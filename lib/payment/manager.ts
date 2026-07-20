/**
 * مدير الدفع الموحد — يدعم 11 بوابة:
 * Thawani, Stripe, PayPal, Telr, CMI, Network International,
 * HyperPay, PayFort, MyFatoorah, PayTabs, Tap Payments
 * كل بوابة في ملفها المنفصل، وهذا الملف يربطها بـ API موحد
 */

import * as thawani from './thawani';
import * as stripe from './stripe';
import * as paypal from './paypal';
import * as telr from './telr';
import * as cmi from './cmi';
import * as networkIntl from './network-intl';
import * as hyperpay from './hyperpay';
import * as payfort from './payfort';
import * as myfatoorah from './myfatoorah';
import * as paytabs from './paytabs';
import * as tap from './tap';

/** البوابات المتاحة */
export type PaymentProvider =
  | 'thawani'
  | 'stripe'
  | 'paypal'
  | 'telr'
  | 'cmi'
  | 'network-intl'
  | 'hyperpay'
  | 'payfort'
  | 'myfatoorah'
  | 'paytabs'
  | 'tap';

export const ALL_PROVIDERS: PaymentProvider[] = [
  'thawani',
  'stripe',
  'paypal',
  'telr',
  'cmi',
  'network-intl',
  'hyperpay',
  'payfort',
  'myfatoorah',
  'paytabs',
  'tap',
];

/** معلومات البوابة */
export interface ProviderInfo {
  key: PaymentProvider;
  nameAr: string;
  nameEn: string;
  icon: string;
  descriptionAr: string;
  descriptionEn: string;
  currencies: string[];
  countries: string[];
  enabled: boolean;
}

/** نتيجة جلسة الدفع الموحدة */
export interface PaymentSession {
  checkoutUrl: string;
  sessionId: string;
  reference: string;
  provider: PaymentProvider;
}

/** نتيجة التحقق من الدفع الموحدة */
export interface PaymentVerification {
  paid: boolean;
  amount: number;
  reference: string;
  paymentMethod?: string;
  provider: PaymentProvider;
}

/** معاملات إنشاء جلسة الدفع */
export interface CreateSessionParams {
  amount: number; // بالريال العماني
  description: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

/** معلومات كل بوابة */
const PROVIDER_INFO: Record<PaymentProvider, Omit<ProviderInfo, 'enabled'>> = {
  thawani: {
    key: 'thawani',
    nameAr: 'ثواني',
    nameEn: 'Thawani',
    icon: '🇴🇲',
    descriptionAr: 'الدفع عبر ثواني — البطاقات المصرفية العمانية',
    descriptionEn: 'Pay via Thawani — Omani banking cards',
    currencies: ['OMR'],
    countries: ['OM'],
  },
  stripe: {
    key: 'stripe',
    nameAr: 'سترايب',
    nameEn: 'Stripe',
    icon: '💳',
    descriptionAr: 'بطاقات ائتمان عالمية (Visa, Mastercard, Amex)',
    descriptionEn: 'Global credit cards (Visa, Mastercard, Amex)',
    currencies: ['OMR', 'USD', 'EUR', 'GBP'],
    countries: ['*'],
  },
  paypal: {
    key: 'paypal',
    nameAr: 'باي بال',
    nameEn: 'PayPal',
    icon: '🅿️',
    descriptionAr: 'المدفوعات الدولية عبر PayPal',
    descriptionEn: 'International payments via PayPal',
    currencies: ['OMR', 'USD', 'EUR', 'GBP'],
    countries: ['*'],
  },
  telr: {
    key: 'telr',
    nameAr: 'تلر',
    nameEn: 'Telr',
    icon: '🔒',
    descriptionAr: 'مدفوعات آمنة للمنطقة العربية',
    descriptionEn: 'Secure payments for the Arab region',
    currencies: ['OMR', 'AED', 'SAR', 'USD'],
    countries: ['AE', 'SA', 'OM', 'BH', 'KW', 'QA'],
  },
  'cmi': {
    key: 'cmi',
    nameAr: 'بوابة الدفع الوطنية',
    nameEn: 'CMI / Oman Payment Gateway',
    icon: '🏦',
    descriptionAr: 'البوابة الوطنية للمدفوعات — البنك المركزي العماني',
    descriptionEn: 'Oman National Payment Gateway — Central Bank of Oman',
    currencies: ['OMR'],
    countries: ['OM'],
  },
  'network-intl': {
    key: 'network-intl',
    nameAr: 'نتورك إنترناشيونال',
    nameEn: 'Network International',
    icon: '🌐',
    descriptionAr: 'مدفوعات آمنة — عمان والإمارات',
    descriptionEn: 'Secure payments — Oman & UAE',
    currencies: ['OMR', 'AED', 'USD'],
    countries: ['OM', 'AE'],
  },
  'hyperpay': {
    key: 'hyperpay',
    nameAr: 'هايبر باي',
    nameEn: 'HyperPay',
    icon: '⚡',
    descriptionAr: 'Apple Pay, Google Pay, STC Pay, مدى',
    descriptionEn: 'Apple Pay, Google Pay, STC Pay, Mada',
    currencies: ['OMR', 'SAR', 'AED', 'USD'],
    countries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA'],
  },
  'payfort': {
    key: 'payfort',
    nameAr: 'أمازون للمدفوعات',
    nameEn: 'Amazon Payment Services',
    icon: '📱',
    descriptionAr: 'مدفوعات آمنة — الإمارات والخليج',
    descriptionEn: 'Secure payments — UAE & GCC',
    currencies: ['OMR', 'AED', 'SAR', 'USD', 'EGP'],
    countries: ['AE', 'SA', 'EG', 'OM', 'BH', 'KW', 'QA'],
  },
  'myfatoorah': {
    key: 'myfatoorah',
    nameAr: 'فاتورتي',
    nameEn: 'MyFatoorah',
    icon: '🧾',
    descriptionAr: 'KNET، Apple Pay، Google Pay، Visa، Mastercard',
    descriptionEn: 'KNET, Apple Pay, Google Pay, Visa, Mastercard',
    currencies: ['OMR', 'KWD', 'AED', 'SAR', 'USD'],
    countries: ['KW', 'OM', 'SA', 'AE', 'BH', 'QA'],
  },
  'paytabs': {
    key: 'paytabs',
    nameAr: 'بيتابس',
    nameEn: 'PayTabs',
    icon: '💠',
    descriptionAr: 'Mada، Apple Pay، STC Pay، Visa، Mastercard',
    descriptionEn: 'Mada, Apple Pay, STC Pay, Visa, Mastercard',
    currencies: ['OMR', 'SAR', 'AED', 'USD'],
    countries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'EG'],
  },
  'tap': {
    key: 'tap',
    nameAr: 'تاب للمدفوعات',
    nameEn: 'Tap Payments',
    icon: '🔵',
    descriptionAr: 'KNET، Apple Pay، Google Pay، Visa، Mastercard',
    descriptionEn: 'KNET, Apple Pay, Google Pay, Visa, Mastercard',
    currencies: ['OMR', 'KWD', 'AED', 'SAR', 'USD', 'BHD', 'QAR'],
    countries: ['KW', 'OM', 'SA', 'AE', 'BH', 'QA'],
  },
};

/** التحقق من صحة اسم البوابة */
export function isValidProvider(p: string): p is PaymentProvider {
  return ALL_PROVIDERS.includes(p as PaymentProvider);
}

/** التحقق من تفعيل البوابة (هل مفاتيح API مضبوطة؟) */
export function isProviderActive(provider: PaymentProvider): boolean {
  const envMap: Record<PaymentProvider, string | undefined> = {
    thawani: process.env.THAWANI_SECRET_KEY,
    stripe: process.env.STRIPE_SECRET_KEY,
    paypal: process.env.PAYPAL_CLIENT_ID,
    telr: process.env.TELR_STORE_ID,
    'cmi': process.env.CMI_MERCHANT_ID,
    'network-intl': process.env.NI_API_KEY,
    'hyperpay': process.env.HYPERPAY_ACCESS_TOKEN,
    'payfort': process.env.PAYFORT_MERCHANT_IDENTIFIER,
    'myfatoorah': process.env.MF_API_KEY,
    'paytabs': process.env.PAYTABS_SERVER_KEY,
    'tap': process.env.TAP_SECRET_KEY,
  };
  return !!(envMap[provider] || '').trim();
}

/** عدد البوابات المفعلة */
export function getEnabledCount(): number {
  return ALL_PROVIDERS.filter(isProviderActive).length;
}

/** قائمة البوابات المتاحة */
export function getEnabledProviders(): ProviderInfo[] {
  return ALL_PROVIDERS.map((key) => ({
    ...PROVIDER_INFO[key],
    enabled: isProviderActive(key),
  })).filter((p) => p.enabled);
}

/** قائمة جميع البوابات (للعرض) */
export function getAllProviders(): ProviderInfo[] {
  return ALL_PROVIDERS.map((key) => ({
    ...PROVIDER_INFO[key],
    enabled: isProviderActive(key),
  }));
}

/** بوابات دول الخليج فقط */
export function getGulfProviders(): ProviderInfo[] {
  return getAllProviders().filter((p) =>
    p.countries.some((c) => ['OM', 'AE', 'SA', 'KW', 'BH', 'QA'].includes(c))
  );
}

/** بوابات عمان فقط */
export function getOmanProviders(): ProviderInfo[] {
  return getAllProviders().filter((p) => p.countries.includes('OM'));
}

/**
 * إنشاء جلسة دفع — يوجه للبوابة المناسبة
 */
export async function createPayment(
  provider: PaymentProvider,
  params: CreateSessionParams
): Promise<PaymentSession> {
  if (!isProviderActive(provider)) {
    throw new Error(
      `بوابة ${PROVIDER_INFO[provider].nameAr} غير مفعلة. يرجى إضافة مفاتيح API في إعدادات النظام.`
    );
  }

  try {
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
      case 'cmi': {
        const s = await cmi.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'cmi',
        };
      }
      case 'network-intl': {
        const s = await networkIntl.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'network-intl',
        };
      }
      case 'hyperpay': {
        const s = await hyperpay.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'hyperpay',
        };
      }
      case 'payfort': {
        const s = await payfort.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'payfort',
        };
      }
      case 'myfatoorah': {
        const s = await myfatoorah.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'myfatoorah',
        };
      }
      case 'paytabs': {
        const s = await paytabs.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'paytabs',
        };
      }
      case 'tap': {
        const s = await tap.createPaymentSession(params);
        return {
          checkoutUrl: s.checkout_url,
          sessionId: s.session_id,
          reference: s.reference,
          provider: 'tap',
        };
      }
      default:
        throw new Error(`بوابة غير مدعومة: ${provider}`);
    }
  } catch (error) {
    console.error(`[PaymentManager] ${provider} error:`, error);
    throw error;
  }
}

/**
 * التحقق من حالة الدفع
 */
export async function verifyPayment(
  provider: PaymentProvider,
  sessionId: string
): Promise<PaymentVerification> {
  try {
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
      case 'cmi': {
        // CMI uses callback params not session ID
        const v = await cmi.verifyPayment({ oid: sessionId });
        return { ...v, provider: 'cmi' };
      }
      case 'network-intl': {
        const v = await networkIntl.verifyPayment(sessionId);
        return { ...v, provider: 'network-intl' };
      }
      case 'hyperpay': {
        const v = await hyperpay.verifyPayment(sessionId);
        return { ...v, provider: 'hyperpay' };
      }
      case 'payfort': {
        const v = await payfort.verifyPayment(sessionId);
        return { ...v, provider: 'payfort' };
      }
      case 'myfatoorah': {
        const v = await myfatoorah.verifyPayment(sessionId);
        return { ...v, provider: 'myfatoorah' };
      }
      case 'paytabs': {
        const v = await paytabs.verifyPayment(sessionId);
        return { ...v, provider: 'paytabs' };
      }
      case 'tap': {
        const v = await tap.verifyPayment(sessionId);
        return { ...v, provider: 'tap' };
      }
      default:
        throw new Error(`بوابة غير مدعومة: ${provider}`);
    }
  } catch (error) {
    console.error(`[PaymentManager] verify ${provider} error:`, error);
    throw error;
  }
}

/**
 * التحقق من صحة إعدادات جميع البوابات
 */
export async function healthCheckAll(): Promise<
  Record<PaymentProvider, boolean>
> {
  const results = await Promise.allSettled([
    thawani.healthCheck(),
    stripe.healthCheck(),
    paypal.healthCheck(),
    telr.healthCheck(),
    cmi.healthCheck(),
    networkIntl.healthCheck(),
    hyperpay.healthCheck(),
    payfort.healthCheck(),
    myfatoorah.healthCheck(),
    paytabs.healthCheck(),
    tap.healthCheck(),
  ]);

  return {
    thawani: results[0].status === 'fulfilled' && (results[0] as PromiseFulfilledResult<boolean>).value,
    stripe: results[1].status === 'fulfilled' && (results[1] as PromiseFulfilledResult<boolean>).value,
    paypal: results[2].status === 'fulfilled' && (results[2] as PromiseFulfilledResult<boolean>).value,
    telr: results[3].status === 'fulfilled' && (results[3] as PromiseFulfilledResult<boolean>).value,
    'cmi': results[4].status === 'fulfilled' && (results[4] as PromiseFulfilledResult<boolean>).value,
    'network-intl': results[5].status === 'fulfilled' && (results[5] as PromiseFulfilledResult<boolean>).value,
    'hyperpay': results[6].status === 'fulfilled' && (results[6] as PromiseFulfilledResult<boolean>).value,
    'payfort': results[7].status === 'fulfilled' && (results[7] as PromiseFulfilledResult<boolean>).value,
    'myfatoorah': results[8].status === 'fulfilled' && (results[8] as PromiseFulfilledResult<boolean>).value,
    'paytabs': results[9].status === 'fulfilled' && (results[9] as PromiseFulfilledResult<boolean>).value,
    'tap': results[10].status === 'fulfilled' && (results[10] as PromiseFulfilledResult<boolean>).value,
  };
}

/**
 * التحقق من صحة بوابة محددة
 */
export async function healthCheckProvider(
  provider: PaymentProvider
): Promise<boolean> {
  const checks: Record<PaymentProvider, () => Promise<boolean>> = {
    thawani: thawani.healthCheck,
    stripe: stripe.healthCheck,
    paypal: paypal.healthCheck,
    telr: telr.healthCheck,
    'cmi': cmi.healthCheck,
    'network-intl': networkIntl.healthCheck,
    'hyperpay': hyperpay.healthCheck,
    'payfort': payfort.healthCheck,
    'myfatoorah': myfatoorah.healthCheck,
    'paytabs': paytabs.healthCheck,
    'tap': tap.healthCheck,
  };

  try {
    return await checks[provider]();
  } catch {
    return false;
  }
}

/**
 * التحقق من وجود بوابات مفعلة
 */
export function hasEnabledProviders(): boolean {
  return getEnabledCount() > 0;
}

/**
 * الحصول على أول بوابة مفعلة (افتراضية)
 */
export function getDefaultProvider(): PaymentProvider | null {
  const enabled = ALL_PROVIDERS.filter(isProviderActive);
  return enabled.length > 0 ? enabled[0] : null;
}

/** توافق مع المسارات الحالية */
export type GatewayProvider = PaymentProvider;
