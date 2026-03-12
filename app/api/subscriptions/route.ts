/**
 * قائمة الاشتراكات (أدمن) + تعيين باقة لمستخدم
 * GET يستخدم استعلاماً خاماً لقراءة الاشتراكات لتفادي خطأ أعمدة/جدول غير متطابق
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUB_COL_MAP: Record<string, string[]> = {
  id: ['id'],
  userId: ['userId', 'user_id'],
  planId: ['planId', 'plan_id'],
  status: ['status'],
  startAt: ['startAt', 'start_at'],
  endAt: ['endAt', 'end_at'],
};

function getSubVal(row: Record<string, unknown>, col: string | undefined): unknown {
  if (!col) return undefined;
  return row[col];
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    const role = token?.role as string | undefined;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tableSub = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'subscription' LIMIT 1
    `;
    const subTableName = tableSub?.[0]?.table_name;
    if (!subTableName) {
      return NextResponse.json({ list: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }

    const colsResult = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${subTableName} ORDER BY ordinal_position`
    );
    const colSet = new Set((colsResult || []).map((c) => c.column_name));

    const selectCols: string[] = [];
    const keyToCol: Record<string, string> = {};
    for (const [key, candidates] of Object.entries(SUB_COL_MAP)) {
      const found = candidates.find((c) => colSet.has(c));
      if (found) {
        selectCols.push(found);
        keyToCol[key] = found;
      }
    }
    if (selectCols.length < 4) {
      return NextResponse.json({ list: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }

    const quoted = selectCols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(', ');
    const safeTable = `"${String(subTableName).replace(/"/g, '""')}"`;
    const orderCol = colSet.has('createdAt') ? '"createdAt"' : '"id"';
    const raw = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${quoted} FROM ${safeTable} ORDER BY ${orderCol} DESC NULLS LAST`
    );

    const list = (raw || []).map((r) => {
      const startVal = getSubVal(r, keyToCol.startAt);
      const endVal = getSubVal(r, keyToCol.endAt);
      return {
        id: String(getSubVal(r, keyToCol.id) ?? ''),
        userId: String(getSubVal(r, keyToCol.userId) ?? ''),
        planId: String(getSubVal(r, keyToCol.planId) ?? ''),
        status: String(getSubVal(r, keyToCol.status) ?? 'active'),
        startAt: startVal != null ? new Date(startVal as string | Date).toISOString() : new Date().toISOString(),
        endAt: endVal != null ? new Date(endVal as string | Date).toISOString() : new Date().toISOString(),
      };
    });

    const userIds = [...new Set(list.map((s) => s.userId).filter(Boolean))];
    const planIds = [...new Set(list.map((s) => s.planId).filter(Boolean))];

    let usersMap: Record<string, { name: string; email: string; serialNumber: string }> = {};
    let plansMap: Record<string, { nameAr: string; nameEn: string }> = {};

    try {
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, serialNumber: true },
        });
        users.forEach((u) => { usersMap[u.id] = { name: u.name, email: u.email, serialNumber: u.serialNumber }; });
      }
      if (planIds.length > 0) {
        const plans = await prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, nameAr: true, nameEn: true },
        });
        plans.forEach((p) => { plansMap[p.id] = { nameAr: p.nameAr, nameEn: p.nameEn }; });
      }
    } catch (enrichErr) {
      console.error('GET /api/subscriptions enrich:', enrichErr);
    }

    const enriched = list.map((s) => ({
      ...s,
      user: usersMap[s.userId] ?? { name: '—', email: '—', serialNumber: '—' },
      plan: plansMap[s.planId] ?? { nameAr: '—', nameEn: '—' },
    }));

    return NextResponse.json({ list: enriched }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
    });
  } catch (e) {
    console.error('GET /api/subscriptions:', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, planId, durationMonths = 12 } = body as { userId: string; planId: string; durationMonths?: number };
    if (!userId || !planId) {
      return NextResponse.json({ error: 'userId and planId required' }, { status: 400 });
    }

    // التحقق من وجود الباقة باستعلام خام لتفادي خطأ أعمدة Plan في الإنتاج
    const tablePlan = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'plan' LIMIT 1
    `;
    const planTable = tablePlan?.[0]?.table_name;
    if (!planTable) {
      return NextResponse.json({ error: 'Plan table not available' }, { status: 500 });
    }
    const safePlanTable = `"${String(planTable).replace(/"/g, '""')}"`;
    const planRow = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM ${safePlanTable} WHERE id = $1 LIMIT 1`,
      planId
    );
    if (!planRow?.length) return NextResponse.json({ error: 'Plan not found' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + (durationMonths || 12));
    const usageJson = JSON.stringify({ properties: 0, units: 0, bookings: 0, users: 0, storage: 0 });

    // استعلام خام لـ upsert الاشتراك إن فشل Prisma (جدول أو أعمدة غير متطابقة)
    try {
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          status: 'active',
          startAt,
          endAt,
          usageJson,
        },
        update: {
          planId,
          status: 'active',
          startAt,
          endAt,
        },
      });
    } catch (upsertErr) {
      const msg = upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
      console.error('POST /api/subscriptions upsert:', upsertErr);
      return NextResponse.json({ error: 'Server error', details: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('POST /api/subscriptions:', e);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
