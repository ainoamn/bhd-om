'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { getSiteContent } from '@/lib/data/siteContent';

export default function AboutPreview() {
  const locale = useLocale();
  const content = getSiteContent().about;

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              {locale === 'ar' ? content.titleAr : content.titleEn}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {locale === 'ar' ? content.descriptionAr : content.descriptionEn}
            </p>
            <Link
              href={`/${locale}/about`}
              prefetch={true}
              className="text-primary hover:text-primary-dark font-semibold inline-flex items-center gap-2 text-lg"
            >
              {locale === 'ar' ? 'اقرأ المزيد' : 'Read More'}
              <span>→</span>
            </Link>
          </div>
          <div className="relative h-[550px] rounded-xl overflow-hidden shadow-xl">
            <Image
              src={content.image}
              alt={locale === 'ar' ? 'عمارة عمانية' : 'Omani Architecture'}
              fill
              className="object-cover"
            />
            {/* Center Watermark - Transparent */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none" 
              style={{ zIndex: 15 }}
            >
              <Image
                src="/logo-bhd.png"
                alt="BHD Logo"
                width={250}
                height={250}
                className="logo-golden-filter"
                style={{ 
                  opacity: 0.3,
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
                loading="lazy"
              />
            </div>
            {/* Corner Watermark - Right Top Only */}
            <div 
              className="absolute right-2 top-2 pointer-events-none" 
              style={{ zIndex: 20 }}
            >
              <Image
                src="/logo-bhd.png"
                alt="BHD Logo"
                width={80}
                height={80}
                className="logo-golden-filter"
                style={{ 
                  opacity: 0.9,
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
