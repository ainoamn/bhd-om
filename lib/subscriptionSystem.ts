/**
 * أنواع ونظام الاشتراكات — منسوخ من ain-oman-web ومتكيف مع bhd-om (API + Prisma)
 * الباقات الفعلية تُجلب من GET /api/plans و GET /api/subscriptions/me
 */

export interface SubscriptionPlanDisplay {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
  sortOrder?: number;
  popular?: boolean;
  color?: string;
}

export interface UserSubscriptionDisplay {
  id: string;
  planId: string;
  status: string;
  startAt: string;
  endAt: string;
  remainingDays?: number;
  usage: Record<string, number>;
  plan: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    priceMonthly: number;
    priceYearly?: number;
    currency: string;
    features: string[];
    limits: Record<string, number>;
  } | null;
}

/** خصم 20% على الاشتراك السنوي (مثل ain-oman-web) */
export function getYearlyPrice(monthlyPrice: number): number {
  return monthlyPrice * 12 * 0.8;
}

export function formatPlanCurrency(amount: number, currency: string = 'OMR'): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
