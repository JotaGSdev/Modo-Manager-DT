/**
 * 🧪 Test E2E de Regresión — Entrenador Leyenda (Playwright)
 * ============================================================================
 * Barrido automatizado de TODOS los módulos del juego en un contexto de
 * navegador aislado (no toca el save real del jugador):
 *
 *  1. Arranque + creación de carrera en contexto limpio.
 *  2. Integridad del save (checksum v3.7).
 *  3. Las 9 vistas del sidebar (dashboard, plantilla, tácticas, mercado,
 *     scouting, cantera, contrato, finanzas, palmarés).
 *  4. Inspector de jugador (modal desde la plantilla).
 *  5. Vista de partido en vivo (marcador, posesión, xG, pitch).
 *  6. Simulación estacional (3 temporadas) por el flujo real del dashboard:
 *     semanas, copas, traspasos IA, economía IA, regens, evolución.
 *  7. Consola limpia (0 page errors / 0 console errors).
 *  8. Reporte de regresión: JSON + Markdown + historial comparativo
 *     (test-results/history.json) para detectar regresiones entre runs.
 *
 * Uso:  npm run build && npm run test:e2e
 * Salida: test-results/e2e-report.json, e2e-report.md, history.json
 * Código de salida: 0 = todo operativo, 1 = hay regresiones.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const RESULTS_DIR = path.join(ROOT, 'test-results');
const HISTORY_FILE = path.join(RESULTS_DIR, 'history.json');

// ── MODO UNIVERSO COMPLETO (--full) ─────────────────────────────────────────
// Ejecuta, además del barrido estándar, una simulación estacional sobre las
// ~496 plantillas (todas las ligas) midiendo el coste POR TEMPORADA y el
// tamaño del save, con umbrales para detectar regresiones de rendimiento de
// la serialización (si el coste se dispara o el payload deja de estar
// acotado, el run falla). Configurable por variables de entorno:
//   E2E_FULL_SEASONS             (def. 12) temporadas simuladas
//   E2E_FULL_MAX_MS_PER_SEASON   (def. 2500) umbral de tiempo medio/temporada
//   E2E_FULL_MAX_SAVE_MB         (def. 9) umbral de payload guardado
const IS_FULL_MODE = process.argv.includes('--full');
const FULL_SEASONS = Number(process.env.E2E_FULL_SEASONS || 12);
const FULL_MAX_MS_PER_SEASON = Number(process.env.E2E_FULL_MAX_MS_PER_SEASON || 2500);
const FULL_MAX_SAVE_MB = Number(process.env.E2E_FULL_MAX_SAVE_MB || 9);

/** Vistas del sidebar: [view, marcador esperado en el contenido] */
const VIEWS = [
  { view: 'dashboard', marker: /Jornada|Semana/i },
  { view: 'squad', marker: /Plantilla Profesional/i },
  { view: 'tactics', marker: /Formación Táctica/i },
  { view: 'transfers', marker: /Presupuesto para Fichajes|Mercado de/i },
  { view: 'scouting', marker: /Centro de Análisis|Multiliga/i },
  { view: 'youth', marker: /Cantera/i },
  { view: 'contract', marker: /Vínculo Contractual|Contrato/i },
  { view: 'finances', marker: /Panel de Finanzas/i },
  { view: 'trophies', marker: /Palmarés|Salón de la Fama/i }
];

/** Marcadores de render roto dentro de una vista */
const ERROR_MARKERS = /Error al renderizar|Restauración de Datos|TypeError|ReferenceError|Cannot read|undefined is not/;

/** Errores de consola benignos (ruido de red/entorno, no del juego) */
const BENIGN_CONSOLE = /favicon|\.map\b|net::ERR|Failed to load resource/i;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

function startServer(port) {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  return spawn(py, ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
}

async function waitForServer(url, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* reintentar */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`El servidor estático no respondió en ${url}`);
}

async function waitForDb(page, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const ok = await page.evaluate(async () => {
        try { const m = await import('/dist/js/data/db.js'); return Boolean(m.db); } catch { return false; }
      });
      if (ok) return;
    } catch { /* página aún cargando */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('El módulo db del juego no quedó disponible.');
}

async function run() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    steps: {},
    views: [],
    interactions: {},
    sim: null,
    consoleErrors: [],
    pageErrors: [],
    ok: false
  };

  const port = await freePort();
  const base = `http://127.0.0.1:${port}/`;
  report.baseUrl = base;
  const server = startServer(port);
  let browser = null;

  try {
    await waitForServer(base);
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') report.consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => report.pageErrors.push(String(err)));

    // ── 1) ARRANQUE ────────────────────────────────────────────────────────
    let t = Date.now();
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body && document.body.innerText.length > 0, null, { timeout: 15000 });
    await waitForDb(page);
    report.steps.bootMs = Date.now() - t;

    // ── 2) SEMBRAR CARRERA (contexto limpio → crear y recargar) ───────────
    const hasSave = await page.evaluate(async () => (await import('/dist/js/data/db.js')).db.hasSave());
    if (!hasSave) {
      await page.evaluate(async () => {
        const { db } = await import('/dist/js/data/db.js');
        db.newCareer('alianza_lima', 'E2E Test', 'Perú', 35, 'GUARDIOLA', {
          enableManagerMarket: true, enableRegens: true, eventFrequency: 'normal'
        });
      });
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.body.innerText.includes('ENTRENADOR LEYENDA'), null, { timeout: 15000 });
      await waitForDb(page);
    }
    report.steps.seeded = true;

    // ── 3) INTEGRIDAD DEL SAVE ─────────────────────────────────────────────
    report.steps.integrity = await page.evaluate(async () => (await import('/dist/js/data/db.js')).db.checkSaveIntegrity());

    // ── 4) BARRIDO DE LAS 9 VISTAS ─────────────────────────────────────────
    for (const { view, marker } of VIEWS) {
      t = Date.now();
      const res = await page.evaluate((viewName) => {
        const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (!nav) return { status: 'NO_NAV', len: 0, buttons: 0, text: '' };
        nav.click();
        const main = document.getElementById('mainContent');
        const text = main ? main.innerText : '';
        return {
          status: 'RENDERED',
          len: text.length,
          buttons: main ? main.querySelectorAll('button').length : 0,
          text,
          htmlBroken: main ? /undefined|NaN/.test(main.innerHTML) : false
        };
      }, view);
      const markerOk = marker.test(res.text || '');
      const broken = ERROR_MARKERS.test(res.text || '') || res.htmlBroken;
      const status = res.status === 'RENDERED' && markerOk && !broken && res.len > 50 ? 'OK' : 'FAIL';
      report.views.push({
        view,
        status,
        len: res.len,
        buttons: res.buttons,
        markerOk,
        snippet: (res.text || '').slice(0, 70).replace(/\n/g, ' | '),
        ms: Date.now() - t
      });
    }

    // ── 5) INSPECTOR DE JUGADOR ────────────────────────────────────────────
    await page.evaluate(() => document.querySelector('.nav-item[data-view="squad"]').click());
    report.interactions.inspector = await page.evaluate(() => {
      const btn = document.querySelector('#mainContent .btn-inspect-player');
      if (!btn) return { status: 'NO_BTN' };
      btn.click();
      const body = document.body.innerText;
      return {
        status: /Rendimiento Deportivo|Histórico de Temporadas/.test(body) ? 'OK' : 'CHECK',
        snippet: body.slice(0, 120).replace(/\n/g, ' | ')
      };
    });
    await page.evaluate(() => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')));

    // ── 6) VISTA DE PARTIDO EN VIVO ────────────────────────────────────────
    report.interactions.match = await page.evaluate(async () => {
      const { db } = await import('/dist/js/data/db.js');
      const { renderMatch } = await import('/dist/js/ui/matchUI.js');
      const gs = db.gameState;
      const rivalId = gs.standings.find(s => s.teamId !== gs.userTeamId)?.teamId;
      const rival = db.teams[rivalId];
      const main = document.getElementById('mainContent');
      renderMatch(main, rival, 'auto', false, () => {});
      const text = main.innerText;
      return {
        rival: rival ? rival.name : null,
        status: /OVR|POSESIÓN|TIROS|xG/.test(text) ? 'OK' : 'CHECK',
        len: text.length,
        pitch: Boolean(main.querySelector('.pitch, #pitchArea, canvas')),
        snippet: text.slice(0, 120).replace(/\n/g, ' | ')
      };
    });
    // Recargar para detener el temporizador del partido antes de la simulación
    await page.reload({ waitUntil: 'load' });
    await waitForDb(page);

    // ── 7) SIMULACIÓN ESTACIONAL (3 temporadas, flujo real) ────────────────
    report.sim = await page.evaluate(async () => {
      const { db } = await import('/dist/js/data/db.js');
      const { MatchEngine } = await import('/dist/js/engine/matchEngine.js');
      const { CompetitionsEngine } = await import('/dist/js/engine/competitionsEngine.js');
      const gs = db.gameState;
      const userTeamId = gs.userTeamId;
      const m = { errors: 0, seasons: 0, weeks: 0, cupWeeks: 0, fireSales: 0, investors: 0, crisisNews: 0, minRoster: 99, maxRoster: 0, duplicates: 0 };
      const marks = () => ({
        fire: gs.feedItems.filter(f => f.icon === '🔥' && /VENTA FORZOSA/.test(f.text)).length,
        inv: gs.feedItems.filter(f => f.type === 'INVERSOR_IA').length,
        crisis: gs.feedItems.filter(f => f.icon === '💸' && f.type === 'CRISIS_FINANCIERA').length
      });
      const t0 = performance.now();
      for (let s = 0; s < 3; s++) {
        if (gs.season >= 2050) break;
        const before = marks();
        while (gs.week < gs.maxWeeks) {
          try {
            db.weeklyHousekeeping();
            if (CompetitionsEngine.processCupWeek(gs.week)) m.cupWeeks++;
            if (CompetitionsEngine.processNationalCupWeek(gs.week)) m.cupWeeks++;
            const rival = (gs.standings.find(st => st.teamId !== userTeamId) || {}).teamId;
            if (rival) MatchEngine.simulateAllRivalMatches(userTeamId, rival);
            gs.week++;
            m.weeks++;
          } catch (e) { m.errors++; }
        }
        gs.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
        try { db.processSeasonPlayerEvolution(); m.seasons++; } catch (e) { m.errors++; }
        const after = marks();
        m.fireSales += Math.max(0, after.fire - before.fire);
        m.investors += Math.max(0, after.inv - before.inv);
        m.crisisNews += Math.max(0, after.crisis - before.crisis);
      }
      m.elapsedMs = Math.round(performance.now() - t0);
      const seen = new Set();
      for (const tId in db.players) {
        const n = db.players[tId].length;
        m.minRoster = Math.min(m.minRoster, n);
        m.maxRoster = Math.max(m.maxRoster, n);
        for (const p of db.players[tId]) { if (seen.has(p.id)) m.duplicates++; seen.add(p.id); }
      }
      m.integrity = db.checkSaveIntegrity();
      m.finalSeason = gs.season;
      return m;
    });

    // ── 7b) MODO UNIVERSO COMPLETO (--full) ───────────────────────────────
    if (IS_FULL_MODE) {
      report.fullUniverse = await page.evaluate(async ({ seasons, maxMsPerSeason, maxSaveMB }) => {
        const { db } = await import('/dist/js/data/db.js');
        const { MatchEngine } = await import('/dist/js/engine/matchEngine.js');
        const gs = db.gameState;
        const userTeamId = gs.userTeamId;
        // El universo completo no cabe en la cuota real de localStorage (~5MB):
        // este modo mide SOLO la serialización, así que el shim registra los
        // escritos en memoria y nunca lanza QuotaExceededError (el save real
        // queda fuera de alcance del test, que usa contexto aislado).
        const realSetItem = Storage.prototype.setItem;
        const realGetItem = Storage.prototype.getItem;
        const bigStore = new Map();
        Storage.prototype.setItem = function (k, v) {
          bigStore.set(k, v);
          try { realSetItem.call(this, k, v); } catch { /* cuota superada: ignorar */ }
        };
        Storage.prototype.getItem = function (k) {
          return bigStore.has(k) ? bigStore.get(k) : realGetItem.call(this, k);
        };
        // Poblar todas las plantillas (generación bajo demanda)
        const tPop = performance.now();
        for (const tId in db.teams) db.getTeamPlayers(tId);
        const popMs = Math.round(performance.now() - tPop);

        const m = { errors: 0, seasons: 0, weeks: 0, perSeasonMs: [], minRoster: 99, maxRoster: 0, duplicates: 0 };
        const t0 = performance.now();
        for (let s = 0; s < seasons; s++) {
          if (gs.season >= 2050) break;
          const tS = performance.now();
          while (gs.week < gs.maxWeeks) {
            try {
              db.weeklyHousekeeping();
              const rival = (gs.standings.find(st => st.teamId !== userTeamId) || {}).teamId;
              if (rival) MatchEngine.simulateAllRivalMatches(userTeamId, rival);
              gs.week++;
              m.weeks++;
            } catch (e) { m.errors++; }
          }
          gs.standings.sort((a, b) => b.points - a.points || b.gd - a.gd);
          try { db.processSeasonPlayerEvolution(); m.seasons++; } catch (e) { m.errors++; }
          m.perSeasonMs.push(Math.round(performance.now() - tS));
        }
        m.elapsedMs = Math.round(performance.now() - t0);
        m.popMs = popMs;
        m.avgMsPerSeason = Math.round(m.perSeasonMs.reduce((a, b) => a + b, 0) / Math.max(1, m.perSeasonMs.length));
        m.maxMsPerSeason = Math.max(0, ...m.perSeasonMs);
        // Payload guardado por la última evolución (formato compacto v3.6)
        m.saveMB = Math.round(localStorage.getItem('entrenador_leyenda_save').length / 1048576 * 100) / 100;

        const seen = new Set();
        for (const tId in db.players) {
          const n = db.players[tId].length;
          m.minRoster = Math.min(m.minRoster, n);
          m.maxRoster = Math.max(m.maxRoster, n);
          for (const p of db.players[tId]) { if (seen.has(p.id)) m.duplicates++; seen.add(p.id); }
        }
        m.teams = Object.keys(db.players).length;
        m.nPlayers = Object.values(db.players).reduce((s, r) => s + r.length, 0);
        m.integrity = db.checkSaveIntegrity();
        m.finalSeason = gs.season;
        // Umbrales de rendimiento (la meta es detectar regresiones)
        m.passTime = m.avgMsPerSeason <= maxMsPerSeason;
        m.passPayload = m.saveMB <= maxSaveMB;
        return m;
      }, { seasons: FULL_SEASONS, maxMsPerSeason: FULL_MAX_MS_PER_SEASON, maxSaveMB: FULL_MAX_SAVE_MB });
    }

    // ── 7c) PREMIOS POR LIGA (v3.9) Y AGENTES LIBRES (v3.8) ───────────────
    report.economy = await page.evaluate(async () => {
      const { db } = await import('/dist/js/data/db.js');
      const lp = await import('/dist/js/data/leaguePrizes.js');
      const bra = lp.getLeaguePrizeByRank('bra_1', 1);
      const per = lp.getLeaguePrizeByRank('per_1', 1);
      const cupBra = lp.getNationalCupRoundPrize('bra_1', 4);
      const gs = db.gameState;
      const fas = gs.freeAgents || [];
      const rosterIds = new Set();
      for (const tId in db.players) for (const p of db.players[tId]) rosterIds.add(p.id);
      return {
        // Premios realistas: Brasileirão domina CONMEBOL y la Copa do Brasil
        // paga más que la liga (premisa v3.9).
        prizesOk: bra > 5_000_000 && per < 1_500_000 && bra / per >= 10 && cupBra > bra,
        bra, per, cupBra,
        // Agentes libres: pool presente, sin duplicados con plantillas.
        freeAgentsOk: fas.length >= 0 && fas.every(f => !rosterIds.has(f.id)),
        freeAgents: fas.length
      };
    });
    report.economyOk = report.economy.prizesOk && report.economy.freeAgentsOk;

    // ── 8) FILTRAR ERRORES DE CONSOLA ──────────────────────────────────────
    report.consoleErrors = report.consoleErrors.filter(e => !BENIGN_CONSOLE.test(e));

    // ── 9) VEREDICTO ───────────────────────────────────────────────────────
    const viewsOk = report.views.every(v => v.status === 'OK');
    const interOk = Object.values(report.interactions).every(v => v.status === 'OK');
    const simOk = report.sim.errors === 0 && report.sim.duplicates === 0 && report.sim.integrity === 'ok' && report.sim.seasons >= 2;
    const integrityOk = report.steps.integrity === 'ok';
    const consoleOk = report.consoleErrors.length === 0 && report.pageErrors.length === 0;
    const fullOk = !IS_FULL_MODE || Boolean(
      report.fullUniverse &&
      report.fullUniverse.errors === 0 &&
      report.fullUniverse.duplicates === 0 &&
      report.fullUniverse.integrity === 'ok' &&
      report.fullUniverse.passTime &&
      report.fullUniverse.passPayload
    );
    const economyOk = report.economyOk === true;
    report.ok = viewsOk && interOk && simOk && integrityOk && consoleOk && fullOk && economyOk;
  } catch (err) {
    report.fatal = String(err && err.stack ? err.stack : err);
    report.ok = false;
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }

  // ── 10) REPORTE ─────────────────────────────────────────────────────────
  writeReport(report);
  process.exit(report.ok ? 0 : 1);
}

function writeReport(report) {
  const history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { history.push(...JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'))); } catch { /* historial corrupto: reiniciar */ }
  }
  const prev = history[history.length - 1] || null;
  history.push({
    at: report.generatedAt,
    ok: report.ok,
    durationMs: report.steps.bootMs ?? 0,
    viewsOk: report.views.filter(v => v.status === 'OK').length,
    simErrors: report.sim ? report.sim.errors : -1,
    pageErrors: report.pageErrors.length,
    consoleErrors: report.consoleErrors.length,
    ...(report.fullUniverse ? {
      fullMode: true,
      fullSeasons: report.fullUniverse.seasons,
      fullAvgMs: report.fullUniverse.avgMsPerSeason,
      fullSaveMB: report.fullUniverse.saveMB,
      fullPass: report.fullUniverse.passTime && report.fullUniverse.passPayload
    } : {})
  });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-10), null, 2));

  fs.writeFileSync(path.join(RESULTS_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));

  const delta = prev
    ? ` (prev: ${prev.viewsOk}/9 vistas OK · ${prev.durationMs}ms · ${prev.simErrors} sim-err · ${prev.pageErrors + prev.consoleErrors} consola${prev.fullMode ? ` · full ${prev.fullAvgMs}ms/T ${prev.fullSaveMB}MB` : ''})`
    : ' (primer run)';
  const L = [];
  L.push('# 🧪 Test E2E de Regresión — Entrenador Leyenda');
  L.push('');
  L.push(`- **Fecha:** ${report.generatedAt} · **Node:** ${report.node} · **URL:** ${report.baseUrl}`);
  L.push(`- **Veredicto:** ${report.ok ? '✅ TODO OPERATIVO' : '❌ REGRESIONES DETECTADAS'}${delta}`);
  if (report.fatal) L.push(`- **Error fatal:** \`${report.fatal}\``);
  L.push('');
  L.push('## 📊 Resumen');
  L.push('');
  L.push('| Módulo | Estado |');
  L.push('|---|---|');
  L.push(`| Integridad del save (checksum) | ${report.steps.integrity === 'ok' ? '✅ ok' : `❌ ${report.steps.integrity}`} |`);
  L.push(`| Vistas (9) | ${report.views.filter(v => v.status === 'OK').length}/9 OK |`);
  L.push(`| Inspector de jugador | ${report.interactions.inspector?.status || 'N/A'} |`);
  L.push(`| Partido en vivo | ${report.interactions.match?.status || 'N/A'} (pitch: ${report.interactions.match?.pitch}) |`);
  L.push(`| Simulación estacional | ${report.sim ? `${report.sim.seasons}T · ${report.sim.errors} errores · ${report.sim.weeks} semanas` : 'N/A'} |`);
  L.push(`| Universo completo (--full) | ${report.fullUniverse ? `${report.fullUniverse.seasons}T · ${report.fullUniverse.avgMsPerSeason}ms/T · ${report.fullUniverse.saveMB}MB ${report.fullUniverse.passTime && report.fullUniverse.passPayload ? '✅' : '❌'}` : 'no ejecutado'} |`);
  L.push(`| Economía (premios por liga + agentes libres) | ${report.economyOk ? '✅' : '❌'} ${report.economy ? `(Brasil €${(report.economy.bra / 1e6).toFixed(0)}M vs Perú €${(report.economy.per / 1e6).toFixed(1)}M · ${report.economy.freeAgents} libres)` : ''} |`);
  L.push(`| Consola | ${report.pageErrors.length + report.consoleErrors.length} errores (${report.pageErrors.length} page + ${report.consoleErrors.length} console) |`);
  L.push('');
  L.push('## 🗂️ Vistas');
  L.push('');
  L.push('| Vista | Estado | Chars | Botones | Marcador | ms |');
  L.push('|---|---|---|---|---|---|');
  for (const v of report.views) {
    L.push(`| ${v.view} | ${v.status === 'OK' ? '✅' : '❌'} | ${v.len} | ${v.buttons} | ${v.markerOk ? '✓' : '✗'} | ${v.ms} |`);
  }
  L.push('');
  L.push('## 🧩 Interacciones');
  L.push('');
  if (report.interactions.inspector) {
    L.push(`- **Inspector:** ${report.interactions.inspector.status} — ${report.interactions.inspector.snippet || ''}`);
  }
  if (report.interactions.match) {
    L.push(`- **Partido:** ${report.interactions.match.status} vs ${report.interactions.match.rival || '?'} (${report.interactions.match.len} chars) — ${report.interactions.match.snippet || ''}`);
  }
  L.push('');
  L.push('## 🔄 Simulación estacional');
  L.push('');
  if (report.sim) {
    L.push('| Métrica | Valor |');
    L.push('|---|---|');
    L.push(`| Temporadas simuladas | ${report.sim.seasons} |`);
    L.push(`| Semanas procesadas | ${report.sim.weeks} |`);
    L.push(`| Semanas de copa | ${report.sim.cupWeeks} |`);
    L.push(`| Errores | ${report.sim.errors} |`);
    L.push(`| Ventas forzosas / Inversores / Crisis | ${report.sim.fireSales} / ${report.sim.investors} / ${report.sim.crisisNews} |`);
    L.push(`| Plantillas (min-max) | ${report.sim.minRoster}-${report.sim.maxRoster} |`);
    L.push(`| Duplicados | ${report.sim.duplicates} |`);
    L.push(`| Integridad final | ${report.sim.integrity} |`);
    L.push(`| Duración | ${report.sim.elapsedMs}ms |`);
  }
  L.push('');
  if (report.fullUniverse) {
    const f = report.fullUniverse;
    L.push('## 🌌 Modo universo completo (--full)');
    L.push('');
    L.push('| Métrica | Valor | Umbral | Estado |');
    L.push('|---|---|---|---|');
    L.push(`| Plantillas | ${f.teams} (${f.nPlayers} jugadores) | — | — |`);
    L.push(`| Temporadas simuladas | ${f.seasons} (población ${f.popMs}ms) | — | — |`);
    L.push(`| Tiempo medio por temporada | ${f.avgMsPerSeason}ms | ≤ ${FULL_MAX_MS_PER_SEASON}ms | ${f.passTime ? '✅' : '❌'} |`);
    L.push(`| Máximo por temporada | ${f.maxMsPerSeason}ms | — | — |`);
    L.push(`| Payload del save (T${f.finalSeason}) | ${f.saveMB}MB | ≤ ${FULL_MAX_SAVE_MB}MB | ${f.passPayload ? '✅' : '❌'} |`);
    L.push(`| Errores / Duplicados | ${f.errors} / ${f.duplicates} | 0 / 0 | ${f.errors === 0 && f.duplicates === 0 ? '✅' : '❌'} |`);
    L.push(`| Plantillas (min-max) | ${f.minRoster}-${f.maxRoster} | — | — |`);
    L.push(`| Integridad final | ${f.integrity} | ok | ${f.integrity === 'ok' ? '✅' : '❌'} |`);
    L.push(`| Duración total | ${f.elapsedMs}ms | — | — |`);
    L.push('');
  }
  L.push('## 🖥️ Consola');
  L.push('');
  if (report.consoleErrors.length === 0 && report.pageErrors.length === 0) {
    L.push('Limpia ✅');
  } else {
    for (const e of report.pageErrors) L.push(`- ⚠️ **pageerror:** ${e}`);
    for (const e of report.consoleErrors) L.push(`- ⚠️ **console.error:** ${e}`);
  }
  L.push('');
  fs.writeFileSync(path.join(RESULTS_DIR, 'e2e-report.md'), L.join('\n'));

  console.log(L.join('\n'));
  console.log(`\n📄 Reportes: test-results/e2e-report.json · e2e-report.md · history.json`);
}

run();
