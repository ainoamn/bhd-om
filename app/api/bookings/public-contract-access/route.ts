/**
 * وصول عام لصفحة شروط العقد — التحقق بالبريد/الهاتف/الرقم المدني أو رابط bookingId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findBookingsForPublicContractAccess } from '@/lib/server/publicContractAccess';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const propertyIdRaw = url.searchParams.get('propertyId');
    const propertyId = propertyIdRaw && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : undefined;
    const bookingId = url.searchParams.get('bookingId')?.trim() || undefined;
    const email = url.searchParams.get('email')?.trim() || undefined;
    const phone = url.searchParams.get('phone')?.trim() || undefined;
    const civilId = url.searchParams.get('civilId')?.trim() || undefined;

    if (!bookingId && !email && !phone && !civilId) {
      return NextResponse.json({ error: 'bookingId or identity field required' }, { status: 400 });
    }

    const bookings = await findBookingsForPublicContractAccess({
      propertyId,
      bookingId,
      email,
      phone,
      civilId,
      allowRented: !!bookingId,
    });

    if (bookings.length === 0) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ bookings });
  } catch (e) {
    console.error('GET /api/bookings/public-contract-access', e);
    return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
  }
}
