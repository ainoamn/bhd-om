/**
 * اختبار عزل الشركات — شركة ثانية لا ترى بيانات bhd-demo.
 *
 *   node tools/test-company-isolation.js
 */
import './load-api-env.js';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(root, 'apps', 'api', 'package.json'));
const { PrismaClient } = requireFromApi('@prisma/client');

const prisma = new PrismaClient();
const base = (process.env.CLOUD_API_URL || 'http://127.0.0.1:3790').replace(/\/$/, '');

async function api(path, opts = {}) {
  const r = await fetch(`${base}/api/v1${path}`, opts);
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

async function main() {
  const slugA = 'bhd-demo';
  const slugB = `isolation-test-${Date.now().toString(36)}`;

  const companyA = await prisma.company.findUnique({ where: { slug: slugA } });
  if (!companyA) {
    console.error('Run db:seed first — bhd-demo not found');
    process.exit(1);
  }

  const unitsA = await prisma.unit.count({ where: { companyId: companyA.id } });
  console.log(`Company A (${slugA}): ${unitsA} units in DB`);

  const reg = await api('/saas/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyNameAr: 'اختبار عزل',
      slug: slugB,
      planCode: 'trial',
      adminEmail: `iso-${Date.now()}@test.local`,
      adminPassword: 'TestPass1234!',
    }),
  });

  if (!reg.ok || !reg.json.accessToken) {
    console.error('Failed to create test company B:', reg.status, reg.json);
    process.exit(1);
  }

  const tokenB = reg.json.accessToken;
  const headers = { Authorization: `Bearer ${tokenB}` };

  const buildingsB = await api('/buildings?limit=500', { headers });
  const unitsB = await api('/units?limit=500', { headers });
  const dataB = await api('/company-data?prefix=bhd_', { headers });

  const buildingCountB = buildingsB.json?.items?.length ?? 0;
  const unitCountB = unitsB.json?.items?.length ?? 0;
  const kvKeysB = Object.keys(dataB.json?.data || {}).length;

  console.log(`Company B (${slugB}): buildings=${buildingCountB}, units=${unitCountB}, kvKeys=${kvKeysB}`);

  const companyBId = reg.json.company?.id;
  if (companyBId) {
    await prisma.company.delete({ where: { id: companyBId } }).catch(() => {});
    console.log('Cleaned up test company B.');
  }

  const leaked =
    (unitsA > 0 && unitCountB > 0) ||
    (unitsA > 0 && buildingCountB > 0 && unitsA === unitCountB) ||
    kvKeysB > 50;

  if (buildingCountB === 0 && unitCountB === 0 && kvKeysB === 0) {
    console.log('\nPASS — company B sees no data from company A.');
    process.exit(0);
  }

  if (!leaked) {
    console.log('\nPASS — no obvious cross-tenant leak.');
    process.exit(0);
  }

  console.error('\nFAIL — possible data leak between companies.');
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
