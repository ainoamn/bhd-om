'use client';

import Image from 'next/image';
import PropertyImageSlider from '@/components/properties/PropertyImageSlider';
import PropertyIcon from '@/components/properties/PropertyIcon';
import {
  MAIN_FEATURES,
  ADDITIONAL_FEATURES,
  NEARBY_LOCATIONS,
  FURNISHED_OPTIONS,
  BUILDING_AGE_OPTIONS,
  FLOOR_COUNT_OPTIONS,
  FACING_OPTIONS,
} from '@/lib/propertyOptions';
import type { PropertyFormData } from './PropertyForm';

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

function getFeatureLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = [...MAIN_FEATURES, ...ADDITIONAL_FEATURES].find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

function getNearbyLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = NEARBY_LOCATIONS.find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

interface PropertyFormReviewPreviewProps {
  form: PropertyFormData;
  locale: string;
}

export default function PropertyFormReviewPreview({ form, locale }: PropertyFormReviewPreviewProps) {
  const ar = locale === 'ar';
  const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
  const va = form.villaApartment;

  const title = ar ? (form.titleAr || form.titleEn) : (form.titleEn || form.titleAr);
  const description = ar ? (form.descriptionAr || form.descriptionEn) : (form.descriptionEn || form.descriptionAr);
  const locationAr = [form.areaAr, form.villageAr, form.stateAr, form.governorateAr].filter(Boolean).join(' - ');
  const locationEn = [form.areaEn, form.villageEn, form.stateEn, form.governorateEn].filter(Boolean).join(', ');
  const location = ar ? locationAr : locationEn;

  const typeLabel = form.type === 'RENT'
    ? (ar ? 'للإيجار' : 'For Rent')
    : form.type === 'SALE'
      ? (ar ? 'للبيع' : 'For Sale')
      : (ar ? 'للاستثمار' : 'For Investment');

  const mapLocationQuery = encodeURIComponent(ar ? locationAr || 'سلطنة عمان' : locationEn || 'Oman');
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapLocationQuery}&hl=${ar ? 'ar' : 'en'}&z=15&output=embed`;

  const images = form.images?.length ? form.images : form.images?.[0] ? [form.images[0]] : [];

  return (
    <div className="space-y-8 [&_*]:leading-[1.5]">
      {/* معاينة كما ستظهر في الموقع */}
      <p className="text-sm text-gray-500 font-medium leading-[1.5]">
        {ar ? 'معاينة العقار كما سيظهر في الموقع:' : 'Property preview as it will appear on the website:'}
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Images Slider */}
        {images.length > 0 ? (
          <PropertyImageSlider
            images={images}
            alt={title || 'Property'}
            type={form.type === 'INVESTMENT' ? 'SALE' : form.type}
            locale={locale}
          />
        ) : (
          <div className="relative h-64 md:h-80 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">{ar ? 'لم تضف صوراً بعد' : 'No images added yet'}</p>
            </div>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8 [&_p]:leading-[1.5] [&_span]:leading-[1.5]">
          {/* Title & Type - مسافة 2 بين العنوان والفقرة */}
          <div className="space-y-[2rem]">
            <span
              className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border-2 ${
                form.type === 'RENT'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : form.type === 'SALE'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {typeLabel}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {title || (ar ? 'بدون عنوان' : 'No title')}
            </h1>
            {description && (
              <p className="text-gray-600 leading-[1.5] whitespace-pre-wrap">{description}</p>
            )}
          </div>

          {/* Video */}
          {form.videoUrl && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {ar ? 'فيديو العقار' : 'Property Video'}
              </h2>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
                <iframe
                  src={getVideoEmbedUrl(form.videoUrl)}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title || 'Property'}
                />
              </div>
            </div>
          )}

          {/* Specifications Grid */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-8 leading-[1.5]">
              {ar ? 'مواصفات العقار' : 'Property Specifications'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Area */}
              {(form.area && Number(form.area) > 0) || (isMultiUnit && form.multiUnitTotalArea) ? (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="area" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'المساحة' : 'Area'}</div>
                    <div className="font-bold text-gray-900">
                      {isMultiUnit ? form.multiUnitTotalArea : form.area} {ar ? 'م²' : 'sqm'}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Property Type */}
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PropertyIcon type="spec" iconKey="propertyType" size="md" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{ar ? 'نوع العقار' : 'Property Type'}</div>
                  <div className="font-bold text-gray-900">
                    {ar
                      ? (form.propertySubTypeAr ? `${form.propertyTypeAr} - ${form.propertySubTypeAr}` : form.propertyTypeAr)
                      : (form.propertySubTypeEn ? `${form.propertyTypeEn} - ${form.propertySubTypeEn}` : form.propertyTypeEn)}
                  </div>
                  {isMultiUnit && (
                    <div className="text-sm text-gray-600 mt-1">
                      {ar ? 'محل' : 'Shop'} {form.multiUnitShops?.length || 0} · {ar ? 'معرض' : 'Showroom'} {form.multiUnitShowrooms?.length || 0} · {ar ? 'شقة' : 'Apartment'} {form.multiUnitApartments?.length || 0}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {location && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="location" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'الموقع' : 'Location'}</div>
                    <div className="font-bold text-gray-900">{location}</div>
                  </div>
                </div>
              )}

              {/* Bedrooms */}
              {form.bedrooms && Number(form.bedrooms) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="bedrooms" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'غرف نوم' : 'Bedrooms'}</div>
                    <div className="font-bold text-gray-900">{form.bedrooms}</div>
                  </div>
                </div>
              )}

              {/* Bathrooms */}
              {form.bathrooms && Number(form.bathrooms) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="bathrooms" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'دورات مياه' : 'Bathrooms'}</div>
                    <div className="font-bold text-gray-900">{form.bathrooms}</div>
                  </div>
                </div>
              )}

              {/* Parking */}
              {form.parkingSpaces && Number(form.parkingSpaces) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="parking" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'مواقف سيارات' : 'Parking'}</div>
                    <div className="font-bold text-gray-900">{form.parkingSpaces}</div>
                  </div>
                </div>
              )}

              {/* Living Rooms */}
              {form.livingRooms && Number(form.livingRooms) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="livingRooms" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'صالات' : 'Living Rooms'}</div>
                    <div className="font-bold text-gray-900">{form.livingRooms}</div>
                  </div>
                </div>
              )}

              {/* Majlis */}
              {form.majlis && Number(form.majlis) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PropertyIcon type="spec" iconKey="majlis" size="md" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{ar ? 'مجالس' : 'Majlis'}</div>
                    <div className="font-bold text-gray-900">{form.majlis}</div>
                  </div>
                </div>
              )}

              {/* Villa/Apartment details */}
              {va && (
                <>
                  {va.roomCount && !form.bedrooms && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="bedrooms" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'عدد الغرف' : 'Rooms'}</div>
                        <div className="font-bold text-gray-900">
                          {va.roomCount === 'studio' ? (ar ? 'ستوديو' : 'Studio') : va.roomCount}
                        </div>
                      </div>
                    </div>
                  )}
                  {va.bathroomCount && !form.bathrooms && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="bathrooms" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'الحمامات' : 'Bathrooms'}</div>
                        <div className="font-bold text-gray-900">{va.bathroomCount}</div>
                      </div>
                    </div>
                  )}
                  {va.furnished && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="furnished" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'التأثيث' : 'Furnished'}</div>
                        <div className="font-bold text-gray-900">
                          {FURNISHED_OPTIONS.find((o) => o.value === va.furnished)?.[ar ? 'ar' : 'en'] || va.furnished}
                        </div>
                      </div>
                    </div>
                  )}
                  {va.buildingArea && Number(va.buildingArea) > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="buildingArea" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'مساحة البناء' : 'Building Area'}</div>
                        <div className="font-bold text-gray-900">{va.buildingArea} م²</div>
                      </div>
                    </div>
                  )}
                  {va.landArea && Number(va.landArea) > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="landArea" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'مساحة الأرض' : 'Land Area'}</div>
                        <div className="font-bold text-gray-900">{va.landArea} م²</div>
                      </div>
                    </div>
                  )}
                  {va.buildingAge && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="buildingAge" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'عمر البناء' : 'Building Age'}</div>
                        <div className="font-bold text-gray-900">
                          {BUILDING_AGE_OPTIONS.find((o) => o.value === va.buildingAge)?.[ar ? 'ar' : 'en'] || va.buildingAge}
                        </div>
                      </div>
                    </div>
                  )}
                  {va.floorCount && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="floors" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'الطوابق' : 'Floors'}</div>
                        <div className="font-bold text-gray-900">
                          {FLOOR_COUNT_OPTIONS.find((o) => o.value === va.floorCount)?.[ar ? 'ar' : 'en'] || va.floorCount}
                        </div>
                      </div>
                    </div>
                  )}
                  {va.facing && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="facing" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'الواجهة' : 'Facing'}</div>
                        <div className="font-bold text-gray-900">
                          {FACING_OPTIONS.find((o) => o.value === va.facing)?.[ar ? 'ar' : 'en'] || va.facing}
                        </div>
                      </div>
                    </div>
                  )}
                  {va.advertiser && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="advertiser" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'المعلن' : 'Advertiser'}</div>
                        <div className="font-bold text-gray-900">
                          {va.advertiser === 'owner' ? (ar ? 'المالك' : 'Owner') : (ar ? 'الوسيط' : 'Broker')}
                        </div>
                        {va.advertiser === 'broker' && (va.brokerName || va.brokerPhone) && (
                          <div className="text-sm text-gray-600 mt-1">
                            {va.brokerName && <div>{va.brokerName}</div>}
                            {va.brokerPhone && <div dir="ltr">{va.brokerPhone}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {va.isMortgaged && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PropertyIcon type="spec" iconKey="isMortgaged" size="md" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{ar ? 'مرهون' : 'Mortgaged'}</div>
                        <div className="font-bold text-gray-900">
                          {va.isMortgaged === 'yes' ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No')}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Features */}
          {((va?.mainFeatures?.length || 0) + (va?.additionalFeatures?.length || 0) + (va?.customMainFeatures?.length || 0) + (va?.customAdditionalFeatures?.length || 0)) > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-8 leading-[1.5] flex items-center gap-2">
                <PropertyIcon type="feature" iconKey="central_ac" size="lg" className="text-primary" />
                {ar ? 'المزايا' : 'Features'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...(va?.mainFeatures ?? []), ...(va?.additionalFeatures ?? [])].map((k) => (
                  <span key={k} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-sm font-medium text-gray-800 border border-gray-200 shadow-sm">
                    <PropertyIcon type="feature" iconKey={k} size="sm" />
                    {getFeatureLabel(k, ar ? 'ar' : 'en')}
                  </span>
                ))}
                {(va?.customMainFeatures ?? []).concat(va?.customAdditionalFeatures ?? []).map((item, i) => (
                  <span key={`custom-${i}`} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-sm font-medium text-gray-800 border border-gray-200 shadow-sm">
                    <PropertyIcon type="feature" iconKey="garden" size="sm" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Locations */}
          {(va?.nearbyLocations?.length || 0) > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-8 leading-[1.5] flex items-center gap-2">
                <PropertyIcon type="nearby" iconKey="bank_atm" size="lg" className="text-primary" />
                {ar ? 'مواقع قريبة' : 'Nearby Locations'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {va!.nearbyLocations!.map((k) => (
                  <span key={k} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl text-sm font-medium text-gray-800 border border-gray-200 shadow-sm">
                    <PropertyIcon type="nearby" iconKey={k} size="sm" />
                    {getNearbyLabel(k, ar ? 'ar' : 'en')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Multi-unit units detail */}
          {isMultiUnit && (form.multiUnitShops?.length || form.multiUnitShowrooms?.length || form.multiUnitApartments?.length) > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-8 leading-[1.5]">
                {ar ? 'تفاصيل الوحدات' : 'Unit Details'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {form.multiUnitShops?.map((u, i) => (
                  <div key={`shop-${i}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {u.images?.length ? (
                        <Image
                          src={u.images[0]}
                          alt={`${ar ? 'محل' : 'Shop'} ${u.unitNumber || i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                          </svg>
                        </div>
                      )}
                      {u.images?.length > 1 && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                          +{u.images.length - 1} {ar ? 'صورة' : 'img'}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-gray-900">{ar ? 'محل' : 'Shop'} {u.unitNumber || i + 1}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span>{u.area} م²</span>
                        {u.price && <span className="text-primary font-semibold">{u.price} ر.ع</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {form.multiUnitShowrooms?.map((u, i) => (
                  <div key={`showroom-${i}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {u.images?.length ? (
                        <Image
                          src={u.images[0]}
                          alt={`${ar ? 'معرض' : 'Showroom'} ${u.unitNumber || i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                          </svg>
                        </div>
                      )}
                      {u.images?.length > 1 && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                          +{u.images.length - 1} {ar ? 'صورة' : 'img'}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-gray-900">{ar ? 'معرض' : 'Showroom'} {u.unitNumber || i + 1}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span>{u.area} م²</span>
                        {u.price && <span className="text-primary font-semibold">{u.price} ر.ع</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {form.multiUnitApartments?.map((u, i) => (
                  <div key={`apt-${i}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {u.images?.length ? (
                        <Image
                          src={u.images[0]}
                          alt={`${ar ? 'شقة' : 'Apartment'} ${u.unitNumber || i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                          </svg>
                        </div>
                      )}
                      {u.images?.length > 1 && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                          +{u.images.length - 1} {ar ? 'صورة' : 'img'}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-gray-900">{ar ? 'شقة' : 'Apartment'} {u.unitNumber || i + 1}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span>{u.area} م²</span>
                        {u.bedrooms && <span>{u.bedrooms} {ar ? 'غرف' : 'bed'}</span>}
                        {u.bathrooms && <span>{u.bathrooms} {ar ? 'حمام' : 'bath'}</span>}
                        {u.livingRooms && <span>{u.livingRooms} {ar ? 'صالة' : 'liv'}</span>}
                        {u.majlis && <span>{u.majlis} {ar ? 'مجلس' : 'maj'}</span>}
                        {u.parkingSpaces && <span>{u.parkingSpaces} {ar ? 'موقف' : 'park'}</span>}
                        {u.price && <span className="text-primary font-semibold">{u.price} ر.ع</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Card */}
          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm opacity-90">
                  {form.type === 'RENT'
                    ? (ar ? 'السعر الشهري' : 'Monthly Rent')
                    : (ar ? 'السعر' : 'Price')}
                </div>
                <div className="text-2xl md:text-3xl font-bold">
                  {form.price ? Number(form.price).toLocaleString() : '0'} ر.ع
                  {form.type === 'RENT' && <span className="text-lg font-semibold opacity-90">/{ar ? 'شهر' : 'month'}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 p-4 bg-gray-50 border-b border-gray-200">
              {ar ? 'موقع العقار' : 'Property Location'}
            </h2>
            {form.googleMapsUrl && (
              <div className="p-4 bg-gray-50 text-center border-b border-gray-200">
                <a
                  href={form.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {ar ? 'فتح موقع العقار في خرائط جوجل' : 'Open property location in Google Maps'}
                </a>
              </div>
            )}
            <div className="h-64 md:h-80 bg-gray-100">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
              />
            </div>
            {location && (
              <p className="p-4 bg-gray-50 text-sm text-gray-600 border-t border-gray-200">
                {ar ? 'الموقع:' : 'Location:'} {location}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
