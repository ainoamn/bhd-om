/**
 * ترحيل booking_documents_settings و booking_checks_settings من AppSetting إلى الجداول.
 * Usage: npm run db:backfill-legacy-booking-settings
 */
import 'dotenv/config';
import {
  getLegacyBookingSettingsStatus,
  runFullLegacyBookingSettingsBackfill,
} from '@/lib/server/legacyBookingSettingsCleanup';

async function main() {
  const before = await getLegacyBookingSettingsStatus();
  console.log('Before:', before);

  const result = await runFullLegacyBookingSettingsBackfill();
  console.log('Migrated:', result);

  const after = await getLegacyBookingSettingsStatus();
  console.log('After:', after);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
