-- Link documents ↔ journal entries for accurate bank reconciliation
ALTER TABLE "AccountingDocument" ADD COLUMN "journalEntryId" TEXT;

ALTER TABLE "AccountingJournalEntry" ADD COLUMN "documentId" TEXT;
ALTER TABLE "AccountingJournalEntry" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "AccountingJournalEntry" ADD COLUMN "contactId" TEXT;

CREATE INDEX "AccountingDocument_journalEntryId_idx" ON "AccountingDocument"("journalEntryId");
CREATE INDEX "AccountingJournalEntry_documentId_idx" ON "AccountingJournalEntry"("documentId");
CREATE INDEX "AccountingJournalEntry_bankAccountId_idx" ON "AccountingJournalEntry"("bankAccountId");
CREATE INDEX "AccountingJournalEntry_contactId_idx" ON "AccountingJournalEntry"("contactId");
