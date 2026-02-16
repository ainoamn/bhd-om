'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import { getSiteContent } from '@/lib/data/siteContent';

export default function Hero() {
  const locale = useLocale();
  const content = getSiteContent().hero;

  return (
    <>
      <PageHero
        title={locale === 'ar' ? content.titleAr : content.titleEn}
        subtitle={locale === 'ar' ? content.subtitleAr : content.subtitleEn}
        backgroundImage={content.backgroundImage}
        description={locale === 'ar' ? content.descriptionAr : content.descriptionEn}
        showStatistics={true}
      />
      <AdsDisplay position="below_header" />
      {/* Additional Content Below Hero */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Link
            href={`/${locale}/projects`}
            prefetch={true}
            className="bg-primary text-white px-10 py-5 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors shadow-xl hover:shadow-2xl transform hover:scale-105 inline-block"
          >
            {locale === 'ar' ? 'اكتشف مشاريعنا' : 'Discover Our Projects'}
          </Link>
        </div>
      </section>
    </>
  );
}
