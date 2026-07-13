import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { buildReservationsListFromKv } from '@/lib/real-estate/buildReservationsList';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';

export const dynamic = 'force-dynamic';

const RESERVATIONS_KV_KEYS = ['bhd_unit_reservations'] as const;

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

    const kv = await getLegacyKvBulk('bhd_', [...RESERVATIONS_KV_KEYS]);
    const { rows, buildings } = buildReservationsListFromKv(kv.bhd_unit_reservations);

    return NextResponse.json(
      {
        source: 'neon-legacy-kv',
        syncedAt: new Date().toISOString(),
        rows,
        buildings,
        total: rows.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard reservations error', error);
    return NextResponse.json({ error: 'Failed to load reservations' }, { status: 500 });
  }
}
