-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'MAINTENANCE';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_reporterUserId_createdAt_idx" ON "MaintenanceRequest"("reporterUserId", "createdAt");
