'use client';

import { useLocale } from 'next-intl';
import { getSiteContent } from '@/lib/data/siteContent';

export default function Services() {
  const locale = useLocale();
  const content = getSiteContent().services;

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {locale === 'ar' ? content.titleAr : content.titleEn}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {locale === 'ar' ? content.subtitleAr : content.subtitleEn}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {content.items.map((service, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-xl p-10 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start gap-8">
                <div className="text-5xl font-bold text-primary opacity-50">
                  {service.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {locale === 'ar' ? service.titleAr : service.titleEn}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-base">
                    {locale === 'ar' ? service.descAr : service.descEn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
