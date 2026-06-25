/**
 * فحص ما قبل الإطلاق — بدون Docker إن لزم.
 * node tools/preflight-path-a.js
 */
import './load-api-env.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [];
function ok(msg) {
  checks.push({ ok: true, msg });
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  checks.push({ ok: null, msg });
  console.log(`  ⚠ ${msg}`);
}
function fail(msg) {
  checks.push({ ok: false, msg });
  console.log(`  ✗ ${msg}`);
}

function has(cmd) {
  const r = spawnSync(cmd, ['--version'], { shell: true, encoding: 'utf8' });
  return r.status === 0;
}

function findRentalDbs() {
  const hits = [];
  const scan = [
    path.join(root, 'data', 'rental.db'),
    path.join(process.env.USERPROFILE || '', 'BHD International Dropbox', 'BHD International team folder', 'BHD', 'rental.db'),
    path.join(process.env.USERPROFILE || '', 'BHD-Real-Estate', 'rental.db'),
    path.join(process.env.USERPROFILE || '', 'OneDrive', 'BHD-Real-Estate', 'rental.db'),
  ];
  for (const p of scan) {
    if (p && fs.existsSync(p)) hits.push(p);
  }
  return hits;
}

async function probeUrl(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\nBHD Path A — Preflight\n');

  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1), 10);
  if (major >= 22) ok(`Node.js ${nodeVer}`);
  else fail(`Node.js ${nodeVer} — يُفضّل 22+`);

  if (has('docker')) {
    const d = spawnSync('docker', ['info'], { shell: true, encoding: 'utf8' });
    if (d.status === 0) ok('Docker daemon يعمل');
    else warn('Docker مثبت لكن Daemon غير شغّال — شغّل Docker Desktop');
  } else warn('Docker غير مثبت — مطلوب للسحابة المحلية');

  const apiEnv = path.join(root, 'apps', 'api', '.env');
  if (fs.existsSync(apiEnv)) ok('apps/api/.env موجود');
  else warn('apps/api/.env مفقود — copy .env.example');

  const serverEnv = path.join(root, 'server', '.env');
  if (fs.existsSync(serverEnv)) {
    const t = fs.readFileSync(serverEnv, 'utf8');
    if (/^CLOUD_API_URL=/m.test(t)) ok('server/.env فيه CLOUD_API_URL');
    else warn('أضف CLOUD_API_URL — أو شغّل: node tools/ensure-server-cloud-env.js');
  } else warn('server/.env مفقود — تشغيل-الخادم.cmd ينشئه');

  const dbs = findRentalDbs();
  if (dbs.length) ok(`rental.db: ${dbs[0]}`);
  else warn('لم يُعثر على rental.db — حدّد --db عند الهجرة');

  if (await probeUrl('http://127.0.0.1:3790/api/v1/health')) ok('Cloud API :3790 يستجيب');
  else warn('Cloud API غير متاح — شغّل تشغيل-السحابة.cmd');

  if (await probeUrl('http://127.0.0.1:3789/api/health')) ok('Web server :3789 يستجيب');
  else warn('الخادم غير متاح — شغّل تشغيل-الخادم.cmd');

  const failed = checks.filter((c) => c.ok === false);
  console.log('\n── الخطوة التالية ──');
  if (failed.length) {
    console.log('1) شغّل Docker Desktop');
    console.log('2) إعداد-مسار-A.cmd');
    console.log('3) تشغيل-الخادم.cmd');
  } else {
    console.log('إعداد-مسار-A.cmd ثم npm run verify:full من apps/api');
  }
  console.log('');
  process.exit(failed.length ? 1 : 0);
}

main();
