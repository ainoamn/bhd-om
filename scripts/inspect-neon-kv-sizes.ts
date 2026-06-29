import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const keys = [
    'bhd_saved_contracts_by_unit',
    'bhd_managed_units',
    'bhd_buildings_list',
    'bhd_building_profiles',
    'bhd_owners_list',
    'bhd_owner_building_map',
    'bhd_accounting_registry',
  ];
  const rows = await prisma.legacyAppKvStore.findMany({
    where: { kvKey: { in: keys } },
    select: { kvKey: true, updatedAt: true, data: true },
  });
  for (const k of keys) {
    const r = rows.find((x) => x.kvKey === k);
    if (!r) {
      console.log(k, 'MISSING');
      continue;
    }
    const len = r.data?.length || 0;
    let preview = '';
    try {
      const p = JSON.parse(r.data || 'null');
      if (Array.isArray(p)) preview = `array len=${p.length}`;
      else if (p && typeof p === 'object') preview = `object keys=${Object.keys(p).length}`;
      else preview = String(p);
    } catch {
      preview = 'parse err';
    }
    console.log(`${r.kvKey} | bytes=${len} | ${preview} | updated=${r.updatedAt?.toISOString()}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
