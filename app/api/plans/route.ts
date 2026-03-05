/**
 * قائمة الباقات المتاحة — للجميع (أو للمصادقين فقط حسب الحاجة)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
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
      sortOrder: p.sortOrder,
    }));
    return NextResponse.json({ list });
  } catch (e) {
    console.error('GET /api/plans:', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}
