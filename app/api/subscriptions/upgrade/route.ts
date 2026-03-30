import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as { userId?: string; planId?: string; durationMonths?: number };
    const userId = String(body.userId || '').trim();
    const planId = String(body.planId || '').trim();
    const durationMonths = Number(body.durationMonths || 12);
    if (!userId || !planId) {
      return NextResponse.json({ error: 'userId and planId are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true, code: true } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + (Number.isFinite(durationMonths) ? durationMonths : 12));

    const updated = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        status: 'active',
        startAt,
        endAt,
        usageJson: JSON.stringify({ properties: 0, users: 0 }),
      },
      update: {
        planId,
        status: 'active',
        startAt,
        endAt,
      },
    });

    await logAudit({
      userId: auth.userId,
      action: 'SUBSCRIPTION_UPGRADE',
      targetType: 'Subscription',
      targetId: updated.id,
      details: { userId, planId: plan.id, planCode: plan.code, durationMonths },
    });

    return NextResponse.json({ ok: true, subscriptionId: updated.id, userId, planId: plan.id });
  } catch (e) {
    console.error('POST /api/subscriptions/upgrade', e);
    return NextResponse.json({ error: 'Failed to upgrade subscription' }, { status: 500 });
  }
}
