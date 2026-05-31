/** بوابة الدفع — mock محلياً؛ Thawani عند ضبط المتغيرات */
export type PaymentProvider = 'mock' | 'thawani';

export type PaymentInitInput = {
  amount: number;
  currency?: string;
  propertyId: number;
  unitKey?: string;
  payerEmail: string;
  payerName: string;
  bookingType: 'BOOKING' | 'VIEWING';
  locale?: string;
};

export type PaymentInitSuccess = {
  ok: true;
  provider: PaymentProvider;
  paymentReferenceNo: string;
  paymentDate: string;
  redirectUrl?: string;
};

export type PaymentInitFailure = {
  ok: false;
  error: string;
  code?: string;
};

export type PaymentInitResult = PaymentInitSuccess | PaymentInitFailure;

function resolveProvider(): PaymentProvider {
  const key = (process.env.THAWANI_SECRET_KEY || '').trim();
  const pub = (process.env.THAWANI_PUBLISHABLE_KEY || '').trim();
  if (key && pub) return 'thawani';
  return 'mock';
}

export type PaymentGatewayCheck = {
  id: string;
  ok: boolean;
  labelAr: string;
  labelEn: string;
};

/** حالة بوابة الدفع — للمراجعة من لوحة الإدارة */
export function getPaymentGatewayStatus() {
  const provider = resolveProvider();
  const siteBase = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const secretKeySet = !!(process.env.THAWANI_SECRET_KEY || '').trim();
  const publishableKeySet = !!(process.env.THAWANI_PUBLISHABLE_KEY || '').trim();
  const webhookSecretSet = !!(process.env.THAWANI_WEBHOOK_SECRET || '').trim();
  const nextAuthUrlSet = !!siteBase;
  const webhookPath = '/api/webhooks/thawani';
  const webhookUrl = siteBase ? `${siteBase}${webhookPath}` : '';

  const checks: PaymentGatewayCheck[] = [
    {
      id: 'nextauth_url',
      ok: nextAuthUrlSet,
      labelAr: 'NEXTAUTH_URL مضبوط',
      labelEn: 'NEXTAUTH_URL is set',
    },
    {
      id: 'thawani_secret',
      ok: secretKeySet,
      labelAr: 'THAWANI_SECRET_KEY مضبوط',
      labelEn: 'THAWANI_SECRET_KEY is set',
    },
    {
      id: 'thawani_publishable',
      ok: publishableKeySet,
      labelAr: 'THAWANI_PUBLISHABLE_KEY مضبوط',
      labelEn: 'THAWANI_PUBLISHABLE_KEY is set',
    },
    {
      id: 'webhook_secret',
      ok: webhookSecretSet,
      labelAr: 'THAWANI_WEBHOOK_SECRET مضبوط',
      labelEn: 'THAWANI_WEBHOOK_SECRET is set',
    },
  ];

  const productionReady =
    provider === 'thawani' && nextAuthUrlSet && secretKeySet && publishableKeySet && webhookSecretSet;

  return {
    provider,
    thawaniConfigured: provider === 'thawani',
    secretKeySet,
    publishableKeySet,
    webhookSecretSet,
    webhookPath,
    webhookUrl,
    webhookHeader: 'x-webhook-secret',
    successUrl: process.env.THAWANI_SUCCESS_URL || (siteBase ? `${siteBase}/ar/payment/success` : ''),
    cancelUrl: process.env.THAWANI_CANCEL_URL || (siteBase ? `${siteBase}/ar/payment/cancel` : ''),
    nextAuthUrlSet,
    siteBase: siteBase || null,
    productionReady,
    checks,
  };
}

function generateMockReference(): string {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/** Thawani — placeholder حتى ربط API الرسمي */
async function initiateThawaniPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
  const baseUrl = (process.env.THAWANI_API_BASE || 'https://checkout.thawani.om/api/v1').replace(/\/$/, '');
  const secret = (process.env.THAWANI_SECRET_KEY || '').trim();
  if (!secret) {
    return { ok: false, error: 'THAWANI_NOT_CONFIGURED', code: 'THAWANI_NOT_CONFIGURED' };
  }

  const locale = input.locale === 'en' ? 'en' : 'ar';
  const siteBase = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const successUrl =
    process.env.THAWANI_SUCCESS_URL || `${siteBase}/${locale}/payment/success`;
  const cancelUrl =
    process.env.THAWANI_CANCEL_URL || `${siteBase}/${locale}/payment/cancel`;

  try {
    const res = await fetch(`${baseUrl}/checkout/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'thawani-api-key': secret,
      },
      body: JSON.stringify({
        client_reference_id: `BHD-${input.propertyId}-${Date.now()}`,
        mode: 'payment',
        products: [
          {
            name: input.bookingType === 'BOOKING' ? 'Property booking deposit' : 'Property viewing',
            quantity: 1,
            unit_amount: Math.round(input.amount * 1000),
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          propertyId: String(input.propertyId),
          unitKey: input.unitKey || '',
          payerEmail: input.payerEmail,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: text || 'THAWANI_REQUEST_FAILED', code: 'THAWANI_REQUEST_FAILED' };
    }

    const data = (await res.json()) as { data?: { session_id?: string; checkout_url?: string } };
    const sessionId = data?.data?.session_id || generateMockReference();
    return {
      ok: true,
      provider: 'thawani',
      paymentReferenceNo: sessionId,
      paymentDate: new Date().toISOString(),
      redirectUrl: data?.data?.checkout_url,
    };
  } catch {
    return { ok: false, error: 'THAWANI_NETWORK_ERROR', code: 'THAWANI_NETWORK_ERROR' };
  }
}

export async function initiateBookingPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'INVALID_AMOUNT', code: 'INVALID_AMOUNT' };
  }
  if (!input.payerEmail?.trim() || !input.payerName?.trim()) {
    return { ok: false, error: 'MISSING_PAYER', code: 'MISSING_PAYER' };
  }

  const provider = resolveProvider();
  if (provider === 'thawani') {
    return initiateThawaniPayment(input);
  }

  return {
    ok: true,
    provider: 'mock',
    paymentReferenceNo: generateMockReference(),
    paymentDate: new Date().toISOString(),
  };
}

/** التحقق من دفع جلسة Thawani — mock يُقبل PAY-* في التطوير */
export async function verifyThawaniSessionPaid(sessionId: string): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;

  const secret = (process.env.THAWANI_SECRET_KEY || '').trim();
  if (!secret) {
    return id.startsWith('PAY-');
  }

  const baseUrl = (process.env.THAWANI_API_BASE || 'https://checkout.thawani.om/api/v1').replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/checkout/session/${encodeURIComponent(id)}`, {
      headers: { 'thawani-api-key': secret },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      data?: { payment_status?: string; status?: string };
    };
    const status = String(data?.data?.payment_status || data?.data?.status || '').toLowerCase();
    return status === 'paid' || status === 'successful' || status === 'success';
  } catch {
    return false;
  }
}
