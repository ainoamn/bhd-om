/**
 * تشفير حقول ContactSubmission القديمة (name, email, phone, message).
 * npm run db:backfill-contact-pii-encryption
 */
import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import {
  decryptAtRest,
  encryptAtRest,
  isEncryptedPii,
} from '@/lib/server/piiField';

const ENC_PREFIX = 'enc:rest:';

function needsEncryption(value: string | null | undefined): value is string {
  return Boolean(value && !value.startsWith(ENC_PREFIX) && !isEncryptedPii(value));
}

async function main() {
  const batch = 200;
  let encrypted = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: batch,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const fields = {
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
      };

      const toEncrypt: Partial<typeof fields> = {};
      if (needsEncryption(fields.name)) toEncrypt.name = fields.name;
      if (needsEncryption(fields.email)) toEncrypt.email = fields.email;
      if (needsEncryption(fields.phone)) toEncrypt.phone = fields.phone;
      if (needsEncryption(fields.message)) toEncrypt.message = fields.message;

      if (Object.keys(toEncrypt).length === 0) {
        skipped++;
        continue;
      }

      await prisma.contactSubmission.update({
        where: { id: row.id },
        data: {
          ...(toEncrypt.name ? { name: encryptAtRest(toEncrypt.name) } : {}),
          ...(toEncrypt.email ? { email: encryptAtRest(toEncrypt.email) } : {}),
          ...(toEncrypt.phone ? { phone: encryptAtRest(toEncrypt.phone) } : {}),
          ...(toEncrypt.message ? { message: encryptAtRest(toEncrypt.message) } : {}),
        },
      });
      encrypted++;
    }

    offset += rows.length;
    console.log(`Progress: encrypted=${encrypted} skipped=${skipped} scanned=${offset}`);
    if (rows.length < batch) break;
  }

  console.log(`Done. Encrypted ${encrypted} rows, already encrypted ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
