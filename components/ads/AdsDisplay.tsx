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

function AdSlider({ ads, locale }: { ads: Ad[]; locale: string }) {
  if (ads.length === 0) return null;
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-4 px-4">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="flex-shrink-0 w-full max-w-4xl mx-auto snap-center"
          >
            {ad.link ? (
              <Link href={ad.link} className="block">
                <div className="relative aspect-[21/9] rounded-xl overflow-hidden">
                  <img
                    src={ad.imageUrl}
                    alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {locale === 'ar' ? ad.titleAr : ad.titleEn}
                      </h3>
                      {(ad.descriptionAr || ad.descriptionEn) && (
                        <p className="text-white/90 text-sm mt-1">
                          {locale === 'ar' ? ad.descriptionAr : ad.descriptionEn}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="relative aspect-[21/9] rounded-xl overflow-hidden">
                <img
                  src={ad.imageUrl}
                  alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {locale === 'ar' ? ad.titleAr : ad.titleEn}
                    </h3>
                    {(ad.descriptionAr || ad.descriptionEn) && (
                      <p className="text-white/90 text-sm mt-1">
                        {locale === 'ar' ? ad.descriptionAr : ad.descriptionEn}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdBanner({ ads, locale }: { ads: Ad[]; locale: string }) {
  if (ads.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ads.map((ad) => (
        <div key={ad.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          {ad.link ? (
            <Link href={ad.link} className="block">
              <div className="aspect-[16/9] relative">
                <img
                  src={ad.imageUrl}
                  alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {locale === 'ar' ? ad.titleAr : ad.titleEn}
                </h3>
              </div>
            </Link>
          ) : (
            <>
              <div className="aspect-[16/9] relative">
                <img
                  src={ad.imageUrl}
                  alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {locale === 'ar' ? ad.titleAr : ad.titleEn}
                </h3>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function AdPromo({ ads, locale }: { ads: Ad[]; locale: string }) {
  if (ads.length === 0) return null;
  return (
    <div className="space-y-4">
      {ads.map((ad) => (
        <div
          key={ad.id}
          className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50"
        >
          <div className="sm:w-48 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-200">
            <img
              src={ad.imageUrl}
              alt={locale === 'ar' ? ad.titleAr : ad.titleEn}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">
              {locale === 'ar' ? ad.titleAr : ad.titleEn}
            </h3>
            {(ad.descriptionAr || ad.descriptionEn) && (
              <p className="text-gray-600 text-sm mt-1">
                {locale === 'ar' ? ad.descriptionAr : ad.descriptionEn}
              </p>
            )}
            {ad.link && (
              <Link
                href={ad.link}
                className="inline-block mt-2 text-primary font-medium hover:underline"
              >
                {locale === 'ar' ? 'اعرض المزيد' : 'Learn more'}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AdsDisplayProps {
  position: 'above_header' | 'below_header' | 'middle' | 'above_footer';
}

export default function AdsDisplay({ position }: AdsDisplayProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const pid = getPageIdFromPath(pathname || '');
    setAds(getEnabledAdsForPage(pid, position));
  }, [pathname, position]);

  useEffect(() => {
    const handler = () => {
      const pid = getPageIdFromPath(pathname || '');
      setAds(getEnabledAdsForPage(pid, position));
    };
    window.addEventListener(ADS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ADS_CHANGED_EVENT, handler);
  }, [pathname, position]);

  const sliderAds = ads.filter((a) => a.type === 'slider');
  const bannerAds = ads.filter((a) => a.type === 'banner');
  const promoAds = ads.filter((a) => a.type === 'promo');
  // floating ads are rendered by FloatingAdsDisplay

  if (ads.length === 0) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {sliderAds.length > 0 && <AdSlider ads={sliderAds} locale={locale} />}
      {bannerAds.length > 0 && <AdBanner ads={bannerAds} locale={locale} />}
      {promoAds.length > 0 && <AdPromo ads={promoAds} locale={locale} />}
    </div>
  );
}
