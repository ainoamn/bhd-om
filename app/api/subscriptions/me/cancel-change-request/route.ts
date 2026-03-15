/**
 * إلغاء طلب ترقية/تنزيل الباقة إذا لم يُفعّل بعد.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { id: true },
    }).catch(() => null);
    if (!sub) {
      return NextResponse.json({ error: 'No subscription' }, { status: 400 });
    }

    const updated = await prisma.subscriptionChangeRequest.updateMany({
      where: { userId, subscriptionId: sub.id, status: 'approved' },
      data: { status: 'cancelled' },
    });

    if (updated.count === 0) {
      return NextResponse.json({ ok: false, message: 'لا يوجد طلب قيد التفعيل لإلغائه' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: 'تم إلغاء طلب الترقية/التنزيل' });
  } catch (e) {
    console.error('POST /api/subscriptions/me/cancel-change-request:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
