/**
 * بوابة الدفع CMI — Central Bank of Oman / Oman Payment Gateway
 * البوابة الوطنية للمدفوعات في سلطنة عمان
 * https://www.cbi-oman.com/ (عبر OmanNet)
 */

const CMI_BASE_URL =
  process.env.CMI_SANDBOX === 'true'
    ? 'https://testsecure.omannet.gov.om'
    : 'https://secure.omannet.gov.om';

const CMI_MERCHANT_ID = process.env.CMI_MERCHANT_ID || '';
const CMI_API_KEY = process.env.CMI_API_KEY || '';
const CMI_STORE_KEY = process.env.CMI_STORE_KEY || '';

/** أنواع البيانات */
interface CreateSessionParams {
  amount: number; // OMR
  description: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface CMISessionResult {
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

/**
 * إنشاء جلسة دفع في CMI (Oman Payment Gateway)
 * CMI يستخدم MPI (Merchant Plug-In) مع 3D Secure
 * المبالغ بالـ halalas (OMR * 1000)
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<CMISessionResult> {
  const reference = `bhd-cmi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000);

  const formData = new URLSearchParams();
  formData.append('clientid', CMI_MERCHANT_ID);
  formData.append('storetype', '3D_PAY_HOSTING');
  formData.append('storekey', CMI_STORE_KEY);
  formData.append('hashAlgorithm', 'ver3');
  formData.append('trantype', 'Auth');
  formData.append('amount', amountInHalalas.toString());
  formData.append('currency', '512'); // OMR ISO code
  formData.append('oid', reference);
  formData.append('okUrl', params.successUrl);
  formData.append('failUrl', params.cancelUrl);
  formData.append('lang', 'ar');
  formData.append('encoding', 'UTF-8');
  formData.append('refreshtime', '5');
  formData.append('BillToEmail', params.customerEmail);
  if (params.customerPhone) {
    formData.append('BillToTelVoice', params.customerPhone);
  }
  formData.append('rnd', Date.now().toString());

  // إنشاء Hash للأمان (CMI يتطلب Hash حسب مواصفاتهم)
  const hashInput = [
    CMI_MERCHANT_ID,
    params.successUrl,
    params.cancelUrl,
    params.successUrl, // callback
    `Auth`,
    amountInHalalas.toString(),
    '512',
    '3D_PAY_HOSTING',
    reference,
    Date.now().toString(),
    params.customerEmail,
  ].join('|');

  const crypto = await import('crypto');
  const hash = crypto
    .createHmac('sha512', CMI_STORE_KEY)
    .update(hashInput)
    .digest('base64');
  formData.append('Hash', hash);

  return {
    session_id: reference,
    checkout_url: `${CMI_BASE_URL}/fim/est3Dgate`,
    amount: params.amount,
    reference,
  };
}

/**
 * إنشاء نموذج POST HTML لـ CMI
 * (CMI يتطلب POST form submission)
 */
export function createPaymentForm(params: CreateSessionParams): string {
  const ref = `bhd-cmi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const amountInHalalas = Math.round(params.amount * 1000);

  return `
<!DOCTYPE html>
<html dir="rtl">
<head><title>إعادة توجيه إلى CMI</title></head>
<body onload="document.forms[0].submit()">
  <form action="${CMI_BASE_URL}/fim/est3Dgate" method="POST">
    <input type="hidden" name="clientid" value="${CMI_MERCHANT_ID}" />
    <input type="hidden" name="storetype" value="3D_PAY_HOSTING" />
    <input type="hidden" name="trantype" value="Auth" />
    <input type="hidden" name="amount" value="${amountInHalalas}" />
    <input type="hidden" name="currency" value="512" />
    <input type="hidden" name="oid" value="${ref}" />
    <input type="hidden" name="okUrl" value="${params.successUrl}" />
    <input type="hidden" name="failUrl" value="${params.cancelUrl}" />
    <input type="hidden" name="lang" value="ar" />
    <input type="hidden" name="BillToEmail" value="${params.customerEmail}" />
    <p>جاري إعادة التوجيه إلى بوابة الدفع الوطنية...</p>
  </form>
</body>
</html>`;
}

/**
 * التحقق من حالة الدفع عبر CMI callback
 */
export async function verifyPayment(
  params: Record<string, string>
): Promise<VerifyResult> {
  // CMI يرسل البيانات عبر POST callback
  const procReturnCode = params['ProcReturnCode'] || '';
  const isPaid = procReturnCode === '00';

  return {
    paid: isPaid,
    amount: params['amount']
      ? parseInt(params['amount']) / 1000
      : 0,
    reference: params['oid'] || '',
    paymentMethod: params['cardIssuer'] || 'cmi',
  };
}

/**
 * التحقق من صحة الاتصال
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${CMI_BASE_URL}/fim/api`, {
      method: 'HEAD',
    });
    return res.ok || res.status === 405; // 405 = Method Not Allowed (الخادم يستجيب)
  } catch {
    return false;
  }
}
