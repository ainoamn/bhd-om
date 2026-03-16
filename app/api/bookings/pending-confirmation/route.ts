/**
 * حجوزات مدفوعة بانتظار تأكيد المحاسب لاستلام المبلغ — من قاعدة البيانات.
 * تُعرض في لوحة المحاسبة لتأكيد الاستلام ثم إظهارها في الحجوزات لإدخال البيانات.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDataScope } from '@/lib/auth/adminPermissions';

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
    if (!scope.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.bookingStorage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const pending: unknown[] = [];
    for (const r of rows) {
      try {
        const b = JSON.parse(r.data) as {
          id?: string;
          type?: string;
          paymentConfirmed?: boolean;
          priceAtBooking?: number;
          accountantConfirmedAt?: string | null;
          [k: string]: unknown;
        };
        if (
          b.type === 'BOOKING' &&
          b.paymentConfirmed === true &&
          b.priceAtBooking != null &&
          b.priceAtBooking > 0 &&
          !b.accountantConfirmedAt
        ) {
          pending.push(b);
        }
      } catch {
        // skip invalid row
      }
    }
    return NextResponse.json(pending);
  } catch (e) {
    console.error('Bookings pending-confirmation GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
