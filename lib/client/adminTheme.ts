export type AdminTheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'bhd_admin_theme';

export function getAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function setAdminTheme(theme: AdminTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyAdminTheme(theme);
  window.dispatchEvent(new Event(ADMIN_THEME_EVENT));
}

export function resolveAdminTheme(theme: AdminTheme): 'light' | 'dark' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyAdminTheme(theme: AdminTheme): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveAdminTheme(theme);
  document.documentElement.setAttribute('data-admin-theme', resolved);
  document.querySelectorAll('.admin-root').forEach((el) => {
    el.setAttribute('data-admin-theme', resolved);
  });
}

/** تطبيق المظهر المحفوظ عند تحميل لوحة الإدارة */
export function initAdminTheme(): void {
  applyAdminTheme(getAdminTheme());
}

export const ADMIN_THEME_EVENT = 'bhd_admin_theme_changed';
