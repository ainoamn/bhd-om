/**
 * خيارات الطباعة والتصدير - ما يُظهر في المستندات
 * Print & Export Options - What to include in documents
 */

export type ContactDisplayLevel = 'nameOnly' | 'namePhone' | 'namePhoneCivilId' | 'namePhoneSerialNumber';

export type PropertyDisplayLevel = 'numberOnly' | 'fullAddress';

export type AccountDisplayLevel = 'codeOnly' | 'nameOnly' | 'codeThenName' | 'nameThenCode';

export const DEFAULT_PRINT_OPTIONS = {
  contactDisplay: 'namePhone' as ContactDisplayLevel,
  propertyDisplay: 'fullAddress' as PropertyDisplayLevel,
  accountDisplay: 'codeThenName' as AccountDisplayLevel,
};

const STORAGE_KEY = 'bhd_print_options';

export function getStoredPrintOptions(): typeof DEFAULT_PRINT_OPTIONS {
  if (typeof window === 'undefined') return DEFAULT_PRINT_OPTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_PRINT_OPTIONS, ...parsed };
  } catch {
    return DEFAULT_PRINT_OPTIONS;
  }
}

export function savePrintOptions(opts: Partial<typeof DEFAULT_PRINT_OPTIONS>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPrintOptions();
    const next = { ...current, ...opts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {}
}
