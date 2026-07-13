import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import {
  CALENDAR_KV_KEYS,
  collectDashboardCalendarEvents,
} from '@/lib/real-estate/dashboardCalendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk =
      isAdminLikeRole(auth.role) ||
      auth.role === 'ADMIN' ||
      auth.role === 'SUPER_ADMIN' ||
      auth.role === 'COMPANY' ||
      auth.role === 'ORG_MANAGER';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get('year')) || now.getFullYear();
    const month = Number(searchParams.get('month')) || now.getMonth() + 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 });
    }

    const kv = await getLegacyKvBulk('bhd_', [...CALENDAR_KV_KEYS]);
    const events = collectDashboardCalendarEvents(kv, year, month);

    return NextResponse.json(
      {
        source: 'neon-legacy-kv',
        syncedAt: new Date().toISOString(),
        year,
        month,
        events,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard calendar error', error);
    return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 });
  }
}
