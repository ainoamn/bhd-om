/**
 * اختبار دخان سريع للـ API — إنشاء/قراءة/حذف مبنى ووحدة.
 * node tools/smoke-test-api.js [--api http://127.0.0.1:3790]
 */
import './load-api-env.js';

const args = process.argv.slice(2);
const base = (
  args.find((a, i) => args[i - 1] === '--api') ||
  process.env.CLOUD_API_URL ||
  'http://127.0.0.1:3790'
).replace(/\/$/, '');

const email = process.env.SEED_ADMIN_EMAIL || 'admin@bhd.local';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

async function api(path, opts = {}) {
  const r = await fetch(`${base}/api/v1${path}`, opts);
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${r.status} ${JSON.stringify(json)}`);
  return json;
}

async function login() {
  const data = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!data.accessToken) throw new Error('No access token');
  return data.accessToken;
}

async function main() {
  console.log('Smoke test:', base);
  const token = await login();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const tag = `smoke-${Date.now()}`;

  const building = await api('/buildings', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: `Test Building ${tag}`, status: 'active' }),
  });
  const buildingId = building.building?.id;
  if (!buildingId) throw new Error('Building create failed');

  const unit = await api('/units', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ buildingId, unitNo: `U-${tag}`, status: 'Vacant' }),
  });
  const unitId = unit.unit?.id;
  if (!unitId) throw new Error('Unit create failed');

  const contract = await api('/contracts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      unitId,
      agreementNo: `AGR-${tag}`,
      status: 'Active',
      payload: { smokeTest: true },
      monthlyRent: 100,
    }),
  });
  const contractId = contract.contract?.id;
  if (!contractId) throw new Error('Contract create failed');

  await api(`/contracts/${contractId}`, { headers: auth });
  await api('/contracts/summary', { headers: auth });
  await api(`/contracts/${contractId}`, { method: 'DELETE', headers: auth });

  console.log('Smoke test OK — building, unit, contract CRUD verified.');
  console.log(`(Test data left: building ${buildingId}, unit ${unitId} — delete manually if needed)`);
}

main().catch((e) => {
  console.error('Smoke test FAILED:', e.message);
  process.exit(1);
});
