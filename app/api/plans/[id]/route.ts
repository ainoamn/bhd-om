/**
 * تحديث باقة — للأدمن فقط
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    if (nameAr !== undefined && nameAr !== null) updateData.nameAr = String(nameAr);
    if (nameEn !== undefined && nameEn !== null) updateData.nameEn = String(nameEn);
    if (priceMonthly !== undefined && priceMonthly !== null) {
      const n = Number(priceMonthly);
      if (!Number.isNaN(n)) updateData.priceMonthly = n;
    }
    if (priceYearly !== undefined) {
      if (priceYearly === null) updateData.priceYearly = null;
      else {
        const n = Number(priceYearly);
        if (!Number.isNaN(n)) updateData.priceYearly = n;
      }
    }
    if (currency !== undefined && currency !== null) updateData.currency = String(currency);
    if (featuresJson !== undefined) updateData.featuresJson = featuresJson == null ? null : String(featuresJson);
    if (limitsJson !== undefined) updateData.limitsJson = limitsJson == null ? null : String(limitsJson);
    if (permissionsJson !== undefined) updateData.permissionsJson = permissionsJson == null ? null : String(permissionsJson);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (sortOrder !== undefined && sortOrder !== null) {
      const n = Number(sortOrder);
      if (!Number.isNaN(n)) updateData.sortOrder = Math.floor(n);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ ok: true, plan: { id: plan.id, code: plan.code } });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const message = err?.message ?? (e instanceof Error ? e.message : String(e));
    console.error('PATCH /api/plans/[id]:', e);
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
