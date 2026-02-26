'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import SerialBadge from '../shared/SerialBadge';
import PropertyBarcode from '@/components/admin/PropertyBarcode';
import { getPublishedProperties, type PropertyListing } from '@/lib/data/properties';
import { getSiteContent } from '@/lib/data/siteContent';

export default function PropertiesList({ overridesCookie = null, dataCookie = null }: { overridesCookie?: string | null; dataCookie?: string | null }) {
  const t = useTranslations('properties');
  const locale = useLocale();
  const [filter, setFilter] = useState<string>('ALL');

  const published = getPublishedProperties(overridesCookie, dataCookie);
  const filteredProperties = filter === 'ALL' 
    ? published 
    : published.filter(p => p.type === filter);

  const pageContent = getSiteContent().pagesProperties;

  return (
    <div className="min-h-screen bg-white" data-page="properties">
      <PageHero
        title={locale === 'ar' ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        subtitle={locale === 'ar' ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
        backgroundImage={pageContent.heroImage}
      />
      <AdsDisplay position="below_header" />

      {/* Properties Section */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            {[
              { key: 'ALL', label: locale === 'ar' ? 'الكل' : 'All' },
              { key: 'SALE', label: t('forSale') },
              { key: 'RENT', label: t('forRent') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-6 sm:px-10 py-3.5 sm:py-4 rounded-lg text-base sm:text-lg font-semibold transition-all border-2 min-h-[44px] touch-manipulation ${
                  filter === key
                    ? 'bg-primary text-white shadow-lg border-primary'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-primary/50 hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredProperties.map((property) => {
              const listing = property as PropertyListing;
              const detailUrl = listing.unitKey
                ? `/${locale}/properties/${property.id}?unit=${listing.unitKey}`
                : `/${locale}/properties/${property.id}`;
              const displayTitle = listing.unitData
                ? `${locale === 'ar' ? property.titleAr : property.titleEn} - ${listing.unitData.unitType === 'shop' ? (locale === 'ar' ? 'محل' : 'Shop') : listing.unitData.unitType === 'showroom' ? (locale === 'ar' ? 'معرض' : 'Showroom') : (locale === 'ar' ? 'شقة' : 'Apartment')} ${listing.unitData.unitNumber}`
                : (locale === 'ar' ? property.titleAr : property.titleEn);
              return (
                <div
                  key={listing.unitKey ? `${property.id}-${listing.unitKey}` : property.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={detailUrl} prefetch={true}>
                    <div className="relative h-64 overflow-hidden cursor-pointer">
                      <Image
                        src={property.image}
                        alt={displayTitle}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={85}
                        loading="lazy"
                      />
                      {/* Center Watermark - Transparent */}
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
                      {/* Type Badge */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-30">
                        <div className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                          {property.type === 'RENT' 
                            ? (locale === 'ar' ? 'للإيجار' : 'For Rent')
                            : (locale === 'ar' ? 'للبيع' : 'For Sale')}
                        </div>
                        {(listing as { businessStatus?: string }).businessStatus === 'RESERVED' && (
                          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                            {locale === 'ar' ? 'محجوز' : 'Reserved'}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="p-6">
                    {/* الباركود والرقم المتسلسل */}
                    <div className="flex items-center gap-2 mb-2">
                      <PropertyBarcode propertyId={property.id} unitKey={listing.unitKey} locale={locale} size={32} />
                      {'serialNumber' in property && (
                        <SerialBadge serialNumber={(property as { serialNumber?: string }).serialNumber!} compact />
                      )}
                    </div>
                    {/* 1. عنوان العقار */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ lineHeight: '1.5' }}>
                      {displayTitle}
                    </h3>
                    
                    {/* 2. وصف العقار */}
                    <p className="text-gray-600 mb-4 text-sm" style={{ lineHeight: '1.5' }}>
                      {locale === 'ar' ? property.descriptionAr : property.descriptionEn}
                    </p>
                    
                    {/* 3. موقع العقار */}
                    <div className="mb-4" style={{ lineHeight: '1.5' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs text-gray-500 font-medium">
                          {locale === 'ar' ? 'الموقع' : 'Location'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 font-semibold" style={{ lineHeight: '1.5' }}>
                        {(() => {
                          const ar = [(property as { areaAr?: string }).areaAr, property.villageAr, property.stateAr, property.governorateAr].filter(Boolean);
                          const en = [(property as { areaEn?: string }).areaEn, property.villageEn, property.stateEn, property.governorateEn].filter(Boolean);
                          return ar.length > 0 || en.length > 0
                            ? (locale === 'ar' ? ar.join(' - ') : en.join(', '))
                            : (locale === 'ar' ? property.locationAr : property.locationEn);
                        })()}
                      </div>
                    </div>
                    
                    {/* 4. نوع العقار */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar' ? 'نوع العقار' : 'Property Type'}
                      </div>
                      <div className="text-sm font-semibold text-gray-900" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar'
                          ? ((property as { propertySubTypeAr?: string }).propertySubTypeAr
                            ? `${property.propertyTypeAr} - ${(property as { propertySubTypeAr?: string }).propertySubTypeAr}`
                            : property.propertyTypeAr)
                          : ((property as { propertySubTypeEn?: string }).propertySubTypeEn
                            ? `${property.propertyTypeEn} - ${(property as { propertySubTypeEn?: string }).propertySubTypeEn}`
                            : property.propertyTypeEn)}
                      </div>
                    </div>

                    {/* 5. المساحة */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-1" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar' ? 'المساحة' : 'Area'}
                      </div>
                      <div className="text-sm font-semibold text-gray-900" style={{ lineHeight: '1.5' }}>
                        {property.area} {locale === 'ar' ? 'متر مربع' : 'sqm'}
                      </div>
                    </div>

                    {/* 6. المواصفات */}
                    <div className="mb-4 flex flex-wrap gap-4 text-xs text-gray-600">
                      {property.bedrooms > 0 && (
                        <span style={{ lineHeight: '1.5' }}>
                          {property.bedrooms} {locale === 'ar' ? 'غرفة' : 'bedrooms'}
                        </span>
                      )}
                      {property.bathrooms > 0 && (
                        <span style={{ lineHeight: '1.5' }}>
                          {property.bathrooms} {locale === 'ar' ? 'دورة مياه' : 'bathrooms'}
                        </span>
                      )}
                      {property.parkingSpaces > 0 && (
                        <span style={{ lineHeight: '1.5' }}>
                          {property.parkingSpaces} {locale === 'ar' ? 'موقف' : 'parking'}
                        </span>
                      )}
                    </div>
                    
                    {/* 7. السعر */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                        {property.type === 'RENT' 
                          ? (locale === 'ar' ? 'السعر الشهري' : 'Monthly Rent')
                          : (locale === 'ar' ? 'السعر' : 'Price')}
                      </div>
                      <div className="flex items-center gap-2 text-2xl font-bold text-primary" style={{ lineHeight: '1.5' }}>
                        {property.price.toLocaleString()}
                        {property.type === 'RENT' ? (
                          <span className="text-base font-semibold">
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
                            /{locale === 'ar' ? 'شهر' : 'month'}
                          </span>
                        ) : (
                          <img
                            src="/omr-symbol.png"
                            alt="OMR"
                            className="object-contain inline-block"
                            style={{ width: '32px', height: '32px', verticalAlign: 'middle' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Link
                      href={detailUrl}
                      prefetch={true}
                      className="block w-full text-center bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors mt-4"
                    >
                      {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
