/**
 * استعادة PostgreSQL من ملف pg_dump.
 *
 *   node tools/restore-postgres.js --file backups/bhd-cloud-2025.sql
 *   node tools/restore-postgres.js --file backup.sql --yes
 */
import './load-api-env.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import readline from 'readline';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { file: '', yes: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') out.file = path.resolve(args[++i]);
    else if (args[i] === '--yes') out.yes = true;
  }
  return out;
}

function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

async function confirm(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${msg} (yes/no): `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const { file, yes } = parseArgs();
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node tools/restore-postgres.js --file <backup.sql> [--yes]');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  if (!yes) {
    const ok = await confirm(`This will OVERWRITE database. Restore from ${file}?`);
    if (!ok) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  const cfg = parseDatabaseUrl(dbUrl);
  const env = { ...process.env, PGPASSWORD: cfg.password };

  const result = spawnSync(
    'psql',
    ['-h', cfg.host, '-p', cfg.port, '-U', cfg.user, '-d', cfg.database, '-f', file],
    { env, stdio: 'inherit', shell: process.platform === 'win32' }
  );

  if (result.status !== 0) {
    console.error('Restore failed. With Docker:');
    console.error('  docker exec -i <postgres-container> psql -U bhd bhd_cloud < backup.sql');
    process.exit(1);
  }

  console.log('Restore OK.');
}

main();
