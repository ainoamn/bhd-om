/**
 * API Route: إنشاء جلسة دفع Thawani
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { createPaymentSession } from '@/lib/payment/thawani';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const { amount, description, dueId } = await req.json();
    if (!amount || !description) {
      return NextResponse.json({ error: 'amount and description required' }, { status: 400 });
    }

    const locale = 'ar';
    const session = await createPaymentSession({
      amount,
      description,
      customerEmail: String((auth.token as { email?: string } | null)?.email || ''),
      metadata: { userId, dueId: dueId || '', type: 'rent' },
      successUrl: `${process.env.NEXTAUTH_URL}/${locale}/portal/tenant/payment/success`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/${locale}/portal/tenant/payment/cancel`,
    });

    return NextResponse.json({
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
      reference: session.client_reference_id,
    });
  } catch (error) {
    console.error('[Thawani] Error:', error);
    return NextResponse.json(
      { error: 'Payment creation failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
