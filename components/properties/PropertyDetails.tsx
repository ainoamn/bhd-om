'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import SerialBadge from '../shared/SerialBadge';
import PropertyImageSlider from './PropertyImageSlider';
import PropertyIcon from './PropertyIcon';
import { FACING_OPTIONS, MAIN_FEATURES, ADDITIONAL_FEATURES, NEARBY_LOCATIONS } from '@/lib/propertyOptions';

interface Property {
  id: number;
  serialNumber?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  type: string; // RENT or SALE
  propertyTypeAr: string;
  propertyTypeEn: string;
  propertySubTypeAr?: string;
  propertySubTypeEn?: string;
  unitCountShop?: number;
  unitCountShowroom?: number;
  unitCountApartment?: number;
  locationAr: string;
  locationEn: string;
  governorateAr?: string;
  governorateEn?: string;
  stateAr?: string;
  stateEn?: string;
  villageAr?: string;
  villageEn?: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  majlis?: number;
  parkingSpaces?: number;
  floors?: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
  villaApartment?: {
    roomCount?: string;
    bathroomCount?: string;
    furnished?: string;
    buildingArea?: string;
    landArea?: string;
    buildingAge?: string;
    advertiser?: string;
    brokerName?: string;
    brokerPhone?: string;
    mainFeatures?: string[];
    additionalFeatures?: string[];
    nearbyLocations?: string[];
    isMortgaged?: string;
    facing?: string;
  };
}

interface PropertyDetailsProps {
  property: Property;
  locale: string;
  similarProperties?: Property[];
}

const WHATSAPP_NUMBER = '9689115341';

function getFeatureLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = [...MAIN_FEATURES, ...ADDITIONAL_FEATURES].find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

function getNearbyLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = NEARBY_LOCATIONS.find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

function getVideoEmbedUrl(url: string) {
  if (!url) return '';
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const videoId = url.includes('youtu.be/')
      ? url.split('youtu.be/')[1].split('?')[0]
      : url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  if (url.includes('youtube.com/embed')) return url;
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
  if (url.includes('player.vimeo.com')) return url;
  return url;
}

export default function PropertyDetails({ property, locale, similarProperties = [] }: PropertyDetailsProps) {
  const currentLocale = useLocale();

  // Google Maps embed URL
  const locPartsAr = [(property as { areaAr?: string }).areaAr, property.villageAr, property.stateAr, property.governorateAr].filter(Boolean);
  const locPartsEn = [(property as { areaEn?: string }).areaEn, property.villageEn, property.stateEn, property.governorateEn].filter(Boolean);
  const locationQuery = encodeURIComponent(
    currentLocale === 'ar' 
      ? (locPartsAr.length > 0 ? locPartsAr.join(' - ') : property.locationAr)
      : (locPartsEn.length > 0 ? locPartsEn.join(', ') : property.locationEn)
  );
  const mapEmbedUrl = property.lat && property.lng
    ? `https://maps.google.com/maps?q=${property.lat},${property.lng}&hl=${currentLocale === 'ar' ? 'ar' : 'en'}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${locationQuery}&hl=${currentLocale === 'ar' ? 'ar' : 'en'}&z=15&output=embed`;

  const isReserved = (property as { businessStatus?: string }).businessStatus === 'RESERVED';

  return (
    <div className="min-h-screen bg-gray-50" data-page="properties">
      <PageHero
        title={currentLocale === 'ar' ? property.titleAr : property.titleEn}
        backgroundImage={property.image}
        compact={true}
      />
      <AdsDisplay position="below_header" />

      {/* Property Details Section */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
              href={`/${locale}/properties`}
              prefetch={true}
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-8 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentLocale === 'ar' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
              {currentLocale === 'ar' ? 'العودة إلى العقارات' : 'Back to Properties'}
            </Link>

            {property.serialNumber && (
              <SerialBadge serialNumber={property.serialNumber} className="mb-6" />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Left Column - Main Info (2/3 width) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Property Images Slider */}
                {property.images && property.images.length > 0 ? (
                  <PropertyImageSlider
                    images={property.images}
                    alt={currentLocale === 'ar' ? property.titleAr : property.titleEn}
                    type={property.type as 'RENT' | 'SALE'}
                    locale={currentLocale}
                    businessStatus={(property as { businessStatus?: string }).businessStatus}
                  />
                ) : (
                  <div className="relative h-80 md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src={property.image}
                      alt={currentLocale === 'ar' ? property.titleAr : property.titleEn}
                      fill
                      className="object-cover"
                      quality={85}
                      sizes="100vw"
                    />
                    {/* Type Badge + محجوز - بجانب بعض */}
                    <div 
                      className="absolute top-6 left-6 flex flex-wrap items-center gap-2 z-30"
                      style={{ backdropFilter: 'blur(10px)' }}
                    >
                      <div 
                        className={`px-8 py-4 rounded-xl font-bold text-xl md:text-2xl shadow-2xl ${
                          property.type === 'RENT' 
                            ? 'bg-blue-600 text-white border-4 border-blue-300'
                            : 'bg-green-600 text-white border-4 border-green-300'
                        }`}
                        style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}
                      >
                        {property.type === 'RENT' 
                          ? (currentLocale === 'ar' ? 'للإيجار' : 'FOR RENT')
                          : (currentLocale === 'ar' ? 'للبيع' : 'FOR SALE')}
                      </div>
                      {(property as { businessStatus?: string }).businessStatus === 'RESERVED' && (
                        <div 
                          className="px-8 py-4 rounded-xl font-bold text-xl md:text-2xl shadow-2xl bg-white/95 text-red-600 border-4 border-red-500"
                          style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                        >
                          {currentLocale === 'ar' ? 'محجوز' : 'RESERVED'}
                        </div>
                      )}
                    </div>
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
                    {/* Watermark Logo - Right Top Only */}
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
                )}

                {/* Video Section */}
                {property.videoUrl && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8" style={{ lineHeight: '1.5' }}>
                      {currentLocale === 'ar' ? 'فيديو العقار' : 'Property Video'}
                    </h2>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <iframe
                        src={getVideoEmbedUrl(property.videoUrl)}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentLocale === 'ar' ? property.titleAr : property.titleEn}
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* تنبيه محجوز - ملاحظة منسقة واحدة */}
                {isReserved && (
                  <div className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-amber-900 text-lg mb-2">
                          {(property as { unitKey?: string }).unitKey
                            ? (currentLocale === 'ar' ? 'هذه الوحدة محجوزة حالياً' : 'This unit is currently reserved')
                            : (currentLocale === 'ar' ? 'هذا العقار محجوز حالياً' : 'This property is currently reserved')}
                        </h3>
                        <p className="text-amber-800 text-sm leading-relaxed mb-4">
                          {currentLocale === 'ar'
                            ? 'يمكنك الاستمرار بالحجز عبر زر "احجز الآن" في قسم التواصل أدناه. في حال لم يُؤكد الحجز السابق من الإدارة، سيُسنَد العقار لك بعد استكمال الإجراءات. وإن تم تأكيد الحجز السابق، سيعاد المبلغ وفق الإجراءات والاشتراطات.'
                            : 'You may proceed with booking via the "Book Now" button in the contact section below. If the previous booking is not confirmed by management, the property will be assigned to you after completing procedures. If the previous booking is confirmed, the amount will be refunded according to procedures and terms.'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold">
                            {currentLocale === 'ar' ? 'يمكن الحجز' : 'Booking available'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-100/80 text-amber-700 text-xs">
                            {currentLocale === 'ar' ? 'استرداد المبلغ عند التأكيد' : 'Refund if confirmed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title and Type */}
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border-2 ${
                      property.type === 'RENT' 
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-green-100 text-green-800 border-green-200'
                    }`}>
                      {property.type === 'RENT' 
                        ? (currentLocale === 'ar' ? 'للإيجار' : 'For Rent')
                        : (currentLocale === 'ar' ? 'للبيع' : 'For Sale')}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                    {currentLocale === 'ar' ? property.titleAr : property.titleEn}
                  </h1>
                  <p className="text-lg md:text-xl text-gray-600 mb-8" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' ? property.descriptionAr : property.descriptionEn}
                  </p>
                </div>

                {/* Property Specifications */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">
                    {currentLocale === 'ar' ? 'مواصفات العقار' : 'Property Specifications'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="area" size="lg" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'المساحة' : 'Area'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {property.area.toLocaleString()} {currentLocale === 'ar' ? 'متر مربع' : 'sqm'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="propertyType" size="lg" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'نوع العقار' : 'Property Type'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar'
                            ? (property.propertySubTypeAr ? `${property.propertyTypeAr} - ${property.propertySubTypeAr}` : property.propertyTypeAr)
                            : (property.propertySubTypeEn ? `${property.propertyTypeEn} - ${property.propertySubTypeEn}` : property.propertyTypeEn)}
                        </div>
                        {property.propertyTypeAr === 'مبنى' && property.propertySubTypeAr === 'متعدد الوحدات' && (property.unitCountShop || property.unitCountShowroom || property.unitCountApartment) && (
                          <div className="mt-2 text-sm text-gray-600" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'محل' : 'Shop'} {property.unitCountShop || 0} · {currentLocale === 'ar' ? 'معرض' : 'Showroom'} {property.unitCountShowroom || 0} · {currentLocale === 'ar' ? 'شقة' : 'Apartment'} {property.unitCountApartment || 0}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="location" size="lg" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'الموقع' : 'Location'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {locPartsAr.length > 0 || locPartsEn.length > 0 ? (
                            currentLocale === 'ar' 
                              ? locPartsAr.join(' - ')
                              : locPartsEn.join(', ')
                          ) : (
                            currentLocale === 'ar' ? property.locationAr : property.locationEn
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Specifications - مزارع وشاليهات أو أرض from villaApartment */}
                    {(property.propertyTypeAr === 'مزارع وشاليهات' && property.villaApartment) ? (
                      <>
                        {property.villaApartment.advertiser && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="advertiser" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'المعلن' : 'Advertiser'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.advertiser === 'owner' ? (currentLocale === 'ar' ? 'المالك' : 'Owner') : (currentLocale === 'ar' ? 'الوسيط' : 'Broker')}
                              </div>
                              {property.villaApartment.advertiser === 'broker' && (property.villaApartment.brokerName || property.villaApartment.brokerPhone) && (
                                <div className="text-sm text-gray-600 mt-1" style={{ lineHeight: '1.5' }}>
                                  {property.villaApartment.brokerName && <div>{property.villaApartment.brokerName}</div>}
                                  {property.villaApartment.brokerPhone && <div dir="ltr">{property.villaApartment.brokerPhone}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {property.villaApartment.roomCount && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="bedrooms" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'عدد الغرف' : 'Rooms'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.roomCount === 'studio' ? (currentLocale === 'ar' ? 'ستوديو' : 'Studio') : property.villaApartment.roomCount}
                              </div>
                            </div>
                          </div>
                        )}
                        {property.villaApartment.bathroomCount && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="bathrooms" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'عدد الحمامات' : 'Bathrooms'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.bathroomCount}
                              </div>
                            </div>
                          </div>
                        )}
                        {property.villaApartment.buildingArea && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="buildingArea" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'مساحة البناء' : 'Building Area'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.buildingArea} م²
                              </div>
                            </div>
                          </div>
                        )}
                        {property.villaApartment.landArea && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="landArea" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'مساحة الأرض' : 'Land Area'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.landArea} م²
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (property.propertyTypeAr === 'أرض' && property.villaApartment) ? (
                      <>
                        {property.villaApartment.advertiser && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="advertiser" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'المعلن' : 'Advertiser'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.advertiser === 'owner' ? (currentLocale === 'ar' ? 'المالك' : 'Owner') : (currentLocale === 'ar' ? 'الوسيط' : 'Broker')}
                              </div>
                              {property.villaApartment.advertiser === 'broker' && (property.villaApartment.brokerName || property.villaApartment.brokerPhone) && (
                                <div className="text-sm text-gray-600 mt-1" style={{ lineHeight: '1.5' }}>
                                  {property.villaApartment.brokerName && <div>{property.villaApartment.brokerName}</div>}
                                  {property.villaApartment.brokerPhone && <div dir="ltr">{property.villaApartment.brokerPhone}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {property.villaApartment.isMortgaged && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="isMortgaged" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'هل العقار مرهون؟' : 'Mortgaged?'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {property.villaApartment.isMortgaged === 'yes' ? (currentLocale === 'ar' ? 'نعم' : 'Yes') : (currentLocale === 'ar' ? 'لا' : 'No')}
                              </div>
                            </div>
                          </div>
                        )}
                        {property.villaApartment.facing && (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <PropertyIcon type="spec" iconKey="facing" size="lg" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                                {currentLocale === 'ar' ? 'الواجهة' : 'Facing'}
                              </div>
                              <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                                {FACING_OPTIONS.find((o) => o.value === property.villaApartment?.facing)?.[currentLocale === 'ar' ? 'ar' : 'en'] || property.villaApartment.facing}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : property.bedrooms && property.bedrooms > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PropertyIcon type="spec" iconKey="bedrooms" size="lg" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الغرف' : 'Bedrooms'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {property.bedrooms} {currentLocale === 'ar' ? 'غرفة' : 'bedrooms'}
                          </div>
                        </div>
                      </div>
                    )}

                    {property.bathrooms && property.bathrooms > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PropertyIcon type="spec" iconKey="bathrooms" size="lg" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد دورات المياه' : 'Bathrooms'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {property.bathrooms} {currentLocale === 'ar' ? 'دورة مياه' : 'bathrooms'}
                          </div>
                        </div>
                      </div>
                    )}

                    {property.parkingSpaces && property.parkingSpaces > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PropertyIcon type="spec" iconKey="parking" size="lg" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'مواقف السيارات' : 'Parking Spaces'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {property.parkingSpaces} {currentLocale === 'ar' ? 'موقف' : 'spaces'}
                          </div>
                        </div>
                      </div>
                    )}

                    {property.floors && property.floors > 0 && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <PropertyIcon type="spec" iconKey="floors" size="lg" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الطوابق' : 'Floors'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {property.floors} {currentLocale === 'ar' ? 'طابق' : 'floors'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features - مزايا */}
                {property.villaApartment && ((property.villaApartment.mainFeatures?.length || 0) + (property.villaApartment.additionalFeatures?.length || 0)) > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <PropertyIcon type="feature" iconKey="central_ac" size="lg" />
                      {currentLocale === 'ar' ? 'المزايا' : 'Features'}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {[...(property.villaApartment.mainFeatures || []), ...(property.villaApartment.additionalFeatures || [])].map((k) => (
                        <span key={k} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-800 border border-gray-200">
                          <PropertyIcon type="feature" iconKey={k} size="sm" />
                          {getFeatureLabel(k, currentLocale === 'ar' ? 'ar' : 'en')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby Locations - مواقع قريبة */}
                {property.villaApartment && (property.villaApartment.nearbyLocations?.length || 0) > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <PropertyIcon type="nearby" iconKey="bank_atm" size="lg" />
                      {currentLocale === 'ar' ? 'مواقع قريبة' : 'Nearby Locations'}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {property.villaApartment.nearbyLocations!.map((k) => (
                        <span key={k} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-800 border border-gray-200">
                          <PropertyIcon type="nearby" iconKey={k} size="sm" />
                          {getNearbyLabel(k, currentLocale === 'ar' ? 'ar' : 'en')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Key Info (1/3 width) */}
              <div className="space-y-6">
                {/* Property Value Card */}
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 md:p-8 text-white shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-3" style={{ lineHeight: '1.5' }}>
                        {property.type === 'RENT' 
                          ? (currentLocale === 'ar' ? 'السعر الشهري' : 'Monthly Rent')
                          : (currentLocale === 'ar' ? 'السعر' : 'Price')}
                      </div>
                      <div className="flex items-center gap-2 text-3xl md:text-4xl font-bold" style={{ lineHeight: '1.5' }}>
                        {property.price.toLocaleString()}
                        {property.type === 'RENT' ? (
                          <>
                            <img
                              src="/omr-symbol.png"
                              alt="OMR"
                              className="object-contain"
                              style={{ width: '40px', height: '40px', display: 'inline-block' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <span className="text-lg font-semibold">/{currentLocale === 'ar' ? 'شهر' : 'month'}</span>
                          </>
                        ) : (
                          <img
                            src="/omr-symbol.png"
                            alt="OMR"
                            className="object-contain"
                            style={{ width: '40px', height: '40px', display: 'inline-block' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' ? 'للتواصل' : 'Contact Us'}
                  </h3>
                  <p className="text-gray-600 mb-6 text-sm" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' 
                      ? 'للمزيد من المعلومات حول هذا العقار، يرجى التواصل معنا'
                      : 'For more information about this property, please contact us'}
                  </p>
                  
                  {/* Contact Buttons - Direct */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Book Now - يفتح صفحة الحجز */}
                    <Link
                      href={`/${locale}/properties/${property.id}/book${(property as { unitKey?: string }).unitKey ? `?unit=${(property as { unitKey?: string }).unitKey}` : ''}`}
                      prefetch={true}
                      className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg hover:shadow-xl group"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span>{currentLocale === 'ar' ? 'احجز الآن' : 'Book Now'}</span>
                    </Link>

                    {/* المعاينة - يفتح صفحة طلب المعاينة */}
                    <Link
                      href={`/${locale}/properties/${property.id}/viewing${(property as { unitKey?: string }).unitKey ? `?unit=${(property as { unitKey?: string }).unitKey}` : ''}`}
                      prefetch={true}
                      className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl group"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{currentLocale === 'ar' ? 'المعاينة' : 'Schedule Viewing'}</span>
                    </Link>

                    {/* واتساب - يفتح واتساب مباشرة برقم الموقع */}
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                        currentLocale === 'ar' 
                          ? `مرحباً، أريد الاستفسار عن العقار: ${property.titleAr}`
                          : `Hello, I want to inquire about property: ${property.titleEn}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold bg-[#25D366] text-white hover:bg-[#20BD5A] transition-all shadow-lg hover:shadow-xl group"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span>{currentLocale === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                    </a>

                    {/* اتصل الآن - يفتح صفحة التواصل */}
                    <Link
                      href={`/${locale}/contact`}
                      prefetch={true}
                      className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl group"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{currentLocale === 'ar' ? 'اتصل الآن' : 'Call Now'}</span>
                    </Link>

                    {/* Contact Form */}
                    <Link
                      href={`/${locale}/contact`}
                      prefetch={true}
                      className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-xl group sm:col-span-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{currentLocale === 'ar' ? 'نموذج التواصل' : 'Contact Form'}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-white py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              {currentLocale === 'ar' ? 'موقع العقار' : 'Property Location'}
            </h2>
            
            {/* Google Maps Link */}
            {property.googleMapsUrl && (
              <div className="mb-6 text-center">
                <a
                  href={property.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentLocale === 'ar' ? 'فتح موقع العقار في خرائط جوجل' : 'Open Property Location in Google Maps'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              <iframe
                width="100%"
                height="500"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
              ></iframe>
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4" style={{ lineHeight: '1.5' }}>
                {currentLocale === 'ar' 
                  ? `الموقع: ${locPartsAr.length > 0 ? locPartsAr.join(' - ') : property.locationAr}`
                  : `Location: ${locPartsEn.length > 0 ? locPartsEn.join(', ') : property.locationEn}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Properties Section */}
      {similarProperties && similarProperties.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
                {currentLocale === 'ar' ? 'عقارات مشابهة' : 'Similar Properties'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {similarProperties.map((similarProperty) => (
                  <div
                    key={similarProperty.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/${locale}/properties/${similarProperty.id}`} prefetch={true}>
                      <div className="relative h-64 overflow-hidden cursor-pointer">
                        <Image
                          src={similarProperty.image}
                          alt={currentLocale === 'ar' ? similarProperty.titleAr : similarProperty.titleEn}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          quality={85}
                          loading="lazy"
                        />
                        {/* Type Badge */}
                        <div className={`absolute top-4 left-4 px-4 py-2 rounded-lg font-bold text-sm shadow-lg z-30 ${
                          similarProperty.type === 'RENT' 
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {similarProperty.type === 'RENT' 
                            ? (currentLocale === 'ar' ? 'للإيجار' : 'For Rent')
                            : (currentLocale === 'ar' ? 'للبيع' : 'For Sale')}
                        </div>
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
                      </div>
                    </Link>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ lineHeight: '1.5' }}>
                        {currentLocale === 'ar' ? similarProperty.titleAr : similarProperty.titleEn}
                      </h3>
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'الموقع' : 'Location'}
                        </div>
                        <div className="text-sm text-gray-700 font-semibold" style={{ lineHeight: '1.5' }}>
                          {(() => {
                            const spAr = [(similarProperty as { areaAr?: string }).areaAr, similarProperty.villageAr, similarProperty.stateAr, similarProperty.governorateAr].filter(Boolean);
                            const spEn = [(similarProperty as { areaEn?: string }).areaEn, similarProperty.villageEn, similarProperty.stateEn, similarProperty.governorateEn].filter(Boolean);
                            return spAr.length > 0 || spEn.length > 0
                              ? (currentLocale === 'ar' ? spAr.join(' - ') : spEn.join(', '))
                              : (currentLocale === 'ar' ? similarProperty.locationAr : similarProperty.locationEn);
                          })()}
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'المساحة' : 'Area'}
                        </div>
                        <div className="text-sm font-semibold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {similarProperty.area} {currentLocale === 'ar' ? 'متر مربع' : 'sqm'}
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {similarProperty.type === 'RENT' 
                            ? (currentLocale === 'ar' ? 'السعر الشهري' : 'Monthly Rent')
                            : (currentLocale === 'ar' ? 'السعر' : 'Price')}
                        </div>
                        <div className="flex items-center gap-2 text-xl font-bold text-primary" style={{ lineHeight: '1.5' }}>
                          {similarProperty.price.toLocaleString()}
                          {similarProperty.type === 'RENT' ? (
                            <span className="text-sm font-semibold">
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
                              /{currentLocale === 'ar' ? 'شهر' : 'month'}
                            </span>
                          ) : (
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
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/${locale}/properties/${similarProperty.id}`}
                        prefetch={true}
                        className="block w-full text-center bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors mt-4"
                      >
                        {currentLocale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
