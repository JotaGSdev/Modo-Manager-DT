/**
 * ============================================================================
 * SCRIPT DE DESCARGA AUTOMÁTICA DE BANDERAS Y ESCUDOS DE API-FOOTBALL (API-SPORTS)
 * ============================================================================
 * Descarga escudos PNG de clubes y banderas SVG de TODOS los países a:
 * - ./assets/badges/
 * - ./assets/flags/
 * 
 * Uso: node scripts/download_assets.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BADGES_DIR = path.join(__dirname, '../assets/badges');
const FLAGS_DIR = path.join(__dirname, '../assets/flags');

if (!fs.existsSync(BADGES_DIR)) fs.mkdirSync(BADGES_DIR, { recursive: true });
if (!fs.existsSync(FLAGS_DIR)) fs.mkdirSync(FLAGS_DIR, { recursive: true });

const TEAMS_TO_DOWNLOAD = [
  { id: 'real_madrid', apiId: 541, name: 'Real Madrid' },
  { id: 'barcelona', apiId: 529, name: 'FC Barcelona' },
  { id: 'atletico', apiId: 530, name: 'Atlético de Madrid' },
  { id: 'boca', apiId: 1064, name: 'Boca Juniors' },
  { id: 'river', apiId: 1065, name: 'River Plate' },
  { id: 'man_city', apiId: 50, name: 'Manchester City' },
  { id: 'man_utd', apiId: 33, name: 'Manchester United' },
  { id: 'liverpool', apiId: 40, name: 'Liverpool' },
  { id: 'arsenal', apiId: 42, name: 'Arsenal' },
  { id: 'chelsea', apiId: 49, name: 'Chelsea' },
  { id: 'juventus', apiId: 496, name: 'Juventus' },
  { id: 'inter', apiId: 505, name: 'Inter de Milán' },
  { id: 'milan', apiId: 489, name: 'AC Milan' },
  { id: 'psg', apiId: 85, name: 'Paris Saint-Germain' },
  { id: 'bayern', apiId: 157, name: 'Bayern Múnich' },
  { id: 'dortmund', apiId: 165, name: 'Borussia Dortmund' },
  { id: 'flamengo', apiId: 127, name: 'Flamengo' },
  { id: 'palmeiras', apiId: 121, name: 'Palmeiras' },
  { id: 'colo_colo', apiId: 1137, name: 'Colo-Colo' },
  { id: 'america_mx', apiId: 2287, name: 'Club América' }
];

const COUNTRY_FLAGS_MAP = {
  'Argentina': 'ar', 'Brasil': 'br', 'Colombia': 'co', 'Chile': 'cl', 'Uruguay': 'uy',
  'Perú': 'pe', 'Ecuador': 'ec', 'Paraguay': 'py', 'Bolivia': 'bo', 'Venezuela': 've',
  'España': 'es', 'Inglaterra': 'gb', 'Italia': 'it', 'Alemania': 'de', 'Francia': 'fr',
  'Portugal': 'pt', 'Países Bajos': 'nl', 'Bélgica': 'be', 'Escocia': 'gb-sct', 'Turquía': 'tr',
  'Grecia': 'gr', 'Suiza': 'ch', 'Austria': 'at', 'Dinamarca': 'dk', 'Noruega': 'no',
  'Suecia': 'se', 'Polonia': 'pl', 'República Checa': 'cz', 'Croacia': 'hr', 'México': 'mx',
  'Estados Unidos': 'us', 'Arabia Saudita': 'sa', 'Japón': 'jp', 'Emiratos Árabes': 'ae',
  'Australia': 'au', 'Marruecos': 'ma', 'Egipto': 'eg'
};

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

async function startDownload() {
  console.log('⬇️ Iniciando descarga completa de escudos y banderas de API-Football...');

  // Descargar Escudos de Equipos
  for (const team of TEAMS_TO_DOWNLOAD) {
    const url = `https://media.api-sports.io/football/teams/${team.apiId}.png`;
    const dest = path.join(BADGES_DIR, `${team.id}.png`);
    const ok = await downloadFile(url, dest);
    console.log(`[Escudo] ${team.name} -> ${ok ? '✅ Descargado' : '❌ Error'}`);
  }

  // Descargar Banderas de Países
  for (const [countryName, code] of Object.entries(COUNTRY_FLAGS_MAP)) {
    const url = `https://media.api-sports.io/flags/${code}.svg`;
    const dest = path.join(FLAGS_DIR, `${code}.svg`);
    const ok = await downloadFile(url, dest);
    console.log(`[Bandera] ${countryName} (${code}) -> ${ok ? '✅ Descargada' : '❌ Error'}`);
  }

  console.log('🎉 Descarga de assets completada.');
}

startDownload();
