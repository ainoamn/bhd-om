/**
 * تهيئة الباقات الافتراضية — للأدمن فقط، وتُنشأ فقط إذا لم توجد أي باقة في قاعدة البيانات.
 * صلاحيات كل باقة من PLAN_FEATURES لربطها بإعدادات لوحة التحكم (الاشتراك = المعيار الأول).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { PLAN_FEATURES } from '@/lib/featurePermissions';

export const runtime = 'nodejs';

const PLAN_CODES = ['basic', 'standard', 'premium', 'enterprise'] as const;

const DEFAULT_PLANS = [
  { code: 'basic', nameAr: 'الخطة الأساسية', nameEn: 'Basic', priceMonthly: 29, priceYearly: 290, sortOrder: 1, featuresJson: '["حتى 5 عقارات","حتى 20 وحدة","إدارة حجوزات أساسية"]', limitsJson: '{"maxProperties":5,"maxUnits":20,"maxBookings":100,"maxUsers":1,"storageGB":1}' },
  { code: 'standard', nameAr: 'الخطة المعيارية', nameEn: 'Standard', priceMonthly: 79, priceYearly: 790, sortOrder: 2, featuresJson: '["حتى 25 عقار","حتى 100 وحدة","تقويم ومهام","دعم ذو أولوية"]', limitsJson: '{"maxProperties":25,"maxUnits":100,"maxBookings":500,"maxUsers":5,"storageGB":10}' },
  { code: 'premium', nameAr: 'الخطة المميزة', nameEn: 'Premium', priceMonthly: 149, priceYearly: 1490, sortOrder: 3, featuresJson: '["حتى 100 عقار","حتى 500 وحدة","تحليلات متقدمة","دعم 24/7"]', limitsJson: '{"maxProperties":100,"maxUnits":500,"maxBookings":2000,"maxUsers":-1,"storageGB":50}' },
  { code: 'enterprise', nameAr: 'الخطة المؤسسية', nameEn: 'Enterprise', priceMonthly: 299, priceYearly: 2990, sortOrder: 4, featuresJson: '["عقارات غير محدودة","وصول كامل","دعم مخصص","API"]', limitsJson: '{"maxProperties":-1,"maxUnits":-1,"maxBookings":-1,"maxUsers":-1,"storageGB":200}' },
];

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const count = await prisma.plan.count();
    if (count > 0) {
      return NextResponse.json({ ok: true, created: 0, message: 'الباقات موجودة مسبقاً' });
    }

    for (let i = 0; i < DEFAULT_PLANS.length; i++) {
      const p = DEFAULT_PLANS[i];
      const code = PLAN_CODES[i];
      const permissionIds = PLAN_FEATURES[code] ?? [];
      await prisma.plan.create({
        data: {
          ...p,
          currency: 'OMR',
          isActive: true,
          permissionsJson: JSON.stringify(permissionIds),
        },
      });
    }
    return NextResponse.json({ ok: true, created: DEFAULT_PLANS.length, message: 'تم إنشاء الباقات الافتراضية' });
  } catch (e) {
    console.error('POST /api/plans/init:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
