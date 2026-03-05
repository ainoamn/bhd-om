/**
 * تحديث باقة — للأدمن فقط
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Plan id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const {
      nameAr,
      nameEn,
      priceMonthly,
      priceYearly,
      currency,
      featuresJson,
      limitsJson,
      permissionsJson,
      isActive,
      sortOrder,
    } = body as {
      nameAr?: string;
      nameEn?: string;
      priceMonthly?: number;
      priceYearly?: number;
      currency?: string;
      featuresJson?: string;
      limitsJson?: string;
      permissionsJson?: string;
      isActive?: boolean;
      sortOrder?: number;
    };

    const updateData: Record<string, unknown> = {};
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (priceMonthly !== undefined) updateData.priceMonthly = Number(priceMonthly);
    if (priceYearly !== undefined) updateData.priceYearly = priceYearly === null ? null : Number(priceYearly);
    if (currency !== undefined) updateData.currency = currency;
    if (featuresJson !== undefined) updateData.featuresJson = featuresJson;
    if (limitsJson !== undefined) updateData.limitsJson = limitsJson;
    if (permissionsJson !== undefined) updateData.permissionsJson = permissionsJson;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ ok: true, plan: { id: plan.id, code: plan.code } });
  } catch (e) {
    console.error('PATCH /api/plans/[id]:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
