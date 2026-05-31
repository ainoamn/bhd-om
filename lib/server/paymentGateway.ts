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
        success_url: process.env.THAWANI_SUCCESS_URL || `${process.env.NEXTAUTH_URL || ''}/payment/success`,
        cancel_url: process.env.THAWANI_CANCEL_URL || `${process.env.NEXTAUTH_URL || ''}/payment/cancel`,
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
