import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { initiateBookingPayment } from '@/lib/server/paymentGateway';
import { savePaymentPending } from '@/lib/server/repositories/paymentPendingRepo';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    const propertyId = Number(body.propertyId);
    const unitKey = typeof body.unitKey === 'string' ? body.unitKey : undefined;
    const payerEmail = typeof body.payerEmail === 'string' ? body.payerEmail.trim() : '';
    const payerName = typeof body.payerName === 'string' ? body.payerName.trim() : '';
    const bookingType = body.bookingType === 'VIEWING' ? 'VIEWING' : 'BOOKING';
    const locale = typeof body.locale === 'string' ? body.locale : 'ar';
    const pendingBooking =
      body.pendingBooking && typeof body.pendingBooking === 'object'
        ? (body.pendingBooking as Record<string, unknown>)
        : undefined;

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ error: 'Invalid propertyId' }, { status: 400 });
    }

    const result = await initiateBookingPayment({
      amount,
      currency: typeof body.currency === 'string' ? body.currency : 'OMR',
      propertyId,
      unitKey,
      payerEmail,
      payerName,
      bookingType,
      locale,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }

    if (pendingBooking && result.redirectUrl) {
      await savePaymentPending({
        sessionId: result.paymentReferenceNo,
        userId: auth.userId,
        propertyId,
        bookingPayload: pendingBooking,
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/bookings/payment/initiate', e);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}
