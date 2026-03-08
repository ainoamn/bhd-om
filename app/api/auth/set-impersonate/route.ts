/**
 * ضبط كوكي الجلسة عبر استجابة توجيه (302) لضمان تطبيقها في كل المتصفحات بعد "فتح حساب".
 * يُستدعى بتوجيه المستخدم من الواجهة بعد نجاح POST /api/admin/impersonate-session.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60;
const COOKIE_NAME =
  process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const locale = (req.nextUrl.searchParams.get('locale') || 'ar').replace(/[^a-z]/gi, '') || 'ar';
  const redirectTo = `/${locale}/admin`;

  if (!token || token.length > 2000) {
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  const res = NextResponse.redirect(new URL(redirectTo, req.url), { status: 302 });
  const isSecure = process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://');
  res.cookies.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
