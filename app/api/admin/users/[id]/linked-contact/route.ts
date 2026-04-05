/**
 * جهة الاتصال المرتبطة بمستخدم محدد — للمدير فقط، من قاعدة البيانات (نفس مصدر «حسابي»)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';
import { applyUserIdentityToContactJson } from '@/lib/server/applyUserIdentityToContactJson';

const NO_STORE = 'private, no-store, must-revalidate';

export async function GET(
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

    let row = await findAddressBookRowByUserId(userId);
    if (!row) {
      await ensureAddressBookContactForUser({
        userId: dbUser.id,
        serialNumber: dbUser.serialNumber,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
      });
      row = await findAddressBookRowByUserId(userId);
    }
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
      return NextResponse.json(null, { headers: { 'Cache-Control': NO_STORE } });
    }

    const data = { ...((row.data as Record<string, unknown>) || {}) };
    const cid = String(row.contactId || '').trim();
    if (typeof data.id !== 'string' || !String(data.id).trim()) {
      data.id = cid;
    }
    applyUserIdentityToContactJson(data, dbUser);
    const rowLinkedRaw = (row as { linkedUserId?: string | null }).linkedUserId;
    const linkedUid = typeof rowLinkedRaw === 'string' ? rowLinkedRaw.trim() : '';
    data.linkedUserId = linkedUid || dbUser.id;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (e) {
    console.error('admin linked-contact GET error:', e);
    return NextResponse.json({ error: 'Failed to load linked contact' }, { status: 500 });
  }
}
