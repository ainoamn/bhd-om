/**
 * Thawani — توافقية خلفية؛ يوجّه عبر المدير الموحد
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { createPayment, verifyPayment } from '@/lib/payment/manager';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const { amount, description, dueId, metadata } = await req.json();
    if (!amount || !description) {
      return NextResponse.json({ error: 'amount and description required' }, { status: 400 });
    }

    const locale = 'ar';
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
    const token = auth.token as { email?: string; phone?: string } | null;

    const session = await createPayment('thawani', {
      amount: Number(amount),
      description: String(description),
      customerEmail: String(token?.email || ''),
      customerPhone: token?.phone ? String(token.phone) : undefined,
      metadata: {
        userId,
        dueId: dueId || '',
        type: 'rent',
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      successUrl: `${baseUrl}/${locale}/portal/tenant/payment/success`,
      cancelUrl: `${baseUrl}/${locale}/portal/tenant/payment/cancel`,
    });

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      reference: session.reference,
      provider: 'thawani',
    });
  } catch (error) {
    console.error('[Thawani Legacy] Error:', error);
    return NextResponse.json(
      {
        error: 'Payment creation failed',
        message: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const sessionId = new URL(req.url).searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const result = await verifyPayment('thawani', sessionId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Thawani Legacy Verify] Error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
