/**
 * يختار أكبر rental.db من المسارات الشائعة (للهجرة).
 * node tools/pick-best-rental-db.js
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const hits = [];

function add(p) {
  if (!p || !fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  hits.push({ path: p, bytes: stat.size, mtime: stat.mtimeMs });
}

function walkForRental(dir, depth = 0) {
  if (depth > 5 || !dir || !fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && (e.name === 'rental.db' || /^rental_\d{4}-\d{2}-\d{2}/.test(e.name))) {
      add(p);
    } else if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      walkForRental(p, depth + 1);
    }
  }
}

const seeds = [
  path.join(root, 'data'),
  path.join(home, 'BHD International Dropbox'),
  path.join(home, 'Dropbox'),
  path.join(home, 'OneDrive'),
];

try {
  const cfgPath = path.join(root, 'bhd-app-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg.dataDir) add(path.join(cfg.dataDir, 'rental.db'));
  }
} catch {
  /* ignore */
}

seeds.forEach((s) => walkForRental(s));

if (!hits.length) {
  console.log('No rental.db found.');
  process.exit(1);
}

hits.sort((a, b) => b.bytes - a.bytes);
const best = hits[0];
const mb = (best.bytes / 1024 / 1024).toFixed(2);

console.log('Recommended for migration:');
console.log(' ', best.path);
console.log(`  ${mb} MB — modified ${new Date(best.mtime).toISOString().slice(0, 19)}`);
console.log('');
console.log('All candidates:');
hits.slice(0, 10).forEach((h, i) => {
  console.log(`  ${i + 1}. ${(h.bytes / 1024 / 1024).toFixed(2)} MB  ${h.path}`);
});

console.log('');
console.log('Migrate:');
console.log(`  هجرة-السحابة.cmd --db "${best.path}"`);
