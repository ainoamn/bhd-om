-- CreateEnum
CREATE TYPE "ArchiveEntityType" AS ENUM ('PROPERTY', 'DOCUMENT', 'ACCOUNT', 'CONTRACT', 'RESERVATION', 'USER');

-- CreateEnum
CREATE TYPE "ArchiveAction" AS ENUM ('ARCHIVE', 'RESTORE', 'AUTO_ARCHIVE', 'POLICY_APPLIED');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KeyStatus" AS ENUM ('ACTIVE', 'ROTATED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "ArchiveRecord" (
    "id" TEXT NOT NULL,
    "entityType" "ArchiveEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "action" "ArchiveAction" NOT NULL,
    "status" "ArchiveStatus" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "dataSnapshot" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "archivedById" TEXT NOT NULL,
    "isAutoArchive" BOOLEAN NOT NULL DEFAULT false,
    "policyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArchiveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveRestoreLog" (
    "id" TEXT NOT NULL,
    "archiveId" TEXT NOT NULL,
    "entityType" "ArchiveEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "restoredById" TEXT NOT NULL,
    "restoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "dataSnapshot" TEXT,
    CONSTRAINT "ArchiveRestoreLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "ArchiveEntityType" NOT NULL,
    "condition" TEXT NOT NULL,
    "conditionValue" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArchivePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptionKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "status" "KeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveRecord_entityType_entityId_idx" ON "ArchiveRecord"("entityType", "entityId");
CREATE INDEX "ArchiveRecord_archivedById_idx" ON "ArchiveRecord"("archivedById");
CREATE INDEX "ArchiveRecord_createdAt_idx" ON "ArchiveRecord"("createdAt");
CREATE INDEX "ArchiveRecord_status_idx" ON "ArchiveRecord"("status");
CREATE INDEX "ArchiveRestoreLog_archiveId_idx" ON "ArchiveRestoreLog"("archiveId");
CREATE INDEX "ArchiveRestoreLog_entityType_entityId_idx" ON "ArchiveRestoreLog"("entityType", "entityId");
CREATE INDEX "ArchiveRestoreLog_restoredById_idx" ON "ArchiveRestoreLog"("restoredById");
CREATE INDEX "ArchiveRestoreLog_restoredAt_idx" ON "ArchiveRestoreLog"("restoredAt");
CREATE INDEX "ArchivePolicy_entityType_isActive_idx" ON "ArchivePolicy"("entityType", "isActive");
CREATE INDEX "ArchivePolicy_organizationId_idx" ON "ArchivePolicy"("organizationId");
CREATE INDEX "EncryptionKey_keyId_idx" ON "EncryptionKey"("keyId");
CREATE INDEX "EncryptionKey_status_idx" ON "EncryptionKey"("status");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "EncryptionKey_keyId_key" ON "EncryptionKey"("keyId");
