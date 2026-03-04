/**
 * استعادة جلسة الأدمن باستخدام رمز العودة (مرة واحدة).
 * يُستخدم عند الضغط على "عودة للأدمن" بعد تسجيل الدخول كمستخدم — يعيد إنشاء الجلسة ويوجّه للوحة التحكم.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { verifyImpersonateToken } from '@/lib/impersonate';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60;
const COOKIE_NAME =
  process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const locale = (req.nextUrl.searchParams.get('locale') || 'ar').replace(/[^a-z]/gi, '') || 'ar';
  const redirectUrl = `/${locale}/admin`;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=missing_token`, req.url));
  }

  const verified = verifyImpersonateToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=invalid_or_expired`, req.url));
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=config`, req.url));
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, name: true, role: true, phone: true, serialNumber: true },
  });

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL(`/${locale}/login?error=not_admin`, req.url));
  }

  const tokenPayload = {
    sub: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    id: user.id,
    role: user.role,
    phone: user.phone ?? undefined,
    serialNumber: user.serialNumber ?? undefined,
  };

  const sessionToken = await encode({
    token: tokenPayload,
    secret,
    maxAge: SESSION_MAX_AGE,
  });

  const origin = req.nextUrl.origin;
  const res = NextResponse.redirect(new URL(redirectUrl, origin));
  const isSecure = process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://');
  res.cookies.set(COOKIE_NAME, sessionToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: SESSION_MAX_AGE,
  });

  return res;
}
