/**
 * تأكيد استرداد المبلغ لمستخدم — يسمح للإدارة بتنزيل باقته بعد تنفيذ الاسترداد من لوحة المحاسبة.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REFUNDS_KEY = 'subscription_refunds';

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
    const { userId } = body as { userId: string };
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const setting = await prisma.appSetting.findUnique({ where: { key: REFUNDS_KEY } });
    const refunds: Record<string, string> = setting?.value ? (JSON.parse(setting.value) as Record<string, string>) : {};
    refunds[userId] = new Date().toISOString();
    await prisma.appSetting.upsert({
      where: { key: REFUNDS_KEY },
      create: { key: REFUNDS_KEY, value: JSON.stringify(refunds) },
      update: { value: JSON.stringify(refunds) },
    });

    return NextResponse.json({ ok: true, message: 'تم تسجيل استرداد المبلغ. يمكنك الآن تعيين الباقة الأقل للمستخدم.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('POST /api/subscriptions/refund-done:', e);
    return NextResponse.json({ error: 'Server error', details: msg }, { status: 500 });
  }
}
