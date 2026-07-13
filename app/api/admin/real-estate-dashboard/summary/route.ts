import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import { BHD_DASH_KV_KEYS } from '@/lib/real-estate/dashboardKvKeys';
import { computeRealEstateDashboardStats } from '@/lib/real-estate/dashboardStats';

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

    const kv = await getLegacyKvBulk('bhd_', [...BHD_DASH_KV_KEYS]);
    const stats = computeRealEstateDashboardStats(kv);

    return NextResponse.json(
      {
        source: 'neon-legacy-kv',
        syncedAt: new Date().toISOString(),
        stats,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard summary error', error);
    return NextResponse.json({ error: 'Failed to load dashboard summary' }, { status: 500 });
  }
}
