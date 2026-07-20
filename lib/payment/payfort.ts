/**
 * بوابة الدفع Amazon Payment Services (سابقاً PayFort)
 * شائعة في الإمارات والسعودية ومصر
 * https://paymentservices-reference.payfort.com/
 */

const PAYFORT_BASE_URL =
  process.env.PAYFORT_SANDBOX === 'true'
    ? 'https://sbcheckout.payfort.com'
    : 'https://checkout.payfort.com';

const PAYFORT_API_URL =
  process.env.PAYFORT_SANDBOX === 'true'
    ? 'https://sbpaymentservices.payfort.com'
    : 'https://paymentservices.payfort.com';

const PAYFORT_MERCHANT_IDENTIFIER = process.env.PAYFORT_MERCHANT_IDENTIFIER || '';
const PAYFORT_ACCESS_CODE = process.env.PAYFORT_ACCESS_CODE || '';
const PAYFORT_SHA_REQUEST_PHRASE = process.env.PAYFORT_SHA_REQUEST_PHRASE || '';
const PAYFORT_SHA_RESPONSE_PHRASE = process.env.PAYFORT_SHA_RESPONSE_PHRASE || '';

/** أنواع البيانات */
interface CreateSessionParams {
  amount: number; // OMR
  description: string;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface PayFortSessionResult {
  session_id: string; // fort_id
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
 * إنشاء SHA256 Signature حسب مواصفات PayFort
 */
async function createSignature(data: Record<string, string>): Promise<string> {
  const crypto = await import('crypto');
  const sorted = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('');
  return crypto
    .createHmac('sha256', PAYFORT_SHA_REQUEST_PHRASE)
    .update(`${PAYFORT_SHA_REQUEST_PHRASE}${sorted}${PAYFORT_SHA_REQUEST_PHRASE}`)
    .digest('hex');
}

/**
 * إنشاء جلسة دفع في PayFort
 * PayFort يستخدم Redirection / Merchant Page / Merchant Page 2.0
 * المبالغ بالـ halalas (OMR * 1000)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<PayFortSessionResult> {
  const reference = `bhd-pf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000).toString();

  const requestParams: Record<string, string> = {
    service_command: 'TOKENIZATION',
    merchant_identifier: PAYFORT_MERCHANT_IDENTIFIER,
    access_code: PAYFORT_ACCESS_CODE,
    merchant_reference: reference,
    language: 'ar',
    return_url: params.successUrl,
    amount: amountInHalalas,
    currency: 'OMR',
    customer_email: params.customerEmail,
    customer_name: params.customerName || params.customerEmail,
    command: 'PURCHASE',
    payment_option: 'MASTERCARD,VISA,AMEX,MADA',
  };

  const signature = await createSignature(requestParams);
  requestParams.signature = signature;

  return {
    session_id: reference,
    checkout_url: `${PAYFORT_BASE_URL}/FortAPI/paymentPage`,
    amount: params.amount,
    reference,
  };
}

/**
 * إنشاء نموذج POST HTML لـ PayFort
 */
export function createPaymentForm(params: CreateSessionParams): string {
  const ref = `bhd-pf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000);

  return `
<!DOCTYPE html>
<html dir="rtl">
<head><title>إعادة توجيه إلى Amazon Payment Services</title></head>
<body onload="document.forms[0].submit()">
  <form action="${PAYFORT_BASE_URL}/FortAPI/paymentPage" method="POST">
    <input type="hidden" name="command" value="PURCHASE" />
    <input type="hidden" name="merchant_identifier" value="${PAYFORT_MERCHANT_IDENTIFIER}" />
    <input type="hidden" name="access_code" value="${PAYFORT_ACCESS_CODE}" />
    <input type="hidden" name="merchant_reference" value="${ref}" />
    <input type="hidden" name="amount" value="${amountInHalalas}" />
    <input type="hidden" name="currency" value="OMR" />
    <input type="hidden" name="language" value="ar" />
    <input type="hidden" name="customer_email" value="${params.customerEmail}" />
    <input type="hidden" name="return_url" value="${params.successUrl}" />
    <p>جاري إعادة التوجيه إلى Amazon Payment Services...</p>
  </form>
</body>
</html>`;
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(
  fortId: string,
  responseParams?: Record<string, string>
): Promise<VerifyResult> {
  // إذا كانت البيانات من callback مباشرة
  if (responseParams) {
    const status = responseParams['status'];
    return {
      paid: status === '14', // 14 = Purchase successful
      amount: responseParams['amount'] ? parseInt(responseParams['amount']) / 1000 : 0,
      reference: responseParams['merchant_reference'] || fortId,
      paymentMethod: responseParams['payment_option'],
    };
  }

  // API verification
  const requestParams: Record<string, string> = {
    query_command: 'CHECK_STATUS',
    merchant_identifier: PAYFORT_MERCHANT_IDENTIFIER,
    access_code: PAYFORT_ACCESS_CODE,
    merchant_reference: fortId,
    language: 'ar',
  };

  const signature = await createSignature(requestParams);
  requestParams.signature = signature;

  const res = await fetch(`${PAYFORT_API_URL}/FortAPI/paymentApi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestParams),
  });

  const data = await res.json();

  return {
    paid: data.status === '14',
    amount: data.amount ? parseInt(data.amount) / 1000 : 0,
    reference: data.merchant_reference || fortId,
    paymentMethod: data.payment_option,
  };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${PAYFORT_API_URL}/FortAPI/paymentApi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_command: 'CHECK_STATUS',
        merchant_identifier: PAYFORT_MERCHANT_IDENTIFIER,
        access_code: PAYFORT_ACCESS_CODE,
        merchant_reference: 'health-check',
        language: 'ar',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
