-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bhdSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_bhdSub_key" ON "User"("bhdSub");

CREATE INDEX IF NOT EXISTS "User_bhdSub_idx" ON "User"("bhdSub");
