-- CreateTable
CREATE TABLE "AddressBookContactFile" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "fieldKey" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "blobUrl" TEXT,
    "content" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressBookContactFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddressBookContactFile_contactId_idx" ON "AddressBookContactFile"("contactId");

-- CreateIndex
CREATE INDEX "AddressBookContactFile_contactId_fieldKey_idx" ON "AddressBookContactFile"("contactId", "fieldKey");

-- CreateIndex
CREATE INDEX "AddressBookContactFile_createdAt_idx" ON "AddressBookContactFile"("createdAt");
