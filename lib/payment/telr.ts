/**
 * بوابة الدفع Telr — شائعة في الإمارات والسعودية والمنطقة العربية
 * https://telr.com/support/kb/
 */

const TELR_BASE_URL =
  process.env.TELR_SANDBOX === 'true'
    ? 'https://secure.innovatepayments.com/gateway/'
    : 'https://secure.telr.com/gateway/';

const TELR_STORE_ID = process.env.TELR_STORE_ID || '';
const TELR_AUTH_KEY = process.env.TELR_AUTH_KEY || '';

interface CreateSessionParams {
  amount: number;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface TelrSessionResult {
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

function withProviderQuery(url: string, provider: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}provider=${provider}`;
}

/** إنشاء جلسة Telr — المبالغ بالـ cents (OMR × 100) */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<TelrSessionResult> {
  const reference = `bhd-telr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInCents = Math.round(params.amount * 100);

  const formData = new URLSearchParams();
  formData.append('ivp_method', 'create');
  formData.append('ivp_store', TELR_STORE_ID);
  formData.append('ivp_authkey', TELR_AUTH_KEY);
  formData.append('ivp_cart', reference);
  formData.append('ivp_test', process.env.TELR_SANDBOX === 'true' ? '1' : '0');
  formData.append('ivp_amount', amountInCents.toString());
  formData.append('ivp_currency', 'OMR');
  formData.append('ivp_desc', params.description);
  formData.append('return_auth', withProviderQuery(params.successUrl, 'telr'));
  formData.append('return_can', params.cancelUrl);
  formData.append('return_decl', params.cancelUrl);
  formData.append('ivp_framed', '0');
  formData.append('bill_email', params.customerEmail);
  if (params.customerPhone) {
    formData.append('bill_tel', params.customerPhone);
  }

  const res = await fetch(`${TELR_BASE_URL}order.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telr create order failed: ${err}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Telr error: ${data.error.message} (code: ${data.error.code})`);
  }

  const order = data.order;
  if (!order?.ref) {
    throw new Error('Telr: Invalid response - no order ref');
  }

  return {
    session_id: order.ref,
    checkout_url: order.url,
    amount: params.amount,
    reference,
  };
}

export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const formData = new URLSearchParams();
  formData.append('ivp_method', 'check');
  formData.append('ivp_store', TELR_STORE_ID);
  formData.append('ivp_authkey', TELR_AUTH_KEY);
  formData.append('order_ref', sessionId);

  const res = await fetch(`${TELR_BASE_URL}order.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Telr: Failed to verify payment');
  }

  const data = await res.json();
  const order = data.order;
  const status = order?.status?.code;
  const isPaid = status === '3' || status === 3;

  return {
    paid: isPaid,
    amount: order?.amount ? parseFloat(order.amount) / 100 : 0,
    reference: order?.cartid || sessionId,
    paymentMethod: order?.card?.type,
  };
}

export async function cancelOrder(sessionId: string) {
  const formData = new URLSearchParams();
  formData.append('ivp_method', 'cancel');
  formData.append('ivp_store', TELR_STORE_ID);
  formData.append('ivp_authkey', TELR_AUTH_KEY);
  formData.append('order_ref', sessionId);

  const res = await fetch(`${TELR_BASE_URL}order.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  const data = await res.json();
  return { cancelled: data.order?.status?.code === '2', data };
}

export async function healthCheck(): Promise<boolean> {
  try {
    if (!TELR_STORE_ID || !TELR_AUTH_KEY) return false;
    const formData = new URLSearchParams();
    formData.append('ivp_method', 'check');
    formData.append('ivp_store', TELR_STORE_ID);
    formData.append('ivp_authkey', TELR_AUTH_KEY);

    const res = await fetch(`${TELR_BASE_URL}order.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    return res.ok;
  } catch {
    return false;
  }
}
