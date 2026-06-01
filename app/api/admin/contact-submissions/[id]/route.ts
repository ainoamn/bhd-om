import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { isRead?: boolean };
    if (typeof body.isRead !== 'boolean') {
      return NextResponse.json({ error: 'isRead required' }, { status: 400 });
    }

    const updated = await prisma.contactSubmission.updateMany({
      where: { id },
      data: { isRead: body.isRead },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/admin/contact-submissions/[id]:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
