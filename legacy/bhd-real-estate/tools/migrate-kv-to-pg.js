/**
 * هجرة بيانات kv_store من SQLite المحلي إلى PostgreSQL السحابي.
 *
 * الاستخدام:
 *   set DATABASE_URL=postgresql://...
 *   node tools/migrate-kv-to-pg.js --db path/to/rental.db --company-slug bhd-demo
 */
import './load-api-env.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(root, 'apps', 'api', 'package.json'));
const { PrismaClient } = requireFromApi('@prisma/client');

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { db: '', companySlug: 'bhd-demo', dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db') out.db = args[++i];
    else if (args[i] === '--company-slug') out.companySlug = args[++i];
    else if (args[i] === '--dry-run') out.dryRun = true;
  }
  return out;
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

async function withCompany(companyId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_company_id', $1, true)`, companyId);
    return fn(tx);
  });
}

async function main() {
  const { db: dbPath, companySlug, dryRun } = parseArgs();
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error('Usage: node tools/migrate-kv-to-pg.js --db <rental.db> [--company-slug bhd-demo] [--dry-run]');
    process.exit(1);
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    console.error(`Company slug not found: ${companySlug}. Run: npm run db:seed`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(path.resolve(dbPath));
  const buildingsList = readKv(sqlite, 'bhd_buildings_list') || [];
  const buildingProfiles = readKv(sqlite, 'bhd_building_profiles') || {};
  const managedUnits = readKv(sqlite, 'bhd_managed_units') || [];

  console.log('Company:', company.slug, company.id);
  console.log('Buildings in list:', Array.isArray(buildingsList) ? buildingsList.length : 0);
  console.log('Building profiles:', Object.keys(buildingProfiles || {}).length);
  console.log('Managed units:', Array.isArray(managedUnits) ? managedUnits.length : 0);

  const kvRows = sqlite.prepare("SELECT key, value FROM kv_store WHERE key LIKE 'bhd_%'").all();
  const skipKeys = new Set(['bhd_auth_session', 'bhd_theme_mode', 'bhd_cloud_session']);
  const kvToMigrate = kvRows.filter((r) => !skipKeys.has(r.key));
  let kvBytes = 0;
  kvToMigrate.forEach((r) => {
    kvBytes += Buffer.byteLength(r.value || '', 'utf8');
  });
  console.log('KV keys to migrate:', kvToMigrate.length, `(${(kvBytes / 1024 / 1024).toFixed(2)} MB)`);

  if (dryRun) {
    console.log('\nDry run — no writes. Remove --dry-run to migrate.');
    return;
  }

  const buildingIdByName = new Map();

  await withCompany(company.id, async (tx) => {
    const names = new Set([
      ...(Array.isArray(buildingsList) ? buildingsList : []),
      ...Object.keys(buildingProfiles || {}),
      ...(Array.isArray(managedUnits) ? managedUnits.map((u) => u.building) : []),
    ]);

    for (const name of names) {
      const n = String(name || '').trim();
      if (!n) continue;
      const profile = buildingProfiles?.[n] || {};
      const b = await tx.building.upsert({
        where: { companyId_name: { companyId: company.id, name: n } },
        update: { profile, status: profile.buildingStatus || null },
        create: {
          companyId: company.id,
          name: n,
          profile,
          status: profile.buildingStatus || null,
        },
      });
      buildingIdByName.set(n, b.id);
    }

    let unitCount = 0;
    if (Array.isArray(managedUnits)) {
      for (const u of managedUnits) {
        const buildingName = String(u.building || '').trim();
        const unitNo = String(u.unit || '').trim();
        if (!buildingName || !unitNo) continue;
        let buildingId = buildingIdByName.get(buildingName);
        if (!buildingId) {
          const b = await tx.building.create({
            data: { companyId: company.id, name: buildingName, profile: {} },
          });
          buildingId = b.id;
          buildingIdByName.set(buildingName, buildingId);
        }
        const { building, unit, ownerNames, ...meta } = u;
        await tx.unit.upsert({
          where: {
            companyId_buildingId_unitNo: {
              companyId: company.id,
              buildingId,
              unitNo,
            },
          },
          update: {
            floor: u.floor || null,
            unitType: u.unitType || null,
            status: u.status || 'Vacant',
            managedMeta: { ...meta, ownerNames: ownerNames || u.ownerNames },
          },
          create: {
            companyId: company.id,
            buildingId,
            unitNo,
            floor: u.floor || null,
            unitType: u.unitType || null,
            status: u.status || 'Vacant',
            managedMeta: { ...meta, ownerNames: ownerNames || u.ownerNames },
          },
        });
        unitCount += 1;
      }
    }
    console.log('Migrated buildings:', buildingIdByName.size, 'units:', unitCount);

    const kvRows = sqlite.prepare("SELECT key, value FROM kv_store WHERE key LIKE 'bhd_%'").all();
    const skipKeys = new Set(['bhd_auth_session', 'bhd_theme_mode', 'bhd_cloud_session']);
    let kvCount = 0;
    for (const row of kvRows) {
      if (skipKeys.has(row.key)) continue;
      await tx.companyDataEntry.upsert({
        where: { companyId_key: { companyId: company.id, key: row.key } },
        create: { companyId: company.id, key: row.key, value: row.value },
        update: { value: row.value },
      });
      kvCount += 1;
    }
    console.log('Migrated company-data keys:', kvCount);
  });

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
