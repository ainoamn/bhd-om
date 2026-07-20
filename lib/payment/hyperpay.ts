/**
 * بوابة الدفع HyperPay — السعودية ودول الخليج
 * https://hyperpay.docs.oppwa.com/
 * تدعم Apple Pay، Google Pay، STC Pay، مدى، Visa، Mastercard
 */

const HYPERPAY_BASE_URL =
  process.env.HYPERPAY_SANDBOX === 'true'
    ? 'https://eu-test.oppwa.com'
    : 'https://eu-prod.oppwa.com';

const HYPERPAY_ENTITY_ID = process.env.HYPERPAY_ENTITY_ID || '';
const HYPERPAY_ACCESS_TOKEN = process.env.HYPERPAY_ACCESS_TOKEN || '';

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

interface HyperPaySessionResult {
  session_id: string; // checkoutId
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
 * إنشاء جلسة دفع في HyperPay
 * HyperPay يستخدم checkoutId ثم Widget/Redirect
 * المبالغ بالـ halalas (OMR * 1000)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<HyperPaySessionResult> {
  const reference = `bhd-hp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000).toString();

  const formData = new URLSearchParams();
  formData.append('entityId', HYPERPAY_ENTITY_ID);
  formData.append('amount', amountInHalalas);
  formData.append('currency', 'OMR');
  formData.append('paymentType', 'DB'); // Direct debit (SALE)
  formData.append('merchantTransactionId', reference);
  formData.append('customer.email', params.customerEmail);
  if (params.customerName) {
    formData.append('customer.givenName', params.customerName);
  }
  if (params.customerPhone) {
    formData.append('customer.mobile', params.customerPhone);
  }
  formData.append('billing.street1', params.metadata?.address || 'Oman');
  formData.append('billing.city', params.metadata?.city || 'Muscat');
  formData.append('billing.country', 'OM');
  formData.append('customParameters[description]', params.description);
  formData.append('shopperResultUrl', params.successUrl);
  formData.append('cancelUrl', params.cancelUrl);
  formData.append('notificationUrl', `${process.env.NEXTAUTH_URL}/api/payment/webhook/hyperpay`);

  const res = await fetch(`${HYPERPAY_BASE_URL}/v1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HyperPay checkout failed: ${err}`);
  }

  const data = await res.json();
  const checkoutId = data.id;

  if (!checkoutId) {
    throw new Error(`HyperPay error: ${data.result?.description}`);
  }

  return {
    session_id: checkoutId,
    checkout_url: `${HYPERPAY_BASE_URL}/v1/paymentWidgets.js?checkoutId=${checkoutId}`,
    amount: params.amount,
    reference,
  };
}

/**
 * إنشاء رابط Widget مباشر (للتضمين في iframe)
 */
export function getWidgetUrl(checkoutId: string): string {
  return `${HYPERPAY_BASE_URL}/v1/checkout/${checkoutId}/payment`;
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(
    `${HYPERPAY_BASE_URL}/v1/checkouts/${sessionId}/payment?entityId=${HYPERPAY_ENTITY_ID}`,
    {
      headers: {
        Authorization: `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error('HyperPay verify failed');
  }

  const data = await res.json();
  const resultCode = data.result?.code;
  const isPaid = resultCode === '000.100.110' || resultCode === '000.000.000';

  return {
    paid: isPaid,
    amount: data.amount ? parseFloat(data.amount) / 1000 : 0,
    reference: data.merchantTransactionId || sessionId,
    paymentMethod: data.paymentBrand,
  };
}

/**
 * استرداد المبلغ
 */
export async function refundPayment(
  paymentId: string,
  amount?: number
) {
  const refundAmount = amount ? Math.round(amount * 1000).toString() : undefined;

  const formData = new URLSearchParams();
  formData.append('entityId', HYPERPAY_ENTITY_ID);
  formData.append('paymentType', 'RF');
  if (refundAmount) {
    formData.append('amount', refundAmount);
    formData.append('currency', 'OMR');
  }

  const res = await fetch(`${HYPERPAY_BASE_URL}/v1/payments/${paymentId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await res.json();
  return { refundId: data.id, status: data.result?.code };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(
      `${HYPERPAY_BASE_URL}/v1/checkouts?entityId=${HYPERPAY_ENTITY_ID}`,
      {
        headers: { Authorization: `Bearer ${HYPERPAY_ACCESS_TOKEN}` },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
