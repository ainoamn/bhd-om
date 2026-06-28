-- CreateTable
CREATE TABLE "LegacyStoredFile" (
    "id" TEXT NOT NULL,
    "storeContext" TEXT,
    "storeKey" TEXT,
    "fieldKey" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "blobUrl" TEXT,
    "content" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyStoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegacyStoredFile_storeContext_idx" ON "LegacyStoredFile"("storeContext");

-- CreateIndex
CREATE INDEX "LegacyStoredFile_storeKey_idx" ON "LegacyStoredFile"("storeKey");

-- CreateIndex
CREATE INDEX "LegacyStoredFile_storeContext_storeKey_idx" ON "LegacyStoredFile"("storeContext", "storeKey");

-- CreateIndex
CREATE INDEX "LegacyStoredFile_createdAt_idx" ON "LegacyStoredFile"("createdAt");
