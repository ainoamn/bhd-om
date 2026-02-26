/**
 * تكوين الموقع المركزي
 * Central Site Configuration
 * يتبع معايير W3C واختبارات الوصول والتقنيات الحديثة
 */

export const siteConfig = {
  /** بيانات الشركة */
  company: {
    nameAr: 'بن حمود للتطوير',
    nameEn: 'Bin Hamood Development',
    legalName: 'Bin Hamood Development SPC',
    sloganAr: 'ش ش و',
    sloganEn: 'SPC',
    url: 'https://bhd-om.com',
    email: 'info@bhd-om.com',
    phone: '+96891115341',
    whatsapp: '96891115341',
    address: 'سلطنة عمان',
    addressEn: 'Sultanate of Oman',
  },

  /** ألوان التصميم - Design Tokens */
  theme: {
    primary: '#8B6F47',
    primaryDark: '#6B5535',
    primaryLight: '#A6895F',
  },

  /** مسافات قياسية - Spacing Scale (8px grid) */
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  /** تكوين التحليلات - يُملأ من متغيرات البيئة */
  analytics: {
    ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '',
    enabled: !!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  },

  /** مستودع الكود المصدري - للتطوير والمزامنة بين الأجهزة والرفع المستقبلي */
  repository: {
    url: 'https://github.com/ainoamn/bhd-om',
    cloneUrl: 'https://github.com/ainoamn/bhd-om.git',
  },

  /** إعدادات التتبع */
  tracking: {
    /** تفعيل تتبع Web Vitals */
    webVitals: true,
    /** تفعيل تتبع أحداث الصفحات */
    pageView: true,
    /** تفعيل تتبع التفاعلات (نقرات، أشكال) */
    events: true,
  },
} as const;
