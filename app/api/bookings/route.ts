/**
 * تخزين واسترجاع الحجوزات على الخادم حتى تظهر في لوحة الإدارة والمحاسبة.
 * للمستخدمين غير الأدمن: تُرجَع فقط الحجوزات الخاصة بعقارات ضمن نطاقهم (ب، ر، د).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDataScope, propertyScopeWhere } from '@/lib/auth/adminPermissions';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    const session = token
      ? {
          user: {
            id: token.sub as string | undefined,
            role: token.role as string | undefined,
            organizationId: token.organizationId as string | null | undefined,
          },
        }
      : null;
    const scope = getDataScope(session);

    const rows = await prisma.bookingStorage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    let bookings = rows.map((r) => {
      try {
        return JSON.parse(r.data) as { propertyId?: number | string; [k: string]: unknown };
      } catch {
        return null;
      }
    }).filter(Boolean) as { propertyId?: number | string; [k: string]: unknown }[];

    if (scope.userId && !scope.isAdmin) {
      const where = propertyScopeWhere(scope);
      const allowedProperties = await prisma.property.findMany({
        where: { ...where, isArchived: false },
        select: { id: true },
      });
      const allowedIds = new Set(allowedProperties.map((p) => p.id));
      bookings = bookings.filter((b) => {
        const pid = b.propertyId;
        if (pid == null) return false;
        const idStr = String(pid);
        return allowedIds.has(idStr);
      });
    }

    return NextResponse.json(bookings);
  } catch (e) {
    console.error('Bookings GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }
    const data = JSON.stringify(body);
    await prisma.bookingStorage.upsert({
      where: { bookingId: id },
      create: { bookingId: id, data },
      update: { data, updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('Bookings POST error:', e);
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
  }
}
