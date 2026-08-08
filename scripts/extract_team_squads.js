/**
 * ============================================================================
 * EXTRACTOR DE PLANTILLAS COMPLETAS POR EQUIPO (API-FOOTBALL v3) — Fase 2
 * ============================================================================
 * El endpoint /players (ligas) está limitado a ~60 jugadores/liga en el plan
 * free. En su lugar, /players/squads?team=X devuelve la plantilla REAL completa
 * (25-30 jugadores) en 1 request por equipo.
 *
 * Este script procesa los equipos ya mapeados de las ligas donde /players
 * devolvió datos (arg, esp, eng, ita) y reemplaza los datos parciales por la
 * plantilla completa. Resumible: equipos con >= 15 jugadores se saltan.
 *
 * Uso:
 *   node scripts/extract_team_squads.js [API_KEY_OPCIONAL]
 *
 * ⚠️  Rate-limit free: 10 requests/min → delay de 6s entre requests.
 *     ~65 equipos ≈ 7 minutos. Ejecutar con paciencia.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) process.env[parts[0].trim()] = parts[1].trim();
  });
}

const API_KEY = process.argv[2] || process.env.API_FOOTBALL_KEY || 'dd5adef4b4e457b125b038f86786fcdd';
const MAPPING_PATH = path.join(__dirname, '../assets/data/team_api_mapping.json');
const OUTPUT_PATH = path.join(__dirname, '../assets/data/real_players.json');

// Ligas donde /players devolvió datos (tenemos mapeo de equipos útil)
const TARGET_LEAGUES = new Set(['arg_1', 'esp_1', 'eng_1', 'ita_1']);

function fetchAPIData(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      headers: { 'x-apisports-key': API_KEY }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ response: [] }); }
      });
    }).on('error', () => resolve({ response: [] }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🚀 Extrayendo plantillas completas por equipo...');
  const leaguesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/data/leagues.json'), 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
  const result = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  const players = result.players || {};

  // Construir lista de equipos objetivo: mapeados y en ligas con datos
  const targets = [];
  leaguesData.forEach(l => {
    if (!TARGET_LEAGUES.has(l.id)) return;
    l.teams.forEach(t => {
      if (mapping[t.id]) targets.push({ gameId: t.id, apiId: mapping[t.id], leagueId: l.id });
    });
  });

  let done = 0, skipped = 0, failed = 0;
  console.log(`📋 ${targets.length} equipos objetivo.`);

  for (const t of targets) {
    const current = players[t.gameId] || [];
    if (current.length >= 15) { skipped++; continue; }

    const resp = await fetchAPIData(`/players/squads?team=${t.apiId}`);
    const squad = (resp.response && resp.response[0] && resp.response[0].players) || [];

    if (squad.length > 0) {
      // Conservar nacionalidad de la extracción previa (squads no trae nationality)
      const prevByNorm = {};
      current.forEach(p => prevByNorm[(p.name || '').toLowerCase()] = p.nationality || null);

      players[t.gameId] = squad.map(p => ({
        name: p.name,
        apiPos: p.position || 'Midfielder',
        age: p.age != null ? p.age : 24,
        nationality: prevByNorm[(p.name || '').toLowerCase()] || null,
        number: p.number != null ? p.number : null
      }));
      done++;
      console.log(`  ✅ ${t.gameId} (${t.apiId}) · ${squad.length} jugadores reales`);
    } else {
      failed++;
      console.log(`  ⚠️ ${t.gameId} (${t.apiId}) · sin respuesta`);
    }

    await sleep(6000); // rate-limit free: 10 req/min
  }

  result.players = players;
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result));
  const totalPlayers = Object.values(players).reduce((a, l) => a + l.length, 0);
  console.log(`\n🎉 FINALIZADO · ${done} plantillas completas (${skipped} ya completas, ${failed} sin datos) · ${totalPlayers} jugadores reales en ${Object.keys(players).length} equipos`);
}

run();
