import { NextRequest, NextResponse } from 'next/server';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import { requireLegacyKvApiAccess } from '@/lib/server/legacyKvApiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET ?prefix=bhd_&keys=k1,k2 — توافق مع النظام القديم /api/kv */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireLegacyKvApiAccess(req);
    if (auth instanceof NextResponse) return auth;

    const prefix = req.nextUrl.searchParams.get('prefix') || 'bhd_';
    const keysParam = req.nextUrl.searchParams.get('keys') || '';
    const keys = keysParam
      ? keysParam
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;

    const data = await getLegacyKvBulk(prefix, keys);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': keys?.length
          ? 'private, max-age=60, stale-while-revalidate=180'
          : 'private, max-age=90, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('GET /api/kv error', error);
    return NextResponse.json({ error: 'Failed to load legacy data' }, { status: 500 });
  }
}
