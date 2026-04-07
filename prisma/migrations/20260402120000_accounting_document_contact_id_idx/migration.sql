-- فهرس لاستعلامات المستندات حسب جهة الاتصال (لوحة العميل / حسابي)
CREATE INDEX IF NOT EXISTS "AccountingDocument_contactId_idx" ON "AccountingDocument"("contactId");
