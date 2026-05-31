import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { listAllBookingChecksFromDb, saveAllBookingChecksToDb } from '@/lib/server/bookingChecksServer';
import type { ChecksStoreEntry } from '@/lib/server/repositories/bookingCheckStorageRepo';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const value = await listAllBookingChecksFromDb();
    return NextResponse.json(value);
  } catch (e) {
    console.error('booking-checks GET error:', e);
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
    const entries = (Array.isArray(body) ? body : []) as ChecksStoreEntry[];
    await saveAllBookingChecksToDb(entries);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('booking-checks POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
