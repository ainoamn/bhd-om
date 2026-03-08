/**
 * إنشاء جلسة حقيقية (كوكي) للمستخدم المختار عند "فتح حساب" من لوحة المدير.
 * يسمح للمدير بالتنقل في الموقع (الرئيسية، العقارات، المشاريع...) وهو معرّف كمستخدم ذلك الحساب.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token || (token.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized', ok: false }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'userId required', ok: false }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET not set', ok: false }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, phone: true, serialNumber: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found', ok: false }, { status: 404 });
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

    // إرجاع التوكن في الجسد لاستخدامه في التوجيه عبر /api/auth/set-impersonate
    // (ضبط الكوكي عبر استجابة توجيه 302 يعمل بشكل موثوق في كل المتصفحات بدل Set-Cookie من fetch)
    return NextResponse.json({ ok: true, sessionToken });
  } catch (e) {
    console.error('Impersonate session error:', e);
    return NextResponse.json({ error: 'Failed to create session', ok: false }, { status: 500 });
  }
}
