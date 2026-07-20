/**
 * مدير الدفع الموحد — يدعم 4 بوابات: Thawani, Stripe, PayPal, Telr
 */

import * as thawani from './thawani';
import * as stripe from './stripe';
import * as paypal from './paypal';
import * as telr from './telr';

export type GatewayProvider = 'thawani' | 'stripe' | 'paypal' | 'telr';

export const ALL_PROVIDERS: GatewayProvider[] = ['thawani', 'stripe', 'paypal', 'telr'];

export interface ProviderInfo {
  key: GatewayProvider;
  nameAr: string;
  nameEn: string;
  icon: string;
  descriptionAr: string;
  descriptionEn: string;
  currencies: string[];
  enabled: boolean;
}

export interface PaymentSession {
  checkoutUrl: string;
  sessionId: string;
  reference: string;
  provider: GatewayProvider;
}

export interface PaymentVerification {
  paid: boolean;
  amount: number;
  reference: string;
  paymentMethod?: string;
  provider: GatewayProvider;
}

export interface CreateSessionParams {
  amount: number;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

const PROVIDER_INFO: Record<GatewayProvider, Omit<ProviderInfo, 'enabled'>> = {
  thawani: {
    key: 'thawani',
    nameAr: 'ثواني',
    nameEn: 'Thawani',
    icon: '🇴🇲',
    descriptionAr: 'الدفع عبر ثواني — البطاقات المصرفية العمانية',
    descriptionEn: 'Pay via Thawani — Omani banking cards',
    currencies: ['OMR'],
  },
  stripe: {
    key: 'stripe',
    nameAr: 'سترايب',
    nameEn: 'Stripe',
    icon: '💳',
    descriptionAr: 'بطاقات ائتمان عالمية (Visa, Mastercard, Amex)',
    descriptionEn: 'Global credit cards (Visa, Mastercard, Amex)',
    currencies: ['OMR', 'USD', 'EUR', 'GBP'],
  },
  paypal: {
    key: 'paypal',
    nameAr: 'باي بال',
    nameEn: 'PayPal',
    icon: '🅿️',
    descriptionAr: 'المدفوعات الدولية عبر PayPal',
    descriptionEn: 'International payments via PayPal',
    currencies: ['OMR', 'USD', 'EUR', 'GBP'],
  },
  telr: {
    key: 'telr',
    nameAr: 'تلر',
    nameEn: 'Telr',
    icon: '🔒',
    descriptionAr: 'مدفوعات آمنة للمنطقة العربية',
    descriptionEn: 'Secure payments for the Arab region',
    currencies: ['OMR', 'AED', 'SAR', 'USD'],
  },
};

export function isValidProvider(p: string): p is GatewayProvider {
  return ALL_PROVIDERS.includes(p as GatewayProvider);
}

export function isProviderActive(provider: GatewayProvider): boolean {
  const envMap: Record<GatewayProvider, string | undefined> = {
    thawani: process.env.THAWANI_SECRET_KEY,
    stripe: process.env.STRIPE_SECRET_KEY,
    paypal: process.env.PAYPAL_CLIENT_ID,
    telr: process.env.TELR_STORE_ID,
  };
  return !!(envMap[provider] || '').trim();
}

export function getEnabledProviders(): ProviderInfo[] {
  return ALL_PROVIDERS.map((key) => ({
    ...PROVIDER_INFO[key],
    enabled: isProviderActive(key),
  })).filter((p) => p.enabled);
}

export function getAllProviders(): ProviderInfo[] {
  return ALL_PROVIDERS.map((key) => ({
    ...PROVIDER_INFO[key],
    enabled: isProviderActive(key),
  }));
}

export async function createPayment(
  provider: GatewayProvider,
  params: CreateSessionParams
): Promise<PaymentSession> {
  if (!isProviderActive(provider)) {
    throw new Error(
      `بوابة ${PROVIDER_INFO[provider].nameAr} غير مفعلة. يرجى إضافة مفاتيح API في إعدادات النظام.`
    );
  }

  switch (provider) {
    case 'thawani': {
      const s = await thawani.createPaymentSession(params);
      return {
        checkoutUrl: s.checkout_url,
        sessionId: s.session_id,
        reference: s.client_reference_id,
        provider: 'thawani',
      };
    }
    case 'stripe': {
      const s = await stripe.createPaymentSession(params);
      return {
        checkoutUrl: s.checkout_url,
        sessionId: s.session_id,
        reference: s.reference,
        provider: 'stripe',
      };
    }
    case 'paypal': {
      const s = await paypal.createPaymentSession(params);
      return {
        checkoutUrl: s.checkout_url,
        sessionId: s.session_id,
        reference: s.reference,
        provider: 'paypal',
      };
    }
    case 'telr': {
      const s = await telr.createPaymentSession(params);
      return {
        checkoutUrl: s.checkout_url,
        sessionId: s.session_id,
        reference: s.reference,
        provider: 'telr',
      };
    }
    default:
      throw new Error(`بوابة غير مدعومة: ${provider as string}`);
  }
}

export async function verifyPayment(
  provider: GatewayProvider,
  sessionId: string
): Promise<PaymentVerification> {
  switch (provider) {
    case 'thawani': {
      const v = await thawani.verifyPayment(sessionId);
      return { ...v, provider: 'thawani' };
    }
    case 'stripe': {
      const v = await stripe.verifyPayment(sessionId);
      return { ...v, provider: 'stripe' };
    }
    case 'paypal': {
      const v = await paypal.verifyPayment(sessionId);
      return { ...v, provider: 'paypal' };
    }
    case 'telr': {
      const v = await telr.verifyPayment(sessionId);
      return { ...v, provider: 'telr' };
    }
    default:
      throw new Error(`بوابة غير مدعومة: ${provider as string}`);
  }
}

export async function healthCheckAll(): Promise<Record<GatewayProvider, boolean>> {
  const results = await Promise.allSettled([
    thawani.healthCheck(),
    stripe.healthCheck(),
    paypal.healthCheck(),
    telr.healthCheck(),
  ]);

  return {
    thawani: results[0].status === 'fulfilled' && results[0].value,
    stripe: results[1].status === 'fulfilled' && results[1].value,
    paypal: results[2].status === 'fulfilled' && results[2].value,
    telr: results[3].status === 'fulfilled' && results[3].value,
  };
}

/** توافق أسماء قديمة من حزمة Kimi */
export type PaymentProvider = GatewayProvider;
