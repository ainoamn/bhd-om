-- Portal tenant/owner v2 tables (from Kimi package, adapted)
-- Apply with: npx prisma db execute --file prisma/migrations/20260720_portal_tenant_owner_v2/migration.sql
-- Or: npx prisma db push

-- CreateEnum
CREATE TYPE "ScoreCategory" AS ENUM ('RENT_PAYMENT', 'BILL_PAYMENT', 'MAINTENANCE', 'OVERALL');
CREATE TYPE "ScoreLevel" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'CRITICAL');
CREATE TYPE "AlertType" AS ENUM ('RENT_DUE', 'RENT_OVERDUE', 'BILL_DUE', 'BILL_OVERDUE', 'CONTRACT_EXPIRE', 'MAINTENANCE', 'TASK_ASSIGNED', 'SYSTEM');
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');
CREATE TYPE "TenantTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskType" AS ENUM ('RENEWAL', 'PAYMENT', 'MAINTENANCE', 'INSPECTION', 'DOCUMENT', 'OTHER');
CREATE TYPE "DueType" AS ENUM ('RENT', 'BILL', 'DEPOSIT', 'PENALTY', 'MAINTENANCE', 'OTHER');
CREATE TYPE "DueStatus" AS ENUM ('PENDING', 'OVERDUE', 'PAID', 'PARTIAL', 'WAIVED');
CREATE TYPE "SignatureMethod" AS ENUM ('OTP_SMS', 'OTP_EMAIL', 'DRAW', 'QR_CODE', 'BIOMETRIC');
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'REJECTED', 'EXPIRED');
CREATE TYPE "AutoAccountStatus" AS ENUM ('PENDING', 'SENT', 'ACTIVATED', 'DISABLED');

CREATE TABLE "TenantScore" (
    "id" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "category" "ScoreCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "ScoreLevel" NOT NULL,
    "notes" TEXT,
    "evidenceJson" TEXT,
    "evaluatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "dueDate" TIMESTAMP(3),
    "relatedId" TEXT,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "TenantAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantTask" (
    "id" TEXT NOT NULL,
    "assignerId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TenantTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DueAmount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "contractId" TEXT,
    "type" "DueType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "status" "DueStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DueAmount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmartSignature" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "method" "SignatureMethod" NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "otpCode" TEXT,
    "otpSentTo" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "signatureData" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SmartSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutoUserAccount" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "tempPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "status" "AutoAccountStatus" NOT NULL DEFAULT 'PENDING',
    "sentVia" TEXT,
    "sentAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "AutoUserAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantScore_tenantUserId_category_key" ON "TenantScore"("tenantUserId", "category");
CREATE INDEX "TenantScore_tenantUserId_category_idx" ON "TenantScore"("tenantUserId", "category");
CREATE INDEX "TenantScore_tenantUserId_createdAt_idx" ON "TenantScore"("tenantUserId", "createdAt");
CREATE INDEX "TenantScore_score_idx" ON "TenantScore"("score");
CREATE INDEX "TenantScore_level_idx" ON "TenantScore"("level");

CREATE INDEX "TenantAlert_userId_status_idx" ON "TenantAlert"("userId", "status");
CREATE INDEX "TenantAlert_userId_type_idx" ON "TenantAlert"("userId", "type");
CREATE INDEX "TenantAlert_priority_idx" ON "TenantAlert"("priority");
CREATE INDEX "TenantAlert_dueDate_idx" ON "TenantAlert"("dueDate");
CREATE INDEX "TenantAlert_createdAt_idx" ON "TenantAlert"("createdAt");

CREATE INDEX "TenantTask_assigneeId_status_idx" ON "TenantTask"("assigneeId", "status");
CREATE INDEX "TenantTask_assigneeId_dueDate_idx" ON "TenantTask"("assigneeId", "dueDate");
CREATE INDEX "TenantTask_assignerId_idx" ON "TenantTask"("assignerId");
CREATE INDEX "TenantTask_type_idx" ON "TenantTask"("type");
CREATE INDEX "TenantTask_dueDate_idx" ON "TenantTask"("dueDate");

CREATE INDEX "DueAmount_userId_status_idx" ON "DueAmount"("userId", "status");
CREATE INDEX "DueAmount_userId_dueDate_idx" ON "DueAmount"("userId", "dueDate");
CREATE INDEX "DueAmount_contractId_idx" ON "DueAmount"("contractId");
CREATE INDEX "DueAmount_status_dueDate_idx" ON "DueAmount"("status", "dueDate");
CREATE INDEX "DueAmount_createdAt_idx" ON "DueAmount"("createdAt");

CREATE INDEX "SmartSignature_contractId_status_idx" ON "SmartSignature"("contractId", "status");
CREATE INDEX "SmartSignature_tenantId_status_idx" ON "SmartSignature"("tenantId", "status");
CREATE INDEX "SmartSignature_status_idx" ON "SmartSignature"("status");
CREATE INDEX "SmartSignature_createdAt_idx" ON "SmartSignature"("createdAt");

CREATE UNIQUE INDEX "AutoUserAccount_username_key" ON "AutoUserAccount"("username");
CREATE INDEX "AutoUserAccount_contactId_idx" ON "AutoUserAccount"("contactId");
CREATE INDEX "AutoUserAccount_userId_idx" ON "AutoUserAccount"("userId");
CREATE INDEX "AutoUserAccount_status_idx" ON "AutoUserAccount"("status");
CREATE INDEX "AutoUserAccount_role_idx" ON "AutoUserAccount"("role");
