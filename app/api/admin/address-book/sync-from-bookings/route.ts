import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { syncBookingsToAddressBookServer } from '@/lib/server/syncBookingsToAddressBook';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** POST: مزامنة دفتر العناوين من BookingStorage — server-first */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const result = await syncBookingsToAddressBookServer();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('POST /api/admin/address-book/sync-from-bookings', e);
    return NextResponse.json({ error: 'Sync from bookings failed' }, { status: 500 });
  }
}
