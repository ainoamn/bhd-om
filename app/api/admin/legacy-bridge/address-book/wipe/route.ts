import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import {
  wipeSiteAddressBookFromLegacy,
  type LegacyAddressBookWipeScope,
} from '@/lib/server/legacyBridge';

export const dynamic = 'force-dynamic';

const ALLOWED_SCOPES = new Set<LegacyAddressBookWipeScope>(['all', 'addressbook', 'tenants', 'owners']);

/** حذف دفتر العناوين من PostgreSQL عند التصفية من النظام القديم — يتطلب تأكيداً صريحاً */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const confirmNeonWipe = body?.confirmNeonWipe === true;
    const confirmPhrase = typeof body?.confirmPhrase === 'string' ? body.confirmPhrase.trim() : '';
    if (!confirmNeonWipe || confirmPhrase !== 'DELETE ADDRESS BOOK') {
      return NextResponse.json(
        {
          error: 'Neon wipe blocked',
          details:
            'Pass confirmNeonWipe:true and confirmPhrase:"DELETE ADDRESS BOOK" to permanently delete AddressBookContact rows.',
        },
        { status: 400 }
      );
    }

    const scopeRaw = typeof body?.scope === 'string' ? body.scope.trim() : 'all';
    const scope: LegacyAddressBookWipeScope = ALLOWED_SCOPES.has(scopeRaw as LegacyAddressBookWipeScope)
      ? (scopeRaw as LegacyAddressBookWipeScope)
      : 'all';

    const result = await wipeSiteAddressBookFromLegacy(scope);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('legacy address-book wipe error', error);
    return NextResponse.json({ error: 'Failed to wipe address book' }, { status: 500 });
  }
}
