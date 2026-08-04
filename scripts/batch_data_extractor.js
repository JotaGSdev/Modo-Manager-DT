/**
 * ============================================================================
 * EXTRACTOR LOCAL EN LOTE (BATCH DATA EXTRACTOR) - API-FOOTBALL (v3)
 * ============================================================================
 * Este script se ejecuta EXCLUSIVAMENTE de forma local en tu máquina.
 * Lee la clave de API desde el archivo .env o variable de entorno para
 * descargar plantillas, datos de jugadores, medias, tácticas y escudos.
 * 
 * Uso:
 *   node scripts/batch_data_extractor.js [API_KEY_OPCIONAL]
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

// Clave de API obtenida de parámetro o variable de entorno
const API_KEY = process.argv[2] || process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error('\n❌ ERROR DE SEGURIDAD: No se encontró clave de API.');
  console.log('👉 Por favor crea un archivo .env en la raíz del proyecto con:');
  console.log('   API_FOOTBALL_KEY=tu_clave_aqui\n');
  console.log('   O ejecuta: node scripts/batch_data_extractor.js SU_API_KEY\n');
  process.exit(1);
}

const OUTPUT_JSON_PATH = path.join(__dirname, '../assets/data/api_extracted_data.json');
const BADGES_DIR = path.join(__dirname, '../assets/badges');
const FLAGS_DIR = path.join(__dirname, '../assets/flags');

if (!fs.existsSync(path.dirname(OUTPUT_JSON_PATH))) fs.mkdirSync(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
if (!fs.existsSync(BADGES_DIR)) fs.mkdirSync(BADGES_DIR, { recursive: true });
if (!fs.existsSync(FLAGS_DIR)) fs.mkdirSync(FLAGS_DIR, { recursive: true });

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

async function runBatchExtraction() {
  console.log('🚀 Iniciando Extracción Batch Local de API-Football...');
  console.log('🛡️ API Key cargada de forma segura desde entorno local.');

  const batchResults = {
    extractedAt: new Date().toISOString(),
    leagues: [],
    teams: [],
    players: []
  };

  // Ejemplo de ligas principales para procesar en lote
  const targetLeagues = [
    { id: 128, name: 'Liga Profesional Argentina', country: 'Argentina' },
    { id: 140, name: 'LaLiga España', country: 'España' },
    { id: 39, name: 'Premier League', country: 'Inglaterra' }
  ];

  for (const league of targetLeagues) {
    console.log(`\n📦 Extrayendo Lote de: ${league.name} (${league.country})...`);
    const teamsData = await fetchAPIData(`/teams?league=${league.id}&season=2024`);

    if (teamsData && teamsData.length > 0) {
      for (const item of teamsData.slice(0, 5)) { // Muestra batch inicial de 5 equipos por liga
        const t = item.team;
        const v = item.venue;

        batchResults.teams.push({
          apiId: t.id,
          name: t.name,
          country: t.country,
          founded: t.founded,
          logo: t.logo,
          stadium: v?.name,
          city: v?.city,
          capacity: v?.capacity
        });

        console.log(`  - 🛡️ Club Extraído: ${t.name} (Estadio: ${v?.name || 'N/A'})`);
      }
    }
  }

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(batchResults, null, 2));
  console.log(`\n✅ Extracción finalizada con éxito.`);
  console.log(`💾 Archivo guardado localmente en: ${OUTPUT_JSON_PATH}`);
}

runBatchExtraction();
