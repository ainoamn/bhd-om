/**
 * إعدادات الموقع - تفعيل/تعطيل الصفحات
 * يُخزّن في localStorage للتحديث الفوري وللتزامن بين التبويبات
 */

const STORAGE_KEY = 'bhd-pages-visibility';
const EVENT_NAME = 'bhd-pages-visibility-changed';

export type PageId = 'home' | 'properties' | 'projects' | 'services' | 'about' | 'contact';

export interface PagesVisibility {
  home: boolean;
  properties: boolean;
  projects: boolean;
  services: boolean;
  about: boolean;
  contact: boolean;
}

const defaultVisibility: PagesVisibility = {
  home: true,
  properties: true,
  projects: true,
  services: true,
  about: true,
  contact: true,
};

function loadFromStorage(): PagesVisibility {
  if (typeof window === 'undefined') return { ...defaultVisibility };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PagesVisibility;
      return { ...defaultVisibility, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...defaultVisibility };
}

function saveToStorage(data: PagesVisibility): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

let pagesVisibility: PagesVisibility = loadFromStorage();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      pagesVisibility = { ...defaultVisibility, ...JSON.parse(e.newValue) };
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  });
}

export function getPagesVisibility(): PagesVisibility {
  return pagesVisibility;
}

export function isPageEnabled(pageId: PageId): boolean {
  return pagesVisibility[pageId] ?? true;
}

export function setPageEnabled(pageId: PageId, enabled: boolean): void {
  if (pageId in pagesVisibility) {
    pagesVisibility = { ...pagesVisibility, [pageId]: enabled };
    saveToStorage(pagesVisibility);
  }
}

export function togglePageEnabled(pageId: PageId): boolean {
  const newVal = !(pagesVisibility[pageId] ?? true);
  setPageEnabled(pageId, newVal);
  return newVal;
}

export { EVENT_NAME as PAGES_VISIBILITY_EVENT };

export const PAGE_LABELS: Record<PageId, { ar: string; en: string }> = {
  home: { ar: 'الصفحة الرئيسية', en: 'Home Page' },
  properties: { ar: 'صفحة العقارات', en: 'Properties Page' },
  projects: { ar: 'صفحة المشاريع', en: 'Projects Page' },
  services: { ar: 'صفحة الخدمات', en: 'Services Page' },
  about: { ar: 'صفحة عنا', en: 'About Page' },
  contact: { ar: 'صفحة التواصل', en: 'Contact Page' },
};
