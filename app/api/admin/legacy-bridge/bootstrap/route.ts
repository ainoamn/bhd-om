import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { buildLegacyBridgePayload } from '@/lib/server/legacyBridge';

export const dynamic = 'force-dynamic';

function resolveLocale(req: NextRequest): 'ar' | 'en' {
  const q = req.nextUrl.searchParams.get('locale');
  if (q === 'en' || q === 'ar') return q;
  const accept = req.headers.get('accept-language') || '';
  if (accept.toLowerCase().startsWith('en')) return 'en';
  return 'ar';
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await buildLegacyBridgePayload(userId, resolveLocale(req));
    if (!payload) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store',
        Vary: 'Cookie, Authorization',
      },
    });
  } catch (error) {
    console.error('legacy-bridge bootstrap error', error);
    return NextResponse.json({ error: 'Failed to build legacy bridge' }, { status: 500 });
  }
}
