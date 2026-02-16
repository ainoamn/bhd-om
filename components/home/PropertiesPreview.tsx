'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import SerialBadge from '../shared/SerialBadge';
import { getPublishedProperties } from '@/lib/data/properties';
import { getSiteContent } from '@/lib/data/siteContent';

export default function PropertiesPreview() {
  const locale = useLocale();
  const rentContent = getSiteContent().propertiesRent;
  const saleContent = getSiteContent().propertiesSale;
  
  // عرض عقارين للإيجار وعقارين للبيع
  const published = getPublishedProperties();
  const rentProperties = published.filter(p => p.type === 'RENT').slice(0, 2);
  const saleProperties = published.filter(p => p.type === 'SALE').slice(0, 2);

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Properties for Rent */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {locale === 'ar' ? rentContent.titleAr : rentContent.titleEn}
              </h2>
              <p className="text-gray-600 text-lg">
                {locale === 'ar' ? rentContent.subtitleAr : rentContent.subtitleEn}
              </p>
            </div>
            <Link
              href={`/${locale}/properties?filter=RENT`}
              prefetch={true}
              className="text-primary hover:text-primary-dark font-semibold text-lg hidden md:block"
            >
              {locale === 'ar' ? 'عرض الكل →' : 'View All →'}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {rentProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
              >
                <Link href={`/${locale}/properties/${property.id}`} prefetch={true}>
                  <div className="relative h-64 overflow-hidden cursor-pointer">
                    <Image
                      src={property.image}
                      alt={locale === 'ar' ? property.titleAr : property.titleEn}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      quality={85}
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Center Watermark */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none" 
                      style={{ zIndex: 15 }}
                    >
                      <Image
                        src="/logo-bhd.png"
                        alt="BHD Logo"
                        width={200}
                        height={200}
                        className="logo-golden-filter"
                        style={{ 
                          opacity: 0.3,
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }}
                        loading="lazy"
                      />
                    </div>
                    {/* Corner Watermark */}
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
                    {/* Type Badge */}
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg z-30">
                      {locale === 'ar' ? 'للإيجار' : 'For Rent'}
                    </div>
                  </div>
                </Link>
                <div className="p-6">
                  {'serialNumber' in property && (
                    <SerialBadge serialNumber={(property as { serialNumber?: string }).serialNumber!} compact className="mb-2" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ lineHeight: '1.5' }}>
                    {locale === 'ar' ? property.titleAr : property.titleEn}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm" style={{ lineHeight: '1.5' }}>
                    {locale === 'ar' ? property.descriptionAr : property.descriptionEn}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const ar = [(property as { areaAr?: string }).areaAr, property.villageAr, property.stateAr].filter(Boolean);
                        const en = [(property as { areaEn?: string }).areaEn, property.villageEn, property.stateEn].filter(Boolean);
                        return ar.length > 0 || en.length > 0
                          ? (locale === 'ar' ? ar.join(' - ') : en.join(', '))
                          : (locale === 'ar' ? property.locationAr : property.locationEn);
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-xl font-bold text-primary">
                      {property.price.toLocaleString()}
                      <img
                        src="/omr-symbol.png"
                        alt="OMR"
                        className="object-contain inline-block"
                        style={{ width: '20px', height: '20px', verticalAlign: 'middle' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <span className="text-sm font-semibold">/{locale === 'ar' ? 'شهر' : 'month'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Properties for Sale */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {locale === 'ar' ? saleContent.titleAr : saleContent.titleEn}
              </h2>
              <p className="text-gray-600 text-lg">
                {locale === 'ar' ? saleContent.subtitleAr : saleContent.subtitleEn}
              </p>
            </div>
            <Link
              href={`/${locale}/properties?filter=SALE`}
              prefetch={true}
              className="text-primary hover:text-primary-dark font-semibold text-lg hidden md:block"
            >
              {locale === 'ar' ? 'عرض الكل →' : 'View All →'}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {saleProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
              >
                <Link href={`/${locale}/properties/${property.id}`} prefetch={true}>
                  <div className="relative h-64 overflow-hidden cursor-pointer">
                    <Image
                      src={property.image}
                      alt={locale === 'ar' ? property.titleAr : property.titleEn}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      quality={85}
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Center Watermark */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none" 
                      style={{ zIndex: 15 }}
                    >
                      <Image
                        src="/logo-bhd.png"
                        alt="BHD Logo"
                        width={200}
                        height={200}
                        className="logo-golden-filter"
                        style={{ 
                          opacity: 0.3,
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }}
                        loading="lazy"
                      />
                    </div>
                    {/* Corner Watermark */}
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
                    {/* Type Badge */}
                    <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg z-30">
                      {locale === 'ar' ? 'للبيع' : 'For Sale'}
                    </div>
                  </div>
                </Link>
                <div className="p-6">
                  {'serialNumber' in property && (
                    <SerialBadge serialNumber={(property as { serialNumber?: string }).serialNumber!} compact className="mb-2" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ lineHeight: '1.5' }}>
                    {locale === 'ar' ? property.titleAr : property.titleEn}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm" style={{ lineHeight: '1.5' }}>
                    {locale === 'ar' ? property.descriptionAr : property.descriptionEn}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const ar = [(property as { areaAr?: string }).areaAr, property.villageAr, property.stateAr].filter(Boolean);
                        const en = [(property as { areaEn?: string }).areaEn, property.villageEn, property.stateEn].filter(Boolean);
                        return ar.length > 0 || en.length > 0
                          ? (locale === 'ar' ? ar.join(' - ') : en.join(', '))
                          : (locale === 'ar' ? property.locationAr : property.locationEn);
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-xl font-bold text-primary">
                      {property.price.toLocaleString()}
                      <img
                        src="/omr-symbol.png"
                        alt="OMR"
                        className="object-contain inline-block"
                        style={{ width: '24px', height: '24px', verticalAlign: 'middle' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View All Properties Button */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/properties`}
            prefetch={true}
            className="inline-block bg-primary text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {locale === 'ar' ? 'عرض جميع العقارات' : 'View All Properties'}
          </Link>
        </div>
      </div>
    </section>
  );
}