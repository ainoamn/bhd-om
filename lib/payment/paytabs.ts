/**
 * بوابة الدفع PayTabs — السعودية ودول الخليج
 * تدعم Mada، Apple Pay، STC Pay، Visa، Mastercard
 * https://dev.paytabs.com/
 */

const PT_BASE_URL =
  process.env.PAYTABS_SANDBOX === 'true'
    ? 'https://secure-global.paytabs.com'
    : 'https://secure.paytabs.com';

const PT_PROFILE_ID = process.env.PAYTABS_PROFILE_ID || '';
const PT_SERVER_KEY = process.env.PAYTABS_SERVER_KEY || '';
const PT_CLIENT_KEY = process.env.PAYTABS_CLIENT_KEY || '';

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

interface PTSessionResult {
  session_id: string; // tran_ref
  checkout_url: string; // redirect_url
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
 * إنشاء جلسة دفع في PayTabs
 * PayTabs 2.0 API — Server-to-Server + Hosted Payment Page
 * المبالغ بالـ halalas (OMR * 1000)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<PTSessionResult> {
  const reference = `bhd-pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch(`${PT_BASE_URL}/payment/request`, {
    method: 'POST',
    headers: {
      authorization: PT_SERVER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: PT_PROFILE_ID,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: reference,
      cart_description: params.description,
      cart_currency: 'OMR',
      cart_amount: params.amount,
      callback: `${process.env.NEXTAUTH_URL}/api/payment/webhook/paytabs`,
      return: params.successUrl,
      customer_details: {
        name: params.customerName || params.customerEmail,
        email: params.customerEmail,
        phone: params.customerPhone || '',
        street1: params.metadata?.address || 'Muscat',
        city: params.metadata?.city || 'Muscat',
        state: 'MA',
        country: 'OM',
        zip: '100',
      },
      shipping_details: {
        name: params.customerName || params.customerEmail,
        email: params.customerEmail,
        phone: params.customerPhone || '',
        street1: params.metadata?.address || 'Muscat',
        city: params.metadata?.city || 'Muscat',
        state: 'MA',
        country: 'OM',
        zip: '100',
      },
      user_defined: {
        ...params.metadata,
        description: params.description,
      },
      hide_shipping: true,
      tokenise: 2, // tokenise for future payments
      show_save_card: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayTabs request failed: ${err}`);
  }

  const data = await res.json();

  if (data.status !== 'success' || !data.redirect_url) {
    throw new Error(`PayTabs error: ${data.message || 'Unknown error'}`);
  }

  return {
    session_id: data.tran_ref,
    checkout_url: data.redirect_url,
    amount: params.amount,
    reference,
  };
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(`${PT_BASE_URL}/payment/query`, {
    method: 'POST',
    headers: {
      authorization: PT_SERVER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: PT_PROFILE_ID,
      tran_ref: sessionId,
    }),
  });

  if (!res.ok) {
    throw new Error('PayTabs verify failed');
  }

  const data = await res.json();
  const paymentResult = data.payment_result;

  return {
    paid: paymentResult?.response_status === 'A', // A = Approved
    amount: data.cart_amount || 0,
    reference: data.cart_id || sessionId,
    paymentMethod: data.payment_info?.payment_method,
  };
}

/**
 * استرداد المبلغ
 */
export async function refundPayment(sessionId: string, amount?: number) {
  const res = await fetch(`${PT_BASE_URL}/payment/request`, {
    method: 'POST',
    headers: {
      authorization: PT_SERVER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: PT_PROFILE_ID,
      tran_type: 'refund',
      tran_class: 'ecom',
      cart_id: `refund-${Date.now()}`,
      cart_currency: 'OMR',
      cart_amount: amount || 0,
      tran_ref: sessionId,
    }),
  });

  const data = await res.json();
  return { refundId: data.tran_ref, status: data.payment_result?.response_status };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${PT_BASE_URL}/payment/list`, {
      method: 'POST',
      headers: {
        authorization: PT_SERVER_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_id: PT_PROFILE_ID,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
