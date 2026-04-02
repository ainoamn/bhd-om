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
        createdAt: true,
        subscriptions: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          where: { status: 'active' },
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            plan: { select: { id: true, code: true, nameAr: true, nameEn: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const safeEmail = user.email?.includes('@nologin.bhd') ? null : user.email;
    const safePhone = user.phone || null;

    // إحصاءات خفيفة (مسموح بها في صفحة scan العامة):
    // - عقارات يملكها هذا المستخدم كمالك (ownerId)
    // - عدد الحجوزات/المعاينات المرتبطة بالبريد/الهاتف (PropertyBooking)
    const [ownedPropertiesCount, bookingsCount, viewingsCount] = await Promise.all([
      prisma.property.count({ where: { ownerId: user.id, isArchived: false } }),
      safeEmail || safePhone
        ? prisma.propertyBooking.count({
            where: {
              type: 'BOOKING',
              status: { not: 'CANCELLED' },
              OR: [
                ...(safeEmail ? [{ email: safeEmail }] : []),
                ...(safePhone ? [{ phone: safePhone }] : []),
              ],
            },
          })
        : Promise.resolve(0),
      safeEmail || safePhone
        ? prisma.propertyBooking.count({
            where: {
              type: 'VIEWING',
              status: { not: 'CANCELLED' },
              OR: [
                ...(safeEmail ? [{ email: safeEmail }] : []),
                ...(safePhone ? [{ phone: safePhone }] : []),
              ],
            },
          })
        : Promise.resolve(0),
    ]);

    const sub = user.subscriptions?.[0] ?? null;

    return NextResponse.json({
      id: user.id,
      serialNumber: user.serialNumber,
      name: user.name,
      email: safeEmail,
      phone: safePhone,
      role: user.role,
      createdAt: user.createdAt,
      subscription: sub
        ? {
            status: sub.status,
            startAt: sub.startAt,
            endAt: sub.endAt,
            plan: sub.plan ? { code: sub.plan.code, nameAr: sub.plan.nameAr, nameEn: sub.plan.nameEn } : null,
          }
        : null,
      stats: {
        ownedProperties: ownedPropertiesCount,
        bookings: bookingsCount,
        viewings: viewingsCount,
      },
      // تقييم placeholder — تجهيز للنظام القادم
      rating: {
        level: 'BRONZE',
        score: 0,
        stars: 0,
      },
    });
  } catch (e) {
    console.error('Scan user API error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
