/**
 * بوابة الدفع Network International — عمان والإمارات
 * https://developer.network.global/
 */

const NI_BASE_URL =
  process.env.NI_SANDBOX === 'true'
    ? 'https://api-gateway.sandbox.ngenius-payments.com'
    : 'https://api-gateway.ngenius-payments.com';

const NI_API_KEY = process.env.NI_API_KEY || '';
const NI_OUTLET_REF = process.env.NI_OUTLET_REF || '';

/** الحصول على Access Token */
async function getAccessToken(): Promise<string> {
  const res = await fetch(`${NI_BASE_URL}/identity/auth/access-token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${NI_API_KEY}`,
      'Content-Type': 'application/vnd.ni-identity.v1+json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NI auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/** أنواع البيانات */
interface CreateSessionParams {
  amount: number; // OMR
  description: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface NISessionResult {
  session_id: string; // order reference
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

/**
 * إنشاء طلب دفع في Network International
 * NI يستخدم أصغر وحدة = OMR * 1000 (halalas)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<NISessionResult> {
  const accessToken = await getAccessToken();
  const reference = `bhd-ni-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000);

  const res = await fetch(
    `${NI_BASE_URL}/transactions/outlets/${NI_OUTLET_REF}/orders`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ni-payment.v2+json',
        'Accept': 'application/vnd.ni-payment.v2+json',
      },
      body: JSON.stringify({
        action: 'SALE',
        amount: { currencyCode: 'OMR', value: amountInHalalas },
        language: 'ar',
        merchantAttributes: {
          redirectUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          skipConfirmationPage: false,
          cancelButtonText: 'إلغاء',
          payButtonText: 'دفع',
        },
        emailAddress: params.customerEmail,
        merchantOrderReference: reference,
        billingAddress: {
          firstName: params.customerName || params.customerEmail,
          lastName: '-',
        },
        merchantDefinedData: {
          ...params.metadata,
          description: params.description,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NI order failed: ${err}`);
  }

  const data = await res.json();
  const paymentLink = data._links?.payment?.href;
  const orderRef = data.reference || reference;

  return {
    session_id: orderRef,
    checkout_url: paymentLink || '',
    amount: params.amount,
    reference,
  };
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${NI_BASE_URL}/transactions/outlets/${NI_OUTLET_REF}/orders/${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/vnd.ni-payment.v2+json',
      },
    }
  );

  if (!res.ok) {
    throw new Error('Failed to verify NI payment');
  }

  const data = await res.json();
  const status = data._embedded?.payment?.[0]?.state;

  return {
    paid: status === 'CAPTURED' || status === 'AUTHORISED',
    amount: data.amount?.value ? data.amount.value / 1000 : 0,
    reference: data.merchantOrderReference || sessionId,
    paymentMethod: data._embedded?.payment?.[0]?.paymentMethod?.name,
  };
}

/**
 * استرداد المبلغ (Refund)
 */
export async function refundPayment(
  sessionId: string,
  amount?: number
) {
  const accessToken = await getAccessToken();
  const refundAmount = amount ? Math.round(amount * 1000) : undefined;

  const body: any = { action: 'REFUND' };
  if (refundAmount) {
    body.amount = { currencyCode: 'OMR', value: refundAmount };
  }

  const res = await fetch(
    `${NI_BASE_URL}/transactions/outlets/${NI_OUTLET_REF}/orders/${sessionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ni-payment.v2+json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return { refundId: data.reference, status: data._embedded?.payment?.[0]?.state };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
