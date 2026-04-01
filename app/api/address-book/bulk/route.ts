import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';

type BulkContact = { id?: string; userId?: string | null } & Record<string, unknown>;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => [])) as unknown;
    const rows = Array.isArray(body) ? (body as BulkContact[]) : [];
    if (rows.length === 0) return NextResponse.json({ ok: true, upserted: 0 });

    const clean = rows
      .map((r) => ({ ...r, id: typeof r.id === 'string' ? r.id.trim() : '' }))
      .filter((r) => r.id.length > 0);
    if (clean.length === 0) return NextResponse.json({ ok: true, upserted: 0 });

    await prisma.$transaction(
      clean.map((row) => {
        const linkedUserId =
          typeof row.userId === 'string' && row.userId.trim().length > 0 ? row.userId.trim() : null;
        return prisma.addressBookContact.upsert({
          where: { contactId: row.id as string },
          create: { contactId: row.id as string, linkedUserId, data: row },
          update: { linkedUserId, data: row, updatedAt: new Date() },
        });
      })
    );

    return NextResponse.json({ ok: true, upserted: clean.length });
  } catch (e) {
    console.error('Address book bulk POST error:', e);
    return NextResponse.json({ error: 'Failed to bulk sync contacts' }, { status: 500 });
  }
}

