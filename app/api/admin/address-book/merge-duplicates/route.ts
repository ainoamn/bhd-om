import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import {
  getAddressBookDuplicateSummary,
  mergeAllAddressBookDuplicatesServer,
} from '@/lib/server/mergeAddressBookDuplicates';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const summary = await getAddressBookDuplicateSummary();
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('GET /api/admin/address-book/merge-duplicates', e);
    return NextResponse.json({ error: 'Failed to read duplicate summary' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const result = await mergeAllAddressBookDuplicatesServer();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('POST /api/admin/address-book/merge-duplicates', e);
    return NextResponse.json({ error: 'Merge duplicates failed' }, { status: 500 });
  }
}
