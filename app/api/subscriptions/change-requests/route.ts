/**
 * طلبات الترقية/التنزيل — أدمن: عرض واعتماد/رفض
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
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await prisma.subscriptionChangeRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    const planIds = [...new Set(requests.map((r) => r.requestedPlanId))];
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, code: true, nameAr: true, nameEn: true },
    });
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

    const userIds = [...new Set(requests.map((r) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, serialNumber: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const list = requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      subscriptionId: r.subscriptionId,
      requestedPlanId: r.requestedPlanId,
      direction: r.direction,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      user: userMap[r.userId] ?? null,
      requestedPlan: planMap[r.requestedPlanId] ?? null,
    }));

    return NextResponse.json({ list });
  } catch (e) {
    console.error('GET /api/subscriptions/change-requests:', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if ((token?.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { requestId, action } = body as { requestId: string; action: 'approve' | 'reject' };
    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'requestId and action (approve|reject) required' }, { status: 400 });
    }

    const changeRequest = await prisma.subscriptionChangeRequest.findUnique({
      where: { id: requestId },
      include: { subscription: true },
    });
    if (!changeRequest || changeRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 400 });
    }

    const reviewedById = token?.sub as string;

    if (action === 'approve') {
      const startAt = new Date();
      const endAt = new Date(startAt);
      endAt.setMonth(endAt.getMonth() + 12);
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: changeRequest.subscriptionId },
          data: { planId: changeRequest.requestedPlanId, startAt, endAt, status: 'active' },
        }),
        prisma.subscriptionChangeRequest.update({
          where: { id: requestId },
          data: { status: 'approved', reviewedAt: new Date(), reviewedById },
        }),
      ]);
    } else {
      await prisma.subscriptionChangeRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', reviewedAt: new Date(), reviewedById },
      });
    }

    return NextResponse.json({ ok: true, action });
  } catch (e) {
    console.error('PATCH /api/subscriptions/change-requests:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
