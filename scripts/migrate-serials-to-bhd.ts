/**
 * ترحيل شامل للأرقام المتسلسلة إلى صيغة BHD-YYYY-TYPE-SEQ
 *
 * تشغيل:
 *   npx tsx scripts/migrate-serials-to-bhd.ts
 * تجربة بدون كتابة:
 *   MIGRATE_SERIALS_DRY_RUN=1 npx tsx scripts/migrate-serials-to-bhd.ts
 */

import { prisma } from '../lib/prisma';
import { runMigrateSerialsToBhd } from '../lib/server/migrateSerialsToBhd';

const dryRun =
  process.env.MIGRATE_SERIALS_DRY_RUN === '1' || process.env.MIGRATE_SERIALS_DRY_RUN === 'true';

async function main(): Promise<void> {
  console.log(dryRun ? '--- DRY RUN (no writes) ---' : '--- MIGRATE SERIALS TO BHD ---');
  console.log(
    'ملاحظة: جدول Subscription لا يحتوي حقل serialNumber في المخطط — يُستثنى من الترحيل حتى يُضاف حقل لاحقاً إن لزم.'
  );
  const result = await runMigrateSerialsToBhd({ dryRun });
  console.log('Done:', result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
