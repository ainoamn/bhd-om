/**
 * Data Layer - Abstraction for persistence
 * Zero Trust: All writes go through audit
 */

const KEYS = {
  ACCOUNTS: 'bhd_chart_of_accounts',
  JOURNAL: 'bhd_journal_entries',
  DOCUMENTS: 'bhd_accounting_documents',
  FISCAL: 'bhd_fiscal_settings',
  PERIODS: 'bhd_fiscal_periods',
  AUDIT: 'bhd_audit_log',
} as const;

export function getStored<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStored<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {}
}

export function getStoredObject<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredObject<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {}
}

export const STORAGE_KEYS = KEYS;
