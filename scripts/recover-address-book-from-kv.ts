/**
 * استعادة دفتر العناوين بعد تصفية خاطئة:
 * - إزالة حجر التصفية
 * - إنشاء/تحديث جهات من الملاك والعقد المحفوظ
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { getLegacyKvBulk } from '../lib/server/legacyKvStore';
import { syncLegacyAddressEntryToDatabase } from '../lib/server/legacyBridge';
import { LEGACY_KV_WIPE_GUARD_KEY } from '../lib/server/legacyKvKeys';

async function main() {
  await prisma.legacyAppKvStore.deleteMany({ where: { kvKey: LEGACY_KV_WIPE_GUARD_KEY } });
  console.log('cleared wipe guard');

  const bulk = await getLegacyKvBulk('bhd_', [
    'bhd_owners_list',
    'bhd_owner_profiles',
    'bhd_owner_building_map',
    'bhd_saved_contracts_by_unit',
  ]);

  const ownersList: string[] = (() => {
    try {
      const a = JSON.parse(bulk.bhd_owners_list || '[]');
      return Array.isArray(a) ? a.map(String) : [];
    } catch {
      return [];
    }
  })();
  const ownerProfiles: Record<string, Record<string, unknown>> = (() => {
    try {
      const o = JSON.parse(bulk.bhd_owner_profiles || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  })();
  const ownerBuildingMap: Record<string, string[]> = (() => {
    try {
      const o = JSON.parse(bulk.bhd_owner_building_map || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  })();

  let upserted = 0;
  for (const name of ownersList) {
    const n = String(name || '').trim();
    if (!n) continue;
    const p = ownerProfiles[n] || {};
    const buildings = Array.isArray(ownerBuildingMap[n]) ? ownerBuildingMap[n].join('، ') : '';
    await syncLegacyAddressEntryToDatabase({
      type: 'owner',
      name: n,
      mobile: String(p.phone || ''),
      idNo: String(p.civilId || ''),
      nationality: String(p.nationality || 'عماني / Omani'),
      idExpiryDate: String(p.idExpiryDate || ''),
      email: String(p.email || ''),
      building: buildings,
      unit: '',
      source: 'owners-recovery',
    });
    upserted += 1;
    console.log('owner upserted', n);
  }

  try {
    const sc = JSON.parse(bulk.bhd_saved_contracts_by_unit || '{}') as Record<
      string,
      { payload?: Record<string, unknown> }
    >;
    for (const entry of Object.values(sc || {})) {
      const p = entry?.payload || {};
      const name = String(p.tenantNameAr || p.tenantName || p.tenant || '').trim();
      if (!name) continue;
      await syncLegacyAddressEntryToDatabase({
        type: 'tenant',
        name,
        nameEn: String(p.tenantNameEn || ''),
        mobile: String(p.tenantMobile || p.contactNo || ''),
        idNo: String(p.tenantId || p.civilCard || ''),
        nationality: 'عماني / Omani',
        email: String(p.tenantEmail || ''),
        building: String(p.buildingNo || ''),
        unit: String(p.flatNo || ''),
        source: 'contracts-recovery',
      });
      upserted += 1;
      console.log('tenant upserted', name);
    }
  } catch (e) {
    console.warn('contract tenant recovery failed', e);
  }

  const count = await prisma.addressBookContact.count();
  console.log(JSON.stringify({ upserted, addressBookContactsNow: count }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
