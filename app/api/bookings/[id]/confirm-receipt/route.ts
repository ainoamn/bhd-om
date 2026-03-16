/**
 * تأكيد استلام مبلغ الحجز من قبل المحاسب — تحديث الحجز في قاعدة البيانات.
 * بعد التأكيد يظهر الحجز في الحجوزات بحالة «مؤكد الدفع» ويمكن إدخال البيانات.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDataScope } from '@/lib/auth/adminPermissions';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req: _req,
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

    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }

    const row = await prisma.bookingStorage.findUnique({
      where: { bookingId },
    });
    if (!row) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(row.data) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid booking data' }, { status: 400 });
    }

    if (data.type !== 'BOOKING' || !data.paymentConfirmed || !data.priceAtBooking) {
      return NextResponse.json({ error: 'Booking not eligible for confirmation' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updated = {
      ...data,
      accountantConfirmedAt: now,
      status: 'CONFIRMED',
      depositReceiptNumber: (data.depositReceiptNumber as string) || undefined,
    };

    // الحصول على رقم الإيصال من المحاسبة إن وُجد
    const doc = await prisma.accountingDocument.findFirst({
      where: { type: 'RECEIPT', reference: `booking:${bookingId}` },
      select: { serialNumber: true },
    });
    if (doc?.serialNumber) {
      (updated as Record<string, unknown>).depositReceiptNumber = doc.serialNumber;
    }

    await prisma.bookingStorage.update({
      where: { bookingId },
      data: { data: JSON.stringify(updated), updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, booking: updated });
  } catch (e) {
    console.error('Bookings confirm-receipt error:', e);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
