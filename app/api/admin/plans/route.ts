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
    function parseJson<T>(raw: string | null, fallback: T): T {
      if (!raw || typeof raw !== 'string') return fallback;
      try {
        const v = JSON.parse(raw) as T;
        return v ?? fallback;
      } catch {
        return fallback;
      }
    }

    const list = plans.map((p) => ({
      id: p.id,
      code: p.code,
      nameAr: p.nameAr ?? '',
      nameEn: p.nameEn ?? '',
      priceMonthly: Number(p.priceMonthly) || 0,
      priceYearly: p.priceYearly != null ? Number(p.priceYearly) : undefined,
      currency: p.currency ?? 'OMR',
      features: parseJson<string[]>(p.featuresJson, []),
      limits: parseJson<Record<string, number>>(p.limitsJson, {}),
      permissions: parseJson<string[]>(p.permissionsJson, []),
      isActive: Boolean(p.isActive),
      sortOrder: Number(p.sortOrder) || 0,
    }));
    return NextResponse.json({ list }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('GET /api/admin/plans:', e);
    return NextResponse.json({ error: 'Server error', details: message, list: [] }, { status: 500 });
  }
}
