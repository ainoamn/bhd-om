/**
 * اختبار حمل — محاكاة مستخدمين متزامنين على API.
 *
 *   node tools/load-test-api.js --users 15 --duration 30
 *   node tools/load-test-api.js --api http://127.0.0.1:3790 --users 15
 */
import './load-api-env.js';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const base = (arg('--api', process.env.CLOUD_API_URL || 'http://127.0.0.1:3790')).replace(/\/$/, '');
const users = parseInt(arg('--users', '15'), 10);
const durationSec = parseInt(arg('--duration', '30'), 10);
const email = process.env.SEED_ADMIN_EMAIL || 'admin@bhd.local';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!data.accessToken) throw new Error('login failed');
  return data.accessToken;
}

const ENDPOINTS = [
  { path: '/units/summary', method: 'GET' },
  { path: '/buildings?limit=50', method: 'GET' },
  { path: '/contracts/summary', method: 'GET' },
  { path: '/companies/current', method: 'GET' },
];

async function worker(id, token, stats, stopAt) {
  const headers = { Authorization: `Bearer ${token}` };
  while (Date.now() < stopAt) {
    const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const t0 = performance.now();
    try {
      const r = await fetch(`${base}/api/v1${ep.path}`, { method: ep.method, headers });
      const ms = performance.now() - t0;
      stats.requests += 1;
      stats.totalMs += ms;
      if (r.ok) {
        stats.ok += 1;
        if (ms > stats.p95Candidate) stats.slow += 1;
        if (ms < stats.minMs) stats.minMs = ms;
        if (ms > stats.maxMs) stats.maxMs = ms;
        stats.latencies.push(ms);
      } else {
        stats.errors += 1;
        stats.lastError = `HTTP ${r.status} ${ep.path}`;
      }
    } catch (e) {
      stats.errors += 1;
      stats.lastError = e.message;
    }
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log(`Load test: ${users} users × ${durationSec}s → ${base}`);
  const token = await login();
  const stopAt = Date.now() + durationSec * 1000;
  const global = { requests: 0, ok: 0, errors: 0, totalMs: 0, minMs: Infinity, maxMs: 0, latencies: [], lastError: '' };

  const workers = Array.from({ length: users }, (_, i) =>
    worker(i + 1, token, global, stopAt)
  );
  await Promise.all(workers);

  const avg = global.requests ? (global.totalMs / global.requests).toFixed(1) : 0;
  const p95 = percentile(global.latencies, 95).toFixed(1);
  const rps = (global.requests / durationSec).toFixed(1);

  console.log('');
  console.log('Results:');
  console.log(`  Requests:  ${global.requests} (${rps}/s)`);
  console.log(`  OK:        ${global.ok}`);
  console.log(`  Errors:    ${global.errors}${global.lastError ? ` — last: ${global.lastError}` : ''}`);
  console.log(`  Latency:   avg ${avg}ms | p95 ${p95}ms | min ${global.minMs === Infinity ? 0 : global.minMs.toFixed(1)}ms | max ${global.maxMs.toFixed(1)}ms`);

  const pass = global.errors === 0 && global.ok > 0 && parseFloat(p95) < 2000;
  if (pass) {
    console.log('\nPASS — suitable for ~15 concurrent staff (p95 < 2s, zero errors).');
    process.exit(0);
  }
  console.log('\nFAIL — review errors or latency before go-live.');
  process.exit(1);
}

main().catch((e) => {
  console.error('Load test aborted:', e.message);
  process.exit(1);
});
