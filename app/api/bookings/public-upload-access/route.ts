/**
 * وصول عام لصفحة رفع المستندات — التحقق بالبريد + propertyId/bookingId.
 * GET: جلب الحجز والمستندات | PATCH: رفع/استبدال ملف (بعد رفع الملف إلى /api/upload/booking-documents).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  applyPublicDocumentReplace,
  applyPublicDocumentUpload,
  findBookingForPublicUpload,
  getDocumentsForBookingFromDb,
} from '@/lib/server/bookingDocumentsServer';
import { isAllowedBrowserOrigin } from '@/lib/server/requestOrigin';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const propertyId = Number(url.searchParams.get('propertyId') || 0);
    const email = String(url.searchParams.get('email') || '').trim();
    const bookingId = url.searchParams.get('bookingId')?.trim() || undefined;

    if (!propertyId || !email) {
      return NextResponse.json({ error: 'propertyId and email are required' }, { status: 400 });
    }

    const booking = await findBookingForPublicUpload({ propertyId, email, bookingId });
    if (!booking) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });
    }

    const id = String(booking.id || '');
    const documents = await getDocumentsForBookingFromDb(id);

    return NextResponse.json({
      booking: {
        id,
        email: booking.email,
        status: booking.status,
        propertyId: booking.propertyId,
        name: booking.name,
      },
      documents,
    });
  } catch (e) {
    console.error('GET /api/bookings/public-upload-access', e);
    return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAllowedBrowserOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || 'upload');
    const bookingId = String(body.bookingId || '').trim();
    const email = String(body.email || '').trim();
    const docId = String(body.docId || '').trim();
    const fileUrl = String(body.fileUrl || '').trim();
    const fileName = String(body.fileName || '').trim();

    if (!bookingId || !email || !docId || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'replace') {
      const oldFileUrl = String(body.oldFileUrl || '').trim();
      if (!oldFileUrl) {
        return NextResponse.json({ error: 'oldFileUrl required for replace' }, { status: 400 });
      }
      const result = await applyPublicDocumentReplace({
        bookingId,
        email,
        docId,
        oldFileUrl,
        newFileUrl: fileUrl,
        newFileName: fileName || 'document',
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.error === 'BOOKING_NOT_FOUND' ? 404 : 400 });
      }
      return NextResponse.json({ ok: true, document: result.document });
    }

    const result = await applyPublicDocumentUpload({
      bookingId,
      email,
      docId,
      fileUrl,
      fileName: fileName || 'document',
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'BOOKING_NOT_FOUND' ? 404 : 400 });
    }
    return NextResponse.json({ ok: true, document: result.document });
  } catch (e) {
    console.error('PATCH /api/bookings/public-upload-access', e);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
