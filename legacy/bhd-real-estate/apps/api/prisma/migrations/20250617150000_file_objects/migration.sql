CREATE TABLE "file_objects" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "byte_size" BIGINT NOT NULL DEFAULT 0,
    "building" TEXT,
    "unit" TEXT,
    "tenant" TEXT,
    "doc_type" TEXT,
    "category" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "file_objects_company_id_idx" ON "file_objects"("company_id");
CREATE INDEX "file_objects_company_id_building_unit_idx" ON "file_objects"("company_id", "building", "unit");

ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
