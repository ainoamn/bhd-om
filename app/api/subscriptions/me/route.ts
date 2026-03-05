/**
 * اشتراك المستخدم الحالي + طلب ترقية/تنزيل
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
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.sub as string;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: { select: { id: true, code: true, nameAr: true, nameEn: true, priceMonthly: true, priceYearly: true, currency: true, featuresJson: true, limitsJson: true } },
      },
    });

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true, priceMonthly: true, priceYearly: true, currency: true, featuresJson: true, limitsJson: true, sortOrder: true },
    });

    const pendingRequest = subscription
      ? await prisma.subscriptionChangeRequest.findFirst({
          where: { userId, status: 'pending' },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    return NextResponse.json({
      subscription: subscription ? {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        startAt: subscription.startAt.toISOString(),
        endAt: subscription.endAt.toISOString(),
        usage: subscription.usageJson ? (JSON.parse(subscription.usageJson) as Record<string, number>) : {},
        plan: subscription.plan
          ? {
              id: subscription.plan.id,
              code: subscription.plan.code,
              nameAr: subscription.plan.nameAr,
              nameEn: subscription.plan.nameEn,
              priceMonthly: subscription.plan.priceMonthly,
              priceYearly: subscription.plan.priceYearly,
              currency: subscription.plan.currency,
              features: subscription.plan.featuresJson ? (JSON.parse(subscription.plan.featuresJson) as string[]) : [],
              limits: subscription.plan.limitsJson ? (JSON.parse(subscription.plan.limitsJson) as Record<string, number>) : {},
            }
          : null,
      } : null,
      plans: plans.map((p) => ({
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
      })),
      pendingRequest: pendingRequest
        ? { id: pendingRequest.id, requestedPlanId: pendingRequest.requestedPlanId, direction: pendingRequest.direction, status: pendingRequest.status, createdAt: pendingRequest.createdAt.toISOString() }
        : null,
    });
  } catch (e) {
    console.error('GET /api/subscriptions/me:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.sub as string;
    const body = await req.json().catch(() => ({}));
    const { requestedPlanId, direction, reason, planId, durationMonths } = body as {
      requestedPlanId?: string;
      direction?: string;
      reason?: string;
      planId?: string;
      durationMonths?: number;
    };

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // إنشاء اشتراك جديد عند عدم وجود اشتراك (من صفحة الباقات العامة)
    if (!subscription) {
      const initialPlanId = planId || requestedPlanId;
      if (!initialPlanId) {
        return NextResponse.json({ error: 'planId required for new subscription' }, { status: 400 });
      }
      const plan = await prisma.plan.findUnique({ where: { id: initialPlanId } });
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
      }
      const months = Math.max(1, Math.min(120, Number(durationMonths) || 12));
      const startAt = new Date();
      const endAt = new Date(startAt);
      endAt.setMonth(endAt.getMonth() + months);
      await prisma.subscription.create({
        data: {
          userId,
          planId: initialPlanId,
          status: 'active',
          startAt,
          endAt,
          usageJson: JSON.stringify({ properties: 0, units: 0, bookings: 0, users: 1, storage: 0 }),
        },
      });
      return NextResponse.json({ ok: true, message: 'تم تفعيل الاشتراك بنجاح' });
    }

    // طلب ترقية/تنزيل عند وجود اشتراك
    if (!requestedPlanId || !direction || !['upgrade', 'downgrade'].includes(direction)) {
      return NextResponse.json({ error: 'requestedPlanId and direction (upgrade|downgrade) required' }, { status: 400 });
    }

    const planExists = await prisma.plan.findUnique({ where: { id: requestedPlanId } });
    if (!planExists) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    const existingPending = await prisma.subscriptionChangeRequest.findFirst({
      where: { userId, status: 'pending' },
    });
    if (existingPending) {
      return NextResponse.json({ error: 'لديك طلب قيد المراجعة بالفعل' }, { status: 400 });
    }

    await prisma.subscriptionChangeRequest.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        requestedPlanId,
        direction,
        reason: reason ?? null,
        status: 'pending',
      },
    });
    return NextResponse.json({ ok: true, message: 'تم إرسال الطلب بنجاح' });
  } catch (e) {
    console.error('POST /api/subscriptions/me:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
