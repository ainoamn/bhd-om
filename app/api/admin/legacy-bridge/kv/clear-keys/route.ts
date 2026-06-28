import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { clearLegacyKvKeys } from '@/lib/server/legacyKvStore';
import { isLegacyKvKey } from '@/lib/server/legacyKvKeys';

export const dynamic = 'force-dynamic';

/** POST { keys: string[] } — حذف مفاتيح محددة */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter((k: unknown) => typeof k === 'string' && isLegacyKvKey(k))
      : [];

    const result = await clearLegacyKvKeys(keys);

    return NextResponse.json(result);
  } catch (error) {
    console.error('legacy kv clear-keys error', error);
    return NextResponse.json({ error: 'Failed to clear keys' }, { status: 500 });
  }
}
