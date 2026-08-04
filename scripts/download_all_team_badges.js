/**
 * ============================================================================
 * EXTRACTOR & DESCARGADOR MASIVO DE LOGOS Y ESCUDOS DE EQUIPOS (API-FOOTBALL)
 * ============================================================================
 * Descarga escudos PNG oficiales desde API-Football para todos los equipos
 * presentes en assets/data/leagues.json y los guarda en ./assets/badges/
 * 
 * Uso:
 *   node scripts/download_all_team_badges.js [API_KEY_OPCIONAL]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cargar archivo .env local si existe
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
const BADGES_DIR = path.join(__dirname, '../assets/badges');
const LEAGUES_PATH = path.join(__dirname, '../assets/data/leagues.json');

if (!fs.existsSync(BADGES_DIR)) fs.mkdirSync(BADGES_DIR, { recursive: true });

// Mapeo de IDs de ligas del juego con IDs de API-Football (v3)
const LEAGUE_API_IDS = [
  { gameId: 'arg_1', apiId: 128, season: 2024 },
  { gameId: 'esp_1', apiId: 140, season: 2024 },
  { gameId: 'eng_1', apiId: 39, season: 2024 },
  { gameId: 'ita_1', apiId: 135, season: 2024 },
  { gameId: 'ger_1', apiId: 78, season: 2024 },
  { gameId: 'fra_1', apiId: 61, season: 2024 },
  { gameId: 'bra_1', apiId: 71, season: 2024 },
  { gameId: 'col_1', apiId: 239, season: 2024 },
  { gameId: 'chi_1', apiId: 265, season: 2024 },
  { gameId: 'per_1', apiId: 281, season: 2024 },
  { gameId: 'mex_1', apiId: 262, season: 2024 },
  { gameId: 'usa_1', apiId: 253, season: 2024 },
  { gameId: 'uru_1', apiId: 268, season: 2024 },
  { gameId: 'ecu_1', apiId: 242, season: 2024 },
  { gameId: 'par_1', apiId: 250, season: 2024 },
  { gameId: 'bol_1', apiId: 238, season: 2024 },
  { gameId: 'ven_1', apiId: 246, season: 2024 },
  { gameId: 'por_1', apiId: 94, season: 2024 },
  { gameId: 'ned_1', apiId: 88, season: 2024 },
  { gameId: 'sau_1', apiId: 307, season: 2024 },
  { gameId: 'eng_2', apiId: 40, season: 2024 },
  { gameId: 'esp_2', apiId: 141, season: 2024 },
  { gameId: 'ita_2', apiId: 136, season: 2024 },
  { gameId: 'ger_2', apiId: 79, season: 2024 },
  { gameId: 'fra_2', apiId: 62, season: 2024 },
  { gameId: 'tur_1', apiId: 203, season: 2024 },
  { gameId: 'jpn_1', apiId: 98, season: 2024 },
  { gameId: 'bel_1', apiId: 144, season: 2024 },
  { gameId: 'sco_1', apiId: 179, season: 2024 },
  { gameId: 'aut_1', apiId: 218, season: 2024 },
  { gameId: 'den_1', apiId: 119, season: 2024 },
  { gameId: 'cro_1', apiId: 210, season: 2024 }
];

function fetchAPIData(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      headers: {
        'x-apisports-key': API_KEY
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        return resolve(false);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      fs.unlink(destPath, () => {});
      resolve(false);
    });
  });
}

function normalizeName(str) {
  return (str || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function startBatchDownload() {
  console.log('🚀 Iniciando extracción masiva de logos desde API-Football...');

  const leaguesData = JSON.parse(fs.readFileSync(LEAGUES_PATH, 'utf8'));
  const allGameTeams = [];
  leaguesData.forEach(l => {
    l.teams.forEach(t => allGameTeams.push({ ...t, leagueId: l.id }));
  });

  console.log(`📋 Total de equipos registrados en el juego: ${allGameTeams.length}`);

  let successCount = 0;
  const teamApiMapping = {};

  for (const item of LEAGUE_API_IDS) {
    console.log(`\n🔍 Consultado Liga API ID ${item.apiId}...`);
    const apiTeams = await fetchAPIData(`/teams?league=${item.apiId}&season=${item.season}`);

    if (apiTeams && apiTeams.length > 0) {
      console.log(`  -> Obtenidos ${apiTeams.length} equipos de la API.`);

      const leagueGameTeams = allGameTeams.filter(t => t.leagueId === item.gameId);

      for (const gTeam of leagueGameTeams) {
        const normGameName = normalizeName(gTeam.name);
        
        // Coincidencia por nombre normalizado
        const match = apiTeams.find(at => {
          const normApiName = normalizeName(at.team.name);
          return normApiName.includes(normGameName) || normGameName.includes(normApiName);
        });

        if (match && match.team && match.team.logo) {
          const logoUrl = match.team.logo;
          const destPath = path.join(BADGES_DIR, `${gTeam.id}.png`);
          const ok = await downloadFile(logoUrl, destPath);
          if (ok) {
            successCount++;
            teamApiMapping[gTeam.id] = match.team.id;
            console.log(`  ✅ Escudo guardado: ${gTeam.name} -> ${gTeam.id}.png (API ID: ${match.team.id})`);
          }
        }
      }
    }
  }

  // Guardar mapeo de IDs para badgeHelper.js
  const mappingPath = path.join(__dirname, '../assets/data/team_api_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(teamApiMapping, null, 2));

  console.log(`\n🎉 DESCARGA COMPLETA: ${successCount} escudos descargados con éxito en assets/badges/`);
  console.log(`💾 Mapeo guardado en: ${mappingPath}`);
}

startBatchDownload();
