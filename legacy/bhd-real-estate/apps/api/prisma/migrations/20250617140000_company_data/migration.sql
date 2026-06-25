-- CreateTable
CREATE TABLE "company_data_entries" (
    "company_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_data_entries_pkey" PRIMARY KEY ("company_id","key")
);

CREATE INDEX "company_data_entries_company_id_idx" ON "company_data_entries"("company_id");

ALTER TABLE "company_data_entries" ADD CONSTRAINT "company_data_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
