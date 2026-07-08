/**
 * تشفير صفوف ContractStorage القديمة (plaintext → cnt:enc:v1).
 * npm run db:backfill-contract-encryption
 */
import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { parseContractStorageData } from '@/lib/server/repositories/contractStorageRepo';
import {
  isEncryptedContractStorage,
  serializeContractStorageData,
} from '@/lib/server/contractStorageCrypto';

async function main() {
  const batch = 100;
  let encrypted = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const rows = await prisma.contractStorage.findMany({
      orderBy: { contractId: 'asc' },
      skip: offset,
      take: batch,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      if (isEncryptedContractStorage(row.data)) {
        skipped++;
        continue;
      }
      const parsed = parseContractStorageData(row);
      if (!parsed) continue;
      await prisma.contractStorage.update({
        where: { contractId: row.contractId },
        data: { data: serializeContractStorageData(parsed) },
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
