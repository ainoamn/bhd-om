import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { putLegacyKvBulk, type LegacyKvBulkPayload } from '@/lib/server/legacyKvStore';

export const dynamic = 'force-dynamic';

/** POST — حفظ دفعة مفاتيح النظام القديم في PostgreSQL */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as LegacyKvBulkPayload & { replace?: boolean };
    const replace = body?.replace === true;
    const payload = { ...body } as LegacyKvBulkPayload & { replace?: boolean };
    delete payload.replace;

    const result = await putLegacyKvBulk(payload, { replace });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('legacy kv bulk error', error);
    return NextResponse.json({ error: 'Failed to save legacy data' }, { status: 500 });
  }
}
