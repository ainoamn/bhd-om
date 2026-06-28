import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { wipeLegacyKvExcept } from '@/lib/server/legacyKvStore';
import { isLegacyKvKey } from '@/lib/server/legacyKvKeys';

export const dynamic = 'force-dynamic';

/** POST { keepKeys?: string[] } — تصفية كل البيانات ما عدا المفاتيح المحفوظة */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const keepKeys = Array.isArray(body?.keepKeys)
      ? body.keepKeys.filter((k: unknown) => typeof k === 'string' && isLegacyKvKey(k))
      : [];

    const result = await wipeLegacyKvExcept(keepKeys);

    return NextResponse.json(result);
  } catch (error) {
    console.error('legacy kv wipe-all-except error', error);
    return NextResponse.json({ error: 'Failed to wipe legacy data' }, { status: 500 });
  }
}
