/**
 * تسجيل الدخول المخصص: يتحقق من البريد/كلمة المرور وينشئ جلسة NextAuth يدوياً.
 * يستخدم نفس منطق التحقق ونفس كوكي الجلسة ليتوافق مع useSession و getServerSession.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60; // 24 ساعة (مطابق لـ authOptions)
const COOKIE_NAME =
  process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailOrUser = (body?.email ?? body?.emailOrUsername ?? body?.username ?? '').toString().trim();
    const password = (body?.password ?? '').toString().trim();
    const callbackUrl = typeof body?.callbackUrl === 'string' && body.callbackUrl.startsWith('/')
      ? body.callbackUrl
      : '/ar/admin';

    if (!emailOrUser || !password) {
      return NextResponse.json(
        { ok: false, error: 'missing', message: 'البريد أو كلمة المرور فارغة' },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: 'config', message: 'NEXTAUTH_SECRET غير معرّف' },
        { status: 500 }
      );
    }

    const isEmail = emailOrUser.includes('@');
    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: emailOrUser.toLowerCase() } })
      : await prisma.user.findUnique({ where: { serialNumber: emailOrUser.toUpperCase() } });

    if (!user || !user.password) {
      return NextResponse.json(
        { ok: false, error: 'invalid_credentials', message: 'اسم المستخدم/البريد أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'invalid_credentials', message: 'اسم المستخدم/البريد أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // نفس الحقول التي يضعها lib/auth في الـ JWT (jwt callback)
    const tokenPayload = {
      sub: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      id: user.id,
      role: user.role,
      dashboardType: (user as { dashboardType?: string | null }).dashboardType ?? undefined,
      phone: user.phone ?? undefined,
      serialNumber: user.serialNumber ?? undefined,
    };

    const token = await encode({
      token: tokenPayload,
      secret,
      maxAge: SESSION_MAX_AGE,
    });

    const res = NextResponse.json({ ok: true, url: callbackUrl });
    const isSecure = process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://');
    res.cookies.set(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json(
      { ok: false, error: 'exception', message: err.message },
      { status: 500 }
    );
  }
}
