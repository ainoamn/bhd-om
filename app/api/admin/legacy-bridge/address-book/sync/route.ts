import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import {
  syncLegacyAddressEntryToDatabase,
  type LegacyBridgeAddressEntry,
} from '@/lib/server/legacyBridge';

export const dynamic = 'force-dynamic';

/** رفع تعديلات دفتر العناوين من النظام القديم إلى PostgreSQL */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const entry = (body && typeof body === 'object' ? body.entry : null) as LegacyBridgeAddressEntry | null;
    if (!entry || typeof entry !== 'object') {
      return NextResponse.json({ error: 'Missing entry' }, { status: 400 });
    }

    const saved = await syncLegacyAddressEntryToDatabase(entry);
    if (!saved) {
      return NextResponse.json({ error: 'Missing site contact id' }, { status: 400 });
    }

    return NextResponse.json(saved, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code;
    if (
      code?.startsWith('DUPLICATE') ||
      msg.includes('identity') ||
      msg.includes('DUPLICATE') ||
      msg.includes('already registered')
    ) {
      return NextResponse.json({ error: msg, code: code || 'IDENTITY_CONFLICT' }, { status: 409 });
    }
    console.error('legacy address-book sync error', error);
    return NextResponse.json({ error: msg || 'Failed to sync address book entry' }, { status: 500 });
  }
}
