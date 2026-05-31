import { NextRequest, NextResponse } from 'next/server';
import { completePendingPayment } from '@/lib/server/completePendingPayment';
import { markPaymentPendingStatus } from '@/lib/server/repositories/paymentPendingRepo';

function extractSessionId(body: Record<string, unknown>): string {
  const data = (body.data as Record<string, unknown> | undefined) || {};
  return String(
    data.session_id ||
      data.checkout_session_id ||
      body.session_id ||
      body.checkout_session_id ||
      ''
  ).trim();
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = (process.env.THAWANI_WEBHOOK_SECRET || '').trim();
    if (webhookSecret) {
      const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('thawani-webhook-secret');
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = (await req.json()) as Record<string, unknown>;
    const eventType = String(body.event_type || body.type || '').toLowerCase();
    const sessionId = extractSessionId(body);

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    if (eventType.includes('cancel') || eventType.includes('fail')) {
      try {
        await markPaymentPendingStatus(sessionId, eventType.includes('cancel') ? 'CANCELLED' : 'FAILED');
      } catch {
        /* ignore if row missing */
      }
      return NextResponse.json({ ok: true, status: 'ignored' });
    }

    const result = await completePendingPayment(sessionId, { skipUserCheck: true });
    if (!result.ok) {
      if (result.error === 'PAYMENT_NOT_VERIFIED') {
        return NextResponse.json({ ok: true, status: 'pending_verification' });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, bookingId: result.bookingId });
  } catch (e) {
    console.error('POST /api/webhooks/thawani', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
