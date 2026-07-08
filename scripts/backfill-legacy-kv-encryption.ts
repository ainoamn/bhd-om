/**
 * تشفير صفوف LegacyAppKvStore القديمة (plaintext → kv:enc:v1).
 * npm run db:backfill-legacy-kv-encryption
 */
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  isEncryptedLegacyKvData,
  serializeLegacyKvData,
} from '@/lib/server/legacyKvCrypto';

async function main() {
  const batch = 50;
  let encrypted = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; kvKey: string; data: string }>
    >(Prisma.sql`
      SELECT id, "kvKey", data
      FROM "LegacyAppKvStore"
      ORDER BY "kvKey" ASC
      OFFSET ${offset}
      LIMIT ${batch}
    `);

    if (rows.length === 0) break;

    for (const row of rows) {
      if (isEncryptedLegacyKvData(row.data)) {
        skipped++;
        continue;
      }
      if (!row.data?.length) {
        skipped++;
        continue;
      }

      const enc = serializeLegacyKvData(row.data);
      await prisma.$executeRaw`
        UPDATE "LegacyAppKvStore"
        SET data = ${enc}, "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      encrypted++;
      console.log(`  encrypted ${row.kvKey} (${row.data.length} → ${enc.length} chars)`);
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
