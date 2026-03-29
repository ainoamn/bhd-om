import type { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { formatSerialNumber, getSerialCounterKey } from '@/lib/serial';
import { seedDefaultAdminDataPinAbdul } from '@/lib/server/adminDataPin';

export const DEFAULT_PLANS = [
  { code: 'basic', nameAr: 'الخطة الأساسية', nameEn: 'Basic', priceMonthly: 29, priceYearly: 290, sortOrder: 1, featuresJson: '["حتى 5 عقارات","حتى 20 وحدة","إدارة حجوزات أساسية"]', limitsJson: '{"maxProperties":5,"maxUnits":20,"maxBookings":100,"maxUsers":1,"storageGB":1}' },
  { code: 'standard', nameAr: 'الخطة المعيارية', nameEn: 'Standard', priceMonthly: 79, priceYearly: 790, sortOrder: 2, featuresJson: '["حتى 25 عقار","حتى 100 وحدة","تقويم ومهام","دعم ذو أولوية"]', limitsJson: '{"maxProperties":25,"maxUnits":100,"maxBookings":500,"maxUsers":5,"storageGB":10}' },
  { code: 'premium', nameAr: 'الخطة المميزة', nameEn: 'Premium', priceMonthly: 149, priceYearly: 1490, sortOrder: 3, featuresJson: '["حتى 100 عقار","حتى 500 وحدة","تحليلات متقدمة","دعم 24/7"]', limitsJson: '{"maxProperties":100,"maxUnits":500,"maxBookings":2000,"maxUsers":-1,"storageGB":50}' },
  { code: 'enterprise', nameAr: 'الخطة المؤسسية', nameEn: 'Enterprise', priceMonthly: 299, priceYearly: 2990, sortOrder: 4, featuresJson: '["عقارات غير محدودة","وصول كامل","دعم مخصص","API"]', limitsJson: '{"maxProperties":-1,"maxUnits":-1,"maxBookings":-1,"maxUsers":-1,"storageGB":200}' },
];

async function deleteAccountingAccountsLeavesTx(tx: Prisma.TransactionClient): Promise<void> {
  for (;;) {
    const leaf = await tx.accountingAccount.findFirst({
      where: { children: { none: {} } },
      select: { id: true },
    });
    if (!leaf) break;
    await tx.accountingAccount.delete({ where: { id: leaf.id } });
  }
}

export type ResetKeepPropertiesResult = {
  adminEmail: string;
  serialNumber: string;
};

/**
 * تصفير قاعدة البيانات مع الإبقاء على جدول Property فقط (تُفرَّغ روابط المالك/المنشئ/الشركة).
 */
export async function executeResetKeepProperties(
  prisma: PrismaClient,
  options?: { adminEmail?: string; adminPassword?: string }
): Promise<ResetKeepPropertiesResult> {
  const adminEmail = (options?.adminEmail || process.env.RESET_ADMIN_EMAIL || 'admin@bhd-om.com').toLowerCase().trim();
  const adminPassword = options?.adminPassword ?? process.env.RESET_ADMIN_PASSWORD ?? 'admin123';
  const year = new Date().getFullYear();

  await prisma.$transaction(
    async (tx) => {
      await tx.propertyBooking.deleteMany();
      await tx.bookingStorage.deleteMany();
      await tx.bookingDocumentFile.deleteMany();
      await tx.contactSubmission.deleteMany();
      await tx.addressBookContact.deleteMany();

      await tx.subscriptionChangeRequest.deleteMany();
      await tx.subscriptionHistory.deleteMany();
      await tx.subscription.deleteMany();

      await tx.transaction.deleteMany();
      await tx.account.deleteMany();

      await tx.task.deleteMany();
      await tx.document.deleteMany();
      await tx.serialNumberHistory.deleteMany();
      await tx.project.deleteMany();

      await tx.property.updateMany({
        data: { createdById: null, ownerId: null, organizationId: null },
      });

      await tx.user.updateMany({ data: { organizationId: null } });
      await tx.organization.deleteMany();

      await tx.siteContent.deleteMany();
      await tx.appSetting.deleteMany();

      await tx.accountingJournalLine.deleteMany();
      await tx.accountingJournalEntry.deleteMany();
      await tx.accountingDocument.deleteMany();
      await tx.accountingAuditLog.deleteMany();
      await tx.accountingFiscalPeriod.deleteMany();
      await tx.userAccountingRole.deleteMany();
      await deleteAccountingAccountsLeavesTx(tx);
    },
    { timeout: 180_000, maxWait: 60_000 }
  );

  await prisma.user.deleteMany();

  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      create: { ...p, currency: 'OMR', isActive: true },
      update: {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        sortOrder: p.sortOrder,
        featuresJson: p.featuresJson,
        limitsJson: p.limitsJson,
      },
    });
  }

  const hashed = await hash(adminPassword, 10);
  const serialNumber = formatSerialNumber('USER', 'ADMIN', 1, year);
  const counterKey = getSerialCounterKey('USER', 'ADMIN', year);

  await prisma.serialCounter.upsert({
    where: { key: counterKey },
    create: { key: counterKey, lastValue: 1 },
    update: { lastValue: 1 },
  });

  await prisma.user.create({
    data: {
      serialNumber,
      email: adminEmail,
      password: hashed,
      name: 'مدير النظام',
      role: 'ADMIN',
      isSuperAdmin: true,
    },
  });

  await seedDefaultAdminDataPinAbdul();

  return { adminEmail, serialNumber };
}

export async function seedPlansOnly(db: Pick<PrismaClient, 'plan'>): Promise<void> {
  for (const p of DEFAULT_PLANS) {
    await db.plan.upsert({
      where: { code: p.code },
      create: { ...p, currency: 'OMR', isActive: true },
      update: {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        sortOrder: p.sortOrder,
        featuresJson: p.featuresJson,
        limitsJson: p.limitsJson,
      },
    });
  }
}
