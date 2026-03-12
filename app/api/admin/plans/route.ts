/**
 * قائمة الباقات للأدمن — استعلام خام حسب الأعمدة الموجودة لتفادي خطأ "column does not exist"
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** أسماء الأعمدة المتوقعة في الجدول (Prisma) مع بدائل محتملة في DB */
const COL_MAP: Record<string, string[]> = {
  id: ['id'],
  code: ['code'],
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
const PLAN_KEYS = Object.keys(COL_MAP) as (keyof typeof COL_MAP)[];

function getVal(row: Record<string, unknown>, col: string | undefined): unknown {
  if (!col) return undefined;
  return row[col];
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || typeof raw !== 'string') return fallback;
  try {
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tableResult = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'plan'
      LIMIT 1
    `;
    const tableName = tableResult?.[0]?.table_name;
    if (!tableName) {
      return NextResponse.json({ list: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }
    const columnsResult = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} ORDER BY ordinal_position`
    );
    const existingCols = new Set((columnsResult || []).map((r) => r.column_name));
    if (existingCols.size === 0) {
      return NextResponse.json({ list: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }

    const selectCols: string[] = [];
    const keyToDbCol: Record<string, string> = {};
    for (const key of PLAN_KEYS) {
      const candidates = COL_MAP[key] ?? [key];
      const found = candidates.find((c) => existingCols.has(c));
      if (found) {
        selectCols.push(found);
        keyToDbCol[key] = found;
      }
    }
    if (selectCols.length === 0) {
      return NextResponse.json({ list: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }

    const quoted = selectCols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(', ');
    const orderCol = keyToDbCol.sortOrder ? `"${keyToDbCol.sortOrder.replace(/"/g, '""')}"` : '"id"';
    const safeTable = `"${String(tableName).replace(/"/g, '""')}"`;
    const raw = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${quoted} FROM ${safeTable} ORDER BY ${orderCol} ASC NULLS LAST`
    );

    const list = (raw || []).map((p) => ({
      id: String(getVal(p, keyToDbCol.id) ?? ''),
      code: String(getVal(p, keyToDbCol.code) ?? ''),
      nameAr: String(getVal(p, keyToDbCol.nameAr) ?? ''),
      nameEn: String(getVal(p, keyToDbCol.nameEn) ?? ''),
      priceMonthly: Number(getVal(p, keyToDbCol.priceMonthly)) || 0,
      priceYearly: keyToDbCol.priceYearly && getVal(p, keyToDbCol.priceYearly) != null ? Number(getVal(p, keyToDbCol.priceYearly)) : undefined,
      currency: String(getVal(p, keyToDbCol.currency) ?? 'OMR'),
      features: parseJson<string[]>(getVal(p, keyToDbCol.featuresJson) as string | null, []),
      limits: parseJson<Record<string, number>>(getVal(p, keyToDbCol.limitsJson) as string | null, {}),
      permissions: parseJson<string[]>(getVal(p, keyToDbCol.permissionsJson) as string | null, []),
      isActive: Boolean(getVal(p, keyToDbCol.isActive)),
      sortOrder: Number(getVal(p, keyToDbCol.sortOrder)) || 0,
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
