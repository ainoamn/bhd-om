import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import type { Contact } from '@/lib/data/addressBook';
import { prisma } from '@/lib/prisma';
import { buildAddressBookContactPrintHtml } from '@/lib/server/addressBookPrint';
import { resolveLegacyBridgeLocale } from '@/lib/server/legacyBridge';
import { withAddressBookSchemaHeal } from '@/lib/server/addressBookDbCompat';

export const dynamic = 'force-dynamic';

/** طباعة جهة اتصال بنفس أسلوب دفتر العناوين في الموقع — للاستخدام من النظام القديم */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contactId = req.nextUrl.searchParams.get('id')?.trim();
    if (!contactId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const row = await withAddressBookSchemaHeal(prisma, () =>
      prisma.addressBookContact.findFirst({
        where: { OR: [{ contactId }, { id: contactId }] },
      })
    );
    if (!row) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contact = row.data as unknown as Contact;
    if (!contact?.id) {
      return NextResponse.json({ error: 'Invalid contact data' }, { status: 404 });
    }

    const locale = resolveLegacyBridgeLocale(req);
    const origin = req.nextUrl.origin;
    const html = buildAddressBookContactPrintHtml(contact, {
      locale,
      origin,
      linkedUserId: row.linkedUserId,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('legacy address-book print error', error);
    return NextResponse.json({ error: 'Failed to build print report' }, { status: 500 });
  }
}
