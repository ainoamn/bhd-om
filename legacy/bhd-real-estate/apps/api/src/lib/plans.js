/** باقات SaaS — حدود كل باقة */
export const SUBSCRIPTION_PLANS = {
  trial: {
    code: 'trial',
    nameAr: 'تجريبي',
    nameEn: 'Trial',
    maxUsers: 5,
    maxUnits: 500,
    trialDays: 30,
  },
  starter: {
    code: 'starter',
    nameAr: 'أساسي',
    nameEn: 'Starter',
    maxUsers: 15,
    maxUnits: 3000,
  },
  business: {
    code: 'business',
    nameAr: 'أعمال',
    nameEn: 'Business',
    maxUsers: 50,
    maxUnits: 15000,
  },
  enterprise: {
    code: 'enterprise',
    nameAr: 'مؤسسات',
    nameEn: 'Enterprise',
    maxUsers: 500,
    maxUnits: 1000000,
  },
};

export function getPlan(code) {
  return SUBSCRIPTION_PLANS[code] || SUBSCRIPTION_PLANS.trial;
}

export function slugifyCompanySlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `co-${Date.now().toString(36)}`;
}
