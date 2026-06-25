import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { buildLegacyBridgePayload, resolveLegacyBridgeLocale } from '@/lib/server/legacyBridge';
import { isAdminLikeRole } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await buildLegacyBridgePayload(userId, resolveLegacyBridgeLocale(req));
    if (!payload) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store, must-revalidate',
        Vary: 'Cookie, Authorization',
      },
    });
  } catch (error) {
    console.error('legacy-bridge bootstrap error', error);
    return NextResponse.json({ error: 'Failed to build legacy bridge' }, { status: 500 });
  }
}
