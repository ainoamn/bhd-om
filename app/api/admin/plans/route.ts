/**
 * قائمة الباقات للأدمن — تشمل كل الباقات (النشطة وغير النشطة) لإدارة التفاصيل
 * لا تخزين مؤقت كي تظهر التعديلات المحفوظة فوراً بعد الحفظ
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        featuresJson: true,
        limitsJson: true,
        permissionsJson: true,
        isActive: true,
        sortOrder: true,
      },
    });
    const list = plans.map((p) => ({
      id: p.id,
      code: p.code,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly ?? undefined,
      currency: p.currency,
      features: p.featuresJson ? (JSON.parse(p.featuresJson) as string[]) : [],
      limits: p.limitsJson ? (JSON.parse(p.limitsJson) as Record<string, number>) : {},
      permissions: p.permissionsJson ? (JSON.parse(p.permissionsJson) as string[]) : [],
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    }));
    return NextResponse.json({ list }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
    });
  } catch (e) {
    console.error('GET /api/admin/plans:', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}
