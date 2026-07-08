-- Encrypt user phones at rest: lookup hash + encrypted phone column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneHash_key" ON "User"("phoneHash");

CREATE INDEX IF NOT EXISTS "User_phoneHash_idx" ON "User"("phoneHash");
