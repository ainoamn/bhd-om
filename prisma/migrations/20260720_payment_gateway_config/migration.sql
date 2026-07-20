-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "displayNameAr" TEXT NOT NULL DEFAULT '',
    "displayNameEn" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT DEFAULT '',
    "apiSecret" TEXT DEFAULT '',
    "merchantId" TEXT DEFAULT '',
    "storeKey" TEXT DEFAULT '',
    "outletRef" TEXT DEFAULT '',
    "profileId" TEXT DEFAULT '',
    "entityId" TEXT DEFAULT '',
    "accessToken" TEXT DEFAULT '',
    "publicKey" TEXT DEFAULT '',
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT DEFAULT '',
    "successUrl" TEXT DEFAULT '',
    "cancelUrl" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '',
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_provider_idx" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_isEnabled_idx" ON "PaymentGatewayConfig"("isEnabled");
