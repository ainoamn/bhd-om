import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { logAudit } from '@/lib/audit';

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: authSecret });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as {
      action?: string;
      targetType?: string;
      targetId?: string;
      details?: Record<string, unknown>;
      reason?: string;
    };

    if (!body?.action || !body?.targetType) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await logAudit({
      userId: String(token.sub || ''),
      action: String(body.action),
      targetType: String(body.targetType),
      targetId: body.targetId ? String(body.targetId) : null,
      details: body.details || null,
      reason: body.reason || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/audit/log', e);
    return NextResponse.json({ error: 'Failed to write audit log' }, { status: 500 });
  }
}
