/**
 * قائمة الاشتراكات (أدمن) + تعيين باقة لمستخدم
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
    const role = token?.role as string | undefined;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, serialNumber: true, role: true } },
        plan: { select: { id: true, code: true, nameAr: true, nameEn: true, priceMonthly: true, currency: true } },
        changeRequests: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const list = subscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      planId: s.planId,
      status: s.status,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      usage: s.usageJson ? (JSON.parse(s.usageJson) as Record<string, number>) : {},
      user: s.user,
      plan: s.plan,
      pendingChangeRequests: s.changeRequests.length,
    }));

    return NextResponse.json({ list }, {
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
