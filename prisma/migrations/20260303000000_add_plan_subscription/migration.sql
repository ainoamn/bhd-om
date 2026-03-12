-- Plan table: create if not exists
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceYearly" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "featuresJson" TEXT,
    "limitsJson" TEXT,
    "permissionsJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");

-- Add columns that may be missing in existing Plan table (e.g. permissionsJson)
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "priceYearly" DOUBLE PRECISION;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featuresJson" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "limitsJson" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "permissionsJson" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "usageJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");

-- SubscriptionChangeRequest table
CREATE TABLE IF NOT EXISTS "SubscriptionChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "requestedPlanId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubscriptionChangeRequest_userId_idx" ON "SubscriptionChangeRequest"("userId");
CREATE INDEX IF NOT EXISTS "SubscriptionChangeRequest_status_idx" ON "SubscriptionChangeRequest"("status");

-- Foreign keys (only if constraint does not exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_userId_fkey') THEN
        ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
        ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionChangeRequest_subscriptionId_fkey') THEN
        ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
