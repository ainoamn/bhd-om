/**
 * إحصائيات سريعة من rental.db قبل الهجرة.
 * node tools/inspect-rental-db.js --db path/to/rental.db
 */
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

function parseArgs() {
  const args = process.argv.slice(2);
  let db = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db') db = args[++i];
  }
  return { db };
}

function readKv(db, key) {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

function main() {
  const { db: dbPath } = parseArgs();
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error('Usage: node tools/inspect-rental-db.js --db <rental.db>');
    process.exit(1);
  }

  const stat = fs.statSync(dbPath);
  const sqlite = new DatabaseSync(path.resolve(dbPath));

  const buildingsList = readKv(sqlite, 'bhd_buildings_list') || [];
  const profiles = readKv(sqlite, 'bhd_building_profiles') || {};
  const units = readKv(sqlite, 'bhd_managed_units') || [];
  const kvCount = sqlite.prepare("SELECT COUNT(*) AS c FROM kv_store WHERE key LIKE 'bhd_%'").get()?.c ?? 0;
  let fileCount = 0;
  try {
    fileCount = sqlite.prepare('SELECT COUNT(*) AS c FROM file_entries').get()?.c ?? 0;
  } catch {
    fileCount = 0;
  }

  console.log('\nBHD rental.db inspection');
  console.log('Path:', dbPath);
  console.log('Size:', `${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log('Buildings (list):', Array.isArray(buildingsList) ? buildingsList.length : 0);
  console.log('Building profiles:', Object.keys(profiles || {}).length);
  console.log('Managed units:', Array.isArray(units) ? units.length : 0);
  console.log('KV keys (bhd_*):', kvCount);
  console.log('file_entries:', fileCount);

  const dataDir = path.dirname(dbPath);
  const buildingsDir = path.join(dataDir, 'buildings');
  if (fs.existsSync(buildingsDir)) {
    let files = 0;
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else files += 1;
      }
    };
    walk(buildingsDir);
    console.log('buildings/ files on disk:', files);
    console.log('buildings/ dir:', buildingsDir);
  } else {
    console.log('buildings/ dir: not found next to db');
  }
  console.log('');
}

main();
