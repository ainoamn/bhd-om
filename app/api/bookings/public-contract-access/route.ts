import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicContractBundle,
  savePublicContractChecks,
  syncPublicContractDocuments,
  updatePublicContractBooking,
} from '@/lib/server/publicContractAccess';
import { syncPublicContractContact } from '@/lib/server/publicContractContactSync';
import { isAllowedBrowserOrigin } from '@/lib/server/requestOrigin';
import type { BookingDocument } from '@/lib/data/bookingDocuments';
import type { BookingCheckEntry } from '@/lib/data/bookingChecks';

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

    const bundle = await getPublicContractBundle({
      propertyId,
      bookingId,
      email,
      phone,
      civilId,
    });

    if (bundle.bookings.length === 0) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (e) {
    console.error('GET /api/bookings/public-contract-access', e);
    return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAllowedBrowserOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || '');
    const bookingId = String(body.bookingId || '').trim();
    const email = String(body.email || '').trim() || undefined;
    const phone = String(body.phone || '').trim() || undefined;
    const civilId = String(body.civilId || '').trim() || undefined;

    if (!bookingId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'syncDocuments') {
      const documents = Array.isArray(body.documents) ? (body.documents as BookingDocument[]) : [];
      const result = await syncPublicContractDocuments({ bookingId, email, phone, documents });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.error === 'BOOKING_NOT_FOUND' ? 404 : 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'saveChecks') {
      const checks = Array.isArray(body.checks) ? (body.checks as BookingCheckEntry[]) : [];
      const result = await savePublicContractChecks({ bookingId, email, phone, checks });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.error === 'BOOKING_NOT_FOUND' ? 404 : 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'updateBooking') {
      const updates =
        body.updates && typeof body.updates === 'object' && !Array.isArray(body.updates)
          ? (body.updates as Record<string, unknown>)
          : {};
      const result = await updatePublicContractBooking({ bookingId, email, phone, civilId, updates });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.error === 'BOOKING_NOT_FOUND' ? 404 : 400 });
      }
      return NextResponse.json({ ok: true, booking: result.booking });
    }

    if (action === 'syncContact') {
      const contact =
        body.contact && typeof body.contact === 'object' && !Array.isArray(body.contact)
          ? (body.contact as Record<string, unknown>)
          : {};
      const contactId = String(body.contactId || contact.id || '').trim() || undefined;
      const result = await syncPublicContractContact({
        bookingId,
        email,
        phone,
        civilId,
        contactId,
        contact,
      });
      if (!result.ok) {
        const status =
          result.error === 'BOOKING_NOT_FOUND'
            ? 404
            : result.code?.startsWith('DUPLICATE')
              ? 409
              : 400;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
      }
      return NextResponse.json({ ok: true, contactId: result.contactId, contact: result.contact });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('PATCH /api/bookings/public-contract-access', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
