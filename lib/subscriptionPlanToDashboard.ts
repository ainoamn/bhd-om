/**
 * ربط صلاحيات الباقة (من لوحة الاشتراكات) بأقسام لوحة التحكم (إعدادات لوحة التحكم)
 * الاشتراك هو المعيار الأول: المستخدم يرى فقط الأقسام التي تسمح بها باقته ثم تُطبّق إعدادات نوع المستخدم.
 */

import type { DashboardSectionKey } from '@/lib/config/dashboardRoles';

/** خريطة: صلاحية الباقة (مفتاح FEATURE_PERMISSIONS) → أقسام لوحة التحكم التي تفتحها */
export const PLAN_PERMISSION_TO_SECTIONS: Record<string, DashboardSectionKey[]> = {
  OVERVIEW: ['dashboard', 'myAccount'],
  TASKS_VIEW: ['maintenanceManage'],
  TASKS_MANAGE: ['maintenanceManage'],
  LEASES_VIEW: ['myContracts', 'myBookings'],
  LEASES_MANAGE: ['myContracts', 'myBookings'],
  INVOICES_VIEW: ['myInvoices', 'myReceipts'],
  INVOICES_MANAGE: ['myInvoices', 'myReceipts'],
  MAINTENANCE_VIEW: ['maintenanceManage'],
  MAINTENANCE_MANAGE: ['maintenanceManage'],
  LEGAL_VIEW: ['contractsManage'],
  LEGAL_MANAGE: ['contractsManage'],
  CONTRACTS_VIEW: ['myContracts', 'myBookings'],
  CONTRACTS_MANAGE: ['myContracts', 'contractsManage', 'myBookings'],
  REQUESTS_VIEW: ['submissions'],
  REQUESTS_MANAGE: ['submissions'],
  CALENDAR_VIEW: ['myBookings'],
  CALENDAR_MANAGE: ['myBookings'],
  ALERTS_VIEW: ['notifications'],
  ALERTS_MANAGE: ['notifications'],
  REVIEWS_VIEW: ['notifications'],
  REVIEWS_MANAGE: ['notifications'],
  AI_ANALYTICS: ['analytics'],
  ADVANCED_REPORTS: ['reports'],
  BULK_OPERATIONS: ['dataManage'],
  API_ACCESS: [],
  WHITE_LABEL: [],
};

/**
 * إرجاع مجموعة أقسام لوحة التحكم المسموح بها حسب صلاحيات الباقة.
 * إذا لم يكن للمستخدم باقة أو الصلاحيات فارغة، يُرجع مجموعة فارغة (المعيار الأول للاشتراك).
 */
export function getSectionsAllowedByPlan(planPermissionIds: string[] | null | undefined): Set<DashboardSectionKey> {
  const set = new Set<DashboardSectionKey>();
  if (!Array.isArray(planPermissionIds) || planPermissionIds.length === 0) return set;
  for (const id of planPermissionIds) {
    const sections = PLAN_PERMISSION_TO_SECTIONS[id];
    if (sections) for (const s of sections) set.add(s);
  }
  return set;
}
