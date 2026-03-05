/**
 * قائمة الاشتراكات (أدمن) + تعيين باقة لمستخدم
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

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

    return NextResponse.json({ list });
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

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + (durationMonths || 12));

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        status: 'active',
        startAt,
        endAt,
        usageJson: JSON.stringify({ properties: 0, units: 0, bookings: 0, users: 0, storage: 0 }),
      },
      update: {
        planId,
        status: 'active',
        startAt,
        endAt,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/subscriptions:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
