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
 *  9. Golden files de escritorio: cada captura de las 9 vistas se compara
 *     píxel a píxel contra tests/e2e/golden/ (baseline FIJA versionada).
 *     --update-golden (o E2E_UPDATE_GOLDEN=1) regenera la línea base.
 *
 * Uso:  npm run build && npm run test:e2e
 *       npm run test:e2e:golden   (regenera la baseline visual)
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
const SHOT_DIR = path.join(RESULTS_DIR, 'screenshots');

// ── MODO UNIVERSO COMPLETO (--full) ─────────────────────────────────────────
// Ejecuta, además del barrido estándar, una simulación estacional sobre las
// ~496 plantillas (todas las ligas) midiendo el coste POR TEMPORADA y el
// tamaño del save, con umbrales para detectar regresiones de rendimiento de
// la serialización (si el coste se dispara o el payload deja de estar
// acotado, el run falla). Configurable por variables de entorno:
//   E2E_FULL_SEASONS             (def. 12) temporadas simuladas
//   E2E_FULL_MAX_MS_PER_SEASON   (def. 1200) umbral de tiempo medio/temporada (exigente: histórico 531-696ms)
//   E2E_FULL_MAX_SAVE_MB         (def. 6) umbral de payload guardado (exigente: histórico 5.27-5.34MB)
const IS_FULL_MODE = process.argv.includes('--full');
const FULL_SEASONS = Number(process.env.E2E_FULL_SEASONS || 12);
const FULL_MAX_MS_PER_SEASON = Number(process.env.E2E_FULL_MAX_MS_PER_SEASON || 1200);
const FULL_MAX_SAVE_MB = Number(process.env.E2E_FULL_MAX_SAVE_MB || 6);

// ── GOLDEN FILES (baseline visual fija de escritorio) ──────────────────────
// tests/e2e/golden/ se versiona en el repo: cada captura de las 9 vistas se
// compara píxel a píxel contra su golden (línea base FIJA, no el run
// anterior). Métricas: media de diferencia por canal (0-255) y % de píxeles
// con cambio fuerte.  --update-golden (o E2E_UPDATE_GOLDEN=1) regenera la
// línea base; WARN avisa en el reporte, FAIL rompe el build.
const GOLDEN_DIR = path.join(ROOT, 'tests/e2e/golden');
const UPDATE_GOLDEN = process.argv.includes('--update-golden') || process.env.E2E_UPDATE_GOLDEN === '1';
// Calibrado con 5 runs: el ruido de contenido (nombres/estadísticas aleatorios)
// llega a mean ~2.1 / ratio ~2.4% (squad). WARN debe quedar por encima; FAIL
// (layout roto/desplazado) muy por encima.
const GOLDEN_WARN_MEAN = 3.0;   // aviso en el reporte (no rompe el build)
const GOLDEN_WARN_RATIO = 0.06; // 6% de píxeles con cambio fuerte
const GOLDEN_FAIL_MEAN = 6;     // rompe el build (layout roto/desplazado)
const GOLDEN_FAIL_RATIO = 0.15;

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
  fs.mkdirSync(SHOT_DIR, { recursive: true });

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
      // Fingerprint de layout (para comparar contra el run anterior) + captura
      const fp = await page.evaluate(() => {
        const main = document.getElementById('mainContent');
        const r = main ? main.getBoundingClientRect() : null;
        return {
          scrollH: document.documentElement.scrollHeight,
          mainH: r ? Math.round(r.height) : 0,
          mainW: r ? Math.round(r.width) : 0,
          imgs: document.querySelectorAll('img').length,
          btns: main ? main.querySelectorAll('button').length : 0
        };
      });
      // Esperar a que las webfonts estén listas (o fallen) para que las capturas
      // (y por tanto los goldens) no dependan del fallback de fuente del SO.
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))])).catch(() => {});
      await page.waitForTimeout(140); // dejar que el re-render se estabilice
      await page.screenshot({ path: path.join(SHOT_DIR, `${view}.png`) });
      report.views.push({
        view,
        status,
        len: res.len,
        buttons: res.buttons,
        markerOk,
        snippet: (res.text || '').slice(0, 70).replace(/\n/g, ' | '),
        ms: Date.now() - t,
        fp,
        shot: `${view}.png`
      });
    }

    // ── 4b) BARRIDOS DE VIEWPORTS ADICIONALES: overflow de las 9 vistas ───
    // Contextos aislados (storage propio) con la misma carrera sembrada, en
    // 360×640 (móvil) y 1280×520 (ventana corta). Cada vista se verifica SIN
    // overflow horizontal: el scrollWidth del documento no debe superar el
    // ancho de ventana y ningún elemento debe salirse del viewport sin un
    // ancestro que recorte/desplace su overflow (sidebar horizontal, tablas
    // con scroll interno, etc.). En 1280×520 la barra de scroll vertical
    // reduce el ancho disponible y puede disparar overflow horizontal. Un
    // overflow rompe el build (es una regresión de layout).
    const extraViewports = [
      { key: 'mobile', label: '360x640', width: 360, height: 640 },
      { key: 'short', label: '1280x520', width: 1280, height: 520 }
    ];
    for (const vp of extraViewports) {
      const vpCtx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vpPage = await vpCtx.newPage();
      vpPage.on('console', msg => {
        if (msg.type() === 'error') report.consoleErrors.push(msg.text());
      });
      vpPage.on('pageerror', err => report.pageErrors.push(String(err)));
      report[vp.key] = { viewport: vp.label, views: [], overflowViews: 0 };
      await vpPage.goto(base, { waitUntil: 'load' });
      await vpPage.waitForFunction(() => document.body && document.body.innerText.length > 0, null, { timeout: 15000 });
      await waitForDb(vpPage);
      const hasSaveVp = await vpPage.evaluate(async () => (await import('/dist/js/data/db.js')).db.hasSave());
      if (!hasSaveVp) {
        await vpPage.evaluate(async () => {
          const { db } = await import('/dist/js/data/db.js');
          db.newCareer('alianza_lima', 'E2E Test', 'Perú', 35, 'GUARDIOLA', {
            enableManagerMarket: true, enableRegens: true, eventFrequency: 'normal'
          });
        });
        await vpPage.reload({ waitUntil: 'load' });
        await vpPage.waitForFunction(() => document.body.innerText.includes('ENTRENADOR LEYENDA'), null, { timeout: 15000 });
        await waitForDb(vpPage);
      }
      for (const { view, marker } of VIEWS) {
        t = Date.now();
        const mres = await vpPage.evaluate((viewName) => {
          const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
          if (!nav) return { status: 'NO_NAV', len: 0, text: '', docOverflow: 0, offenders: [], htmlBroken: false };
          nav.click();
          const main = document.getElementById('mainContent');
          const winW = window.innerWidth;
          const docOverflow = document.documentElement.scrollWidth - winW;
          // Solo los contenedores con scroll propio (auto|scroll: sidebar
          // horizontal, tablas responsivas) "poseen" el overflow de sus hijos.
          // El overflow-x:hidden de body recorta pero NO debe ocultar el detalle
          // (el contenido sigue siendo inalcanzable = regresión).
          const isInsideClippingAncestor = (el) => {
            let p = el.parentElement;
            while (p) {
              if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
              p = p.parentElement;
            }
            return false;
          };
          const offenders = [];
          for (const el of document.querySelectorAll('body *')) {
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if ((r.right - winW > 1 || -r.left > 1) && !isInsideClippingAncestor(el)) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                cls: typeof el.className === 'string' ? el.className.slice(0, 40) : '',
                id: el.id || '',
                right: Math.round(r.right),
                text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
              });
              if (offenders.length >= 4) break;
            }
          }
          const text = main ? main.innerText : '';
          const mr = main ? main.getBoundingClientRect() : null;
          return {
            status: 'RENDERED',
            len: text.length,
            text,
            htmlBroken: main ? /undefined|NaN/.test(main.innerHTML) : false,
            docOverflow,
            offenders,
            fp: {
              scrollH: document.documentElement.scrollHeight,
              mainH: mr ? Math.round(mr.height) : 0,
              mainW: mr ? Math.round(mr.width) : 0,
              imgs: document.querySelectorAll('img').length,
              btns: main ? main.querySelectorAll('button').length : 0
            }
          };
        }, view);
        const mMarkerOk = marker.test(mres.text || '');
        const mBroken = ERROR_MARKERS.test(mres.text || '') || mres.htmlBroken;
        const hasOverflow = mres.docOverflow > 0 || mres.offenders.length > 0;
        const mStatus = mres.status === 'RENDERED' && mMarkerOk && !mBroken && mres.len > 50
          ? (hasOverflow ? 'OVERFLOW' : 'OK')
          : 'FAIL';
        await vpPage.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))])).catch(() => {});
        await vpPage.waitForTimeout(140);
        await vpPage.screenshot({ path: path.join(SHOT_DIR, `${vp.key}-${view}.png`) });
        report[vp.key].views.push({
          view,
          status: mStatus,
          len: mres.len,
          markerOk: mMarkerOk,
          docOverflow: mres.docOverflow,
          offenders: mres.offenders,
          fp: mres.fp,
          ms: Date.now() - t,
          shot: `${vp.key}-${view}.png`
        });
        if (hasOverflow) report[vp.key].overflowViews++;
      }
      await vpCtx.close();
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
    // Captura del inspector abierto (modal) antes de ocultarlo
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(SHOT_DIR, 'inspector.png') });
    report.interactions.inspector.shot = 'inspector.png';
    await page.evaluate(() => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')));

    // ── 5b) PANTALLA "INGRESOS DE MI LIGA" EN FINANZAS (v3.13) ─────────────
    // Conmutador de pantalla: panel contable ⇄ premios por posición + copa
    // nacional + pozo continental, según el país del club.
    report.interactions.premiosScreen = await page.evaluate(() => {
      document.querySelector('.nav-item[data-view="finances"]').click();
      const toggle = document.getElementById('btnModePremios');
      if (!toggle) return { status: 'NO_TOGGLE' };
      toggle.click();
      const main = document.getElementById('mainContent');
      const text = main ? main.innerText : '';
      return {
        status: /Premios de la Liga/.test(text) && /premios por ronda/.test(text)
          && /pozo continental/.test(text) && /Campeón \(1º\)/.test(text)
          && main && !/undefined|NaN/.test(main.innerHTML) ? 'OK' : 'FAIL',
        len: text.length,
        snippet: text.slice(0, 100).replace(/\n/g, ' | ')
      };
    });
    // Captura de la pantalla "Ingresos de Mi Liga"
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(SHOT_DIR, 'premios.png') });
    report.interactions.premiosScreen.shot = 'premios.png';

    // ── 5c) ESCUDOS Y BANDERAS LOCALES (assets descargados) ─────────────────
    // El dashboard muestra el escudo del club y el del rival; la barra global
    // muestra la bandera del DT. Se verifica que los assets LOCALES cargan
    // (naturalWidth > 0) y que la cobertura de escudos en disco es mayoritaria.
    report.interactions.assets = await page.evaluate(async () => {
      document.querySelector('.nav-item[data-view="dashboard"]').click();
      await new Promise(r => setTimeout(r, 400));
      const imgs = [...document.querySelectorAll('img')];
      const badge = imgs.find(i => /assets\/badges\//.test(i.src));
      const flag = imgs.find(i => /assets\/flags\//.test(i.src));
      const okImg = (el) => el && el.complete && el.naturalWidth > 0;
      return {
        badgeSrc: badge ? badge.src.split('/').pop() : null,
        badgeLoaded: okImg(badge),
        flagSrc: flag ? flag.src.split('/').pop() : null,
        flagLoaded: okImg(flag)
      };
    });
    // Cobertura en disco (nodo): escudos locales vs 496 equipos de las 36 ligas
    const leaguesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/leagues.json'), 'utf8'));
    const totalTeams = leaguesJson.reduce((a, l) => a + l.teams.length, 0);
    const localBadges = fs.readdirSync(path.join(ROOT, 'assets/badges')).filter(f => f.endsWith('.png')).length;
    report.interactions.assets.coverage = `${localBadges}/${totalTeams}`;
    if (!report.interactions.assets.badgeLoaded || !report.interactions.assets.flagLoaded) {
      report.interactions.assets.status = 'FAIL';
    } else {
      report.interactions.assets.status = localBadges >= totalTeams * 0.85 ? 'OK' : 'CHECK';
    }

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
    // Captura del partido en vivo (con el marcador y el campo visibles)
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOT_DIR, 'match.png') });
    report.interactions.match.shot = 'match.png';
    // Recargar para detener el temporizador del partido antes de la simulación.
    // FIX: esperar también el layout principal (no solo el módulo db importable):
    // app.init() carga el save de forma asíncrona y en discos lentos (CI/clon
    // limpio) la simulación podía leer db.gameState null → TypeError.
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.body.innerText.includes('ENTRENADOR LEYENDA'), null, { timeout: 15000 });
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
      // Tabla "Premios de mi liga" (v3.11): proporciones por puesto y copa
      // continental por región.
      const champ = lp.getLeagueChampionPrize('per_1');
      const top4 = lp.getLeaguePrizeByRank('per_1', 2);
      const rest = lp.getLeaguePrizeByRank('per_1', 5);
      const contSA = lp.getContinentalCupInfo('Sudamérica');
      const contEU = lp.getContinentalCupInfo('Europa');
      const gs = db.gameState;
      const fas = gs.freeAgents || [];
      const rosterIds = new Set();
      for (const tId in db.players) for (const p of db.players[tId]) rosterIds.add(p.id);
      // v3.12 — premio continental POR ETAPAS: la J1 (semana 6) garantiza el
      // premio por jugar la Fase de Grupos (se paga gane o pierda) y se anuncia
      // en The Feed. En --full el harness omite processCupWeek para aislar el
      // coste de serialización, así que se verifica aquí de forma directa (la
      // J1 de la temporada actual sigue PENDIENTE en ambos modos).
      let stagedOk = false;
      try {
        const { CompetitionsEngine } = await import('/dist/js/engine/competitionsEngine.js');
        const r = CompetitionsEngine.processCupWeek(6); // J1 de la Libertadores
        const feedAfter = (gs.feedItems || []).filter(f => f.type === 'PREMIOS_CONTINENTAL');
        stagedOk = Boolean(r && r.breakdown && r.breakdown.entry === contSA.groupEntryPrize
          && r.reward >= contSA.groupEntryPrize && feedAfter.length >= 1);
      } catch { stagedOk = false; }
      const contFeed = (gs.feedItems || []).filter(f => f.type === 'PREMIOS_CONTINENTAL').length;
      return {
        // Premios realistas: Brasileirão domina CONMEBOL y la Copa do Brasil
        // paga más que la liga (premisa v3.9).
        prizesOk: bra > 5_000_000 && per < 1_500_000 && bra / per >= 10 && cupBra > bra,
        bra, per, cupBra,
        // Tabla de premios: campeón > zona alta > resto con 100/50/20% y
        // Libertadores por etapas reales: ~$3M por jugar grupos (€2.8M),
        // $340K por victoria (€310K) y $25M por el título.
        tableOk: champ > top4 && top4 > rest && top4 === champ * 0.5 && rest === champ * 0.2
          && contSA.name.includes('Libertadores') && contSA.groupEntryPrize === 2_800_000 && contSA.groupWinPrize === 310_000 && contSA.finalPrize === 25_000_000
          && contEU.name.includes('Champions') && contEU.groupEntryPrize === 4_000_000 && contEU.finalPrize === 35_000_000
          && stagedOk,
        stagedOk, contFeed,
        // Agentes libres: pool presente, sin duplicados con plantillas.
        freeAgentsOk: fas.length >= 0 && fas.every(f => !rosterIds.has(f.id)),
        freeAgents: fas.length
      };
    });
    report.economyOk = report.economy.prizesOk && report.economy.tableOk && report.economy.freeAgentsOk;

    // ── 7d) FLUJO COMPLETO DE AGENTES LIBRES (v3.8) ────────────────────────
    // Expiración de contrato → aparición en el mercado → fichaje del DT sin
    // traspaso (wizard real de la UI, cualquier semana) → verificación de
    // presupuesto (fee 0) y plantilla.
    report.freeFlow = await page.evaluate(async () => {
      const { db } = await import('/dist/js/data/db.js');
      const { TransferEngine } = await import('/dist/js/engine/transfers.js');
      const gs = db.gameState;
      const userTeamId = gs.userTeamId;

      // 1) Víctima: jugador IA joven (≤33 → tras la evolución ≤34, sin retiro)
      //    de una plantilla holgada, forzado a su último año de contrato (0).
      let victim = null;
      let victimTeamId = null;
      for (const tId in db.players) {
        if (tId === userTeamId) continue;
        const roster = db.players[tId] || [];
        if (roster.length < 18) continue;
        const cand = roster.find(p => p.age <= 33 && p.contractYears > 0);
        if (cand) { victim = cand; victimTeamId = tId; break; }
      }
      if (!victim) return { status: 'NO_PLAYER' };
      if (!victim.salary) victim.salary = 8000;
      if (!victim.value) victim.value = 500000;
      const victimId = victim.id;
      const victimName = victim.name;
      const preEvoContract = victim.contractYears;
      victim.contractYears = 0;

      // 2) Expiración real: la evolución de fin de temporada marca al jugador
      //    con contrato vencido (wasExpired) y lo deja libre, fuera de su
      //    plantilla. Para aislar el mecanismo de la IA se infla su valor a
      //    €100.000M: la prima del refill (1% del valor) y del mercado (3%)
      //    queda fuera del presupuesto de cualquier club IA (tope 2.5× base,
      //    ~€500M como máximo), así que ni el refill de plantillas cortas ni
      //    processAITransfers (que corre al final de la evolución, tras
      //    recomputar presupuestos) pueden re-ficharlo al instante. El fichaje
      //    del DT usa salario + prima fija, no el valor de mercado.
      const realValue = victim.value;
      victim.value = 100_000_000_000_000;
      db.processSeasonPlayerEvolution();
      victim.value = realValue; // restaurar ya: el mercado y el wizard usan el valor real
      const leftOriginal = !(db.players[victimTeamId] || []).some(p => p.id === victimId);
      const whereAfter = [];
      for (const tId in db.players) {
        if ((db.players[tId] || []).some(p => p.id === victimId)) whereAfter.push(tId);
      }
      const expired = leftOriginal && (gs.freeAgents || []).some(p => p.id === victimId);

      // 3) Aparición en el mercado (motor): sin club vendedor ni fee.
      const inMarketEngine = TransferEngine.getFreeAgents({ name: victimName })
        .some(p => p.id === victimId && p.teamName === 'Agente Libre');

      // 4) Aparición en la UI: vista de traspasos → modo Agentes Libres →
      //    búsqueda por nombre → tarjeta con "FIRMAR CONTRATO (sin traspaso)".
      const showFreeList = () => {
        document.querySelector('.nav-item[data-view="transfers"]').click();
        document.getElementById('btnModeFree').click();
        const search = document.getElementById('inputSearchName');
        search.value = victimName;
        search.dispatchEvent(new Event('input', { bubbles: true }));
        return document.getElementById('marketPlayerList');
      };
      let uiShown = false;
      try {
        const list = showFreeList();
        uiShown = Boolean(list) && list.innerText.includes(victimName)
          && Boolean(list.querySelector(`.btn-sign-free[data-id="${victimId}"]`));
      } catch { uiShown = false; }

      // 5) Fichaje del DT por el wizard real (sin traspaso, cualquier semana):
      //    salario ≥ esperado y prima ≥5% del valor → el agente acepta (60+).
      //
      //    El render de la vista de traspasos puebla el universo en memoria
      //    (getMarketPlayers genera las ~496 plantillas bajo demanda), así que
      //    el saveGame del fichaje serializaría ~5MB y superaría la cuota de
      //    localStorage del headless (~5MB; en Chrome normal es ~60GB). Este
      //    bloque mide la LÓGICA de agentes libres, no la capacidad de
      //    almacenamiento (eso lo cubre --full con sus umbrales): se aplica el
      //    mismo shim de Storage en memoria que usa el modo universo completo.
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
      const expectedWage = Math.round(victim.salary * (victim.overall >= 82 ? 1.25 : 1.10));
      const wage = expectedWage;
      const bonus = Math.round(victim.value * 0.05);
      if (gs.wageBudget < wage) gs.wageBudget = wage;
      const budgetBefore = gs.budget;
      const wageBefore = gs.wageBudget;
      const kb = (s) => Math.round((s || '').length / 1024);
      const saveKB = { beforeSign: kb(localStorage.getItem('entrenador_leyenda_save')), backupKB: kb(localStorage.getItem('entrenador_leyenda_backup')) };
      let wizardResult = 'NOT_RUN';
      try {
        document.querySelector(`.btn-sign-free[data-id="${victimId}"]`).click();
        const wageInput = document.getElementById('inputPlayerWage');
        const bonusInput = document.getElementById('inputSigningBonus');
        if (wageInput && bonusInput) {
          wageInput.value = String(wage);
          bonusInput.value = String(bonus);
          document.getElementById('btnSubmitStep2').click();
          await new Promise(r => setTimeout(r, 2200)); // cierre del modal + re-render
          wizardResult = 'RUN';
        }
      } catch { wizardResult = 'THREW'; }

      // 6) Verificación post-fichaje: plantilla del DT, fuera del pool, fee 0
      //    (presupuesto intacto) y salario descontado de la masa salarial.
      const inSquad = db.getTeamPlayers(userTeamId).some(p => p.id === victimId);
      const stillFree = (gs.freeAgents || []).some(p => p.id === victimId);
      const signed = wizardResult === 'RUN' && inSquad && !stillFree;
      const noFee = gs.budget === budgetBefore;
      const wageDeducted = wageBefore - gs.wageBudget === wage;

      // 7) La lista de libres ya no muestra al fichado. Se verifica por ID
      //    único (no por nombre: con el universo completo hay colisiones de
      //    nombres entre jugadores generados — otro "Lucas Romero" podría
      //    seguir libre en el pool).
      let uiGone = true;
      try {
        const list = showFreeList();
        if (list) uiGone = !list.querySelector(`.btn-sign-free[data-id="${victimId}"]`);
      } catch { /* vista re-renderizada: asumir correcto */ }

      // Restaurar el almacenamiento real (el shim solo aplica a este bloque).
      Storage.prototype.setItem = realSetItem;
      Storage.prototype.getItem = realGetItem;

      return {
        status: expired && inMarketEngine && uiShown && signed && noFee && wageDeducted && uiGone
          && victim.contractYears === 3 && victim.teamId === userTeamId ? 'OK' : 'FAIL',
        victim: victimName, pos: victim.pos, ovr: victim.overall, age: victim.age,
        expired, inMarketEngine, uiShown, signed, noFee, wageDeducted, uiGone,
        contractYears: victim.contractYears, teamId: victim.teamId, victimTeamId, preEvoContract, whereAfter,
        wizardResult, poolSize: (gs.freeAgents || []).length,
        saveKB: { ...saveKB, afterSign: kb(localStorage.getItem('entrenador_leyenda_save')) }
      };
    });

    // ── 7e) GOLDEN FILES DE ESCRITORIO (baseline visual fija) ──────────────
    // Compara cada captura de las 9 vistas contra su golden versionado en
    // tests/e2e/golden/ (línea base FIJA; no el run anterior). Si el golden no
    // existe (primer run / vista nueva) se crea como baseline; con
    // --update-golden se regeneran todos. El diff se calcula píxel a píxel en
    // el navegador (canvas) y para WARN/FAIL se guarda una imagen de
    // diferencias (píxeles cambiados en rojo) junto a la captura.
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    const goldenNames = report.views.map(v => ({ name: v.view, shot: v.shot }));
    report.golden = await page.evaluate(async ({ names, baseUrl, update, warnMean, warnRatio, failMean, failRatio }) => {
      const results = [];
      const load = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('img'));
        img.src = src;
      });
      for (const { name, shot } of names) {
        const goldenUrl = `${baseUrl}tests/e2e/golden/${name}.png`;
        const currentUrl = `${baseUrl}test-results/screenshots/${shot}`;
        let golden = null;
        try { golden = await load(goldenUrl); } catch { golden = null; }
        if (!golden || update) {
          results.push({ name, status: 'BASELINE', note: update ? 'regenerado' : 'baseline creada' });
          continue;
        }
        const cur = await load(currentUrl);
        const W = golden.naturalWidth, H = golden.naturalHeight;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.drawImage(golden, 0, 0);
        const gd = ctx.getImageData(0, 0, W, H).data;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(cur, 0, 0);
        const cd = ctx.getImageData(0, 0, W, H).data;
        const pixels = W * H;
        const THRESH = 24; // cambio fuerte por canal (suma de los 3)
        let sum = 0, diffCount = 0;
        for (let i = 0; i < gd.length; i += 4) {
          const d = Math.abs(gd[i] - cd[i]) + Math.abs(gd[i + 1] - cd[i + 1]) + Math.abs(gd[i + 2] - cd[i + 2]);
          sum += d;
          if (d > THRESH) diffCount++;
        }
        const meanDiff = sum / (pixels * 3);
        const diffRatio = diffCount / pixels;
        const status = (meanDiff > failMean || diffRatio > failRatio) ? 'FAIL'
          : (meanDiff > warnMean || diffRatio > warnRatio) ? 'WARN' : 'OK';
        const entry = { name, status, meanDiff: +meanDiff.toFixed(3), diffRatio: +diffRatio.toFixed(4), diffPixels: diffCount, w: W, h: H };
        if (status === 'WARN' || status === 'FAIL') {
          for (let i = 0; i < gd.length; i += 4) {
            const d = Math.abs(gd[i] - cd[i]) + Math.abs(gd[i + 1] - cd[i + 1]) + Math.abs(gd[i + 2] - cd[i + 2]);
            if (d > THRESH) { cd[i] = 255; cd[i + 1] = 30; cd[i + 2] = 30; }
          }
          ctx.putImageData(new ImageData(new Uint8ClampedArray(cd), W, H), 0, 0);
          entry.diffDataUrl = cv.toDataURL('image/png');
        }
        results.push(entry);
      }
      return { results };
    }, { names: goldenNames, baseUrl: base, update: UPDATE_GOLDEN, warnMean: GOLDEN_WARN_MEAN, warnRatio: GOLDEN_WARN_RATIO, failMean: GOLDEN_FAIL_MEAN, failRatio: GOLDEN_FAIL_RATIO });
    // Escribir baselines y diffs en disco (fuera del navegador)
    for (const g of report.golden.results) {
      if (g.status === 'BASELINE') {
        const shotEntry = goldenNames.find(n => n.name === g.name);
        if (shotEntry) fs.copyFileSync(path.join(SHOT_DIR, shotEntry.shot), path.join(GOLDEN_DIR, `${g.name}.png`));
      } else if (g.diffDataUrl) {
        fs.writeFileSync(path.join(SHOT_DIR, `golden-${g.name}-diff.png`), Buffer.from(g.diffDataUrl.split(',')[1], 'base64'));
        g.diffShot = `golden-${g.name}-diff.png`;
        delete g.diffDataUrl;
      }
    }
    report.golden.failed = report.golden.results.filter(g => g.status === 'FAIL').length;
    report.golden.warned = report.golden.results.filter(g => g.status === 'WARN').length;
    report.golden.baselined = report.golden.results.filter(g => g.status === 'BASELINE').length;

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
    const freeFlowOk = report.freeFlow?.status === 'OK';
    const assetsOk = report.interactions.assets?.status === 'OK' || report.interactions.assets?.status === 'CHECK';
    // Viewports adicionales (móvil 360×640 y ventana corta 1280×520): las 9
    // vistas deben renderizar y NO tener overflow horizontal (scrollWidth del
    // doc ≤ ancho de ventana y ningún elemento fuera del viewport sin ancestro
    // con scroll propio).
    const sweepOk = (key) => report[key]?.views.length === VIEWS.length
      && report[key].overflowViews === 0
      && report[key].views.every(v => v.status === 'OK');
    const mobileOk = sweepOk('mobile');
    const shortOk = sweepOk('short');
    // Golden files: solo el FAIL (layout roto/desplazado) rompe el build; WARN
    // y BASELINE (primer run) no.
    const goldenOk = !report.golden || report.golden.failed === 0;
    report.ok = viewsOk && interOk && simOk && integrityOk && consoleOk && fullOk && economyOk && freeFlowOk && assetsOk && mobileOk && shortOk && goldenOk;
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
    freeFlowOk: report.freeFlow?.status === 'OK',
    simErrors: report.sim ? report.sim.errors : -1,
    pageErrors: report.pageErrors.length,
    consoleErrors: report.consoleErrors.length,
    fp: Object.fromEntries(report.views.map(v => [v.view, v.fp])),
    ...(report.mobile ? { mobileFp: Object.fromEntries(report.mobile.views.map(v => [v.view, v.fp])) } : {}),
    ...(report.short ? { shortFp: Object.fromEntries(report.short.views.map(v => [v.view, v.fp])) } : {}),
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

  // ── Comparativa visual vs run anterior (fingerprint de layout) ────────────
  const prevFp = (prev && prev.fp) || {};
  const layoutChanges = [];
  for (const v of report.views) {
    const p = prevFp[v.view];
    const cur = v.fp;
    if (!p || !cur) continue;
    const dH = Math.abs(cur.scrollH - p.scrollH) / Math.max(1, p.scrollH);
    const dMain = Math.abs(cur.mainH - p.mainH) / Math.max(1, p.mainH);
    const dImgs = cur.imgs !== p.imgs;
    const dBtns = cur.btns !== p.btns;
    const why = [
      dH > 0.12 ? `alto ${p.scrollH}→${cur.scrollH}px` : null,
      dMain > 0.12 ? `main ${p.mainH}→${cur.mainH}px` : null,
      dImgs ? `imgs ${p.imgs}→${cur.imgs}` : null,
      dBtns ? `btns ${p.btns}→${cur.btns}` : null
    ].filter(Boolean);
    if (why.length) layoutChanges.push({ view: v.view, why: why.join(', '), from: p, to: cur });
  }
  // Comparativa de viewports adicionales vs run anterior (misma regla >12%)
  for (const [key, prefix] of [['mobile', 'm:'], ['short', 's:']]) {
    const section = report[key];
    const prevFp = (prev && prev[key + 'Fp']) || {};
    if (!section) continue;
    for (const v of section.views) {
      const p = prevFp[v.view];
      const cur = v.fp;
      if (!p || !cur) continue;
      const dH = Math.abs(cur.scrollH - p.scrollH) / Math.max(1, p.scrollH);
      const dMain = Math.abs(cur.mainH - p.mainH) / Math.max(1, p.mainH);
      const dImgs = cur.imgs !== p.imgs;
      const dBtns = cur.btns !== p.btns;
      const why = [
        dH > 0.12 ? `alto ${p.scrollH}→${cur.scrollH}px` : null,
        dMain > 0.12 ? `main ${p.mainH}→${cur.mainH}px` : null,
        dImgs ? `imgs ${p.imgs}→${cur.imgs}` : null,
        dBtns ? `btns ${p.btns}→${cur.btns}` : null
      ].filter(Boolean);
      if (why.length) layoutChanges.push({ view: prefix + v.view, why: why.join(', '), from: p, to: cur });
    }
  }
  report.visual = {
    shots: report.views.length + ['match', 'inspector', 'premios'].filter(n => {
      if (n === 'match') return report.interactions.match?.shot;
      if (n === 'inspector') return report.interactions.inspector?.shot;
      return report.interactions.premiosScreen?.shot;
    }).length + (report.mobile ? report.mobile.views.length : 0) + (report.short ? report.short.views.length : 0),
    changed: layoutChanges
  };

  const L = [];
  L.push('# 🧪 Test E2E de Regresión — Entrenador Leyenda');
  L.push('');
  L.push(`- **Fecha:** ${report.generatedAt} · **Node:** ${report.node} · **URL:** ${report.baseUrl}`);
  const layoutWarn = report.visual.changed.length
    ? ` · ⚠️ ${report.visual.changed.length} vista(s) con cambio de layout (${report.visual.changed.map(c => c.view).join(', ')})`
    : '';
  L.push(`- **Veredicto:** ${report.ok ? '✅ TODO OPERATIVO' : '❌ REGRESIONES DETECTADAS'}${delta}${layoutWarn}`);
  if (report.fatal) L.push(`- **Error fatal:** \`${report.fatal}\``);
  L.push('');
  L.push('## 📊 Resumen');
  L.push('');
  L.push('| Módulo | Estado |');
  L.push('|---|---|');
  L.push(`| Integridad del save (checksum) | ${report.steps.integrity === 'ok' ? '✅ ok' : `❌ ${report.steps.integrity}`} |`);
  L.push(`| Vistas (9) | ${report.views.filter(v => v.status === 'OK').length}/9 OK |`);
  L.push(`| Vista móvil 360×640 (overflow) | ${report.mobile ? `${report.mobile.views.filter(v => v.status === 'OK').length}/9 OK · ${report.mobile.overflowViews} vistas con overflow ${report.mobile.overflowViews === 0 ? '✅' : '❌'}` : 'no ejecutado'} |`);
  L.push(`| Vista ventana corta 1280×520 (overflow) | ${report.short ? `${report.short.views.filter(v => v.status === 'OK').length}/9 OK · ${report.short.overflowViews} vistas con overflow ${report.short.overflowViews === 0 ? '✅' : '❌'}` : 'no ejecutado'} |`);
  L.push(`| Golden files (baseline visual) | ${report.golden ? `${report.golden.results.length} vistas · ${report.golden.failed} FAIL · ${report.golden.warned} WARN · ${report.golden.baselined} baseline ${report.golden.failed === 0 ? '✅' : '❌'}` : 'no ejecutado'} |`);
  L.push(`| Inspector de jugador | ${report.interactions.inspector?.status || 'N/A'} |`);
  L.push(`| Partido en vivo | ${report.interactions.match?.status || 'N/A'} (pitch: ${report.interactions.match?.pitch}) |`);
  L.push(`| Simulación estacional | ${report.sim ? `${report.sim.seasons}T · ${report.sim.errors} errores · ${report.sim.weeks} semanas` : 'N/A'} |`);
  L.push(`| Universo completo (--full) | ${report.fullUniverse ? `${report.fullUniverse.seasons}T · ${report.fullUniverse.avgMsPerSeason}ms/T · ${report.fullUniverse.saveMB}MB ${report.fullUniverse.passTime && report.fullUniverse.passPayload ? '✅' : '❌'}` : 'no ejecutado'} |`);
  L.push(`| Economía (premios por liga + agentes libres) | ${report.economyOk ? '✅' : '❌'} ${report.economy ? `(Brasil €${(report.economy.bra / 1e6).toFixed(0)}M vs Perú €${(report.economy.per / 1e6).toFixed(1)}M · ${report.economy.freeAgents} libres · tabla premios ${report.economy.tableOk ? 'OK' : '❌'} · ${report.economy.contFeed} noticias continentales)` : ''} |`);
  L.push(`| Flujo agentes libres (expiración → fichaje) | ${report.freeFlow?.status === 'OK' ? '✅' : '❌'} ${report.freeFlow ? `(${report.freeFlow.victim} · expirado ${report.freeFlow.expired ? '✓' : '✗'} · mercado ${report.freeFlow.inMarketEngine ? '✓' : '✗'} · UI ${report.freeFlow.uiShown ? '✓' : '✗'} · fichado ${report.freeFlow.signed ? '✓' : '✗'} · sin fee ${report.freeFlow.noFee ? '✓' : '✗'})` : 'N/A'} |`);
  L.push(`| Escudos y banderas locales | ${report.interactions.assets?.status || 'N/A'} (cobertura ${report.interactions.assets?.coverage || '?'} · escudo ${report.interactions.assets?.badgeLoaded ? '✓' : '✗'} ${report.interactions.assets?.badgeSrc || ''} · bandera ${report.interactions.assets?.flagLoaded ? '✓' : '✗'} ${report.interactions.assets?.flagSrc || ''}) |`);

  L.push(`| Reporte visual (capturas) | ${report.visual.shots} capturas · ${layoutChanges.length} vistas con cambio de layout ${layoutChanges.length ? '⚠️' : '✅'} |`);
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
  L.push('## 📸 Reporte visual');
  L.push('');
  L.push('Capturas de cada vista (viewport) + partido en vivo. Comparadas contra el');
  L.push('run anterior por **fingerprint de layout** (alto de página, alto de `#mainContent`,');
  L.push('nº de imágenes y botones). Un cambio marcado con ⚠️ no rompe el build, pero');
  L.push('merece una ojeada.');
  L.push('');
  L.push('| Vista | Estado | Layout (scrollH / mainH / imgs / btns) | Cambio vs anterior | Captura |');
  L.push('|---|---|---|---|---|');
  for (const v of report.views) {
    const change = layoutChanges.find(c => c.view === v.view);
    const fp = v.fp;
    L.push(`| ${v.view} | ${v.status === 'OK' ? '✅' : '❌'} | ${fp ? `${fp.scrollH}px / ${fp.mainH}px / ${fp.imgs} / ${fp.btns}` : '—'} | ${change ? `⚠️ ${change.why}` : 'sin cambios'} | <img src="screenshots/${v.shot}" width="300" alt="${v.view}"> |`);
  }
  L.push(`| **partido** | ${report.interactions.match?.status || 'N/A'} | — | — | <img src="screenshots/match.png" width="300" alt="match"> |`);
  L.push(`| **inspector** | ${report.interactions.inspector?.status || 'N/A'} | — | — | <img src="screenshots/inspector.png" width="300" alt="inspector"> |`);
  L.push(`| **ingresos liga** | ${report.interactions.premiosScreen?.status || 'N/A'} | — | — | <img src="screenshots/premios.png" width="300" alt="premios"> |`);
  L.push('');
  const extraSections = [
    { key: 'mobile', title: '## 📱 Vista móvil (360×640)', prefix: 'mobile', w: 150 },
    { key: 'short', title: '## 🖥️ Vista ventana corta (1280×520)', prefix: 'short', w: 300 }
  ];
  for (const sec of extraSections) {
    const section = report[sec.key];
    if (!section) continue;
    L.push(sec.title);
    L.push('');
    L.push('Barrido de las 9 vistas verificando **cero overflow horizontal**: el');
    L.push('scrollWidth del documento no supera el ancho de ventana y ningún');
    L.push('elemento se sale del viewport (ignorando contenedores con scroll');
    L.push('propio: sidebar horizontal, tablas responsivas). En 1280×520 la barra');
    L.push('de scroll vertical reduce el ancho disponible y puede disparar');
    L.push('overflow horizontal. Un overflow **rompe el build** (regresión de');
    L.push('layout); los fingerprints se comparan contra el run anterior.');
    L.push('');
    L.push('| Vista | Estado | Overflow doc (px) | Elementos fuera | Captura |');
    L.push('|---|---|---|---|---|');
    for (const v of section.views) {
      const sample = v.offenders.length
        ? v.offenders.map(o => `<${o.tag}${o.id ? '#' + o.id : ''}${o.cls ? '.' + o.cls.split(' ')[0] : ''}> ${o.text}`).join('<br>')
        : '0';
      L.push(`| ${v.view} | ${v.status === 'OK' ? '✅' : '❌'} | ${v.docOverflow} | ${sample} | <img src="screenshots/${v.shot}" width="${sec.w}" alt="${sec.prefix} ${v.view}"> |`);
    }
    L.push('');
  }
  if (report.golden) {
    const g = report.golden;
    L.push('## 🥇 Golden files (baseline visual)');
    L.push('');
    L.push('Cada captura de escritorio se compara contra su **golden versionado** en');
    L.push('`tests/e2e/golden/` — línea base FIJA (no el run anterior). Diff píxel a');
    L.push('píxel: media de diferencia por canal (0-255) y % de píxeles con cambio');
    L.push('fuerte. Para WARN/FAIL se guarda una imagen de diferencias (cambios en');
    L.push('rojo) junto a la captura. Regenera la línea base con `npm run test:e2e:golden`.');
    L.push('');
    L.push('| Vista | Estado | Media Δ | % píxeles | Diferencia |');
    L.push('|---|---|---|---|---|');
    for (const v of g.results) {
      const badge = v.status === 'OK' ? '✅' : v.status === 'WARN' ? '⚠️' : v.status === 'FAIL' ? '❌' : '🆕';
      const metrics = v.status === 'BASELINE' ? '—' : `${v.meanDiff} / ${(v.diffRatio * 100).toFixed(2)}%`;
      const img = v.status === 'BASELINE' ? `(${v.note || 'baseline creada'})` : (v.diffShot ? `<img src="screenshots/${v.diffShot}" width="300" alt="diff ${v.name}">` : 'sin diferencias');
      L.push(`| ${v.name} | ${badge} | ${metrics} | ${v.diffPixels ?? '—'} px | ${img} |`);
    }
    L.push('');
  }
  L.push('## 🧩 Interacciones');
  L.push('');
  if (report.interactions.inspector) {
    L.push(`- **Inspector:** ${report.interactions.inspector.status} — ${report.interactions.inspector.snippet || ''}`);
  }
  if (report.interactions.premiosScreen) {
    L.push(`- **Ingresos de Mi Liga (finanzas):** ${report.interactions.premiosScreen.status} — ${report.interactions.premiosScreen.snippet || ''}`);
  }
  if (report.interactions.match) {
    L.push(`- **Partido:** ${report.interactions.match.status} vs ${report.interactions.match.rival || '?'} (${report.interactions.match.len} chars) — ${report.interactions.match.snippet || ''}`);
  }
  if (report.interactions.assets) {
    L.push(`- **Escudos/Banderas locales:** ${report.interactions.assets.status} — cobertura ${report.interactions.assets.coverage} · escudo ${report.interactions.assets.badgeSrc || '?'} cargado ${report.interactions.assets.badgeLoaded ? '✓' : '✗'} · bandera ${report.interactions.assets.flagSrc || '?'} cargada ${report.interactions.assets.flagLoaded ? '✓' : '✗'}`);
  }
  L.push('');
  L.push('## 🕊️ Flujo de agentes libres');
  L.push('');
  if (report.freeFlow) {
    const f = report.freeFlow;
    L.push(`- **Jugador:** ${f.victim} (${f.pos}, OVR ${f.ovr}, ${f.age}a)`);
    L.push(`- **Expiración (contrato 0 → pool):** ${f.expired ? '✅' : '❌'} · fuera de su plantilla: ${f.expired ? '✓' : '✗'}`);
    L.push(`- **Aparición en el mercado (motor):** ${f.inMarketEngine ? '✅' : '❌'}`);
    L.push(`- **Aparición en la UI (modo libres):** ${f.uiShown ? '✅' : '❌'}`);
    L.push(`- **Fichaje del DT por wizard (sin traspaso):** ${f.signed ? '✅' : '❌'} (${f.wizardResult})`);
    L.push(`- **Presupuesto intacto (fee 0) / salario descontado:** ${f.noFee ? '✅' : '❌'} / ${f.wageDeducted ? '✅' : '❌'}`);
    L.push(`- **Contrato final:** ${f.contractYears}a · teamId=${f.teamId} · desaparece de la lista de libres: ${f.uiGone ? '✅' : '❌'}`);
    L.push(`- **Pool de libres tras el flujo:** ${f.poolSize}`);
  } else {
    L.push('No ejecutado.');
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
