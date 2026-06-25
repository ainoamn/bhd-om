/**
 * فحص جاهزية السحابة قبل الإطلاق.
 * الاستخدام: node tools/verify-cloud-stack.js [--api http://127.0.0.1:3790]
 */
import './load-api-env.js';

const args = process.argv.slice(2);
const apiBase =
  args.find((a, i) => args[i - 1] === '--api') ||
  process.env.CLOUD_API_URL ||
  'http://127.0.0.1:3790';
const base = apiBase.replace(/\/$/, '');
const email = process.env.SEED_ADMIN_EMAIL || 'admin@bhd.local';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, opts = {}) {
  const r = await fetch(`${base}/api/v1${path}`, opts);
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: r.ok, status: r.status, json };
}

async function main() {
  console.log('\nBHD Cloud Stack Verification');
  console.log('API:', base);

  try {
    const health = await fetchJson('/health');
    if (health.ok && health.json?.ok !== false) pass('Health endpoint', health.json?.status || 'ok');
    else fail('Health endpoint', `HTTP ${health.status}`);
  } catch (e) {
    fail('Health endpoint', e.message);
    printSummary();
    process.exit(1);
  }

  let token = null;
  try {
    const login = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (login.json?.accessToken) {
      token = login.json.accessToken;
      pass('Auth login', email);
    } else if (login.json?.needsCompanySelection) {
      fail('Auth login', 'needs company selection — run db:seed');
    } else {
      fail('Auth login', `HTTP ${login.status}`);
    }
  } catch (e) {
    fail('Auth login', e.message);
  }

  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    const endpoints = [
      ['/buildings?limit=1', 'Buildings'],
      ['/units/summary', 'Units summary'],
      ['/contracts/summary', 'Contracts summary'],
      ['/companies/current', 'Company context'],
      ['/saas/plans', 'SaaS plans'],
    ];
    for (const [path, label] of endpoints) {
      try {
        const r = await fetchJson(path, { headers });
        if (r.ok) pass(label, path);
        else fail(label, `HTTP ${r.status}`);
      } catch (e) {
        fail(label, e.message);
      }
    }
  }

  printSummary();
}

function printSummary() {
  const failed = checks.filter((c) => !c.ok);
  console.log('');
  if (!failed.length) {
    console.log('All checks passed. Stack is ready for migration and user testing.');
    process.exit(0);
  }
  console.log(`${failed.length} check(s) failed. Fix before go-live.`);
  process.exit(1);
}

main();
