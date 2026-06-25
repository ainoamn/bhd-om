/**
 * البحث عن rental.db على الجهاز (مسارات شائعة).
 * node tools/find-rental-db.js
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const hits = new Set();

function walk(dir, depth) {
  if (depth > 4 || !dir || !fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name === 'rental.db') hits.add(p);
    else if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      walk(p, depth + 1);
    }
  }
}

const seeds = [
  path.join(root, 'data'),
  path.join(home, 'BHD-Real-Estate'),
  path.join(home, 'OneDrive'),
  path.join(home, 'BHD International Dropbox'),
];

seeds.forEach((s) => walk(s, 0));

console.log('rental.db found:');
if (!hits.size) {
  console.log('  (none in common paths — pass --db manually to هجرة-السحابة.cmd)');
} else {
  [...hits].forEach((p) => console.log(' ', p));
}
