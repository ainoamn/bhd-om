import 'dotenv/config';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ensureAdminDataPinReady } from '@/lib/server/adminDataPin';

const DEFAULT_PLANS = [
  { code: 'basic', nameAr: 'الخطة الأساسية', nameEn: 'Basic', priceMonthly: 29, priceYearly: 290, sortOrder: 1, featuresJson: '["حتى 5 عقارات","حتى 20 وحدة","إدارة حجوزات أساسية"]', limitsJson: '{"maxProperties":5,"maxUnits":20,"maxBookings":100,"maxUsers":1,"storageGB":1}' },
  { code: 'standard', nameAr: 'الخطة المعيارية', nameEn: 'Standard', priceMonthly: 79, priceYearly: 790, sortOrder: 2, featuresJson: '["حتى 25 عقار","حتى 100 وحدة","تقويم ومهام","دعم ذو أولوية"]', limitsJson: '{"maxProperties":25,"maxUnits":100,"maxBookings":500,"maxUsers":5,"storageGB":10}' },
  { code: 'premium', nameAr: 'الخطة المميزة', nameEn: 'Premium', priceMonthly: 149, priceYearly: 1490, sortOrder: 3, featuresJson: '["حتى 100 عقار","حتى 500 وحدة","تحليلات متقدمة","دعم 24/7"]', limitsJson: '{"maxProperties":100,"maxUnits":500,"maxBookings":2000,"maxUsers":-1,"storageGB":50}' },
  { code: 'enterprise', nameAr: 'الخطة المؤسسية', nameEn: 'Enterprise', priceMonthly: 299, priceYearly: 2990, sortOrder: 4, featuresJson: '["عقارات غير محدودة","وصول كامل","دعم مخصص","API"]', limitsJson: '{"maxProperties":-1,"maxUnits":-1,"maxBookings":-1,"maxUsers":-1,"storageGB":200}' },
];

async function main() {
  const adminEmail = 'admin@bhd-om.com';
  const adminPassword = 'admin123';
  const hashed = await hash(adminPassword, 10);

  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { code: p.code },
      create: { ...p, currency: 'OMR', isActive: true },
      update: { nameAr: p.nameAr, nameEn: p.nameEn, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, sortOrder: p.sortOrder, featuresJson: p.featuresJson, limitsJson: p.limitsJson },
    });
  }
  console.log('Plans seeded:', DEFAULT_PLANS.length);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashed, name: 'مدير النظام', role: 'ADMIN', isSuperAdmin: true },
    });
    console.log('Admin user updated:', adminEmail, '(password:', adminPassword + ')');
  } else {
    await prisma.user.create({
      data: {
        serialNumber: 'USR-A-2025-0001',
        email: adminEmail,
        password: hashed,
        name: 'مدير النظام',
        role: 'ADMIN',
        isSuperAdmin: true,
      },
    });
    console.log('Admin user created:', adminEmail, '(password:', adminPassword + ')');
  }

  await ensureAdminDataPinReady();
  console.log('Admin data security PIN ensured (AppSetting hash).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
