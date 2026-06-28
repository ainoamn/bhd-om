import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getContactWithAttachmentsForLegacy } from '@/lib/server/legacyBridge';

export const dynamic = 'force-dynamic';

/** قراءة جهة اتصال مع مرفقاتها من PostgreSQL (لاستعادة المرفقات بعد التحديث) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { contactId } = await params;
    const contact = await getContactWithAttachmentsForLegacy(contactId);
    if (!contact) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(contact, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('legacy address-book contact GET error', error);
    return NextResponse.json({ error: 'Failed to load contact' }, { status: 500 });
  }
}
