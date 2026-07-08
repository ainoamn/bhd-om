/**
 * تشفير صفوف BookingStorage القديمة (plaintext → bkg:enc:v1).
 * npm run db:backfill-booking-encryption
 */
import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import {
  isEncryptedBookingStorage,
  serializeBookingStorageData,
} from '@/lib/server/bookingStorageCrypto';

async function main() {
  const batch = 100;
  let encrypted = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.bookingStorage.findMany({
      orderBy: { bookingId: 'asc' },
      skip: offset,
      take: batch,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      if (isEncryptedBookingStorage(row.data)) {
        skipped++;
        continue;
      }
      const parsed = parseBookingStorageRow(row.data);
      if (!parsed) continue;
      await prisma.bookingStorage.update({
        where: { bookingId: row.bookingId },
        data: { data: serializeBookingStorageData(parsed) },
      });
      encrypted++;
    }

    offset += rows.length;
    console.log(`Progress: encrypted=${encrypted} skipped=${skipped} scanned=${offset}`);
    if (rows.length < batch) break;
  }

  console.log(`Done. Encrypted ${encrypted}, already encrypted ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
