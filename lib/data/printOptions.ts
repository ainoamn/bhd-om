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
const API_URL = '/api/settings/print-options';
let didHydrateFromServer = false;
let hydratingFromServer = false;
let printOptionsStore = { ...DEFAULT_PRINT_OPTIONS };

async function hydrateFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (didHydrateFromServer || hydratingFromServer) return;
  hydratingFromServer = true;
  try {
    const res = await fetch(API_URL, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as Partial<typeof DEFAULT_PRINT_OPTIONS>;
    if (!data || typeof data !== 'object') return;
    const next = { ...DEFAULT_PRINT_OPTIONS, ...data };
    printOptionsStore = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    didHydrateFromServer = true;
  } catch {
    // keep local fallback
  } finally {
    hydratingFromServer = false;
  }
}

function syncToServer(data: typeof DEFAULT_PRINT_OPTIONS): void {
  if (typeof window === 'undefined') return;
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function getStoredPrintOptions(): typeof DEFAULT_PRINT_OPTIONS {
  if (typeof window === 'undefined') return DEFAULT_PRINT_OPTIONS;
  void hydrateFromServer();
  return printOptionsStore;
}

export function savePrintOptions(opts: Partial<typeof DEFAULT_PRINT_OPTIONS>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPrintOptions();
    const next = { ...current, ...opts };
    printOptionsStore = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    syncToServer(next);
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      didHydrateFromServer = false;
      void hydrateFromServer();
    }
  });
}
