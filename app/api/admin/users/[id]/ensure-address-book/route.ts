/**
 * ضمان وجود صف دفتر العناوين لمستخدم — للمدير فقط.
 * يُستخدم بدل createContact المحلي (يتجنب DUPLICATE_PHONE في المتصفح عند وجود السجل على الخادم).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';
import { applyUserIdentityToContactJson } from '@/lib/server/applyUserIdentityToContactJson';

const NO_STORE = 'private, no-store, must-revalidate';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const { id: userId } = await params;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, serialNumber: true, name: true, email: true, phone: true, role: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await ensureAddressBookContactForUser({
      userId: dbUser.id,
      serialNumber: dbUser.serialNumber,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
    });

    /** إعادة جلب الصف — لا نرمي: findAddressBookRowByUserId يتضمن SQL خام + يحمي من الأعطال */
    let row = await findAddressBookRowByUserId(userId);
    if (!row) {
      try {
        row = await prisma.addressBookContact.findUnique({
          where: { linkedUserId: userId },
        });
      } catch {
        /* عمود غير متاح */
      }
    }
    if (!row) {
      try {
        row = await prisma.addressBookContact.findFirst({
          where: { data: { path: ['userId'], equals: userId } },
        });
      } catch {
        row = null;
      }
    }

    if (!row) {
      return NextResponse.json({ error: 'Could not create address book row' }, { status: 500 });
    }

    const data = { ...((row.data as Record<string, unknown>) || {}) };
    const cid = String(row.contactId || '').trim();
    if (typeof data.id !== 'string' || !String(data.id).trim()) {
      data.id = cid;
    }
    try {
      applyUserIdentityToContactJson(data, dbUser);
    } catch (applyErr) {
      console.error('ensure-address-book: applyUserIdentityToContactJson', applyErr);
      return NextResponse.json({ error: 'Invalid contact payload after ensure' }, { status: 500 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': NO_STORE } });
  } catch (e) {
    console.error('ensure-address-book POST error:', e);
    const detail = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    return NextResponse.json({ error: 'Failed to ensure address book', detail }, { status: 500 });
  }
}
