import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { markAllNotificationsRead } from '@/lib/server/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await markAllNotificationsRead(auth.userId);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error('PATCH /api/me/notifications/read-all:', e);
    return NextResponse.json({ error: 'Failed to mark all read' }, { status: 500 });
  }
}
