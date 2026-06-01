import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import {
  listUserNotifications,
  syncNotificationsFromBookings,
} from '@/lib/server/notifications';
import { CACHE_ME_NOTIFICATIONS_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import { parsePaginationParams } from '@/lib/server/pagination';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 100, defaultLimit: 50 });
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    try {
      await syncNotificationsFromBookings(auth.userId);
    } catch (e) {
      console.error('syncNotificationsFromBookings:', e);
    }

    const { items, total, unreadCount } = await listUserNotifications(auth.userId, {
      limit: pagination.limit,
      offset: pagination.offset,
      unreadOnly,
    });

    return NextResponse.json(
      { items, total, unreadCount },
      {
        headers: {
          'Cache-Control': CACHE_ME_NOTIFICATIONS_GET,
          Vary: HTTP_CACHE_VARY_AUTH,
          'X-Total-Count': String(total),
        },
      }
    );
  } catch (e) {
    console.error('GET /api/me/notifications:', e);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
