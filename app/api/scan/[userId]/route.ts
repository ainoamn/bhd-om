import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimitRequest } from '@/lib/rate-limit';

function maskEmail(email: string | null | undefined): string | null {
  if (!email || email.includes('@nologin.bhd')) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `***${digits.slice(-4)}`;
}

/** API لمسح الباركود — عام مع rate limit وتقليل PII */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const limited = await rateLimitRequest(req, 'scan-user', 30, 60);
  if (limited) return limited;

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
            status: true,
            startAt: true,
            endAt: true,
            plan: { select: { code: true, nameAr: true, nameEn: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const safeEmail = maskEmail(user.email);
    const safePhone = maskPhone(user.phone);

    const [ownedPropertiesCount, bookingsCount, viewingsCount] = await Promise.all([
      prisma.property.count({ where: { ownerId: user.id, isArchived: false } }),
      safeEmail || safePhone
        ? prisma.propertyBooking.count({
            where: {
              type: 'BOOKING',
              status: { not: 'CANCELLED' },
              OR: [
                ...(user.email && !user.email.includes('@nologin.bhd') ? [{ email: user.email }] : []),
                ...(user.phone ? [{ phone: user.phone }] : []),
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
                ...(user.email && !user.email.includes('@nologin.bhd') ? [{ email: user.email }] : []),
                ...(user.phone ? [{ phone: user.phone }] : []),
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
      rating: { level: 'BRONZE', score: 0, stars: 0 },
    });
  } catch (e) {
    console.error('Scan user API error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
