/**
 * تشفير User.phone وملء phoneHash للصفوف القديمة.
 * npm run db:backfill-user-phone-encryption
 */
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  decryptUserPhone,
  encryptUserPhone,
  hashUserPhoneForLookup,
  isEncryptedUserPhone,
  normalizeUserPhone,
} from '@/lib/server/userPhoneCrypto';

async function main() {
  const batch = 200;
  let encrypted = 0;
  let skipped = 0;
  let cleared = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; phone: string | null; phoneHash: string | null }>
    >(Prisma.sql`
      SELECT id, phone, "phoneHash"
      FROM "User"
      ORDER BY id ASC
      OFFSET ${offset}
      LIMIT ${batch}
    `);

    if (rows.length === 0) break;

    for (const row of rows) {
      if (!row.phone) {
        if (row.phoneHash) {
          await prisma.$executeRaw`UPDATE "User" SET "phoneHash" = NULL WHERE id = ${row.id}`;
          cleared++;
        } else {
          skipped++;
        }
        continue;
      }

      const plain = isEncryptedUserPhone(row.phone)
        ? decryptUserPhone(row.phone)
        : normalizeUserPhone(row.phone);

      if (!plain || plain.replace(/\D/g, '').length < 8) {
        await prisma.$executeRaw`UPDATE "User" SET phone = NULL, "phoneHash" = NULL WHERE id = ${row.id}`;
        cleared++;
        continue;
      }

      const encPhone = encryptUserPhone(plain);
      const phoneHash = hashUserPhoneForLookup(plain);

      if (row.phone === encPhone && row.phoneHash === phoneHash) {
        skipped++;
        continue;
      }

      await prisma.$executeRaw`
        UPDATE "User"
        SET phone = ${encPhone}, "phoneHash" = ${phoneHash}
        WHERE id = ${row.id}
      `;
      encrypted++;
    }

    offset += rows.length;
    console.log(`Progress: encrypted=${encrypted} skipped=${skipped} cleared=${cleared} scanned=${offset}`);
    if (rows.length < batch) break;
  }

  console.log(`Done. Encrypted ${encrypted}, skipped ${skipped}, cleared ${cleared}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
