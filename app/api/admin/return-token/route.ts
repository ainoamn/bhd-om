/**
 * إصدار رمز لمرة واحدة للعودة إلى حساب الأدمن بعد "تسجيل الدخول كمستخدم".
 * يُستدعى قبل تسجيل الخروج عند الضغط على "فتح حساب" ويُخزّن الرمز في الجلسة.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createImpersonateToken } from '@/lib/impersonate';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token || (token.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminId = (token.sub ?? token.id) as string;
    if (!adminId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    const returnToken = createImpersonateToken(adminId);
    return NextResponse.json({ token: returnToken });
  } catch (e) {
    console.error('Return token error:', e);
    return NextResponse.json({ error: 'Failed to create return token' }, { status: 500 });
  }
}
