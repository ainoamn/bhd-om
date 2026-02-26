/**
 * تخزين المسودات - سلوك عام للموقع
 * كل ما يُدخل يُحفظ كمسودة تلقائياً، ولا يُطبق إلا بعد النقر على "حفظ"
 */

const DRAFT_PREFIX = 'bhd_draft_';
const DRAFT_KEYS_LIST = 'bhd_draft_keys';

const DRAFT_CHANGE_EVENT = 'bhd-draft-change';

function emitDraftChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DRAFT_CHANGE_EVENT));
  }
}

/** حفظ مسودة */
export function saveDraft(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const fullKey = DRAFT_PREFIX + key;
    const serialized = JSON.stringify({ data, savedAt: new Date().toISOString() });
    localStorage.setItem(fullKey, serialized);
    const keysRaw = localStorage.getItem(DRAFT_KEYS_LIST);
    const keys: string[] = keysRaw ? JSON.parse(keysRaw) : [];
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem(DRAFT_KEYS_LIST, JSON.stringify(keys));
    }
    emitDraftChange();
  } catch {}
}

/** تحميل مسودة */
export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T };
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

/** حذف مسودة */
export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
    const keysRaw = localStorage.getItem(DRAFT_KEYS_LIST);
    const keys: string[] = keysRaw ? JSON.parse(keysRaw) : [];
    const next = keys.filter((k) => k !== key);
    localStorage.setItem(DRAFT_KEYS_LIST, JSON.stringify(next));
    emitDraftChange();
  } catch {}
}

/** قائمة مفاتيح المسودات النشطة */
export function getDraftKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRAFT_KEYS_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** هل توجد مسودات غير محفوظة؟ */
export function hasDrafts(): boolean {
  return getDraftKeys().length > 0;
}
