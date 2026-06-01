-- AlterTable: due date for AR/AP aging accuracy
ALTER TABLE "AccountingDocument" ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AccountingDocument_dueDate_idx" ON "AccountingDocument"("dueDate");
