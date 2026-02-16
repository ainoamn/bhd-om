/**
 * أداة توليد الوصف الدعائي للعقار تلقائياً
 * Auto-generates promotional property descriptions from form data
 */

import {
  MAIN_FEATURES,
  ADDITIONAL_FEATURES,
  NEARBY_LOCATIONS,
  FURNISHED_OPTIONS,
  BUILDING_AGE_OPTIONS,
  FACING_OPTIONS,
} from './propertyOptions';
import type { PropertyFormData } from '@/components/admin/PropertyForm';

function getFeatureLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = [...MAIN_FEATURES, ...ADDITIONAL_FEATURES].find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

function getNearbyLabel(key: string, lang: 'ar' | 'en'): string {
  const opt = NEARBY_LOCATIONS.find((o) => o.key === key);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : key;
}

function getFurnishedLabel(value: string, lang: 'ar' | 'en'): string {
  const opt = FURNISHED_OPTIONS.find((o) => o.value === value);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : '';
}

function getBuildingAgeLabel(value: string, lang: 'ar' | 'en'): string {
  const opt = BUILDING_AGE_OPTIONS.find((o) => o.value === value);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : '';
}

function getFacingLabel(value: string, lang: 'ar' | 'en'): string {
  const opt = FACING_OPTIONS.find((o) => o.value === value);
  return opt ? (lang === 'ar' ? opt.ar : opt.en) : '';
}

export function generatePropertyDescription(form: PropertyFormData): { descriptionAr: string; descriptionEn: string } {
  const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
  const isLand = form.propertyTypeAr === 'أرض';
  const isFarmChalet = form.propertyTypeAr === 'مزارع وشاليهات';
  const va = form.villaApartment;

  const typeAr = form.type === 'RENT' ? 'للإيجار' : form.type === 'SALE' ? 'للبيع' : 'للاستثمار';
  const typeEn = form.type === 'RENT' ? 'for rent' : form.type === 'SALE' ? 'for sale' : 'for investment';

  const locationAr = [form.areaAr, form.villageAr, form.stateAr, form.governorateAr].filter(Boolean).join(' - ');
  const locationEn = [form.areaEn, form.villageEn, form.stateEn, form.governorateEn].filter(Boolean).join(', ');

  const titleAr = form.titleAr || form.titleEn || 'عقار';
  const titleEn = form.titleEn || form.titleAr || 'Property';

  const priceStr = form.price && Number(form.price) > 0 ? `${Number(form.price).toLocaleString()} ر.ع` : '';
  const priceEn = form.price && Number(form.price) > 0 ? `${Number(form.price).toLocaleString()} OMR` : '';

  if (isMultiUnit) {
    const shops = form.multiUnitShops?.length || 0;
    const showrooms = form.multiUnitShowrooms?.length || 0;
    const apartments = form.multiUnitApartments?.length || 0;
    const totalArea = form.multiUnitTotalArea || '';

    const descriptionAr = [
      `مبنى ${typeAr} في ${locationAr || 'سلطنة عمان'}.`,
      totalArea ? `المساحة الإجمالية ${totalArea} متر مربع.` : '',
      shops ? `${shops} ${shops === 1 ? 'محل' : 'محل'}` : '',
      showrooms ? `${showrooms} ${showrooms === 1 ? 'معرض' : 'معرض'}` : '',
      apartments ? `${apartments} ${apartments === 1 ? 'شقة' : 'شقة'}` : '',
      'فرصة استثمارية مميزة في موقع استراتيجي.',
    ]
      .filter(Boolean)
      .join(' ');

    const descriptionEn = [
      `Building ${typeEn} in ${locationEn || 'Oman'}.`,
      totalArea ? `Total area ${totalArea} sqm.` : '',
      shops ? `${shops} shop(s)` : '',
      showrooms ? `${showrooms} showroom(s)` : '',
      apartments ? `${apartments} apartment(s)` : '',
      'Prime investment opportunity in a strategic location.',
    ]
      .filter(Boolean)
      .join(' ');

    return { descriptionAr, descriptionEn };
  }

  // أرض - Land
  if (isLand) {
    const areaAr = form.area && Number(form.area) > 0 ? `على مساحة ${form.area} متر مربع` : '';
    const areaEn = form.area && Number(form.area) > 0 ? `on ${form.area} square meters` : '';
    const facingAr = va?.facing ? getFacingLabel(va.facing, 'ar') : '';
    const facingEn = va?.facing ? getFacingLabel(va.facing, 'en') : '';
    const nearbyAr = va?.nearbyLocations?.length ? va.nearbyLocations.map((k) => getNearbyLabel(k, 'ar')).join('، ') : '';
    const nearbyEn = va?.nearbyLocations?.length ? va.nearbyLocations.map((k) => getNearbyLabel(k, 'en')).join(', ') : '';
    const subAr = form.propertySubTypeAr ? ` (${form.propertySubTypeAr})` : '';
    const subEn = form.propertySubTypeEn ? ` (${form.propertySubTypeEn})` : '';

    const descriptionAr = [
      `أرض${subAr} ${typeAr} بعنوان "${titleAr}".`,
      locationAr ? `تقع في ${locationAr}، سلطنة عمان.` : 'في موقع مميز بسلطنة عمان.',
      areaAr ? `${areaAr}.` : '',
      facingAr ? `واجهة ${facingAr}.` : '',
      nearbyAr ? `قريب من: ${nearbyAr}.` : '',
      priceStr ? `السعر: ${priceStr}.` : '',
      'للتواصل والاستفسار.',
    ]
      .filter(Boolean)
      .join(' ');

    const descriptionEn = [
      `Land${subEn} ${typeEn} titled "${titleEn}".`,
      locationEn ? `Located in ${locationEn}, Oman.` : 'In a prime location in Oman.',
      areaEn ? `${areaEn}.` : '',
      facingEn ? `${facingEn} facing.` : '',
      nearbyEn ? `Nearby: ${nearbyEn}.` : '',
      priceEn ? `Price: ${priceEn}.` : '',
      'Contact us for more information.',
    ]
      .filter(Boolean)
      .join(' ');

    return { descriptionAr, descriptionEn };
  }

  // مزارع وشاليهات - Farms and Chalets
  if (isFarmChalet) {
    const buildAreaAr = va?.buildingArea && Number(va.buildingArea) > 0 ? `مساحة بناء ${va.buildingArea} م²` : '';
    const buildAreaEn = va?.buildingArea && Number(va.buildingArea) > 0 ? `building area ${va.buildingArea} sqm` : '';
    const landAreaAr = va?.landArea && Number(va.landArea) > 0 ? `مساحة أرض ${va.landArea} م²` : '';
    const landAreaEn = va?.landArea && Number(va.landArea) > 0 ? `land area ${va.landArea} sqm` : '';
    const areaAr = form.area && Number(form.area) > 0 ? `مساحة ${form.area} م²` : '';
    const areaEn = form.area && Number(form.area) > 0 ? `area ${form.area} sqm` : '';
    const featAr: string[] = [];
    const featEn: string[] = [];
    (va?.mainFeatures ?? []).forEach((k) => { featAr.push(getFeatureLabel(k, 'ar')); featEn.push(getFeatureLabel(k, 'en')); });
    (va?.additionalFeatures ?? []).forEach((k) => { featAr.push(getFeatureLabel(k, 'ar')); featEn.push(getFeatureLabel(k, 'en')); });
    (va?.customMainFeatures ?? []).forEach((k) => { featAr.push(k); featEn.push(k); });
    (va?.customAdditionalFeatures ?? []).forEach((k) => { featAr.push(k); featEn.push(k); });
    const featuresAr = featAr.length ? featAr.join('، ') : '';
    const featuresEn = featEn.length ? featEn.join(', ') : '';
    const nearbyAr = va?.nearbyLocations?.length ? va.nearbyLocations.map((k) => getNearbyLabel(k, 'ar')).join('، ') : '';
    const nearbyEn = va?.nearbyLocations?.length ? va.nearbyLocations.map((k) => getNearbyLabel(k, 'en')).join(', ') : '';

    const descriptionAr = [
      `مزارع وشاليهات ${typeAr} بعنوان "${titleAr}".`,
      locationAr ? `يقع في ${locationAr}، سلطنة عمان.` : 'في موقع مميز بسلطنة عمان.',
      [buildAreaAr, landAreaAr, areaAr].filter(Boolean).join('، ') ? `${[buildAreaAr, landAreaAr, areaAr].filter(Boolean).join('، ')}.` : '',
      featuresAr ? `يتميز بـ: ${featuresAr}.` : '',
      nearbyAr ? `قريب من: ${nearbyAr}.` : '',
      priceStr ? `السعر: ${priceStr}.` : '',
      'للتواصل والاستفسار.',
    ]
      .filter(Boolean)
      .join(' ');

    const descriptionEn = [
      `Farms and Chalets ${typeEn} titled "${titleEn}".`,
      locationEn ? `Located in ${locationEn}, Oman.` : 'In a prime location in Oman.',
      [buildAreaEn, landAreaEn, areaEn].filter(Boolean).join(', ') ? `${[buildAreaEn, landAreaEn, areaEn].filter(Boolean).join(', ')}.` : '',
      featuresEn ? `Features: ${featuresEn}.` : '',
      nearbyEn ? `Nearby: ${nearbyEn}.` : '',
      priceEn ? `Price: ${priceEn}.` : '',
      'Contact us for more information.',
    ]
      .filter(Boolean)
      .join(' ');

    return { descriptionAr, descriptionEn };
  }

  // Single unit (فيلا، شقة، مبنى كامل، إلخ) - build rich description
  const specsAr: string[] = [];
  const specsEn: string[] = [];

  if (form.area && Number(form.area) > 0) {
    specsAr.push(`على مساحة ${form.area} متر مربع`);
    specsEn.push(`on ${form.area} square meters`);
  }

  if (form.propertyTypeAr === 'فيلا' || form.propertyTypeAr === 'شقة' || (form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'مبنى كامل')) {
    if (form.bedrooms && Number(form.bedrooms) > 0) {
      specsAr.push(`${form.bedrooms} ${Number(form.bedrooms) === 1 ? 'غرفة نوم' : 'غرف نوم'}`);
      specsEn.push(`${form.bedrooms} bedroom${Number(form.bedrooms) > 1 ? 's' : ''}`);
    }
    if (form.bathrooms && Number(form.bathrooms) > 0) {
      specsAr.push(`${form.bathrooms} ${Number(form.bathrooms) === 1 ? 'دورة مياه' : 'دورات مياه'}`);
      specsEn.push(`${form.bathrooms} bathroom${Number(form.bathrooms) > 1 ? 's' : ''}`);
    }
    if (form.livingRooms && Number(form.livingRooms) > 0) {
      specsAr.push(`${form.livingRooms} ${Number(form.livingRooms) === 1 ? 'صالة' : 'صالات'}`);
      specsEn.push(`${form.livingRooms} living room${Number(form.livingRooms) > 1 ? 's' : ''}`);
    }
    if (form.majlis && Number(form.majlis) > 0) {
      specsAr.push(`${form.majlis} ${Number(form.majlis) === 1 ? 'مجلس' : 'مجالس'}`);
      specsEn.push(`${form.majlis} majlis`);
    }
    if (form.parkingSpaces && Number(form.parkingSpaces) > 0) {
      specsAr.push(`${form.parkingSpaces} ${Number(form.parkingSpaces) === 1 ? 'موقف سيارات' : 'مواقف سيارات'}`);
      specsEn.push(`${form.parkingSpaces} parking space${Number(form.parkingSpaces) > 1 ? 's' : ''}`);
    }
  }

  // VillaApartment details (تكملة المواصفات - لا نكرر الغرف والحمامات إن وُجدت أعلاه)
  if (va) {
    if (va.roomCount && !form.bedrooms) {
      const roomLabel = va.roomCount === 'studio' ? 'ستوديو' : va.roomCount;
      specsAr.push(roomLabel === 'ستوديو' ? 'تصميم ستوديو' : `${roomLabel} غرفة`);
      specsEn.push(va.roomCount === 'studio' ? 'studio layout' : `${va.roomCount} room${va.roomCount !== '1' ? 's' : ''}`);
    }
    if (va.bathroomCount && !form.bathrooms) {
      specsAr.push(`${va.bathroomCount} حمام`);
      specsEn.push(`${va.bathroomCount} bathroom${Number(va.bathroomCount) > 1 ? 's' : ''}`);
    }
    if (va.furnished) {
      const furnishedAr = getFurnishedLabel(va.furnished, 'ar');
      const furnishedEn = getFurnishedLabel(va.furnished, 'en');
      if (furnishedAr) specsAr.push(furnishedAr);
      if (furnishedEn) specsEn.push(furnishedEn);
    }
    if (va.buildingArea && Number(va.buildingArea) > 0) {
      specsAr.push(`مساحة بناء ${va.buildingArea} م²`);
      specsEn.push(`building area ${va.buildingArea} sqm`);
    }
    if (va.landArea && Number(va.landArea) > 0) {
      specsAr.push(`مساحة أرض ${va.landArea} م²`);
      specsEn.push(`land area ${va.landArea} sqm`);
    }
    if (va.buildingAge) {
      const ageAr = getBuildingAgeLabel(va.buildingAge, 'ar');
      const ageEn = getBuildingAgeLabel(va.buildingAge, 'en');
      if (ageAr) specsAr.push(`عمر البناء: ${ageAr}`);
      if (ageEn) specsEn.push(`building age: ${ageEn}`);
    }
    if (va.facing) {
      const facingAr = getFacingLabel(va.facing, 'ar');
      const facingEn = getFacingLabel(va.facing, 'en');
      if (facingAr) specsAr.push(`واجهة ${facingAr}`);
      if (facingEn) specsEn.push(`${facingEn} facing`);
    }
  }

  const featuresAr: string[] = [];
  const featuresEn: string[] = [];
  if (va?.mainFeatures?.length) {
    va.mainFeatures.forEach((k) => {
      featuresAr.push(getFeatureLabel(k, 'ar'));
      featuresEn.push(getFeatureLabel(k, 'en'));
    });
  }
  if (va?.additionalFeatures?.length) {
    va.additionalFeatures.forEach((k) => {
      featuresAr.push(getFeatureLabel(k, 'ar'));
      featuresEn.push(getFeatureLabel(k, 'en'));
    });
  }
  if (va?.customMainFeatures?.length) {
    featuresAr.push(...va.customMainFeatures);
    featuresEn.push(...va.customMainFeatures);
  }
  if (va?.customAdditionalFeatures?.length) {
    featuresAr.push(...va.customAdditionalFeatures);
    featuresEn.push(...va.customAdditionalFeatures);
  }

  const nearbyAr: string[] = [];
  const nearbyEn: string[] = [];
  if (va?.nearbyLocations?.length) {
    va.nearbyLocations.forEach((k) => {
      nearbyAr.push(getNearbyLabel(k, 'ar'));
      nearbyEn.push(getNearbyLabel(k, 'en'));
    });
  }

  // Build Arabic description
  const introAr = `${form.propertyTypeAr} ${typeAr} بعنوان "${titleAr}"`;
  const locAr = locationAr ? `يقع العقار في ${locationAr}، سلطنة عمان.` : 'في موقع مميز في سلطنة عمان.';
  const specStrAr = specsAr.length > 0 ? `يتكون من ${specsAr.join('، ')}.` : '';
  const featStrAr = featuresAr.length > 0 ? `يتميز بـ: ${featuresAr.join('، ')}.` : '';
  const nearStrAr = nearbyAr.length > 0 ? `قريب من: ${nearbyAr.join('، ')}.` : '';
  const priceLineAr = priceStr ? `السعر: ${priceStr}.` : '';

  const descriptionAr = [introAr, locAr, specStrAr, featStrAr, nearStrAr, priceLineAr, 'للتواصل والاستفسار.']
    .filter(Boolean)
    .join(' ');

  // Build English description
  const introEn = `${form.propertyTypeEn} ${typeEn} titled "${titleEn}"`;
  const locEn = locationEn ? `Located in ${locationEn}, Oman.` : 'In a prime location in Oman.';
  const specStrEn = specsEn.length > 0 ? `Features ${specsEn.join(', ')}.` : '';
  const featStrEn = featuresEn.length > 0 ? `Amenities include: ${featuresEn.join(', ')}.` : '';
  const nearStrEn = nearbyEn.length > 0 ? `Nearby: ${nearbyEn.join(', ')}.` : '';
  const priceLineEn = priceEn ? `Price: ${priceEn}.` : '';

  const descriptionEn = [introEn, locEn, specStrEn, featStrEn, nearStrEn, priceLineEn, 'Contact us for more information.']
    .filter(Boolean)
    .join(' ');

  return { descriptionAr, descriptionEn };
}
