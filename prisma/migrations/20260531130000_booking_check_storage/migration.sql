-- CreateTable
CREATE TABLE IF NOT EXISTS "BookingCheckStorage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkTypeId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "propertyId" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingCheckStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BookingCheckStorage_bookingId_checkTypeId_key" ON "BookingCheckStorage"("bookingId", "checkTypeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_bookingId_idx" ON "BookingCheckStorage"("bookingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_propertyId_idx" ON "BookingCheckStorage"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_isApproved_idx" ON "BookingCheckStorage"("isApproved");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_isRejected_idx" ON "BookingCheckStorage"("isRejected");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_bookingId_isApproved_idx" ON "BookingCheckStorage"("bookingId", "isApproved");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookingCheckStorage_updatedAt_idx" ON "BookingCheckStorage"("updatedAt");
