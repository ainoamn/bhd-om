/**
 * نسخ احتياطي PostgreSQL — يتطلب pg_dump في PATH.
 * node tools/backup-postgres.js [--out backups/bhd-cloud.sql]
 */
import './load-api-env.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = {
    out: path.join(root, 'backups', `bhd-cloud-${stamp}.sql`),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out.out = path.resolve(args[++i]);
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

function tryDockerDump(out) {
  const containers = ['deploy-postgres-1', 'bhd-postgres-1'];
  for (const name of containers) {
    const check = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', name], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (check.stdout?.trim() !== 'true') continue;
    const result = spawnSync(
      'docker',
      ['exec', name, 'pg_dump', '-U', 'bhd', '-d', 'bhd_cloud', '-F', 'p'],
      { encoding: 'buffer', shell: process.platform === 'win32', maxBuffer: 512 * 1024 * 1024 }
    );
    if (result.status === 0 && result.stdout?.length) {
      fs.writeFileSync(out, result.stdout);
      return true;
    }
  }
  return false;
}

function main() {
  const { out } = parseArgs();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is required (set in apps/api/.env)');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const cfg = parseDatabaseUrl(dbUrl);
  const env = { ...process.env, PGPASSWORD: cfg.password };

  let result = spawnSync(
    'pg_dump',
    ['-h', cfg.host, '-p', cfg.port, '-U', cfg.user, '-d', cfg.database, '-F', 'p', '-f', out],
    { env, stdio: 'pipe', shell: process.platform === 'win32' }
  );

  if (result.status !== 0) {
    console.log('pg_dump not available locally — trying Docker...');
    if (tryDockerDump(out)) {
      const stat = fs.statSync(out);
      console.log('Backup OK (via Docker):', out, `(${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }
    console.error('Backup failed. Install pg_dump or start Docker postgres.');
    process.exit(1);
  }

  const stat = fs.statSync(out);
  console.log('Backup OK:', out, `(${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main();
