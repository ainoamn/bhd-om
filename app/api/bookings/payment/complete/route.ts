import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { completePendingPayment } from '@/lib/server/completePendingPayment';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const sessionId =
      req.nextUrl.searchParams.get('session_id')?.trim() ||
      req.nextUrl.searchParams.get('sessionId')?.trim() ||
      '';
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const result = await completePendingPayment(sessionId, { userId: auth.userId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/bookings/payment/complete', e);
    return NextResponse.json({ error: 'Failed to complete payment' }, { status: 500 });
  }
}
