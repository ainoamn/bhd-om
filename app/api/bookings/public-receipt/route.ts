/**
 * إيصال حجز عام — يعتمد على bookingId في الرابط (كالسلوك السابق).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicBookingReceipt } from '@/lib/server/publicContractAccess';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get('bookingId')?.trim() || '';
    const propertyIdRaw = url.searchParams.get('propertyId');
    const propertyId = propertyIdRaw && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : undefined;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const result = await getPublicBookingReceipt({ bookingId, propertyId });
    if (!result) {
      return NextResponse.json({ error: 'RECEIPT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/bookings/public-receipt', e);
    return NextResponse.json({ error: 'Failed to load receipt' }, { status: 500 });
  }
}
