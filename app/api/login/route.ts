/**
 * تسجيل الدخول المخصص: يتحقق من البريد/كلمة المرور وينشئ جلسة NextAuth يدوياً.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { getAuthSecret } from '@/lib/server/authSecret';
import { getClientIp } from '@/lib/server/clientIp';
import { rateLimitRequest } from '@/lib/rate-limit';
import { loginTracker, auditSecurityEvent } from '@/lib/security';
import { requiresAdminTotp, verifyUserTotp, isAdminRole } from '@/lib/server/adminTotp';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60;
const COOKIE_NAME =
  process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export async function POST(req: NextRequest) {
  const limited = await rateLimitRequest(req, 'login', 10, 60);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const emailOrUser = (body?.email ?? body?.emailOrUsername ?? body?.username ?? '').toString().trim();
    const password = (body?.password ?? '').toString().trim();
    const callbackUrl = typeof body?.callbackUrl === 'string' && body.callbackUrl.startsWith('/')
      ? body.callbackUrl
      : '/ar/admin';

    const ip = getClientIp(req);
    const ua = req.headers.get('user-agent') ?? undefined;
    const lockKey = `${emailOrUser.toLowerCase()}:${ip}`;

    if (!emailOrUser || !password) {
      return NextResponse.json(
        { ok: false, error: 'missing', message: 'البريد أو كلمة المرور فارغة' },
        { status: 400 }
      );
    }

    const attempt = loginTracker.recordAttempt(lockKey);
    if (!attempt.allowed) {
      auditSecurityEvent({ type: 'LOGIN_FAILURE', ip, userAgent: ua, details: { reason: 'lockout', emailOrUser } });
      return NextResponse.json(
        { ok: false, error: 'locked', message: 'تم تجاوز عدد المحاولات. حاول لاحقاً.' },
        { status: 429 }
      );
    }

    let secret: string;
    try {
      secret = getAuthSecret();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'config',
          message: 'NEXTAUTH_SECRET غير معرّف. عيّنه في Vercel ثم أعد النشر.',
        },
        { status: 500 }
      );
    }

    const isEmail = emailOrUser.includes('@');
    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: emailOrUser.toLowerCase() } })
      : await prisma.user.findUnique({ where: { serialNumber: emailOrUser.toUpperCase() } });

    if (!user || !user.password) {
      auditSecurityEvent({ type: 'LOGIN_FAILURE', ip, userAgent: ua, details: { reason: 'invalid_credentials' } });
      return NextResponse.json(
        { ok: false, error: 'invalid_credentials', message: 'اسم المستخدم/البريد أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      auditSecurityEvent({ type: 'LOGIN_FAILURE', userId: user.id, ip, userAgent: ua, details: { reason: 'invalid_password' } });
      return NextResponse.json(
        { ok: false, error: 'invalid_credentials', message: 'اسم المستخدم/البريد أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const totpCode = (body?.totp ?? body?.totpCode ?? '').toString().trim();
    if (await requiresAdminTotp(user.id, user.role)) {
      if (!totpCode) {
        return NextResponse.json(
          { ok: false, requiresTotp: true, message: 'أدخل رمز المصادقة الثنائية (6 أرقام)' },
          { status: 403 }
        );
      }
      const totpOk = await verifyUserTotp(user.id, totpCode);
      if (!totpOk) {
        auditSecurityEvent({ type: 'LOGIN_FAILURE', userId: user.id, ip, userAgent: ua, details: { reason: 'invalid_totp' } });
        return NextResponse.json(
          { ok: false, error: 'invalid_totp', message: 'رمز المصادقة الثنائية غير صحيح' },
          { status: 401 }
        );
      }
    } else if (totpCode && isAdminRole(user.role)) {
      /* optional early setup verification ignored */
    }

    loginTracker.clearAttempts(lockKey);
    auditSecurityEvent({ type: 'LOGIN_SUCCESS', userId: user.id, ip, userAgent: ua });

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
