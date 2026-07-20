/**
 * بوابة الدفع PayPal — المدفوعات الدولية
 * https://developer.paypal.com/docs/api/
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
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

interface PayPalSessionResult {
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

export async function createPaymentSession(
  params: CreateSessionParams
): Promise<PayPalSessionResult> {
  const accessToken = await getAccessToken();
  const reference = `bhd-paypal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reference,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference,
          description: params.description,
          amount: {
            currency_code: 'OMR',
            value: params.amount.toFixed(3),
          },
          custom_id: params.metadata?.userId || '',
          invoice_id: params.metadata?.dueId || reference,
        },
      ],
      application_context: {
        brand_name: 'بن حمود للتطوير العقاري',
        locale: 'ar-OM',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: withProviderQuery(params.successUrl, 'paypal'),
        cancel_url: params.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal order failed: ${err}`);
  }

  const data = await res.json();
  const approveLink = (data.links || []).find(
    (l: { rel?: string; href?: string }) => l.rel === 'approve'
  );

  return {
    session_id: data.id,
    checkout_url: approveLink?.href || '',
    amount: params.amount,
    reference,
  };
}

export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const accessToken = await getAccessToken();

  const captureRes = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${sessionId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!captureRes.ok) {
    const orderRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${sessionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await orderRes.json();
    return {
      paid: order.status === 'COMPLETED',
      amount: parseFloat(order.purchase_units?.[0]?.amount?.value || '0'),
      reference: order.purchase_units?.[0]?.reference_id || sessionId,
      paymentMethod: 'paypal',
    };
  }

  const data = await captureRes.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    paid: data.status === 'COMPLETED',
    amount: capture ? parseFloat(capture.amount.value) : 0,
    reference: data.purchase_units?.[0]?.reference_id || sessionId,
    paymentMethod: 'paypal',
  };
}

export async function refundPayment(captureId: string, amount?: number) {
  const accessToken = await getAccessToken();
  const body: Record<string, unknown> = {};
  if (amount) {
    body.amount = {
      currency_code: 'OMR',
      value: amount.toFixed(3),
    };
  }

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { refundId: data.id, status: data.status };
}

export async function healthCheck(): Promise<boolean> {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) return false;
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
