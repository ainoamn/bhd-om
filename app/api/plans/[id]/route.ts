/**
 * تحديث باقة — للأدمن فقط. يستخدم استعلاماً خاماً حسب الأعمدة الموجودة لتفادي خطأ "column does not exist".
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COL_MAP: Record<string, string[]> = {
  nameAr: ['nameAr', 'name_ar'],
  nameEn: ['nameEn', 'name_en'],
  priceMonthly: ['priceMonthly', 'price_monthly'],
  priceYearly: ['priceYearly', 'price_yearly'],
  currency: ['currency'],
  featuresJson: ['featuresJson', 'features_json'],
  limitsJson: ['limitsJson', 'limits_json'],
  permissionsJson: ['permissionsJson', 'permissions_json'],
  isActive: ['isActive', 'is_active'],
  sortOrder: ['sortOrder', 'sort_order'],
};

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

    const tableResult = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'plan'
      LIMIT 1
    `;
    const tableName = tableResult?.[0]?.table_name;
    if (!tableName) {
      return NextResponse.json({ error: 'Plan table not found' }, { status: 500 });
    }

    const columnsResult = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} ORDER BY ordinal_position`
    );
    const existingCols = new Set((columnsResult ?? []).map((r) => r.column_name));

    if (!existingCols.has('id')) {
      return NextResponse.json({ error: 'Plan table missing id column' }, { status: 500 });
    }

    const setParts: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    for (const [key, dbNames] of Object.entries(COL_MAP)) {
      if (!(key in updateData)) continue;
      const dbCol = dbNames.find((c) => existingCols.has(c));
      if (!dbCol) continue;
      const val = updateData[key];
      setParts.push(`"${dbCol.replace(/"/g, '""')}" = $${paramIndex}`);
      values.push(val === null || val === undefined ? null : val);
      paramIndex += 1;
    }

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'No updatable columns exist in Plan table' }, { status: 400 });
    }

    const safeTable = `"${String(tableName).replace(/"/g, '""')}"`;
    const sql = `UPDATE ${safeTable} SET ${setParts.join(', ')} WHERE id = $${paramIndex}`;
    values.push(id);

    await prisma.$executeRawUnsafe(sql, ...values);

    const check = await prisma.$queryRawUnsafe<{ id: string; code: string }[]>(
      `SELECT id, code FROM ${safeTable} WHERE id = $1`,
      id
    );
    const plan = check?.[0];
    return NextResponse.json({ ok: true, plan: plan ? { id: plan.id, code: plan.code } : { id, code: '' } });
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
