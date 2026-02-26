/**
 * إعدادات لوحات التحكم لكل نوع (عميل، مستأجر، مالك، مورد، ...)
 * يُخزّن في localStorage - يتيح للمدير التحكم في ما يظهر لكل نوع
 */

import type { RoleKey, DashboardSectionKey, RoleDashboardConfig, DashboardType } from '@/lib/config/dashboardRoles';
import { defaultDashboardConfigs, defaultDashboardConfigsByType, ROLE_TO_DASHBOARD_TYPE, ALL_DASHBOARD_TYPES, ALL_PERMISSION_SECTIONS } from '@/lib/config/dashboardRoles';

const STORAGE_KEY = 'bhd_dashboard_settings';
export const DASHBOARD_SETTINGS_EVENT = 'bhd_dashboard_settings_changed';

export type DashboardSettingsStore = Partial<Record<DashboardType | RoleKey, DashboardSectionKey[]>>;

function loadFromStorage(): DashboardSettingsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardSettingsStore;
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(data: DashboardSettingsStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
  } catch {
    // ignore
  }
}

let store: DashboardSettingsStore = loadFromStorage();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      store = JSON.parse(e.newValue) as DashboardSettingsStore;
      window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
    }
  });
}

export function getDashboardSettings(): DashboardSettingsStore {
  return { ...store };
}

/** الحصول على الأقسام لنوع معيّن - يدعم RoleKey للتوافق مع القديم و DashboardType */
export function getSectionsForRole(roleOrType: RoleKey | DashboardType): DashboardSectionKey[] {
  const custom = store[roleOrType];
  if (Object.prototype.hasOwnProperty.call(store, roleOrType) && Array.isArray(custom)) return custom;
  if (roleOrType === 'ADMIN') return (defaultDashboardConfigs.ADMIN?.sections ?? []);
  if (roleOrType in defaultDashboardConfigsByType) {
    return [...(defaultDashboardConfigsByType[roleOrType as DashboardType]?.sections ?? [])];
  }
  const defaultConfig = defaultDashboardConfigs[roleOrType as RoleKey];
  return defaultConfig ? [...defaultConfig.sections] : [];
}

export function setSectionsForRole(roleOrType: RoleKey | DashboardType, sections: DashboardSectionKey[]): void {
  store = { ...store, [roleOrType]: sections };
  saveToStorage(store);
}

export function resetToDefaults(): void {
  store = {};
  saveToStorage(store);
}

/** إلغاء صلاحية معيّنة عن جميع الأنواع */
export function disableSectionForAll(section: DashboardSectionKey): void {
  if (typeof window === 'undefined') return;
  for (const type of ALL_DASHBOARD_TYPES) {
    const current = getSectionsForRole(type);
    const next = current.filter((s) => s !== section);
    store = { ...store, [type]: next };
  }
  saveToStorage(store);
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
}

/** منح صلاحية معيّنة لجميع الأنواع */
export function enableSectionForAll(section: DashboardSectionKey): void {
  if (typeof window === 'undefined') return;
  for (const type of ALL_DASHBOARD_TYPES) {
    const current = getSectionsForRole(type);
    if (!current.includes(section)) {
      store = { ...store, [type]: [...current, section] };
    }
  }
  saveToStorage(store);
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
}

/** إلغاء جميع الصلاحيات عن نوع معيّن */
export function disableAllForType(type: DashboardType): void {
  setSectionsForRole(type, []);
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
}

/** منح جميع الصلاحيات لنوع معيّن */
export function enableAllForType(type: DashboardType): void {
  setSectionsForRole(type, [...ALL_PERMISSION_SECTIONS]);
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
}

/** إعداد لوحة التحكم الفعّال للدور (مع تطبيق إعدادات المدير) - للاستخدام في RoleBasedSidebar */
/** عند توفير contactDashboardType يُستخدم تصنيف جهة الاتصال بدلاً من الدور */
export function getEffectiveDashboardConfig(
  role: RoleKey,
  contactDashboardType?: DashboardType
): RoleDashboardConfig {
  const base = defaultDashboardConfigs[role] ?? defaultDashboardConfigs.CLIENT;
  if (role === 'ADMIN') return base;
  const dashboardType: DashboardType =
    contactDashboardType && defaultDashboardConfigsByType[contactDashboardType]
      ? contactDashboardType
      : ROLE_TO_DASHBOARD_TYPE[role];
  const sections = getSectionsForRole(dashboardType);
  const typeConfig = defaultDashboardConfigsByType[dashboardType];
  const navItems = (typeConfig?.navItems ?? base.navItems).filter((item) => {
    const sec = (item as { section?: DashboardSectionKey }).section;
    return !sec || sections.includes(sec);
  });
  return { ...base, sections, navItems };
}
