/**
 * GET حساب مبلغ الترقية بعد خصم المتبقي من الاشتراك الحالي (proration).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDocumentByIdFromDb } from '@/lib/accounting/data/dbService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const requestedPlanId = req.nextUrl.searchParams.get('requestedPlanId');
    if (!requestedPlanId) {
      return NextResponse.json({ error: 'requestedPlanId required' }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }).catch(() => null);
    if (!sub) {
      return NextResponse.json({ error: 'No subscription' }, { status: 400 });
    }

    const requestedPlan = await prisma.plan.findUnique({ where: { id: requestedPlanId } }).catch(() => null);
    if (!requestedPlan || requestedPlan.sortOrder <= (sub.plan?.sortOrder ?? 0)) {
      return NextResponse.json({ error: 'Plan not valid for upgrade' }, { status: 400 });
    }

    const now = new Date();
    const startAt = sub.startAt;
    const endAt = sub.endAt;
    const totalMs = endAt.getTime() - startAt.getTime();
    const totalDays = Math.max(1, totalMs / (24 * 60 * 60 * 1000));
    const remainingMs = Math.max(0, endAt.getTime() - now.getTime());
    const remainingDays = remainingMs / (24 * 60 * 60 * 1000);

    let amountPaidCurrent: number = sub.plan?.priceMonthly ?? 0;
    if (sub.receiptDocumentId) {
      try {
        const doc = await getDocumentByIdFromDb(sub.receiptDocumentId);
        if (doc?.totalAmount != null) amountPaidCurrent = Number(doc.totalAmount);
      } catch {
        // use plan price
      }
    }

    const remainingValue = totalDays > 0 ? (amountPaidCurrent * remainingDays) / totalDays : 0;
    const newPlanPrice = requestedPlan.priceMonthly ?? 0;
    const chargeAmount = Math.max(0, Math.round((newPlanPrice - remainingValue) * 100) / 100);

    return NextResponse.json({
      remainingValue: Math.round(remainingValue * 100) / 100,
      chargeAmount,
      newPlanPrice,
      currency: 'OMR',
      remainingDays: Math.ceil(remainingDays),
      planNameAr: requestedPlan.nameAr,
      planNameEn: requestedPlan.nameEn,
    });
  } catch (e) {
    console.error('GET /api/subscriptions/me/upgrade-quote:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
