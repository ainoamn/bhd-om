import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { importAddressBookCsvServer } from '@/lib/server/importAddressBookCsv';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** POST: استيراد CSV إلى دفتر العناوين على الخادم */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as { csv?: string };
    const csv = typeof body.csv === 'string' ? body.csv : '';
    if (!csv.trim()) {
      return NextResponse.json({ error: 'Missing csv' }, { status: 400 });
    }

    const result = await importAddressBookCsvServer(csv);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('POST /api/admin/address-book/import-csv', e);
    return NextResponse.json({ error: 'CSV import failed' }, { status: 500 });
  }
}
