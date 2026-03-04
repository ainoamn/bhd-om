/**
 * التحقق من صحة بيانات الدخول (نفس منطق lib/auth)
 * GET: تعليمات استخدام
 * POST body (JSON): { "email": "admin@bhd-om.com", "password": "admin123" }
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

export async function GET() {
  return NextResponse.json({
    usage: 'استخدم POST مع body بصيغة JSON: { "email": "البريد أو اسم المستخدم", "password": "كلمة المرور" }',
    example: 'POST /api/verify-credentials with body {"email":"admin@bhd-om.com","password":"admin123"}',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailOrUser = (body?.email ?? body?.emailOrUsername ?? body?.username ?? '').toString().trim();
    const password = (body?.password ?? '').toString().trim();

    if (!emailOrUser || !password) {
      return NextResponse.json({
        ok: false,
        error: 'missing',
        message: 'البريد أو كلمة المرور فارغة',
        keys: Object.keys(body),
      });
    }

    let user;
    try {
      const isEmail = emailOrUser.includes('@');
      user = isEmail
        ? await prisma.user.findUnique({ where: { email: emailOrUser.toLowerCase() } })
        : await prisma.user.findUnique({ where: { serialNumber: emailOrUser.toUpperCase() } });
    } catch (dbError) {
      const err = dbError instanceof Error ? dbError : new Error(String(dbError));
      return NextResponse.json({
        ok: false,
        error: 'database',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }

    if (!user || !user.password) {
      return NextResponse.json({
        ok: false,
        error: 'user_not_found',
        message: 'المستخدم غير موجود',
      });
    }

    let valid: boolean;
    try {
      valid = await compare(password, user.password);
    } catch (compareError) {
      const err = compareError instanceof Error ? compareError : new Error(String(compareError));
      return NextResponse.json({
        ok: false,
        error: 'compare',
        message: err.message,
      });
    }

    if (!valid) {
      return NextResponse.json({
        ok: false,
        error: 'invalid_password',
        message: 'كلمة المرور غير صحيحة',
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'البيانات صحيحة',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({
      ok: false,
      error: 'exception',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}
