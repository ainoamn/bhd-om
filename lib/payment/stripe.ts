/**
 * بوابة الدفع Stripe — بطاقات ائتمان عالمية (Visa, Mastercard, Amex)
 * https://stripe.com/docs
 */

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!key) throw new Error('STRIPE_SECRET_KEY غير مضبوط');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

interface CreateSessionParams {
  amount: number;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface StripeSessionResult {
  session_id: string;
  checkout_url: string;
  amount: number;
  reference: string;
}

interface VerifyResult {
  paid: boolean;
  amount: number;
  reference: string;
  paymentMethod?: string;
}

/** إنشاء جلسة Stripe Checkout — OMR بالهلالات (×1000) */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<StripeSessionResult> {
  const stripe = getStripe();
  const amountInHalalas = Math.round(params.amount * 1000);
  const reference = `bhd-stripe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const successBase = params.successUrl.includes('?')
    ? `${params.successUrl}&provider=stripe`
    : `${params.successUrl}?provider=stripe`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'omr',
          product_data: {
            name: params.description,
            description: params.description,
          },
          unit_amount: amountInHalalas,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${successBase}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    client_reference_id: reference,
    customer_email: params.customerEmail || undefined,
    metadata: {
      ...params.metadata,
      customer_phone: params.customerPhone || '',
    },
    payment_intent_data: {
      description: params.description,
      metadata: { reference },
    },
  });

  return {
    session_id: session.id,
    checkout_url: session.url || '',
    amount: params.amount,
    reference,
  };
}

export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === 'paid',
    amount: session.amount_total ? session.amount_total / 1000 : 0,
    reference: session.client_reference_id || session.id,
    paymentMethod: session.payment_method_types?.join(', '),
  };
}

export async function createCustomer(
  email: string,
  name?: string
): Promise<{ customerId: string }> {
  const customer = await getStripe().customers.create({
    email,
    name: name || email,
    description: 'BHD Real Estate Tenant',
  });
  return { customerId: customer.id };
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  const refund = await getStripe().refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 1000) : undefined,
  });
  return { refundId: refund.id, status: refund.status };
}

export async function healthCheck(): Promise<boolean> {
  try {
    if (!(process.env.STRIPE_SECRET_KEY || '').trim()) return false;
    await getStripe().balance.retrieve();
    return true;
  } catch {
    return false;
  }
}
