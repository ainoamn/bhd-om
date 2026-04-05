/**
 * يضمن صف دفتر العناوين لكل مستخدم في قاعدة البيانات (بدون الاعتماد على localStorage).
 * يستبدل زر «تحديث من المستخدمين» القديم الذي كان يستخدم createContact محلياً فقط.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';

const NO_STORE = 'private, no-store, must-revalidate';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        serialNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    });

    let ensured = 0;
    let failed = 0;
    for (const u of users) {
      try {
        await ensureAddressBookContactForUser({
          userId: u.id,
          serialNumber: u.serialNumber,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
        });
        ensured += 1;
      } catch (e) {
        failed += 1;
        console.error('bulk-ensure-from-users row:', u.id, e);
      }
    }

    return NextResponse.json(
      { ensured, failed, total: users.length },
      { headers: { 'Cache-Control': NO_STORE } }
    );
  } catch (e) {
    console.error('bulk-ensure-from-users POST error:', e);
    return NextResponse.json({ error: 'Failed to bulk ensure' }, { status: 500 });
  }
}
