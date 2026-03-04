/**
 * مسار تشخيصي مؤقت للتحقق من تسجيل الدخول — احذفه بعد حل المشكلة
 * GET /api/debug-auth?email=admin@bhd-om.com
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get('email') || 'admin@bhd-om.com';
  const testPassword = 'admin123';

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, role: true, password: true },
    });

    if (!user) {
      return NextResponse.json({
        ok: false,
        error: 'USER_NOT_FOUND',
        message: 'لا يوجد مستخدم بهذا البريد',
        email: email.toLowerCase(),
      });
    }

    const passwordMatch = await compare(testPassword, user.password);
    return NextResponse.json({
      ok: true,
      userFound: true,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordMatches: passwordMatch,
      message: passwordMatch
        ? 'المستخدم موجود وكلمة المرور صحيحة'
        : 'المستخدم موجود لكن كلمة المرور غير مطابقة',
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: 'EXCEPTION',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
