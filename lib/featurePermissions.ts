/**
 * نظام الصلاحيات — منسوخ من ain-oman-web كما هو
 * للاستخدام في صفحة إدارة الباقات (مصفوفة الصلاحيات)
 */
export interface FeaturePermission {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  requiredPlan: 'basic' | 'standard' | 'premium' | 'enterprise';
  icon?: string;
}

export const FEATURE_PERMISSIONS: Record<string, FeaturePermission> = {
  OVERVIEW: { id: 'overview', name: 'Overview', nameAr: 'نظرة عامة', description: 'View property overview and statistics', descriptionAr: 'عرض نظرة عامة وإحصائيات العقار', category: 'property_management', requiredPlan: 'basic' },
  TASKS_VIEW: { id: 'tasks_view', name: 'View Tasks', nameAr: 'عرض المهام', description: 'View property tasks', descriptionAr: 'عرض مهام العقار', category: 'property_management', requiredPlan: 'standard' },
  TASKS_MANAGE: { id: 'tasks_manage', name: 'Manage Tasks', nameAr: 'إدارة المهام', description: 'Create and manage tasks', descriptionAr: 'إنشاء وإدارة المهام', category: 'property_management', requiredPlan: 'standard' },
  LEASES_VIEW: { id: 'leases_view', name: 'View Leases', nameAr: 'عرض عقود الإيجار', description: 'View lease contracts', descriptionAr: 'عرض عقود الإيجار', category: 'property_management', requiredPlan: 'basic' },
  LEASES_MANAGE: { id: 'leases_manage', name: 'Manage Leases', nameAr: 'إدارة عقود الإيجار', description: 'Create and manage lease contracts', descriptionAr: 'إنشاء وإدارة عقود الإيجار', category: 'property_management', requiredPlan: 'standard' },
  INVOICES_VIEW: { id: 'invoices_view', name: 'View Invoices', nameAr: 'عرض الفواتير', description: 'View invoices and payments', descriptionAr: 'عرض الفواتير والمدفوعات', category: 'property_management', requiredPlan: 'basic' },
  INVOICES_MANAGE: { id: 'invoices_manage', name: 'Manage Invoices', nameAr: 'إدارة الفواتير', description: 'Create and manage invoices', descriptionAr: 'إنشاء وإدارة الفواتير', category: 'property_management', requiredPlan: 'standard' },
  MAINTENANCE_VIEW: { id: 'maintenance_view', name: 'View Maintenance', nameAr: 'عرض الصيانة', description: 'View maintenance requests', descriptionAr: 'عرض طلبات الصيانة', category: 'property_management', requiredPlan: 'standard' },
  MAINTENANCE_MANAGE: { id: 'maintenance_manage', name: 'Manage Maintenance', nameAr: 'إدارة الصيانة', description: 'Create and manage maintenance requests', descriptionAr: 'إنشاء وإدارة طلبات الصيانة', category: 'property_management', requiredPlan: 'standard' },
  LEGAL_VIEW: { id: 'legal_view', name: 'View Legal Cases', nameAr: 'عرض القضايا القانونية', description: 'View legal cases', descriptionAr: 'عرض القضايا القانونية', category: 'property_management', requiredPlan: 'premium' },
  LEGAL_MANAGE: { id: 'legal_manage', name: 'Manage Legal Cases', nameAr: 'إدارة القضايا القانونية', description: 'Create and manage legal cases', descriptionAr: 'إنشاء وإدارة القضايا القانونية', category: 'property_management', requiredPlan: 'premium' },
  CONTRACTS_VIEW: { id: 'contracts_view', name: 'View Contracts', nameAr: 'عرض العقود', description: 'View all contracts', descriptionAr: 'عرض جميع العقود', category: 'property_management', requiredPlan: 'basic' },
  CONTRACTS_MANAGE: { id: 'contracts_manage', name: 'Manage Contracts', nameAr: 'إدارة العقود', description: 'Create and manage contracts', descriptionAr: 'إنشاء وإدارة العقود', category: 'property_management', requiredPlan: 'standard' },
  REQUESTS_VIEW: { id: 'requests_view', name: 'View Requests', nameAr: 'عرض الطلبات', description: 'View tenant requests', descriptionAr: 'عرض طلبات المستأجرين', category: 'property_management', requiredPlan: 'basic' },
  REQUESTS_MANAGE: { id: 'requests_manage', name: 'Manage Requests', nameAr: 'إدارة الطلبات', description: 'Respond to and manage requests', descriptionAr: 'الرد على وإدارة الطلبات', category: 'property_management', requiredPlan: 'standard' },
  CALENDAR_VIEW: { id: 'calendar_view', name: 'View Calendar', nameAr: 'عرض التقويم', description: 'View calendar events', descriptionAr: 'عرض أحداث التقويم', category: 'property_management', requiredPlan: 'standard' },
  CALENDAR_MANAGE: { id: 'calendar_manage', name: 'Manage Calendar', nameAr: 'إدارة التقويم', description: 'Create and manage calendar events', descriptionAr: 'إنشاء وإدارة أحداث التقويم', category: 'property_management', requiredPlan: 'standard' },
  ALERTS_VIEW: { id: 'alerts_view', name: 'View Alerts', nameAr: 'عرض التنبيهات', description: 'View property alerts', descriptionAr: 'عرض تنبيهات العقار', category: 'property_management', requiredPlan: 'standard' },
  ALERTS_MANAGE: { id: 'alerts_manage', name: 'Manage Alerts', nameAr: 'إدارة التنبيهات', description: 'Create and manage alerts', descriptionAr: 'إنشاء وإدارة التنبيهات', category: 'property_management', requiredPlan: 'standard' },
  REVIEWS_VIEW: { id: 'reviews_view', name: 'View Reviews', nameAr: 'عرض التقييمات', description: 'View property reviews', descriptionAr: 'عرض تقييمات العقار', category: 'property_management', requiredPlan: 'basic' },
  REVIEWS_MANAGE: { id: 'reviews_manage', name: 'Manage Reviews', nameAr: 'إدارة التقييمات', description: 'Respond to reviews', descriptionAr: 'الرد على التقييمات', category: 'property_management', requiredPlan: 'standard' },
  AI_ANALYTICS: { id: 'ai_analytics', name: 'AI Analytics', nameAr: 'التنبؤات والذكاء', description: 'AI-powered predictions and insights', descriptionAr: 'تنبؤات ورؤى مدعومة بالذكاء الاصطناعي', category: 'property_management', requiredPlan: 'premium' },
  ADVANCED_REPORTS: { id: 'advanced_reports', name: 'Advanced Reports', nameAr: 'التقارير المتقدمة', description: 'Generate advanced reports', descriptionAr: 'إنشاء التقارير المتقدمة', category: 'property_management', requiredPlan: 'premium' },
  BULK_OPERATIONS: { id: 'bulk_operations', name: 'Bulk Operations', nameAr: 'العمليات الجماعية', description: 'Perform bulk operations', descriptionAr: 'تنفيذ العمليات الجماعية', category: 'property_management', requiredPlan: 'premium' },
  API_ACCESS: { id: 'api_access', name: 'API Access', nameAr: 'الوصول للـ API', description: 'Access to API', descriptionAr: 'الوصول إلى واجهة البرمجة', category: 'system', requiredPlan: 'enterprise' },
  WHITE_LABEL: { id: 'white_label', name: 'White Label', nameAr: 'العلامة البيضاء', description: 'White label solution', descriptionAr: 'حل العلامة البيضاء', category: 'system', requiredPlan: 'enterprise' },
};

/** تعيين الصلاحيات الافتراضية لكل باقة (كما في الموقع القديم) */
export const PLAN_FEATURES: Record<string, string[]> = {
  basic: ['OVERVIEW', 'LEASES_VIEW', 'INVOICES_VIEW', 'CONTRACTS_VIEW', 'REQUESTS_VIEW', 'REVIEWS_VIEW'],
  standard: ['OVERVIEW', 'TASKS_VIEW', 'TASKS_MANAGE', 'LEASES_VIEW', 'LEASES_MANAGE', 'INVOICES_VIEW', 'INVOICES_MANAGE', 'MAINTENANCE_VIEW', 'MAINTENANCE_MANAGE', 'CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'REQUESTS_VIEW', 'REQUESTS_MANAGE', 'CALENDAR_VIEW', 'CALENDAR_MANAGE', 'ALERTS_VIEW', 'ALERTS_MANAGE', 'REVIEWS_VIEW', 'REVIEWS_MANAGE'],
  premium: ['OVERVIEW', 'TASKS_VIEW', 'TASKS_MANAGE', 'LEASES_VIEW', 'LEASES_MANAGE', 'INVOICES_VIEW', 'INVOICES_MANAGE', 'MAINTENANCE_VIEW', 'MAINTENANCE_MANAGE', 'LEGAL_VIEW', 'LEGAL_MANAGE', 'CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'REQUESTS_VIEW', 'REQUESTS_MANAGE', 'CALENDAR_VIEW', 'CALENDAR_MANAGE', 'ALERTS_VIEW', 'ALERTS_MANAGE', 'REVIEWS_VIEW', 'REVIEWS_MANAGE', 'AI_ANALYTICS', 'ADVANCED_REPORTS', 'BULK_OPERATIONS'],
  enterprise: ['OVERVIEW', 'TASKS_VIEW', 'TASKS_MANAGE', 'LEASES_VIEW', 'LEASES_MANAGE', 'INVOICES_VIEW', 'INVOICES_MANAGE', 'MAINTENANCE_VIEW', 'MAINTENANCE_MANAGE', 'LEGAL_VIEW', 'LEGAL_MANAGE', 'CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'REQUESTS_VIEW', 'REQUESTS_MANAGE', 'CALENDAR_VIEW', 'CALENDAR_MANAGE', 'ALERTS_VIEW', 'ALERTS_MANAGE', 'REVIEWS_VIEW', 'REVIEWS_MANAGE', 'AI_ANALYTICS', 'ADVANCED_REPORTS', 'BULK_OPERATIONS', 'API_ACCESS', 'WHITE_LABEL'],
};

/** ألوان الباقات (ثيم الموقع الجديد: primary) */
export const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-[var(--primary)]',
  standard: 'bg-[var(--primary)]',
  premium: 'bg-[var(--primary-dark)]',
  enterprise: 'bg-[var(--primary-dark)]',
};

/** باقات افتراضية لعرض الصفحة مثل الموقع القديم عند عدم وجود باقات في قاعدة البيانات */
export const DEFAULT_PLANS_FOR_ADMIN = [
  { id: 'basic', code: 'basic', nameAr: 'الخطة الأساسية', nameEn: 'Basic Plan', priceMonthly: 29, priceYearly: undefined as number | undefined, currency: 'OMR', duration: 'monthly' as const, priority: 'basic', color: 'bg-[var(--primary)]', maxProperties: 5, maxUnits: 20, maxBookings: 100, maxUsers: 1, storageGB: 1, features: ['Up to 5 properties', 'Up to 20 units'], featuresAr: ['حتى 5 عقارات', 'حتى 20 وحدة'], isActive: true },
  { id: 'standard', code: 'standard', nameAr: 'الخطة المعيارية', nameEn: 'Standard Plan', priceMonthly: 79, priceYearly: undefined as number | undefined, currency: 'OMR', duration: 'monthly' as const, priority: 'standard', color: 'bg-[var(--primary)]', maxProperties: 25, maxUnits: 100, maxBookings: 500, maxUsers: 5, storageGB: 10, features: ['Up to 25 properties', 'Up to 100 units'], featuresAr: ['حتى 25 عقار', 'حتى 100 وحدة'], isActive: true },
  { id: 'premium', code: 'premium', nameAr: 'الخطة المميزة', nameEn: 'Premium Plan', priceMonthly: 149, priceYearly: undefined as number | undefined, currency: 'OMR', duration: 'monthly' as const, priority: 'premium', color: 'bg-[var(--primary-dark)]', maxProperties: 100, maxUnits: 500, maxBookings: 2000, maxUsers: -1, storageGB: 50, features: ['Up to 100 properties', 'Unlimited users'], featuresAr: ['حتى 100 عقار', 'مستخدمون غير محدودين'], isActive: true },
  { id: 'enterprise', code: 'enterprise', nameAr: 'الخطة المؤسسية', nameEn: 'Enterprise Plan', priceMonthly: 299, priceYearly: undefined as number | undefined, currency: 'OMR', duration: 'monthly' as const, priority: 'enterprise', color: 'bg-[var(--primary-dark)]', maxProperties: -1, maxUnits: -1, maxBookings: -1, maxUsers: -1, storageGB: 200, features: ['Unlimited', 'API access'], featuresAr: ['غير محدود', 'وصول API'], isActive: true },
];
