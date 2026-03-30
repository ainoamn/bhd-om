import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { checkLimit } from '@/lib/subscriptions/entitlements';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = (await req.json().catch(() => ({}))) as { resource?: 'users' | 'properties' };
    const resource = body.resource;
    if (!resource || !['users', 'properties'].includes(resource)) {
      return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
    }

    const allowed = await checkLimit(auth.userId || '', resource);
    if (!allowed) {
      return NextResponse.json(
        {
          allowed: false,
          error: 'LIMIT_EXCEEDED',
          messageAr: 'تم تجاوز حد الباقة الحالية، يرجى الترقية.',
          messageEn: 'Current plan limit exceeded. Please upgrade.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ allowed: true });
  } catch (e) {
    console.error('POST /api/subscriptions/check', e);
    return NextResponse.json({ error: 'Failed to check subscription limit' }, { status: 500 });
  }
}
