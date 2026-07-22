import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';

export const dynamic = 'force-dynamic';

/** GET ?prefix=bhd_ — جلب بيانات النظام القديم من PostgreSQL */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    console.error('legacy kv GET error', error);
    return NextResponse.json({ error: 'Failed to load legacy data' }, { status: 500 });
  }
}
