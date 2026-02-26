/**
 * صلاحيات تصنيفات دفتر العناوين حسب نوع المستخدم (عميل، مستأجر، مالك، ...)
 * يُتحكم في أي تصنيفات يمكن لكل نوع الاطلاع عليها أو استخدامها
 */

import type { ContactCategory } from './addressBook';
import type { DashboardType } from '@/lib/config/dashboardRoles';
import { ALL_DASHBOARD_TYPES } from '@/lib/config/dashboardRoles';

export type PermissionRole = DashboardType;

const STORAGE_KEY = 'bhd_contact_category_permissions';
export const PERMISSIONS_EVENT = 'bhd_contact_category_permissions_changed';

/** التصنيفات المعرّفة في دفتر العناوين + شركة (نوع جهة الاتصال) */
export const ALL_CATEGORIES: (ContactCategory | 'COMPANY')[] = [
  'CLIENT',
  'TENANT',
  'LANDLORD',
  'SUPPLIER',
  'PARTNER',
  'GOVERNMENT',
  'AUTHORIZED_REP',
  'COMPANY',
  'OTHER',
];

export type ContactCategoryOrCompany = ContactCategory | 'COMPANY';

export type PermissionsStore = Partial<Record<PermissionRole, ContactCategoryOrCompany[]>>;

function loadFromStorage(): PermissionsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PermissionsStore;
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(data: PermissionsStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(PERMISSIONS_EVENT));
  } catch {
    // ignore
  }
}

let store: PermissionsStore = loadFromStorage();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      store = JSON.parse(e.newValue) as PermissionsStore;
      window.dispatchEvent(new CustomEvent(PERMISSIONS_EVENT));
    }
  });
}

/** الإعداد الافتراضي: كل التصنيفات مسموح بها لكل دور */
const DEFAULT_ALLOWED: ContactCategoryOrCompany[] = [...ALL_CATEGORIES];

export function getAllowedCategoriesForRole(role: PermissionRole): ContactCategoryOrCompany[] {
  const custom = store[role];
  if (Array.isArray(custom) && custom.length >= 0) {
    return custom;
  }
  return [...DEFAULT_ALLOWED];
}

export function setAllowedCategoriesForRole(
  role: PermissionRole,
  categories: ContactCategoryOrCompany[]
): void {
  store = { ...store, [role]: categories };
  saveToStorage(store);
}

export function resetToDefaults(): void {
  store = {};
  saveToStorage(store);
}

/** هل الدور يمكنه الاطلاع على هذا التصنيف؟ */
export function canRoleAccessCategory(
  role: PermissionRole,
  category: ContactCategoryOrCompany
): boolean {
  const allowed = getAllowedCategoriesForRole(role);
  return allowed.includes(category);
}

/** تصفية قائمة جهات الاتصال حسب صلاحيات الدور - للاستخدام عند CLIENT/OWNER */
export function filterContactsByRolePermissions<T extends { category?: ContactCategory; contactType?: string }>(
  contacts: T[],
  role: PermissionRole
): T[] {
  const allowed = getAllowedCategoriesForRole(role);
  return contacts.filter((c) => {
    const cat = c.category ?? 'OTHER';
    const isCompany = c.contactType === 'COMPANY';
    const categoryAllowed = allowed.includes(cat);
    if (isCompany && !allowed.includes('COMPANY')) return false;
    return categoryAllowed;
  });
}
