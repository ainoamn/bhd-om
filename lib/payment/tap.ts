/**
 * بوابة الدفع Tap Payments — الكويت ودول الخليج
 * تدعم KNET، Apple Pay، Google Pay، Visa، Mastercard، AMEX، Benefit
 * https://www.tap.company/kw/en/developers
 */

const TAP_BASE_URL =
  process.env.TAP_SANDBOX === 'true'
    ? 'https://api.tap.company/v2'
    : 'https://api.tap.company/v2';

const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY || '';
const TAP_PUBLIC_KEY = process.env.TAP_PUBLIC_KEY || '';

/** أنواع البيانات */
interface CreateSessionParams {
  amount: number; // OMR
  description: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string; // Tap customer ID if exists
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface TapSessionResult {
  session_id: string; // charge id
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
 * إنشاء Charge في Tap Payments
 * Tap يستخدم Charges API مع redirect
 * المبالغ بالـ halalas (OMR * 1000)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<TapSessionResult> {
  const reference = `bhd-tap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000);

  const res = await fetch(`${TAP_BASE_URL}/charges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TAP_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInHalalas,
      currency: 'OMR',
      customer: {
        id: params.customerId || '',
        email: params.customerEmail,
        phone: {
          country_code: '968',
          number: params.customerPhone || '00000000',
        },
        first_name: params.customerName?.split(' ')[0] || 'Customer',
        last_name: params.customerName?.split(' ').slice(1).join(' ') || 'BHD',
      },
      source: {
        id: 'src_all', // all payment methods
      },
      redirect: {
        url: params.successUrl,
      },
      post: {
        url: `${process.env.NEXTAUTH_URL}/api/payment/webhook/tap`,
      },
      reference: {
        transaction: reference,
        order: params.metadata?.dueId || reference,
      },
      metadata: {
        description: params.description,
        ...params.metadata,
      },
      description: params.description,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tap charge failed: ${err}`);
  }

  const data = await res.json();
  const chargeId = data.id;
  const redirectUrl = data.transaction?.url;

  if (!chargeId) {
    throw new Error(`Tap error: ${data.response?.message || 'Unknown'}`);
  }

  return {
    session_id: chargeId,
    checkout_url: redirectUrl || '',
    amount: params.amount,
    reference,
  };
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(`${TAP_BASE_URL}/charges/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${TAP_SECRET_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error('Tap verify failed');
  }

  const data = await res.json();
  const status = data.status;

  return {
    paid: status === 'CAPTURED',
    amount: data.amount ? data.amount / 1000 : 0,
    reference: data.reference?.transaction || sessionId,
    paymentMethod: data.source?.payment_method,
  };
}

/**
 * استرداد المبلغ (Refund)
 */
export async function refundPayment(
  chargeId: string,
  amount?: number
) {
  const refundAmount = amount ? Math.round(amount * 1000) : undefined;

  const body: any = {
    charge_id: chargeId,
    reason: 'requested_by_customer',
  };
  if (refundAmount) {
    body.amount = refundAmount;
    body.currency = 'OMR';
  }

  const res = await fetch(`${TAP_BASE_URL}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TAP_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { refundId: data.id, status: data.status };
}

/**
 * إنشاء عميل Tap
 */
export async function createCustomer(
  email: string,
  name: string,
  phone?: string
) {
  const res = await fetch(`${TAP_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TAP_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' ') || '-',
      phone: phone
        ? { country_code: '968', number: phone }
        : undefined,
    }),
  });

  const data = await res.json();
  return { customerId: data.id };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${TAP_BASE_URL}/charges/list`, {
      headers: {
        Authorization: `Bearer ${TAP_SECRET_KEY}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
