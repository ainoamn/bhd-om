-- AlterEnum: credit/debit notes for accounting documents
ALTER TYPE "AccountingDocType" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE';
ALTER TYPE "AccountingDocType" ADD VALUE IF NOT EXISTS 'DEBIT_NOTE';

-- Performance indexes for large-scale accounting queries
CREATE INDEX IF NOT EXISTS "AccountingJournalEntry_date_status_idx" ON "AccountingJournalEntry"("date", "status");
CREATE INDEX IF NOT EXISTS "AccountingDocument_date_type_idx" ON "AccountingDocument"("date", "type");
