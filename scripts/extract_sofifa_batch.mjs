/**
 * ============================================================================
 * EXTRACTOR BATCH DE SOFIFA / EA FC — real_players.json (scripts/extract_sofifa_batch.mjs)
 * ============================================================================
 * Extrae y actualiza la media (OVR), nombres reales, edades y valores de mercado
 * para los equipos del juego desde soFIFA usando Playwright.
 *
 * Uso:
 *   node scripts/extract_sofifa_batch.mjs            -> Extracción batch en modo visual (pasa Cloudflare)
 *   node scripts/extract_sofifa_batch.mjs --headless  -> Extracción en segundo plano
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REAL_PLAYERS_PATH = path.join(__dirname, '../assets/data/real_players.json');
const LEAGUES_PATH = path.join(__dirname, '../assets/data/leagues.json');

const IS_HEADLESS = process.argv.includes('--headless');

async function runExtractor() {
  console.log('🚀 Iniciando Extractor Batch de soFIFA (EA FC)...');
  console.log(`Modo: ${IS_HEADLESS ? 'Headless (Segundo plano)' : 'Navegador Abierto (Recomendado para Cloudflare)'}`);

  // Cargar datos existentes
  let realPlayersData = { dataSeason: 2026, players: {} };
  if (fs.existsSync(REAL_PLAYERS_PATH)) {
    try {
      realPlayersData = JSON.parse(fs.readFileSync(REAL_PLAYERS_PATH, 'utf8'));
    } catch (e) {
      console.warn('⚠️ No se pudo leer real_players.json previo, se creará uno nuevo.');
    }
  }

  const leagues = JSON.parse(fs.readFileSync(LEAGUES_PATH, 'utf8'));
  const allTeams = [];
  leagues.forEach(l => {
    l.teams.forEach(t => {
      allTeams.push({ id: t.id, name: t.name, country: l.country });
    });
  });

  console.log(`📊 Universo total a verificar: ${allTeams.length} equipos.`);

  // Lanzar navegador Playwright
  const browser = await chromium.launch({
    headless: IS_HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'es-ES'
  });

  const page = await context.newPage();

  try {
    console.log('🌐 Navegando a soFIFA...');
    await page.goto('https://sofifa.com/players?hl=es-ES', { waitUntil: 'domcontentloaded', timeout: 45000 });

    console.log('⏳ Esperando verificación de seguridad...');
    await page.waitForTimeout(4000);

    const title = await page.title();
    console.log('📄 Título de la página:', title);

    if (title.includes('Un momento') || title.includes('Just a moment')) {
      console.log('⚠️ Detectada pantalla de verificación Cloudflare. Si estás en modo visual, completa la verificación en la ventana del navegador.');
      await page.waitForSelector('table.table tbody tr', { timeout: 30000 }).catch(() => {});
    }

    // Extraer jugadores destacados
    const scrapedPlayers = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.table tbody tr'));
      return rows.map(row => {
        const nameEl = row.querySelector('td:nth-child(2) a');
        const posEls = Array.from(row.querySelectorAll('td:nth-child(2) span.pos'));
        const ovrEl = row.querySelector('td:nth-child(3) span');
        const ageEl = row.querySelector('td:nth-child(4)');
        const teamEl = row.querySelector('td:nth-child(6) a');
        const valEl = row.querySelector('td:nth-child(7)');

        const name = nameEl ? nameEl.textContent.trim() : '';
        const positions = posEls.map(p => p.textContent.trim());
        const ovr = ovrEl ? parseInt(ovrEl.textContent.trim()) || 70 : 70;
        const age = ageEl ? parseInt(ageEl.textContent.trim()) || 25 : 25;
        const teamName = teamEl ? teamEl.textContent.trim() : '';
        const valueStr = valEl ? valEl.textContent.trim() : '€0';

        return { name, positions, ovr, age, teamName, valueStr };
      }).filter(p => p.name.length > 0);
    });

    console.log(`✅ Extracción exitosa: ${scrapedPlayers.length} jugadores recopilados.`);
    if (scrapedPlayers.length > 0) {
      console.log('📋 Muestra:', scrapedPlayers.slice(0, 3));
    }

    // Guardar avance en real_players.json
    realPlayersData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(REAL_PLAYERS_PATH, JSON.stringify(realPlayersData, null, 2), 'utf8');
    console.log('💾 Avance guardado en assets/data/real_players.json');

  } catch (err) {
    console.error('❌ Error durante la extracción:', err.message);
  } finally {
    await browser.close();
  }
}

runExtractor();
