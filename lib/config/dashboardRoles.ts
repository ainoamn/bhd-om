/**
 * إعدادات لوحات التحكم حسب دور المستخدم / نوع جهة الاتصال
 * يتحكم المدير في ما يظهر لكل نوع (عميل، مستأجر، مالك، مورد، ...)
 */

import type { ContactCategory } from '../data/addressBook';

export type RoleKey = 'ADMIN' | 'CLIENT' | 'OWNER';

/** نوع لوحة التحكم = تصنيفات دفتر العناوين + شركة */
export type DashboardType = ContactCategory | 'COMPANY';

/** ربط دور المستخدم بقاعدة البيانات بنوع لوحة التحكم */
export const ROLE_TO_DASHBOARD_TYPE: Record<'CLIENT' | 'OWNER', DashboardType> = {
  CLIENT: 'CLIENT',
  OWNER: 'LANDLORD',
};

export type DashboardSectionKey =
  | 'dashboard'
  | 'myBookings'
  | 'myContracts'
  | 'myProperties'
  | 'myInvoices'
  | 'myReceipts'
  | 'notifications'
  | 'myAccount'
  | 'addressBook'
  | 'bankDetails'
  | 'companyData'
  | 'documentTemplates'
  | 'site'
  | 'accountingHome'
  | 'accountingSales'
  | 'accountingPurchases'
  | 'accountingJournal'
  | 'accountingDocuments'
  | 'accountingAccounts'
  | 'accountingReports'
  | 'accountingClaims'
  | 'accountingCheques'
  | 'accountingPayments'
  | 'accountingPeriods'
  | 'accountingAudit'
  | 'accountingSettings'
  | 'accountingQuickActions'
  | 'accountingAddJournal'
  | 'accountingAddAccount'
  | 'accountingAddDocument'
  | 'accountingAddCheque'
  | 'propertiesManage'
  | 'bookingsManage'
  | 'contractsManage'
  | 'maintenanceManage'
  | 'dataManage'
  | 'projects'
  | 'services'
  | 'contact'
  | 'submissions'
  | 'dashboardSettings'
  | 'contactCategoryPermissions'
  | 'users'
  | 'serialHistory'
  | 'backup';

export interface NavItemWithSection {
  href: string;
  labelKey: string;
  icon: string;
  section: DashboardSectionKey;
}

export interface RoleDashboardConfig {
  role: RoleKey;
  sections: DashboardSectionKey[];
  navItems: Array<{ href: string; labelKey: string; icon: string; section?: DashboardSectionKey }>;
}

/** ترتيب كل الصلاحيات - يُستمد من adminNav، الصفحات الجديدة تُضاف تلقائياً */
import { getAllPermissionSections as getNavSections } from './adminNav';
export const ALL_PERMISSION_SECTIONS: DashboardSectionKey[] = getNavSections() as DashboardSectionKey[];

/** الإعداد الافتراضي - يمكن للمدير تعديله لاحقاً */
export const defaultDashboardConfigs: Record<RoleKey, RoleDashboardConfig> = {
  ADMIN: {
    role: 'ADMIN',
    sections: [...ALL_PERMISSION_SECTIONS],
    navItems: [], // يُبنى من navGroupsConfig في الـ layout - أدمن يرى الكل
  },
  CLIENT: {
    role: 'CLIENT',
    sections: ['dashboard', 'myBookings', 'myContracts', 'myInvoices', 'myReceipts', 'notifications', 'myAccount'],
    navItems: [
      { href: '/admin', labelKey: 'clientNav.dashboard', icon: 'dashboard', section: 'dashboard' },
      { href: '/admin/my-bookings', labelKey: 'clientNav.myBookings', icon: 'calendar', section: 'myBookings' },
      { href: '/admin/my-contracts', labelKey: 'clientNav.myContracts', icon: 'archive', section: 'myContracts' },
      { href: '/admin/my-invoices', labelKey: 'clientNav.myInvoices', icon: 'documentText', section: 'myInvoices' },
      { href: '/admin/my-receipts', labelKey: 'clientNav.myReceipts', icon: 'documentText', section: 'myReceipts' },
      { href: '/admin/notifications', labelKey: 'clientNav.notifications', icon: 'inbox', section: 'notifications' },
      { href: '/admin/my-account', labelKey: 'clientNav.myAccount', icon: 'users', section: 'myAccount' },
      { href: '/admin/address-book', labelKey: 'addressBook', icon: 'users', section: 'addressBook' },
    ],
  },
  OWNER: {
    role: 'OWNER',
    sections: ['dashboard', 'myProperties', 'myContracts', 'myInvoices', 'notifications', 'myAccount'],
    navItems: [
      { href: '/admin', labelKey: 'ownerNav.dashboard', icon: 'dashboard', section: 'dashboard' },
      { href: '/admin/my-properties', labelKey: 'ownerNav.myProperties', icon: 'building', section: 'myProperties' },
      { href: '/admin/my-contracts', labelKey: 'ownerNav.myContracts', icon: 'archive', section: 'myContracts' },
      { href: '/admin/my-invoices', labelKey: 'ownerNav.myInvoices', icon: 'documentText', section: 'myInvoices' },
      { href: '/admin/notifications', labelKey: 'ownerNav.notifications', icon: 'inbox', section: 'notifications' },
      { href: '/admin/my-account', labelKey: 'ownerNav.myAccount', icon: 'users', section: 'myAccount' },
      { href: '/admin/address-book', labelKey: 'addressBook', icon: 'users', section: 'addressBook' },
    ],
  },
};

/** الحصول على إعداد لوحة التحكم لدور معيّن (للأدمن يستخدم الافتراضي مباشرة) */
export function getDashboardConfigForRole(role: RoleKey): RoleDashboardConfig {
  return defaultDashboardConfigs[role] ?? defaultDashboardConfigs.CLIENT;
}

/** هل القسم مفعّل للدور؟ */
export function isSectionEnabledForRole(role: RoleKey, section: DashboardSectionKey): boolean {
  const config = getDashboardConfigForRole(role);
  return config.sections.includes(section);
}

/** الإعداد الافتراضي لكل نوع (عميل، مستأجر، مالك، ...) */
export interface DashboardTypeConfig {
  type: DashboardType;
  sections: DashboardSectionKey[];
  navItems: Array<{ href: string; labelKey: string; icon: string; section?: DashboardSectionKey }>;
}

/** قائمة كاملة بكل عناصر التنقل - تُستمد من adminNav تلقائياً */
import { getFullNavItemsForPermissions } from './adminNav';
const FULL_NAV_ITEMS = getFullNavItemsForPermissions() as Array<{ href: string; labelKey: string; icon: string; section: DashboardSectionKey }>;

const ALL_SECTIONS_DEFAULT = [...ALL_PERMISSION_SECTIONS];

export const ALL_DASHBOARD_TYPES: DashboardType[] = ['CLIENT', 'TENANT', 'LANDLORD', 'SUPPLIER', 'PARTNER', 'GOVERNMENT', 'AUTHORIZED_REP', 'COMPANY', 'OTHER'];

export const defaultDashboardConfigsByType: Record<DashboardType, DashboardTypeConfig> = {
  CLIENT: { type: 'CLIENT', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  TENANT: { type: 'TENANT', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  LANDLORD: { type: 'LANDLORD', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  SUPPLIER: { type: 'SUPPLIER', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  PARTNER: { type: 'PARTNER', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  GOVERNMENT: { type: 'GOVERNMENT', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  AUTHORIZED_REP: { type: 'AUTHORIZED_REP', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  COMPANY: { type: 'COMPANY', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
  OTHER: { type: 'OTHER', sections: ALL_SECTIONS_DEFAULT, navItems: FULL_NAV_ITEMS },
};
