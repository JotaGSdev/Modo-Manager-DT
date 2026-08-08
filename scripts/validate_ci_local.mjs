#!/usr/bin/env node
/**
 * 🧪 Valida la baseline CI desde un clon limpio (scripts/validate_ci_local.mjs)
 * ============================================================================
 * Reproduce en local lo que hará GitHub Actions, sin subir nada:
 *   1. git clone del HEAD actual a un directorio temporal (checkout limpio,
 *      idéntico a lo que recibe CI — no incluye cambios sin commitear).
 *   2. npm ci  (dependencias exactas del package-lock).
 *   3. npm run build  (TypeScript).
 *   4. npm run test:e2e       (estándar + golden files + viewports 360/1280).
 *   5. npm run test:e2e:full  (universo completo con umbrales de rendimiento).
 *
 * El directorio temporal se elimina al terminar. Opciones:
 *   --keep  conserva el clon (para inspeccionar test-results/).
 *
 * Uso:  npm run validate:ci
 * Código de salida: 0 = el pipeline pasaría en CI, 1 = algo falló.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KEEP = process.argv.includes('--keep');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const results = [];
function run(label, cmd, args, opts = {}) {
  process.stdout.write(`\n━━━ ${label} ━━━\n$ ${cmd} ${args.join(' ')}\n`);
  const t0 = Date.now();
  // En Windows, npm es un shim .cmd que exige shell:true para spawnSync
  // (git NO: sus argumentos contienen rutas con espacios y cmd.exe las rompería).
  const shell = process.platform === 'win32' && cmd === npmCmd;
  const r = spawnSync(cmd, args, { cwd: opts.cwd || ROOT, stdio: 'inherit', timeout: opts.timeout || 0, shell });
  const ok = r.status === 0;
  results.push({ label, ok, ms: Date.now() - t0 });
  return ok;
}

// Advertencia: el clon valida HEAD, no el árbol de trabajo
const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim();
if (dirty) {
  console.warn(`⚠️  Hay ${dirty.split('\n').length} línea(s) de cambios sin commitear. El clon valida SOLO el estado commiteado (HEAD); los cambios locales NO se incluyen en la validación.`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'el_ci_'));
const cloneDir = path.join(tmp, 'checkout');
try {
  run('CLONAR repo (HEAD)', 'git', ['clone', '--no-hardlinks', ROOT, cloneDir]) &&
  run('Instalar dependencias (npm ci)', npmCmd, ['ci', '--no-audit', '--no-fund'], { cwd: cloneDir, timeout: 600000 }) &&
  run('Build TypeScript', npmCmd, ['run', 'build'], { cwd: cloneDir, timeout: 300000 }) &&
  run('E2E estándar (vistas + goldens + viewports)', npmCmd, ['run', 'test:e2e'], { cwd: cloneDir, timeout: 600000 }) &&
  run('E2E universo completo (--full)', npmCmd, ['run', 'test:e2e:full'], { cwd: cloneDir, timeout: 900000 });
} finally {
  if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true });
}

const allOk = results.length === 5 && results.every(r => r.ok);
console.log('\n━━━ RESUMEN CI LOCAL ━━━');
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.label}${r.ok ? '' : ' FALLÓ'} (${(r.ms / 1000).toFixed(1)}s)`);
}
if (results.length < 5) console.log(`  ⛔ Pasos restantes no ejecutados (fallo en cadena).`);
if (KEEP) console.log(`  📁 Clon conservado en: ${cloneDir}`);
console.log(allOk
  ? '\n✅ CI LOCAL: TODO OPERATIVO — el pipeline pasaría en GitHub Actions.'
  : '\n❌ CI LOCAL: REGRESIONES — revisa los pasos fallidos (o regenera la baseline con npm run test:e2e:golden si el layout cambió a propósito).');
process.exit(allOk ? 0 : 1);
