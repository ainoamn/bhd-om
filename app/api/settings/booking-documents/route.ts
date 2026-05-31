import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import type { BookingDocument } from '@/lib/data/bookingDocuments';
import {
  listBookingDocumentsFromDb,
  saveBookingDocumentsToDb,
} from '@/lib/server/repositories/bookingDocumentStorageRepo';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const url = new URL(req.url);
    const bookingId = url.searchParams.get('bookingId')?.trim() || undefined;
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 500)));
    const list = await listBookingDocumentsFromDb({ bookingId, offset, limit });
    return NextResponse.json(list);
  } catch (e) {
    console.error('booking-documents GET error:', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER', 'CLIENT', 'OWNER', 'LANDLORD']);
    if (forbidden) return forbidden;
    const body = await req.json().catch(() => []);
    const docs = Array.isArray(body) ? (body as BookingDocument[]) : [];
    await saveBookingDocumentsToDb(docs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('booking-documents POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
