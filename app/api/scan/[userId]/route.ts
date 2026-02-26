import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** API عامة لعرض بيانات المستخدم عند مسح الباركود - لا تتطلب تسجيل دخول */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        serialNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dashboardType: true,
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      serialNumber: user.serialNumber,
      name: user.name,
      email: user.email?.includes('@nologin.bhd') ? null : user.email,
      phone: user.phone,
      role: user.role,
      dashboardType: user.dashboardType,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error('Scan user API error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
