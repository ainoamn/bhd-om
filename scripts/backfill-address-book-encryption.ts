/**
 * تشفير صفوف AddressBookContact القديمة (plaintext JSON → __addrEncV1).
 * npm run db:backfill-address-book-encryption
 */
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  isEncryptedAddressBookData,
  parseAddressBookContactData,
  serializeAddressBookContactData,
} from '@/lib/server/addressBookCrypto';

async function main() {
  const batch = 100;
  let encrypted = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; contactId: string; data: Prisma.JsonValue }>
    >(Prisma.sql`
      SELECT id, "contactId", data
      FROM "AddressBookContact"
      ORDER BY "contactId" ASC
      OFFSET ${offset}
      LIMIT ${batch}
    `);

    if (rows.length === 0) break;

    for (const row of rows) {
      if (isEncryptedAddressBookData(row.data)) {
        skipped++;
        continue;
      }
      const parsed = parseAddressBookContactData(row.data);
      if (!parsed || !Object.keys(parsed).length) continue;

      const stored = serializeAddressBookContactData(parsed);
      await prisma.$executeRaw`
        UPDATE "AddressBookContact"
        SET data = ${JSON.stringify(stored)}::jsonb, "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
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
