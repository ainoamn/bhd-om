-- AlterTable
ALTER TABLE "AddressBookContact" ADD COLUMN IF NOT EXISTS "linkedUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AddressBookContact_linkedUserId_key" ON "AddressBookContact"("linkedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AddressBookContact_linkedUserId_idx" ON "AddressBookContact"("linkedUserId");
