import 'dotenv/config';
import { repairLegacyOperationalKv } from '@/lib/server/legacyOperationalRepair';

function hasDatabaseUrl(): boolean {
  return !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL
  );
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const buildingIdx = args.indexOf('--building');
  const unitIdx = args.indexOf('--unit');
  const building = buildingIdx >= 0 ? args[buildingIdx + 1] : undefined;
  const unit = unitIdx >= 0 ? args[unitIdx + 1] : undefined;

  if (!hasDatabaseUrl()) {
    console.error(
      [
        '[repair-legacy-operational-kv] لا يوجد رابط PostgreSQL في البيئة.',
        'ضع DATABASE_URL ثم أعد التشغيل.',
        'أمثلة:',
        '  npm run db:repair-legacy-operational-kv',
        '  npm run db:repair-legacy-operational-kv -- --apply',
        '  npm run db:repair-legacy-operational-kv -- --building "Al Khuwair Plot 410, Building 88" --unit 88',
      ].join('\n')
    );
    process.exit(1);
  }

  const report = await repairLegacyOperationalKv({
    dryRun: !apply,
    building,
    unit,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log('\n[repair-legacy-operational-kv] dry-run فقط — لم يُكتب شيء إلى Neon.');
    console.log('للتطبيق: npm run db:repair-legacy-operational-kv -- --apply');
  } else if (report.persisted) {
    console.log('\n[repair-legacy-operational-kv] تمت الكتابة إلى Neon:', report.keysWritten.join(', '));
  } else {
    console.log('\n[repair-legacy-operational-kv] لا توجد تغييرات مطلوبة.');
  }
}

main()
  .catch((error) => {
    console.error('[repair-legacy-operational-kv] failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });
