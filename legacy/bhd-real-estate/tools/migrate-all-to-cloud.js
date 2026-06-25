/**
 * هجرة كاملة: KV + ملفات في خطوة واحدة.
 * node tools/migrate-all-to-cloud.js --db rental.db --data-dir DATA [--dry-run]
 */
import './load-api-env.js';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const extra = args.join(' ');

function run(script) {
  const r = spawnSync('node', [path.join(__dirname, script), ...args], {
    stdio: 'inherit',
    cwd: root,
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log('=== Migrate KV ===');
run('migrate-kv-to-pg.js');

if (args.includes('--data-dir') || args.some((a, i) => args[i - 1] === '--data-dir')) {
  console.log('\n=== Migrate files ===');
  run('migrate-files-to-cloud.js');
} else {
  console.log('\nSkipped files (no --data-dir).');
}

console.log('\nAll migrations finished.');
