-- CreateTable
CREATE TABLE "LegacyAppKvStore" (
    "id" TEXT NOT NULL,
    "kvKey" TEXT NOT NULL,
    "category" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyAppKvStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacyAppKvStore_kvKey_key" ON "LegacyAppKvStore"("kvKey");

-- CreateIndex
CREATE INDEX "LegacyAppKvStore_category_idx" ON "LegacyAppKvStore"("category");

-- CreateIndex
CREATE INDEX "LegacyAppKvStore_updatedAt_idx" ON "LegacyAppKvStore"("updatedAt");

-- CreateIndex
CREATE INDEX "LegacyAppKvStore_kvKey_idx" ON "LegacyAppKvStore"("kvKey");
