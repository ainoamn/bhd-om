/**
 * إدارة الإعلانات - سلايدر، بانر، إعلان مبوب
 * تُخزّن في localStorage للتحديث الفوري وللتزامن بين التبويبات
 */

const STORAGE_KEY = 'bhd-ads';
const EVENT_NAME = 'bhd-ads-changed';

export type AdType = 'slider' | 'banner' | 'promo' | 'floating';

export type AdPosition = 'above_header' | 'below_header' | 'middle' | 'above_footer' | 'floating';

export type FloatingPosition = 'left' | 'center' | 'right';

export interface Ad {
  id: string;
  type: AdType;
  titleAr: string;
  titleEn: string;
  imageUrl: string;
  link?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  enabled: boolean;
  order: number;
  /** 'all' = كل الصفحات، أو مصفوفة معرفات الصفحات */
  showOnPages: 'all' | string[];
  /** مكان ظهور الإعلان */
  position: AdPosition;
  /** موضع الإعلان الطائر: يمين، يسار، منتصف (لنوع floating فقط) */
  floatingPosition?: FloatingPosition;
}

const defaultAds: Ad[] = [
  {
    id: 'ad1',
    type: 'slider',
    titleAr: 'عروض خاصة على العقارات',
    titleEn: 'Special Offers on Properties',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    link: '/properties',
    descriptionAr: 'اكتشف عروضنا المميزة',
    descriptionEn: 'Discover our exclusive offers',
    enabled: true,
    order: 1,
    showOnPages: 'all',
    position: 'below_header',
  },
  {
    id: 'ad2',
    type: 'banner',
    titleAr: 'مشاريع جديدة',
    titleEn: 'New Projects',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    link: '/projects',
    enabled: true,
    order: 2,
    showOnPages: 'all',
    position: 'above_footer',
  },
];

function loadFromStorage(): Ad[] {
  if (typeof window === 'undefined') return JSON.parse(JSON.stringify(defaultAds));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Ad[];
      return parsed.map((a) => ({
        ...defaultAds[0],
        ...a,
        position: (a.position ?? 'below_header') as AdPosition,
        floatingPosition: (a.floatingPosition ?? 'right') as FloatingPosition,
      }));
    }
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(defaultAds));
}

function saveToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adsStore));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

let adsStore: Ad[] = loadFromStorage();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      adsStore = JSON.parse(e.newValue);
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  });
}

export function getAds(): Ad[] {
  return adsStore;
}

export function getEnabledAdsForPage(pageId: string, position?: AdPosition): Ad[] {
  return adsStore
    .filter(
      (ad) =>
        ad.enabled &&
        (ad.showOnPages === 'all' || ad.showOnPages.includes(pageId)) &&
        (!position || ad.position === position)
    )
    .sort((a, b) => a.order - b.order);
}

export function addAd(ad: Omit<Ad, 'id'>): Ad {
  const id = `ad-${Date.now()}`;
  const newAd: Ad = { ...ad, id, position: ad.position ?? 'below_header' };
  adsStore = [...adsStore, newAd].sort((a, b) => a.order - b.order);
  saveToStorage();
  return newAd;
}

export function updateAd(id: string, updates: Partial<Ad>): void {
  adsStore = adsStore.map((ad) => (ad.id === id ? { ...ad, ...updates } : ad)).sort((a, b) => a.order - b.order);
  saveToStorage();
}

export function deleteAd(id: string): void {
  adsStore = adsStore.filter((ad) => ad.id !== id);
  saveToStorage();
}

export function toggleAdEnabled(id: string): void {
  adsStore = adsStore.map((ad) => (ad.id === id ? { ...ad, enabled: !ad.enabled } : ad));
  saveToStorage();
}

export const AD_POSITION_LABELS: Record<AdPosition, { ar: string; en: string }> = {
  above_header: { ar: 'أعلى الصفحة (فوق الهيدر)', en: 'Above page (above header)' },
  below_header: { ar: 'تحت الهيدر', en: 'Below header' },
  middle: { ar: 'في المنتصف', en: 'In the middle' },
  above_footer: { ar: 'أسفل الصفحة (قبل الفوتر)', en: 'Bottom of page (above footer)' },
  floating: { ar: 'إعلان طائر/متحرك', en: 'Floating ad' },
};

export const AD_TYPE_LABELS: Record<AdType, { ar: string; en: string }> = {
  slider: { ar: 'سلايدر', en: 'Slider' },
  banner: { ar: 'بانر', en: 'Banner' },
  promo: { ar: 'إعلان مبوب', en: 'Promo Ad' },
  floating: { ar: 'إعلان طائر', en: 'Floating ad' },
};

export const AD_IMAGE_SIZES: Record<AdType, { ar: string; en: string }> = {
  slider: { ar: 'مقاس الصورة: 1200 × 514 بكسل', en: 'Image size: 1200 × 514 px' },
  banner: { ar: 'مقاس الصورة: 800 × 450 بكسل', en: 'Image size: 800 × 450 px' },
  promo: { ar: 'مقاس الصورة: 320 × 180 بكسل', en: 'Image size: 320 × 180 px' },
  floating: { ar: 'مقاس الصورة: 300 × 400 بكسل', en: 'Image size: 300 × 400 px' },
};

export const FLOATING_POSITION_LABELS: Record<FloatingPosition, { ar: string; en: string }> = {
  left: { ar: 'اليسار', en: 'Left' },
  center: { ar: 'المنتصف', en: 'Center' },
  right: { ar: 'اليمين', en: 'Right' },
};

export const PAGE_IDS = ['home', 'properties', 'projects', 'services', 'about', 'contact'] as const;
