-- CreateTable
CREATE TABLE IF NOT EXISTS "BookingDocumentStorage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "propertyId" INTEGER,
    "status" TEXT,
    "docTypeId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "emailNorm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDocumentStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BookingDocumentStorage_documentId_key" ON "BookingDocumentStorage"("documentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_bookingId_idx" ON "BookingDocumentStorage"("bookingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_propertyId_idx" ON "BookingDocumentStorage"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_status_idx" ON "BookingDocumentStorage"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_docTypeId_idx" ON "BookingDocumentStorage"("docTypeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_bookingId_status_idx" ON "BookingDocumentStorage"("bookingId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_propertyId_status_idx" ON "BookingDocumentStorage"("propertyId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingDocumentStorage_updatedAt_idx" ON "BookingDocumentStorage"("updatedAt");
