// Convierte a PNG real los escudos que Wikimedia sirvió como JPEG (cabecera
// FFD8) usando el Chromium de Playwright: canvas → toDataURL('image/png').
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'assets', 'badges');

const targets = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.png'))
  .filter((f) => {
    const b = fs.readFileSync(path.join(DIR, f));
    return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff; // JPEG SOI
  });

console.log('A convertir:', targets.join(', ') || 'ninguno');
if (!targets.length) process.exit(0);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
// Mismo origen que las imágenes (el server no envía cabeceras CORS)
await page.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'load' });
let ok = 0;
for (const f of targets) {
  // Las imágenes se sirven por HTTP (mismo origen, sin bloqueo file://)
  const src = `http://127.0.0.1:8123/assets/badges/${f}`;
  const data = await page.evaluate(async (url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png').split(',')[1];
  }, src);
  const buf = Buffer.from(data, 'base64');
  fs.writeFileSync(path.join(DIR, f), buf);
  ok++;
  console.log(`  ✓ ${f} → PNG ${buf.length}B`);
}
await browser.close();
console.log(`Convertidos: ${ok}/${targets.length}`);
