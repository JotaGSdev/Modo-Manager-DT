// Descarga de escudos reales (496 equipos) y banderas SVG de países.
// Fuentes:
//  - Escudos con API id  -> CDN api-sports (https://media.api-sports.io/football/teams/{id}.png)
//  - Escudos sin API id   -> Wikipedia (REST summary + search API), lead image de la página del club
//  - Banderas             -> CDN api-sports (https://media.api-sports.io/flags/{code}.svg)
// Resumible: los archivos locales ya válidos (>500 bytes) se saltan.
// Uso: node scripts/download_badges_flags.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BADGE_DIR = path.join(ROOT, 'assets', 'badges');
const FLAG_DIR = path.join(ROOT, 'assets', 'flags');
const UA = { 'User-Agent': 'EntrenadorLeyenda/1.0 (career mode football game; asset download; contact: none)' };
const DELAY_MS = 220; // cortesía con Wikipedia
const TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const valid = (p) => { try { return fs.statSync(p).size > 500; } catch { return false; } };
// Las banderas SVG son archivos pequeños y válidos (<500 bytes); su validez es
// tamaño >100 + contenido SVG (no confundir con el umbral de los PNG).
const validFlag = (p) => {
  try {
    const b = fs.readFileSync(p);
    return b.length > 100 && b.toString('utf8', 0, 40).includes('<svg');
  } catch { return false; }
};

async function fetchBuf(url, tries = 4, minBytes = 500) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(url, { headers: UA, signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 429) { const ra = Number(r.headers.get('retry-after') || 2); await sleep(ra * 1000); continue; }
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < minBytes) return null;
      return buf;
    } catch (e) {
      if (i === tries - 1) return null;
      await sleep(800 * (i + 1));
    }
  }
  return null;
}

async function fetchJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) { const ra = Number(r.headers.get('retry-after') || 2); await sleep(ra * 1000); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch {
      if (i === tries - 1) return null;
      await sleep(800 * (i + 1));
    }
  }
  return null;
}

// ── Datos ────────────────────────────────────────────────────────────────────
const leagues = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/leagues.json'), 'utf8'));
const apiMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/team_api_mapping.json'), 'utf8'));
const teams = leagues.flatMap((l) => l.teams.map((t) => ({ ...t, country: l.country, leagueName: l.name })));
fs.mkdirSync(BADGE_DIR, { recursive: true });
fs.mkdirSync(FLAG_DIR, { recursive: true });

// ── Fase A: escudos con API id (CDN api-sports) ─────────────────────────────
async function phaseA() {
  const todo = teams.filter((t) => apiMap[t.id] && !valid(path.join(BADGE_DIR, `${t.id}.png`)));
  console.log(`\n[Fase A] Escudos CDN api-sports: ${todo.length} pendientes`);
  let ok = 0, fail = 0;
  for (const t of todo) {
    const buf = await fetchBuf(`https://media.api-sports.io/football/teams/${apiMap[t.id]}.png`);
    if (buf) { fs.writeFileSync(path.join(BADGE_DIR, `${t.id}.png`), buf); ok++; }
    else { fail++; console.log(`  ✗ ${t.id} (api ${apiMap[t.id]})`); }
    await sleep(50);
  }
  console.log(`[Fase A] OK ${ok} · fallos ${fail}`);
  return fail;
}

// ── Fase B: escudos sin API id (Wikipedia) ──────────────────────────────────
const BAD_DESC_RE = /(footballer|born \d|season|stadium|competition|people|musician|film|album|band|island|province|city|town|village|railway|airport|disease|software|website|ship|defunct|former)/i;
const GOOD_DESC_RE = /(football|soccer|futebol|fútbol|club|team|sport)/i;

function looksLikeClub(summary) {
  if (!summary || !summary.thumbnail || !summary.thumbnail.source) return false;
  const desc = (summary.description || '').toLowerCase();
  if (BAD_DESC_RE.test(desc)) return false;
  return GOOD_DESC_RE.test(desc) || /(F\.?C\.?|CF|Club|Futebol|Futbol|Football|Sociedad|Associação|Asociación|Sporting|SV|VV|FK)\b/i.test(summary.title || '');
}

function stripQuery(u) { return (u || '').split('?')[0]; }

async function summaryFor(title) {
  const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'));
  const j = await fetchJson(url);
  return j && j.type === 'standard' ? j : null;
}

async function resolveBadge(team) {
  const base = team.name.replace(/\s*\([^)]*\)\s*/g, '').trim();
  // 1) Título directo con el nombre base
  const direct = await summaryFor(base);
  await sleep(DELAY_MS);
  if (looksLikeClub(direct)) return { summary: direct, via: `direct:${base}` };

  // 2) Search API → primeros resultados
  const q = encodeURIComponent(`${base} ${team.country} football club`);
  const j = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=${q}`
  );
  await sleep(DELAY_MS);
  const results = (j && j.query && j.query.search) || [];
  for (const res of results.slice(0, 6)) {
    const s = await summaryFor(res.title);
    await sleep(DELAY_MS);
    if (looksLikeClub(s)) return { summary: s, via: `search:${res.title}` };
  }
  return null;
}

async function phaseB() {
  const todo = teams.filter((t) => !valid(path.join(BADGE_DIR, `${t.id}.png`)));
  console.log(`\n[Fase B] Escudos Wikipedia: ${todo.length} pendientes`);
  let ok = 0, fail = 0;
  const failures = [];
  for (let i = 0; i < todo.length; i++) {
    const t = todo[i];
    const res = await resolveBadge(t);
    if (res) {
      const buf = await fetchBuf(stripQuery(res.summary.thumbnail.source));
      if (buf) {
        fs.writeFileSync(path.join(BADGE_DIR, `${t.id}.png`), buf);
        ok++;
      } else { fail++; failures.push(t.id); }
    } else { fail++; failures.push(t.id); }
    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      console.log(`  … ${i + 1}/${todo.length} (OK ${ok} · fail ${fail})`);
    }
  }
  if (failures.length) console.log('  Sin escudo local (usa fallback vectorial):', failures.join(', '));
  console.log(`[Fase B] OK ${ok} · fallos ${fail}`);
  return fail;
}

// ── Fase C: banderas ─────────────────────────────────────────────────────────
const COUNTRY_FLAG_CODES = {
  'Argentina': 'ar', 'Brasil': 'br', 'Colombia': 'co', 'Chile': 'cl', 'Uruguay': 'uy',
  'Perú': 'pe', 'Ecuador': 'ec', 'Paraguay': 'py', 'Bolivia': 'bo', 'Venezuela': 've',
  'España': 'es', 'Inglaterra': 'gb', 'Italia': 'it', 'Alemania': 'de', 'Francia': 'fr',
  'Portugal': 'pt', 'Países Bajos': 'nl', 'Bélgica': 'be', 'Escocia': 'gb-sct', 'Turquía': 'tr',
  'Grecia': 'gr', 'Suiza': 'ch', 'Austria': 'at', 'Dinamarca': 'dk', 'Noruega': 'no',
  'Suecia': 'se', 'Polonia': 'pl', 'República Checa': 'cz', 'Croacia': 'hr', 'México': 'mx',
  'Estados Unidos': 'us', 'Arabia Saudita': 'sa', 'Japón': 'jp', 'Emiratos Árabes': 'ae',
  'Australia': 'au', 'Marruecos': 'ma', 'Egipto': 'eg',
  'Canadá': 'ca', 'Costa Rica': 'cr', 'Honduras': 'hn', 'Guatemala': 'gt',
};

async function phaseC() {
  const needed = new Set([
    ...leagues.map((l) => COUNTRY_FLAG_CODES[l.country]).filter(Boolean),
    ...Object.values(COUNTRY_FLAG_CODES),
  ]);
  const todo = [...needed].filter((code) => !validFlag(path.join(FLAG_DIR, `${code}.svg`)));
  console.log(`\n[Fase C] Banderas: ${todo.length} pendientes`);
  let ok = 0, fail = 0;
  for (const code of todo) {
    const buf = await fetchBuf(`https://media.api-sports.io/flags/${code}.svg`, 4, 100);
    if (buf && buf.toString('utf8', 0, 40).includes('<svg')) {
      fs.writeFileSync(path.join(FLAG_DIR, `${code}.svg`), buf);
      ok++;
    } else { fail++; console.log(`  ✗ bandera ${code}`); }
    await sleep(50);
  }
  console.log(`[Fase C] OK ${ok} · fallos ${fail}`);
  return fail;
}

// ── Ejecución ────────────────────────────────────────────────────────────────
const t0 = Date.now();
const fa = await phaseA();
const fb = await phaseB();
const fc = await phaseC();
const have = fs.readdirSync(BADGE_DIR).filter((f) => f.endsWith('.png')).length;
const flags = fs.readdirSync(FLAG_DIR).filter((f) => f.endsWith('.svg')).length;
console.log(`\n=== RESUMEN ===`);
console.log(`Escudos locales: ${have}/${teams.length} equipos · fallos A=${fa} B=${fb}`);
console.log(`Banderas locales: ${flags} SVG`);
console.log(`Tiempo: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
