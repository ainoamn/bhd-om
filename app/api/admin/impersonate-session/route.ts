/**
 * إنشاء جلسة حقيقية (كوكي) للمستخدم المختار عند "فتح حساب" من لوحة المدير.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getAuthSecret } from '@/lib/server/authSecret';

export const runtime = 'nodejs';

const SESSION_MAX_AGE = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: getAuthSecret(),
    });
    if (!token || (token.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized', ok: false }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'userId required', ok: false }, { status: 400 });
    }

    const secret = getAuthSecret();

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

    return NextResponse.json({ ok: true, sessionToken });
  } catch (e) {
    console.error('Impersonate session error:', e);
    return NextResponse.json({ error: 'Failed to create session', ok: false }, { status: 500 });
  }
}
