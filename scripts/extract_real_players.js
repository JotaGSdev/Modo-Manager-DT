/**
 * ============================================================================
 * EXTRACTOR DE PLANTILLAS REALES (API-FOOTBALL v3) — real_players.json
 * ============================================================================
 * Descarga las plantillas reales de todos los equipos de las ligas del juego
 * (nombre, edad, posición genérica, nacionalidad y dorsal) y las guarda en
 * assets/data/real_players.json, indexadas por el ID de equipo del juego.
 *
 * También EXTENDE assets/data/team_api_mapping.json: completa el mapeo
 * gameTeamId -> apiTeamId con los equipos que no tenían mapeo previo.
 *
 * Uso:
 *   node scripts/extract_real_players.js [API_KEY_OPCIONAL]       → 16 ligas prioritarias
 *   node scripts/extract_real_players.js [API_KEY_OPCIONAL] --all → las 32 ligas mapeadas
 *
 * El plan FREE de API-Football permite ~100 requests/día (10/min), por lo que
 * el script es RESUMIBLE: las ligas ya extraídas en real_players.json se saltan.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar archivo .env local si existe (misma lógica que download_all_team_badges.js)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      process.env[parts[0].trim()] = parts[1].trim();
    }
  });
}

const API_KEY = process.argv[2] || process.env.API_FOOTBALL_KEY || 'dd5adef4b4e457b125b038f86786fcdd';
const SEASON = 2024; // Plan free: solo 2022-2024
const IS_ALL = process.argv.includes('--all');

const LEAGUES_PATH = path.join(__dirname, '../assets/data/leagues.json');
const MAPPING_PATH = path.join(__dirname, '../assets/data/team_api_mapping.json');
const OUTPUT_PATH = path.join(__dirname, '../assets/data/real_players.json');

if (!API_KEY) {
  console.error('❌ No se encontró clave de API. Usa: node scripts/extract_real_players.js SU_API_KEY');
  process.exit(1);
}

// Mapeo de IDs de ligas del juego con IDs de API-Football (v3) — season 2024
const LEAGUE_API_IDS = [
  // ── Prioridad 1: ligas ya mapeadas (top tiers + liga del usuario) ──────────
  { gameId: 'arg_1', apiId: 128 }, { gameId: 'esp_1', apiId: 140 }, { gameId: 'eng_1', apiId: 39 },
  { gameId: 'ita_1', apiId: 135 }, { gameId: 'ger_1', apiId: 78 },  { gameId: 'fra_1', apiId: 61 },
  { gameId: 'bra_1', apiId: 71 },  { gameId: 'col_1', apiId: 239 }, { gameId: 'chi_1', apiId: 265 },
  { gameId: 'per_1', apiId: 281 }, { gameId: 'mex_1', apiId: 262 }, { gameId: 'usa_1', apiId: 253 },
  { gameId: 'uru_1', apiId: 268 }, { gameId: 'ecu_1', apiId: 242 }, { gameId: 'por_1', apiId: 94 },
  { gameId: 'ned_1', apiId: 88 },  { gameId: 'sau_1', apiId: 307 },
  // ── Prioridad 2: divisiones de ascenso y ligas secundarias ─────────────────
  { gameId: 'par_1', apiId: 250 }, { gameId: 'bol_1', apiId: 238 }, { gameId: 'ven_1', apiId: 246 },
  { gameId: 'eng_2', apiId: 40 },  { gameId: 'esp_2', apiId: 141 }, { gameId: 'ita_2', apiId: 136 },
  { gameId: 'ger_2', apiId: 79 },  { gameId: 'fra_2', apiId: 62 },  { gameId: 'tur_1', apiId: 203 },
  { gameId: 'jpn_1', apiId: 98 },  { gameId: 'bel_1', apiId: 144 }, { gameId: 'sco_1', apiId: 179 },
  { gameId: 'aut_1', apiId: 218 }, { gameId: 'den_1', apiId: 119 }, { gameId: 'cro_1', apiId: 210 }
];

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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ response: [], paging: { total: 0 } });
        }
      });
    }).on('error', () => resolve({ response: [], paging: { total: 0 } }));
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalizeName(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log(`🚀 Extrayendo plantillas reales (season ${SEASON})...`);
  const leaguesData = JSON.parse(fs.readFileSync(LEAGUES_PATH, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));

  // Cargar resultado previo (resumible)
  let result = { dataSeason: SEASON, players: {} };
  if (fs.existsSync(OUTPUT_PATH)) {
    const prev = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    if (prev && prev.players) result.players = prev.players;
  }

  const targetLeagues = IS_ALL ? LEAGUE_API_IDS : LEAGUE_API_IDS.slice(0, 17);
  let requests = 0;

  for (const lg of targetLeagues) {
    const gameLeague = leaguesData.find(l => l.id === lg.gameId);
    if (!gameLeague) { console.log(`⚠️ Liga ${lg.gameId} no existe en leagues.json`); continue; }

    // ¿Liga ya cubierta? (todos los equipos tienen datos reales)
    const teamsWithData = gameLeague.teams.filter(t => result.players[t.id] && result.players[t.id].length >= 11).length;
    if (teamsWithData >= gameLeague.teams.length) {
      console.log(`⏭️  ${lg.gameId} ya extraída (${teamsWithData}/${gameLeague.teams.length} equipos).`);
      continue;
    }

    console.log(`\n📦 ${lg.gameId} · ${gameLeague.name} (API ${lg.apiId})...`);

    // ── Paso 1: extender el mapeo con /teams ────────────────────────────────
    const teamsResp = await fetchAPIData(`/teams?league=${lg.apiId}&season=${SEASON}`);
    requests++;
    const apiTeams = teamsResp.response || [];
    if (apiTeams.length === 0) {
      console.log(`   ⚠️ Sin equipos para la liga (¿plan premium?). Se omite.`);
      continue;
    }

    const byNormName = {};
    gameLeague.teams.forEach(t => { byNormName[normalizeName(t.name)] = t.id; });

    apiTeams.forEach(item => {
      const at = item.team;
      const gameId = byNormName[normalizeName(at.name)];
      if (gameId && !mapping[gameId]) mapping[gameId] = at.id;
    });
    console.log(`   → ${apiTeams.length} equipos API · mapeo ahora ${gameLeague.teams.filter(t => mapping[t.id]).length}/${gameLeague.teams.length}`);

    // ── Paso 2: paginar jugadores de la liga ────────────────────────────────
    const playersByApiTeam = {};
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const resp = await fetchAPIData(`/players?league=${lg.apiId}&season=${SEASON}&page=${page}`);
      requests++;
      const list = resp.response || [];
      if (resp.paging && resp.paging.total) totalPages = resp.paging.total;

      list.forEach(p => {
        if (!p.player || !p.player.name || !Array.isArray(p.statistics) || p.statistics.length === 0) return;
        const last = p.statistics[p.statistics.length - 1];
        const apiTeam = last && last.team ? last.team.id : null;
        if (!apiTeam) return;
        const number = (last.games && last.games.number != null) ? last.games.number : null;
        (playersByApiTeam[apiTeam] = playersByApiTeam[apiTeam] || []).push({
          name: p.player.name,
          apiPos: p.player.position || 'Midfielder',
          age: p.player.age != null ? p.player.age : 25,
          nationality: p.player.nationality || null,
          number
        });
      });
      console.log(`   → página ${page}/${totalPages} (${list.length} jugadores)`);
      page++;
      if (page <= totalPages) await sleep(1400); // rate-limit free (10/min)
    }

    // ── Paso 3: volcar por equipo del juego (dedupe por nombre) ──────────────
    let covered = 0;
    gameLeague.teams.forEach(t => {
      const apiId = mapping[t.id];
      if (!apiId) return;
      const list = playersByApiTeam[apiId];
      if (!list || list.length === 0) return;
      const seen = new Set();
      const clean = list.filter(p => {
        const key = normalizeName(p.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      result.players[t.id] = clean;
      covered++;
    });
    console.log(`   ✅ ${covered}/${gameLeague.teams.length} equipos con plantilla real.`);

    await sleep(1400); // pausa entre ligas
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result));
  const totalPlayers = Object.values(result.players).reduce((a, list) => a + list.length, 0);
  console.log(`\n🎉 FINALIZADO · ${Object.keys(result.players).length} equipos · ${totalPlayers} jugadores reales · ${requests} requests`);
  console.log(`💾 assets/data/real_players.json y team_api_mapping.json actualizados.`);
}

run();
