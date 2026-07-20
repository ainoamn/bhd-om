/**
 * بوابة الدفع MyFatoorah — الكويت ودول الخليج
 * تدعم KNET، Apple Pay، Google Pay، Visa، Mastercard
 * https://myfatoorah.readme.io/
 */

const MF_BASE_URL =
  process.env.MF_SANDBOX === 'true'
    ? 'https://apitest.myfatoorah.com'
    : 'https://api.myfatoorah.com';

const MF_API_KEY = process.env.MF_API_KEY || '';
const MF_TOKEN_URL = `${MF_BASE_URL}/Token`;
const MF_INVOICE_URL = `${MF_BASE_URL}/v2/ExecutePayment`;
const MF_STATUS_URL = `${MF_BASE_URL}/v2/GetPaymentStatus`;

/** الحصول على Access Token */
async function getAccessToken(): Promise<string> {
  const res = await fetch(MF_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: MF_API_KEY,
      client_secret: MF_API_KEY,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MyFatoorah auth failed: ${err}`);
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
  customerCivilId?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

interface MFSessionResult {
  session_id: string; // InvoiceId / PaymentURL extracted
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
 * إنشاء فاتورة دفع في MyFatoorah
 * MyFatoorah يستخدم InvoiceURL للدفع المباشر
 */
export async function createPaymentSession(
  params: CreateSessionParams
): Promise<MFSessionResult> {
  const token = await getAccessToken();
  const reference = `bhd-mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch(MF_INVOICE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      PaymentMethodId: 0, // 0 = All methods
      CustomerName: params.customerName || params.customerEmail,
      DisplayCurrencyIso: 'OMR',
      MobileCountryCode: '+968',
      CustomerMobile: params.customerPhone || '',
      CustomerEmail: params.customerEmail,
      InvoiceValue: params.amount,
      CallBackUrl: params.successUrl,
      ErrorUrl: params.cancelUrl,
      Language: 'AR',
      CustomerReference: reference,
      CustomerCivilId: params.customerCivilId || '',
      UserDefinedField: JSON.stringify({
        description: params.description,
        ...params.metadata,
      }),
      ExpireDate: '',
      CustomerAddress: {
        Block: '',
        Street: '',
        HouseBuildingNo: '',
        Address: params.metadata?.address || 'Oman',
        AddressInstructions: '',
      },
      InvoiceItems: [
        {
          ItemName: params.description,
          Quantity: 1,
          UnitPrice: params.amount,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MyFatoorah invoice failed: ${err}`);
  }

  const data = await res.json();
  const isSuccess = data.IsSuccess;

  if (!isSuccess) {
    throw new Error(`MyFatoorah error: ${data.Message}`);
  }

  const paymentUrl = data.Data?.PaymentURL || data.Data?.InvoiceURL;
  const invoiceId = data.Data?.InvoiceId || data.Data?.InvoiceReference;

  return {
    session_id: invoiceId || reference,
    checkout_url: paymentUrl,
    amount: params.amount,
    reference,
  };
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  const token = await getAccessToken();

  const res = await fetch(MF_STATUS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      Key: sessionId,
      KeyType: 'PaymentId', // أو InvoiceId
    }),
  });

  if (!res.ok) {
    throw new Error('MyFatoorah verify failed');
  }

  const data = await res.json();
  const isSuccess = data.IsSuccess;
  const paymentData = data.Data;

  return {
    paid: isSuccess && paymentData?.InvoiceStatus === 'Paid',
    amount: paymentData?.InvoiceValue || 0,
    reference: paymentData?.CustomerReference || sessionId,
    paymentMethod: paymentData?.PaymentGateway,
  };
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
