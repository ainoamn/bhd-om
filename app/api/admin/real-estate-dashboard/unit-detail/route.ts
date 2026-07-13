import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import { resolveUnitDetailExtras, UNIT_DETAIL_KV_KEYS } from '@/lib/real-estate/unitDetailExtras';
import { gatherUnitLedgerFromKv, UNIT_LEDGER_KV_KEYS } from '@/lib/real-estate/unitLedger';

export const dynamic = 'force-dynamic';

const ALL_KEYS = [...new Set([...UNIT_LEDGER_KV_KEYS, ...UNIT_DETAIL_KV_KEYS])];

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

    const building = req.nextUrl.searchParams.get('building')?.trim() ?? '';
    const unit = req.nextUrl.searchParams.get('unit')?.trim() ?? '';
    if (!building || !unit) {
      return NextResponse.json({ error: 'building and unit are required' }, { status: 400 });
    }

    const kv = await getLegacyKvBulk('bhd_', ALL_KEYS);
    const ledger = gatherUnitLedgerFromKv(kv, building, unit);
    const extras = resolveUnitDetailExtras(kv, building, unit);

    return NextResponse.json(
      {
        source: 'neon-legacy-kv',
        syncedAt: new Date().toISOString(),
        building,
        unit,
        ledger,
        extras,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard unit-detail error', error);
    return NextResponse.json({ error: 'Failed to load unit detail' }, { status: 500 });
  }
}
