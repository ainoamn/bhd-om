'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { getEnabledAdsForPage } from '@/lib/data/ads';
import type { Ad } from '@/lib/data/ads';

const ADS_CHANGED_EVENT = 'bhd-ads-changed';

const PATH_TO_PAGE: Record<string, string> = {
  '': 'home',
  '/': 'home',
  '/properties': 'properties',
  '/projects': 'projects',
  '/services': 'services',
  '/about': 'about',
  '/contact': 'contact',
};

function getPageIdFromPath(pathname: string): string {
  const path = pathname?.replace(/^\/(ar|en)/, '') || '';
  const normalized = path === '' || path === '/' ? 'home' : path;
  if (PATH_TO_PAGE[normalized]) return PATH_TO_PAGE[normalized];
  const segment = normalized.split('/')[1];
  return PATH_TO_PAGE[`/${segment}`] ?? 'home';
}

const FLOAT_POSITION_CLASS = {
  left: 'left-4',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-4',
};

export default function FloatingAdsDisplay() {
  const pathname = usePathname();
  const locale = useLocale();
  const [ads, setAds] = useState<Ad[]>([]);
  const [closedIds, setClosedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const pid = getPageIdFromPath(pathname || '');
    setAds(getEnabledAdsForPage(pid, 'floating'));
    setClosedIds(new Set());
  }, [pathname]);

  useEffect(() => {
    const handler = () => {
      const pid = getPageIdFromPath(pathname || '');
      setAds(getEnabledAdsForPage(pid, 'floating'));
    };
    window.addEventListener(ADS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ADS_CHANGED_EVENT, handler);
  }, [pathname]);

  const handleClose = (id: string) => {
    setClosedIds((prev) => new Set(prev).add(id));
  };

  const visibleAds = ads.filter((ad) => !closedIds.has(ad.id));
  if (visibleAds.length === 0) return null;

  return (
    <>
      {visibleAds.map((ad, i) => {
        const pos = ad.floatingPosition ?? 'right';
        return (
          <div
            key={ad.id}
            className={`fixed z-[9999] w-[300px] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-white animate-in slide-in-from-bottom-4 duration-300 ${FLOAT_POSITION_CLASS[pos]}`}
            style={{ bottom: `${2 + i * 22}rem` }}
          >
            <div className="relative group">
              <button
                onClick={() => handleClose(ad.id)}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {ad.link ? (
                <Link href={ad.link} className="block">
                  <div className="aspect-[3/4] relative">
                    <img
                      src={ad.imageUrl}
                      alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                      <h3 className="text-white font-bold text-sm">
                        {locale === 'ar' ? ad.titleAr : ad.titleEn}
                      </h3>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="aspect-[3/4] relative">
                  <img
                    src={ad.imageUrl}
                    alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                    <h3 className="text-white font-bold text-sm">
                      {locale === 'ar' ? ad.titleAr : ad.titleEn}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
