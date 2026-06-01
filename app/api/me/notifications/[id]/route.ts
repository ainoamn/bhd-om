import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { markNotificationRead } from '@/lib/server/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { read?: boolean };
    if (body.read !== true) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const ok = await markNotificationRead(auth.userId, id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/me/notifications/[id]:', e);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
