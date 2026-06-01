/**
 * Backfill journal ↔ document links for bank reconciliation accuracy.
 * Run: npx tsx scripts/backfill-accounting-journal-links.ts
 */

import { prisma } from '../lib/prisma';

async function main() {
  const docs = await prisma.accountingDocument.findMany({
    select: {
      id: true,
      serialNumber: true,
      bankAccountId: true,
      contactId: true,
      journalEntryId: true,
    },
  });

  let journalUpdated = 0;
  let docUpdated = 0;

  for (const doc of docs) {
    const hay = doc.serialNumber;
    if (!hay) continue;

    const entries = await prisma.accountingJournalEntry.findMany({
      where: {
        OR: [
          { descriptionAr: { contains: hay } },
          { descriptionEn: { contains: hay } },
          { reference: { contains: hay } },
        ],
      },
      select: { id: true, documentId: true, bankAccountId: true, contactId: true },
      take: 5,
    });

    const entry = entries.find((e) => !e.documentId) || entries[0];
    if (!entry) continue;

    const journalPatch: { documentId?: string; bankAccountId?: string | null; contactId?: string | null } = {};
    if (!entry.documentId) journalPatch.documentId = doc.id;
    if (doc.bankAccountId && !entry.bankAccountId) journalPatch.bankAccountId = doc.bankAccountId;
    if (doc.contactId && !entry.contactId) journalPatch.contactId = doc.contactId;

    if (Object.keys(journalPatch).length > 0) {
      await prisma.accountingJournalEntry.update({
        where: { id: entry.id },
        data: journalPatch,
      });
      journalUpdated++;
    }

    if (!doc.journalEntryId && entry.id) {
      await prisma.accountingDocument.update({
        where: { id: doc.id },
        data: { journalEntryId: entry.id },
      });
      docUpdated++;
    }
  }

  console.log(`Backfill complete: ${journalUpdated} journal entries updated, ${docUpdated} documents linked.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
