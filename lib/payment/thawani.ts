/**
 * تكامل بوابة الدفع Thawani — سلطنة عمان
 */
import { getGatewayField } from './credentials';

function thawaniBaseUrl(): string {
  return getGatewayField('thawani', 'sandbox') !== false
    ? 'https://uatcheckout.thawani.om'
    : 'https://checkout.thawani.om';
}

interface ThawaniSession {
  session_id: string;
  client_reference_id: string;
  invoice: string;
  amount: number;
  checkout_url: string;
  success_url: string;
  cancel_url: string;
}

interface PaymentItem {
  name: string;
  description: string;
  quantity: number;
  unit_amount: number; // بالهلالات (OMR * 1000)
}

/** إنشاء جلسة دفع في Thawani */
export async function createPaymentSession(params: {
  amount: number; // بالريال العماني
  description: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<ThawaniSession> {
  const amountInHalalas = Math.round(params.amount * 1000);

  const items: PaymentItem[] = [{
    name: params.description,
    description: params.description,
    quantity: 1,
    unit_amount: amountInHalalas,
  }];

  const response = await fetch(`${thawaniBaseUrl()}/api/v1/checkout/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'thawani-api-key': String(getGatewayField('thawani', 'apiSecret')),
    },
    body: JSON.stringify({
      client_reference_id: `bhd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'payment',
      products: items,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone || '',
        ...params.metadata,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Thawani error: ${error}`);
  }

  const data = await response.json();
  return {
    session_id: data.data.session_id,
    client_reference_id: data.data.client_reference_id,
    invoice: data.data.invoice,
    amount: params.amount,
    checkout_url: `${thawaniBaseUrl()}/pay/${data.data.session_id}?key=${String(getGatewayField('thawani', 'publicKey'))}`,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };
}

/** التحقق من حالة الدفع */
export async function verifyPayment(sessionId: string): Promise<{
  paid: boolean;
  amount: number;
  reference: string;
  paymentMethod?: string;
}> {
  const response = await fetch(`${thawaniBaseUrl()}/api/v1/checkout/session/${sessionId}`, {
    headers: { 'thawani-api-key': String(getGatewayField('thawani', 'apiSecret')) },
  });

  if (!response.ok) {
    throw new Error('Failed to verify payment');
  }

  const data = await response.json();
  const session = data.data;

  return {
    paid: session.payment_status === 'paid',
    amount: session.amount_total ? session.amount_total / 1000 : 0,
    reference: session.client_reference_id,
    paymentMethod: session.payment_method?.type,
  };
}

/** إنشاء رابط دفع سريع */
export function generatePaymentLink(sessionId: string): string {
  return `${thawaniBaseUrl()}/pay/${sessionId}?key=${String(getGatewayField('thawani', 'publicKey'))}`;
}

/** التحقق من إعداد المفاتيح */
export async function healthCheck(): Promise<boolean> {
  return !!(
    String(getGatewayField('thawani', 'apiSecret')).trim() &&
    String(getGatewayField('thawani', 'publicKey')).trim()
  );
}
