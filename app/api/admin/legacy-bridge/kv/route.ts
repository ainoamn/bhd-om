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
    const data = await getLegacyKvBulk(prefix);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('legacy kv GET error', error);
    return NextResponse.json({ error: 'Failed to load legacy data' }, { status: 500 });
  }
}
