/**
 * إعدادات لوحات التحكم لكل نوع (عميل، مستأجر، مالك، مورد، ...)
 * مصدر القراءة الأساسي: الخادم. التخزين المحلي للكتابة/الأحداث فقط.
 */

import type { RoleKey, DashboardSectionKey, RoleDashboardConfig, DashboardType } from '@/lib/config/dashboardRoles';
import { defaultDashboardConfigs, defaultDashboardConfigsByType, ROLE_TO_DASHBOARD_TYPE, ALL_DASHBOARD_TYPES, ALL_PERMISSION_SECTIONS } from '@/lib/config/dashboardRoles';
import { getSectionsAllowedByPlan } from '@/lib/subscriptionPlanToDashboard';

const STORAGE_KEY = 'bhd_dashboard_settings';
export const DASHBOARD_SETTINGS_EVENT = 'bhd_dashboard_settings_changed';

export type DashboardSettingsStore = Partial<Record<DashboardType | RoleKey, DashboardSectionKey[]>>;

/** إعدادات من الخادم — عند توفرها تُستخدم للعميل/المالك حتى تنعكس الصلاحيات في أي متصفح */
let serverStore: DashboardSettingsStore | null = null;

export function setServerDashboardSettings(data: DashboardSettingsStore | null): void {
  serverStore = data && typeof data === 'object' ? { ...data } : null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
  }
}

/** تحميل إعدادات لوحات التحكم من الخادم (للعميل/المالك) */
export async function loadDashboardSettingsFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/settings/dashboard', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as DashboardSettingsStore;
    setServerDashboardSettings(data);
  } catch {
    // ignore
  }
}

function saveToStorage(data: DashboardSettingsStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    serverStore = { ...data };
    window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
    // مزامنة مع الخادم حتى تنعكس الصلاحيات على لوحة العميل في أي متصفح
    fetch('/api/settings/dashboard', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

let store: DashboardSettingsStore = {};
let didAutoHydrateFromServer = false;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      // لا نعتمد القيم المحلية كمصدر حقيقة؛ نعيد الجلب من الخادم.
      didAutoHydrateFromServer = false;
      void loadDashboardSettingsFromServer();
    }
  });
}

export function getDashboardSettings(): DashboardSettingsStore {
  if (typeof window !== 'undefined' && !didAutoHydrateFromServer) {
    didAutoHydrateFromServer = true;
    void loadDashboardSettingsFromServer();
  }
  return { ...store };
}

/** الحصول على الأقسام لنوع معيّن - يدعم RoleKey للتوافق مع القديم و DashboardType. يُفضّل إعدادات الخادم للعميل/المالك. */
export function getSectionsForRole(roleOrType: RoleKey | DashboardType): DashboardSectionKey[] {
  if (typeof window !== 'undefined' && !didAutoHydrateFromServer) {
    didAutoHydrateFromServer = true;
    void loadDashboardSettingsFromServer();
  }
  if (roleOrType === 'ADMIN') return (defaultDashboardConfigs.ADMIN?.sections ?? []);
  if (serverStore && Object.prototype.hasOwnProperty.call(serverStore, roleOrType) && Array.isArray(serverStore[roleOrType])) {
    return [...serverStore[roleOrType]!];
  }
  const custom = store[roleOrType];
  if (Object.prototype.hasOwnProperty.call(store, roleOrType) && Array.isArray(custom)) return custom;
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
  serverStore = null;
  saveToStorage(store);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT));
  }
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

/** إعداد لوحة التحكم الفعّال للدور (مع تطبيق إعدادات المدير والاشتراك) - للاستخدام في RoleBasedSidebar */
/** المعيار الأول: الباقة (من لوحة الاشتراكات)، ثم إعدادات نوع المستخدم (من إعدادات لوحة التحكم). */
export function getEffectiveDashboardConfig(
  role: RoleKey,
  _contactDashboardType?: DashboardType,
  planPermissionIds?: string[] | null
): RoleDashboardConfig {
  const base = defaultDashboardConfigs[role] ?? defaultDashboardConfigs.CLIENT;
  if (role === 'ADMIN') return base;
  const dashboardTypeForSections: DashboardType = ROLE_TO_DASHBOARD_TYPE[role];
  const typeSections = getSectionsForRole(dashboardTypeForSections);
  /** بدون صلاحيات باقة: المالك والعميل يحصلان على أقسام لوحتهما الافتراضية كاملة (حجوزات، عقود…) وليس فقط 3 أقسام */
  const allowedByPlan =
    planPermissionIds && planPermissionIds.length > 0
      ? getSectionsAllowedByPlan(planPermissionIds)
      : role === 'OWNER'
        ? new Set(defaultDashboardConfigs.OWNER.sections)
        : role === 'CLIENT'
          ? new Set(defaultDashboardConfigs.CLIENT.sections)
          : new Set<DashboardSectionKey>(['dashboard', 'myAccount', 'subscriptions'] as DashboardSectionKey[]);
  const sections = typeSections.filter((s) => allowedByPlan.has(s));
  const typeConfig = defaultDashboardConfigsByType[dashboardTypeForSections];
  const navItems = (typeConfig?.navItems ?? base.navItems).filter((item) => {
    const sec = (item as { section?: DashboardSectionKey }).section;
    return !sec || sections.includes(sec);
  });
  return { ...base, sections, navItems };
}
