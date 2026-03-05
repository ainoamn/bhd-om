/**
 * صلاحيات الميزات — لكل باقة (مصفوفة الصلاحيات)
 * منسوخ من ain-oman-web ومُختصر ليتوافق مع bhd-om
 */
export interface FeaturePermission {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
}

export const FEATURE_PERMISSIONS: Record<string, FeaturePermission> = {
  OVERVIEW: { id: 'overview', name: 'Overview', nameAr: 'نظرة عامة', descriptionAr: 'عرض نظرة عامة وإحصائيات العقار' },
  TASKS_VIEW: { id: 'tasks_view', name: 'View Tasks', nameAr: 'عرض المهام', descriptionAr: 'عرض مهام العقار' },
  TASKS_MANAGE: { id: 'tasks_manage', name: 'Manage Tasks', nameAr: 'إدارة المهام', descriptionAr: 'إنشاء وإدارة المهام' },
  LEASES_VIEW: { id: 'leases_view', name: 'View Leases', nameAr: 'عرض عقود الإيجار', descriptionAr: 'عرض عقود الإيجار' },
  LEASES_MANAGE: { id: 'leases_manage', name: 'Manage Leases', nameAr: 'إدارة عقود الإيجار', descriptionAr: 'إنشاء وإدارة العقود' },
  INVOICES_VIEW: { id: 'invoices_view', name: 'View Invoices', nameAr: 'عرض الفواتير', descriptionAr: 'عرض الفواتير والمدفوعات' },
  INVOICES_MANAGE: { id: 'invoices_manage', name: 'Manage Invoices', nameAr: 'إدارة الفواتير', descriptionAr: 'إنشاء وإدارة الفواتير' },
  MAINTENANCE_VIEW: { id: 'maintenance_view', name: 'View Maintenance', nameAr: 'عرض الصيانة', descriptionAr: 'عرض طلبات الصيانة' },
  MAINTENANCE_MANAGE: { id: 'maintenance_manage', name: 'Manage Maintenance', nameAr: 'إدارة الصيانة', descriptionAr: 'إنشاء وإدارة طلبات الصيانة' },
  CONTRACTS_VIEW: { id: 'contracts_view', name: 'View Contracts', nameAr: 'عرض العقود', descriptionAr: 'عرض جميع العقود' },
  CONTRACTS_MANAGE: { id: 'contracts_manage', name: 'Manage Contracts', nameAr: 'إدارة العقود', descriptionAr: 'إنشاء وإدارة العقود' },
  REQUESTS_VIEW: { id: 'requests_view', name: 'View Requests', nameAr: 'عرض الطلبات', descriptionAr: 'عرض طلبات المستأجرين' },
  REQUESTS_MANAGE: { id: 'requests_manage', name: 'Manage Requests', nameAr: 'إدارة الطلبات', descriptionAr: 'الرد على وإدارة الطلبات' },
  CALENDAR_VIEW: { id: 'calendar_view', name: 'View Calendar', nameAr: 'عرض التقويم', descriptionAr: 'عرض أحداث التقويم' },
  CALENDAR_MANAGE: { id: 'calendar_manage', name: 'Manage Calendar', nameAr: 'إدارة التقويم', descriptionAr: 'إنشاء وإدارة أحداث التقويم' },
  ALERTS_VIEW: { id: 'alerts_view', name: 'View Alerts', nameAr: 'عرض التنبيهات', descriptionAr: 'عرض تنبيهات العقار' },
  ALERTS_MANAGE: { id: 'alerts_manage', name: 'Manage Alerts', nameAr: 'إدارة التنبيهات', descriptionAr: 'إنشاء وإدارة التنبيهات' },
  REVIEWS_VIEW: { id: 'reviews_view', name: 'View Reviews', nameAr: 'عرض التقييمات', descriptionAr: 'عرض تقييمات العقار' },
  REVIEWS_MANAGE: { id: 'reviews_manage', name: 'Manage Reviews', nameAr: 'إدارة التقييمات', descriptionAr: 'الرد على التقييمات' },
  ADVANCED_REPORTS: { id: 'advanced_reports', name: 'Advanced Reports', nameAr: 'تقارير متقدمة', descriptionAr: 'تقارير وتحليلات متقدمة' },
  API_ACCESS: { id: 'api_access', name: 'API Access', nameAr: 'وصول API', descriptionAr: 'استخدام واجهة برمجة التطبيقات' },
};

/** ألوان الباقات للعرض */
export const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-blue-500',
  standard: 'bg-green-500',
  premium: 'bg-purple-500',
  enterprise: 'bg-amber-600',
};
