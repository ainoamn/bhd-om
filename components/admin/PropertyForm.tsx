'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import ImagePicker from './ImagePicker';
import TranslateField from './TranslateField';
import MultiUnitDataModal from './MultiUnitDataModal';
import VillaApartmentDetails, { emptyVillaApartment, type VillaApartmentFormData } from './VillaApartmentDetails';
import LandDetails from './LandDetails';
import PropertyFormReviewPreview from './PropertyFormReviewPreview';
import type { Property } from '@/lib/data/properties';
import { generatePropertyDescription } from '@/lib/propertyDescriptionGenerator';
import { omanLocations } from '@/lib/data/omanLocations';

const PROPERTY_TYPES: { ar: string; en: string }[] = [
  { ar: 'فيلا', en: 'Villa' },
  { ar: 'شقة', en: 'Apartment' },
  { ar: 'أرض', en: 'Land' },
  { ar: 'مبنى', en: 'Building' },
  { ar: 'محل', en: 'Shop' },
  { ar: 'معرض', en: 'Showroom' },
  { ar: 'مخزن', en: 'Warehouse' },
  { ar: 'مزارع وشاليهات', en: 'Farms and Chalets' },
];

const PROPERTY_SUB_TYPES: Record<string, { ar: string; en: string }[]> = {
  شقة: [
    { ar: 'سكني', en: 'Residential' },
    { ar: 'تجاري', en: 'Commercial' },
    { ar: 'سكني تجاري', en: 'Residential-Commercial' },
  ],
  أرض: [
    { ar: 'سكني', en: 'Residential' },
    { ar: 'تجاري', en: 'Commercial' },
    { ar: 'صناعي', en: 'Industrial' },
    { ar: 'سياحي', en: 'Tourism' },
    { ar: 'زراعي', en: 'Agricultural' },
    { ar: 'سكني تجاري', en: 'Residential-Commercial' },
  ],
  مبنى: [
    { ar: 'مبنى كامل', en: 'Full Building' },
    { ar: 'متعدد الوحدات', en: 'Multi-unit' },
  ],
};

const STEPS = [
  { id: 1, key: 'basic', labelAr: 'المعلومات الأساسية', labelEn: 'Basic Information', icon: 'home' },
  { id: 2, key: 'location', labelAr: 'الموقع والتفاصيل', labelEn: 'Location & Details', icon: 'information' },
  { id: 3, key: 'media', labelAr: 'الصور والفيديو', labelEn: 'Images & Video', icon: 'archive' },
  { id: 4, key: 'review', labelAr: 'المراجعة والحفظ', labelEn: 'Review & Save', icon: 'check' },
];

export interface PropertyFormData {
  titleAr: string;
  titleEn: string;
  landParcelNumber: string;
  propertyNumber: string;
  surveyMapNumber: string;
  descriptionAr: string;
  descriptionEn: string;
  type: 'RENT' | 'SALE' | 'INVESTMENT';
  propertyTypeAr: string;
  propertyTypeEn: string;
  propertySubTypeAr: string;
  propertySubTypeEn: string;
  governorateAr: string;
  governorateEn: string;
  stateAr: string;
  stateEn: string;
  areaAr: string;
  areaEn: string;
  villageAr: string;
  villageEn: string;
  googleMapsUrl: string;
  price: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  livingRooms: string;
  majlis: string;
  parkingSpaces: string;
  images: string[];
  videoUrl: string;
  unitCountShop: string;
  unitCountShowroom: string;
  unitCountApartment: string;
  multiUnitTotalArea: string;
  multiUnitShops: { unitNumber: string; price: string; area: string; images: string[] }[];
  multiUnitShowrooms: { unitNumber: string; price: string; area: string; images: string[] }[];
  multiUnitApartments: { unitNumber: string; price: string; area: string; bedrooms: string; bathrooms: string; livingRooms: string; majlis: string; parkingSpaces: string; images: string[] }[];
  villaApartment: VillaApartmentFormData;
}

const emptyForm: PropertyFormData = {
  titleAr: '',
  titleEn: '',
  landParcelNumber: '',
  propertyNumber: '',
  surveyMapNumber: '',
  descriptionAr: '',
  descriptionEn: '',
  type: 'RENT',
  propertyTypeAr: 'فيلا',
  propertyTypeEn: 'Villa',
  propertySubTypeAr: '',
  propertySubTypeEn: '',
  governorateAr: '',
  governorateEn: '',
  stateAr: '',
  stateEn: '',
  areaAr: '',
  areaEn: '',
  villageAr: '',
  villageEn: '',
  googleMapsUrl: '',
  price: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  livingRooms: '',
  majlis: '',
  parkingSpaces: '',
  images: [],
  videoUrl: '',
  unitCountShop: '',
  unitCountShowroom: '',
  unitCountApartment: '',
  multiUnitTotalArea: '',
  multiUnitShops: [],
  multiUnitShowrooms: [],
  multiUnitApartments: [],
  villaApartment: emptyVillaApartment,
};

interface PropertyFormProps {
  property?: Property | null;
  locale: string;
  onSubmit: (data: PropertyFormData, publish: boolean) => void;
  submitLabel: string;
  title: string;
  subtitle: string;
  /** عند النقر على "التالي" من خطوة معينة - إن رُجع false لا يُنتقل للخطوة التالية (مثلاً عند إنشاء مسودة والانتقال لصفحة التعديل) */
  onBeforeNextFromStep?: (step: number, form: PropertyFormData) => boolean | void;
  /** حفظ تلقائي كمسودة عند تغيير النموذج (للتحسب من الأخطاء التقنية) */
  onAutoSave?: (form: PropertyFormData) => void;
}

export default function PropertyForm({ property, locale, onSubmit, submitLabel, title, subtitle, onBeforeNextFromStep, onAutoSave }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyFormData>(emptyForm);
  const [step, setStep] = useState(1);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [modalMissingFields, setModalMissingFields] = useState<string[]>([]);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (property) {
      let typeAr = property.propertyTypeAr;
      let typeEn = property.propertyTypeEn;
      let subAr = (property as { propertySubTypeAr?: string }).propertySubTypeAr || '';
      let subEn = (property as { propertySubTypeEn?: string }).propertySubTypeEn || '';
      if (typeAr === 'أرض سكنية') {
        typeAr = 'أرض';
        typeEn = 'Land';
        subAr = subAr || 'سكني';
        subEn = subEn || 'Residential';
      } else if (typeAr === 'محل تجاري') {
        typeAr = 'محل';
        typeEn = 'Shop';
      } else if (typeAr === 'مكتب تجاري') {
        typeAr = 'مبنى';
        typeEn = 'Building';
      }
      setForm({
        titleAr: property.titleAr,
        titleEn: property.titleEn,
        landParcelNumber: (property as { landParcelNumber?: string }).landParcelNumber || '',
        propertyNumber: (property as { propertyNumber?: string }).propertyNumber || '',
        surveyMapNumber: (property as { surveyMapNumber?: string }).surveyMapNumber || '',
        descriptionAr: property.descriptionAr || '',
        descriptionEn: property.descriptionEn || '',
        type: property.type,
        propertyTypeAr: typeAr,
        propertyTypeEn: typeEn,
        propertySubTypeAr: subAr,
        propertySubTypeEn: subEn,
        governorateAr: property.governorateAr || '',
        governorateEn: property.governorateEn || '',
        stateAr: property.stateAr || '',
        stateEn: property.stateEn || '',
        areaAr: (property as { areaAr?: string }).areaAr || '',
        areaEn: (property as { areaEn?: string }).areaEn || '',
        villageAr: property.villageAr || '',
        villageEn: property.villageEn || '',
        googleMapsUrl: (property as { googleMapsUrl?: string }).googleMapsUrl || '',
        price: String(property.price),
        area: String(property.area || ''),
        bedrooms: String(property.bedrooms ?? ''),
        bathrooms: String(property.bathrooms ?? ''),
        livingRooms: String(property.livingRooms ?? ''),
        majlis: String(property.majlis ?? ''),
        parkingSpaces: String(property.parkingSpaces ?? ''),
        images: property.images?.length ? [...property.images] : property.image ? [property.image] : [],
        videoUrl: (property as { videoUrl?: string }).videoUrl || '',
        unitCountShop: String((property as { unitCountShop?: number }).unitCountShop ?? ''),
        unitCountShowroom: String((property as { unitCountShowroom?: number }).unitCountShowroom ?? ''),
        unitCountApartment: String((property as { unitCountApartment?: number }).unitCountApartment ?? ''),
        multiUnitTotalArea: String((property as { multiUnitTotalArea?: number }).multiUnitTotalArea ?? ''),
        multiUnitShops: (property as { multiUnitShops?: { unitNumber?: string; price: number; area: number; images?: string[] }[] }).multiUnitShops?.map((u) => ({ unitNumber: String(u.unitNumber ?? ''), price: String(u.price ?? ''), area: String(u.area ?? ''), images: u.images ?? [] })) ?? [],
        multiUnitShowrooms: (property as { multiUnitShowrooms?: { unitNumber?: string; price: number; area: number; images?: string[] }[] }).multiUnitShowrooms?.map((u) => ({ unitNumber: String(u.unitNumber ?? ''), price: String(u.price ?? ''), area: String(u.area ?? ''), images: u.images ?? [] })) ?? [],
        multiUnitApartments: (property as { multiUnitApartments?: { unitNumber?: string; price: number; area: number; bedrooms: number; bathrooms: number; livingRooms: number; majlis: number; parkingSpaces: number; images?: string[] }[] }).multiUnitApartments?.map((u) => ({
          unitNumber: String(u.unitNumber ?? ''),
          price: String(u.price ?? ''),
          area: String(u.area ?? ''),
          bedrooms: String(u.bedrooms ?? ''),
          bathrooms: String(u.bathrooms ?? ''),
          livingRooms: String(u.livingRooms ?? ''),
          majlis: String(u.majlis ?? ''),
          parkingSpaces: String(u.parkingSpaces ?? ''),
          images: u.images ?? [],
        })) ?? [],
        villaApartment: { ...emptyVillaApartment, ...(property as { villaApartment?: VillaApartmentFormData }).villaApartment },
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [property]);

  const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
  const shopCount = Math.max(0, Number(form.unitCountShop) || 0);
  const showroomCount = Math.max(0, Number(form.unitCountShowroom) || 0);
  const apartmentCount = Math.max(0, Number(form.unitCountApartment) || 0);

  useEffect(() => {
    if (!isMultiUnit) return;
    setForm((prev) => {
      const emptyShop = { unitNumber: '', price: '', area: '', images: [] as string[] };
      const emptyApartment = { unitNumber: '', price: '', area: '', bedrooms: '', bathrooms: '', livingRooms: '', majlis: '', parkingSpaces: '', images: [] as string[] };
      const shops = prev.multiUnitShops.slice(0, shopCount).map((s) => ({ ...emptyShop, ...s, images: s.images ?? [], unitNumber: s.unitNumber ?? '' }));
      while (shops.length < shopCount) shops.push({ ...emptyShop });
      const showrooms = prev.multiUnitShowrooms.slice(0, showroomCount).map((s) => ({ ...emptyShop, ...s, images: s.images ?? [], unitNumber: s.unitNumber ?? '' }));
      while (showrooms.length < showroomCount) showrooms.push({ ...emptyShop });
      const apartments = prev.multiUnitApartments.slice(0, apartmentCount).map((a) => ({ ...emptyApartment, ...a, images: a.images ?? [], unitNumber: a.unitNumber ?? '' }));
      while (apartments.length < apartmentCount) apartments.push({ ...emptyApartment });
      return { ...prev, multiUnitShops: shops, multiUnitShowrooms: showrooms, multiUnitApartments: apartments };
    });
  }, [isMultiUnit, shopCount, showroomCount, apartmentCount]);

  const ar = locale === 'ar';

  const isFieldValid = (fieldId: string): boolean => {
    if (fieldId === 'governorateAr') return !!form.governorateAr.trim();
    if (fieldId === 'stateAr') return !!form.stateAr.trim();
    if (fieldId === 'areaAr') return !!form.areaAr.trim();
    if (fieldId === 'multiUnitTotalArea') return !!(form.multiUnitTotalArea.trim() && Number(form.multiUnitTotalArea) > 0);
    if (fieldId === 'titleAr') return !!form.titleAr.trim();
    if (fieldId === 'titleEn') return !!form.titleEn.trim();
    if (fieldId === 'landParcelNumber') return !!form.landParcelNumber.trim();
    if (fieldId === 'propertySubTypeAr') return !!form.propertySubTypeAr.trim();
    if (fieldId === 'unitCounts') {
      const total = (Number(form.unitCountShop) || 0) + (Number(form.unitCountShowroom) || 0) + (Number(form.unitCountApartment) || 0);
      return total > 0;
    }
    if (fieldId === 'price') return !!(form.price.trim() && Number(form.price) > 0);
    if (fieldId === 'area') return !!form.area.trim();
    if (fieldId === 'bedrooms') return !!form.bedrooms.trim();
    if (fieldId === 'bathrooms') return !!form.bathrooms.trim();
    if (fieldId === 'livingRooms') return !!form.livingRooms.trim();
    if (fieldId === 'majlis') return !!form.majlis.trim();
    if (fieldId === 'parkingSpaces') return !!form.parkingSpaces.trim();
    if (fieldId === 'descriptionAr') return !!form.descriptionAr.trim();
    if (fieldId === 'descriptionEn') return !!form.descriptionEn.trim();
    if (fieldId === 'images') return form.images.length >= 1;
    const shopM = fieldId.match(/^shop-(\d+)$/);
    if (shopM) {
      const i = parseInt(shopM[1], 10);
      const u = form.multiUnitShops[i];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0);
    }
    const showM = fieldId.match(/^showroom-(\d+)$/);
    if (showM) {
      const i = parseInt(showM[1], 10);
      const u = form.multiUnitShowrooms[i];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0);
    }
    const aptM = fieldId.match(/^apartment-(\d+)$/);
    if (aptM) {
      const i = parseInt(aptM[1], 10);
      const u = form.multiUnitApartments[i];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0 &&
        u.bedrooms?.trim() !== '' && u.bathrooms?.trim() !== '' && u.livingRooms?.trim() !== '' &&
        u.majlis?.trim() !== '' && u.parkingSpaces?.trim() !== '');
    }
    return false;
  };

  const fieldHighlight = (fieldId: string) => {
    if (!highlightedFields.has(fieldId)) return '';
    return isFieldValid(fieldId) ? 'ring-2 ring-green-500 border-green-500 bg-green-50' : 'ring-2 ring-red-500 border-red-500 bg-red-50';
  };

  const labelsToFieldIds = (labels: string[]): Set<string> => {
    const ids = new Set<string>();
    const gov = ar ? 'المحافظة' : 'Governorate';
    const state = ar ? 'الولاية' : 'State';
    const area = ar ? 'المنطقة' : 'Area';
    const totalArea = ar ? /المساحة الإجمالية/ : /Total area|Total building/;
    const shopRe = ar ? /محل\s*(\d+)/ : /Shop\s*(\d+)/;
    const showroomRe = ar ? /معرض\s*(\d+)/ : /Showroom\s*(\d+)/;
    const aptRe = ar ? /شقة\s*(\d+)/ : /Apartment\s*(\d+)/;
    const price = ar ? 'السعر' : 'Price';
    const descAr = ar ? 'الوصف بالعربية' : 'Description (Arabic)';
    const descEn = ar ? 'الوصف بالإنجليزية' : 'Description (English)';
    const images = ar ? 'الصور' : 'Images';
    labels.forEach((l) => {
      if (l.includes(gov) || l === gov) ids.add('governorateAr');
      if (l.includes(state) || l === state) ids.add('stateAr');
      if (l.includes(area) && !totalArea.test(l)) ids.add('areaAr');
      if (totalArea.test(l)) ids.add('multiUnitTotalArea');
      const shopM = l.match(shopRe);
      if (shopM) ids.add(`shop-${parseInt(shopM[1], 10) - 1}`);
      const showM = l.match(showroomRe);
      if (showM) ids.add(`showroom-${parseInt(showM[1], 10) - 1}`);
      const aptM = l.match(aptRe);
      if (aptM) ids.add(`apartment-${parseInt(aptM[1], 10) - 1}`);
      if (l.includes(price) && !shopRe.test(l) && !showroomRe.test(l) && !aptRe.test(l)) ids.add('price');
      if (l === (ar ? 'المساحة' : 'Area') || (l.includes(ar ? 'المساحة' : 'Area') && !totalArea.test(l) && !shopRe.test(l) && !aptRe.test(l))) ids.add('area');
      if (l.includes(ar ? 'غرف النوم' : 'Bedrooms')) ids.add('bedrooms');
      if (l.includes(ar ? 'الحمامات' : 'Bathrooms')) ids.add('bathrooms');
      if (l.includes(ar ? 'الصالات' : 'Living Rooms')) ids.add('livingRooms');
      if (l.includes(ar ? 'المجالس' : 'Majlis')) ids.add('majlis');
      if (l.includes(ar ? 'مواقف السيارات' : 'Parking')) ids.add('parkingSpaces');
      if (l.includes(descAr) || l === descAr) ids.add('descriptionAr');
      if (l.includes(descEn) || l === descEn) ids.add('descriptionEn');
      if (l.includes(images)) ids.add('images');
      if (l.includes(ar ? 'العنوان بالعربية' : 'Title (Arabic)')) ids.add('titleAr');
      if (l.includes(ar ? 'العنوان بالإنجليزية' : 'Title (English)')) ids.add('titleEn');
      if (l.includes(ar ? 'رقم قطعة الأرض' : 'Land Parcel Number')) ids.add('landParcelNumber');
      if (l.includes(ar ? 'نوع العقار الفرعي' : 'Property Sub-type')) ids.add('propertySubTypeAr');
      if (l.includes(ar ? 'عدد الوحدات' : 'Unit counts')) ids.add('unitCounts');
    });
    return ids;
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (step === 1) {
      if (!form.titleAr.trim()) missing.push(ar ? 'العنوان بالعربية' : 'Title (Arabic)');
      if (!form.titleEn.trim()) missing.push(ar ? 'العنوان بالإنجليزية' : 'Title (English)');
      if (!form.landParcelNumber.trim()) missing.push(ar ? 'رقم قطعة الأرض' : 'Land Parcel Number');
      const needsSubType = ['شقة', 'أرض', 'مبنى'].includes(form.propertyTypeAr);
      if (needsSubType && !form.propertySubTypeAr.trim()) {
        missing.push(ar ? 'نوع العقار الفرعي' : 'Property Sub-type');
      }
      const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
      if (isMultiUnit) {
        const total = (Number(form.unitCountShop) || 0) + (Number(form.unitCountShowroom) || 0) + (Number(form.unitCountApartment) || 0);
        if (total <= 0) {
          missing.push(ar ? 'عدد الوحدات (محل / معرض / شقة)' : 'Unit counts (Shop / Showroom / Apartment)');
        }
      }
    }
    if (step === 2) {
      if (!form.governorateAr.trim()) missing.push(ar ? 'المحافظة' : 'Governorate');
      if (!form.stateAr.trim()) missing.push(ar ? 'الولاية' : 'State');
      if (!form.areaAr.trim()) missing.push(ar ? 'المنطقة' : 'Area');
      if (isMultiUnit) {
        if (!form.multiUnitTotalArea.trim() || Number(form.multiUnitTotalArea) <= 0) missing.push(ar ? 'المساحة الإجمالية للمبنى' : 'Total building area');
        form.multiUnitShops.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0) missing.push(`${ar ? 'محل' : 'Shop'} ${i + 1}: ${ar ? 'السعر' : 'Price'}`);
          if (!u.area.trim() || Number(u.area) <= 0) missing.push(`${ar ? 'محل' : 'Shop'} ${i + 1}: ${ar ? 'المساحة' : 'Area'}`);
        });
        form.multiUnitShowrooms.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0) missing.push(`${ar ? 'معرض' : 'Showroom'} ${i + 1}: ${ar ? 'السعر' : 'Price'}`);
          if (!u.area.trim() || Number(u.area) <= 0) missing.push(`${ar ? 'معرض' : 'Showroom'} ${i + 1}: ${ar ? 'المساحة' : 'Area'}`);
        });
        form.multiUnitApartments.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0) missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'السعر' : 'Price'}`);
          if (!u.area.trim() || Number(u.area) <= 0) missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'المساحة' : 'Area'}`);
          if (u.bedrooms.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'غرف النوم' : 'Bedrooms'}`);
          if (u.bathrooms.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'الحمامات' : 'Bathrooms'}`);
          if (u.livingRooms.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'الصالات' : 'Living Rooms'}`);
          if (u.majlis.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'المجالس' : 'Majlis'}`);
          if (u.parkingSpaces.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}: ${ar ? 'مواقف السيارات' : 'Parking'}`);
        });
      } else {
        if (!form.price.trim() || Number(form.price) <= 0) missing.push(ar ? 'السعر' : 'Price');
        const isFarmsChalets = form.propertyTypeAr === 'مزارع وشاليهات';
        const isLand = form.propertyTypeAr === 'أرض';
        if (!isFarmsChalets) {
          if (form.area.trim() === '') missing.push(ar ? 'المساحة' : 'Area');
        }
        if (!isFarmsChalets && !isLand) {
          if (form.bedrooms.trim() === '') missing.push(ar ? 'غرف النوم' : 'Bedrooms');
          if (form.bathrooms.trim() === '') missing.push(ar ? 'الحمامات' : 'Bathrooms');
          if (form.livingRooms.trim() === '') missing.push(ar ? 'الصالات' : 'Living Rooms');
          if (form.majlis.trim() === '') missing.push(ar ? 'المجالس' : 'Majlis');
          if (form.parkingSpaces.trim() === '') missing.push(ar ? 'مواقف السيارات' : 'Parking');
        }
      }
      if (!form.descriptionAr.trim()) missing.push(ar ? 'الوصف بالعربية' : 'Description (Arabic)');
      if (!form.descriptionEn.trim()) missing.push(ar ? 'الوصف بالإنجليزية' : 'Description (English)');
    }
    if (step === 3) {
      if (form.images.length < 1) missing.push(ar ? 'الصور (صورة واحدة على الأقل)' : 'Images (at least one)');
    }
    return missing;
  };

  const missingFields = getMissingFields();
  const canProceedCurrentStep = missingFields.length === 0;

  const handleSubmit = (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault();
    if (step < 4) {
      if (!canProceedCurrentStep) {
        setModalMissingFields(missingFields);
        setShowMissingModal(true);
        return;
      }
      const prevent = onBeforeNextFromStep?.(step, form);
      if (prevent === false) return;
      setShowMissingModal(false);
      setHighlightedFields(new Set());
      setStep(step + 1);
    } else {
      onSubmit(form, publish ?? false);
    }
  };

  const getMissingFieldsForStep = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 1) {
      if (!form.titleAr.trim()) missing.push(ar ? 'العنوان بالعربية' : 'Title (Arabic)');
      if (!form.titleEn.trim()) missing.push(ar ? 'العنوان بالإنجليزية' : 'Title (English)');
      if (!form.landParcelNumber.trim()) missing.push(ar ? 'رقم قطعة الأرض' : 'Land Parcel Number');
      const needsSubType = ['شقة', 'أرض', 'مبنى'].includes(form.propertyTypeAr);
      if (needsSubType && !form.propertySubTypeAr.trim()) {
        missing.push(ar ? 'نوع العقار الفرعي' : 'Property Sub-type');
      }
      const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
      if (isMultiUnit) {
        const total = (Number(form.unitCountShop) || 0) + (Number(form.unitCountShowroom) || 0) + (Number(form.unitCountApartment) || 0);
        if (total <= 0) {
          missing.push(ar ? 'عدد الوحدات' : 'Unit counts');
        }
      }
    }
    if (s === 2) {
      const isMU = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
      if (!form.governorateAr.trim()) missing.push(ar ? 'المحافظة' : 'Governorate');
      if (!form.stateAr.trim()) missing.push(ar ? 'الولاية' : 'State');
      if (!form.areaAr.trim()) missing.push(ar ? 'المنطقة' : 'Area');
      if (isMU) {
        if (!form.multiUnitTotalArea.trim() || Number(form.multiUnitTotalArea) <= 0) missing.push(ar ? 'المساحة الإجمالية' : 'Total area');
        form.multiUnitShops.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0 || !u.area.trim() || Number(u.area) <= 0) missing.push(`${ar ? 'محل' : 'Shop'} ${i + 1}`);
        });
        form.multiUnitShowrooms.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0 || !u.area.trim() || Number(u.area) <= 0) missing.push(`${ar ? 'معرض' : 'Showroom'} ${i + 1}`);
        });
        form.multiUnitApartments.forEach((u, i) => {
          if (!u.price.trim() || Number(u.price) <= 0 || !u.area.trim() || u.bedrooms.trim() === '' || u.bathrooms.trim() === '' || u.livingRooms.trim() === '' || u.majlis.trim() === '' || u.parkingSpaces.trim() === '') missing.push(`${ar ? 'شقة' : 'Apartment'} ${i + 1}`);
        });
      } else {
        if (!form.price.trim() || Number(form.price) <= 0) missing.push(ar ? 'السعر' : 'Price');
        const isFarmsChalets = form.propertyTypeAr === 'مزارع وشاليهات';
        const isLand = form.propertyTypeAr === 'أرض';
        if (!isFarmsChalets) {
          if (form.area.trim() === '') missing.push(ar ? 'المساحة' : 'Area');
        }
        if (!isFarmsChalets && !isLand) {
          if (form.bedrooms.trim() === '') missing.push(ar ? 'غرف النوم' : 'Bedrooms');
          if (form.bathrooms.trim() === '') missing.push(ar ? 'الحمامات' : 'Bathrooms');
          if (form.livingRooms.trim() === '') missing.push(ar ? 'الصالات' : 'Living Rooms');
          if (form.majlis.trim() === '') missing.push(ar ? 'المجالس' : 'Majlis');
          if (form.parkingSpaces.trim() === '') missing.push(ar ? 'مواقف السيارات' : 'Parking');
        }
      }
      if (!form.descriptionAr.trim()) missing.push(ar ? 'الوصف بالعربية' : 'Description (Arabic)');
      if (!form.descriptionEn.trim()) missing.push(ar ? 'الوصف بالإنجليزية' : 'Description (English)');
    }
    if (s === 3) {
      if (form.images.length < 1) missing.push(ar ? 'الصور' : 'Images');
    }
    return missing;
  };

  const allMissingForPublish = step === 4 ? [1, 2, 3].flatMap((s) => getMissingFieldsForStep(s)) : missingFields;

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onAutoSave || !property) return;
    autoSaveTimerRef.current = setTimeout(() => {
      onAutoSave(form);
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, property, onAutoSave]);

  const goToStep = (s: number) => {
    if (s < 1 || s > 4) return;
    if (s > step) {
      const allMissing: string[] = [];
      for (let i = step; i < s; i++) {
        allMissing.push(...getMissingFieldsForStep(i));
      }
      if (allMissing.length > 0) {
        setModalMissingFields(allMissing);
        setShowMissingModal(true);
        return;
      }
    }
    setShowMissingModal(false);
    setHighlightedFields(new Set());
    setStep(s);
  };

  return (
    <div className="property-form-steps">
      {/* Modal النواقص */}
      {showMissingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setShowMissingModal(false);
            setHighlightedFields(labelsToFieldIds(modalMissingFields));
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {ar ? 'بيانات ناقصة' : 'Missing Data'}
                </h3>
                <p className="text-sm text-gray-500">
                  {ar ? 'يرجى إكمال الحقول التالية قبل الانتقال:' : 'Please complete the following fields before proceeding:'}
                </p>
              </div>
            </div>
            <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {modalMissingFields.map((field) => (
                <li key={field} className="flex items-center gap-2 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setShowMissingModal(false);
                setHighlightedFields(labelsToFieldIds(modalMissingFields));
              }}
              className="w-full admin-btn-primary"
            >
              {ar ? 'حسناً' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        <Link href={`/${locale}/admin/properties`} className="admin-btn-secondary inline-flex items-center gap-2 w-fit">
          <Icon name="chevronLeft" className="w-5 h-5" />
          {ar ? 'رجوع' : 'Back'}
        </Link>
      </div>

      {/* Step Indicator - مكتمل: أخضر، الحالي: أساسي، المتبقي: أحمر */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => goToStep(s.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all min-h-[44px] touch-manipulation ${
                  step > s.id
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                    : step === s.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                }`}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step === s.id ? 'bg-white/25' : step > s.id ? 'bg-white/25' : ''}`}>
                  {s.id}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {ar ? s.labelAr : s.labelEn}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 flex-shrink-0 mx-1 rounded ${step > s.id ? 'bg-emerald-400' : 'bg-red-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="property-form-step animate-fadeIn">
            <div className="admin-card shadow-lg border-0">
              <div className="admin-card-header bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="admin-card-title text-xl">
                  {ar ? 'المعلومات الأساسية' : 'Basic Information'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ar ? 'أدخل العنوان ونوع العقار' : 'Enter title and property type'}
                </p>
              </div>
              <div className="admin-card-body space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={highlightedFields.has('titleAr') ? `rounded-lg p-3 -m-3 ${isFieldValid('titleAr') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}>
                    <TranslateField
                      value={form.titleAr}
                      onChange={(v) => setForm({ ...form, titleAr: v })}
                      label={ar ? 'العنوان بالعربية' : 'Title (Arabic)'}
                      placeholder={ar ? 'مثال: فيلا فاخرة في الخوض' : 'e.g. Luxury Villa in Al Khoudh'}
                      required
                      locale={locale}
                      sourceValue={form.titleEn}
                      onTranslateFromSource={(v) => setForm({ ...form, titleEn: v })}
                      translateFrom="en"
                    />
                  </div>
                  <div className={highlightedFields.has('titleEn') ? `rounded-lg p-3 -m-3 ${isFieldValid('titleEn') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}>
                    <TranslateField
                      value={form.titleEn}
                      onChange={(v) => setForm({ ...form, titleEn: v })}
                      label={ar ? 'العنوان بالإنجليزية' : 'Title (English)'}
                      placeholder="Luxury Villa in Al Khoudh"
                      locale={locale}
                      sourceValue={form.titleAr}
                      onTranslateFromSource={(v) => setForm({ ...form, titleAr: v })}
                      translateFrom="ar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={highlightedFields.has('landParcelNumber') ? `rounded-lg p-3 -m-3 ${isFieldValid('landParcelNumber') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}>
                    <label className="admin-input-label">
                      {ar ? 'رقم قطعة الأرض' : 'Land Parcel Number'}
                      <span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={form.landParcelNumber}
                      onChange={(e) => setForm({ ...form, landParcelNumber: e.target.value })}
                      className={`admin-input w-full ${fieldHighlight('landParcelNumber')}`}
                      placeholder={ar ? 'مثال: 1234' : 'e.g. 1234'}
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">
                      {ar ? 'رقم العقار' : 'Property Number'}
                    </label>
                    <input
                      type="text"
                      value={form.propertyNumber}
                      onChange={(e) => setForm({ ...form, propertyNumber: e.target.value })}
                      className="admin-input w-full"
                      placeholder={ar ? 'اختياري' : 'Optional'}
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">
                      {ar ? 'رقم الرسم المساحي (الكروركي)' : 'Survey Map Number (Cadastral)'}
                    </label>
                    <input
                      type="text"
                      value={form.surveyMapNumber}
                      onChange={(e) => setForm({ ...form, surveyMapNumber: e.target.value })}
                      className="admin-input w-full"
                      placeholder={ar ? 'اختياري' : 'Optional'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="admin-input-label">{ar ? 'نوع العرض' : 'Type'}</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'RENT' | 'SALE' | 'INVESTMENT' })}
                      className="admin-select w-full"
                    >
                      <option value="RENT">{ar ? 'للإيجار' : 'Rent'}</option>
                      <option value="SALE">{ar ? 'للبيع' : 'Sale'}</option>
                      <option value="INVESTMENT">{ar ? 'للاستثمار' : 'Investment'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'نوع العقار' : 'Property Type'}</label>
                    <select
                      value={form.propertyTypeAr}
                      onChange={(e) => {
                        const typeAr = e.target.value;
                        const typeEn = PROPERTY_TYPES.find((t) => t.ar === typeAr)?.en || '';
                        const hasSubTypes = typeAr in PROPERTY_SUB_TYPES;
                        setForm({
                          ...form,
                          propertyTypeAr: typeAr,
                          propertyTypeEn: typeEn,
                          propertySubTypeAr: hasSubTypes ? '' : form.propertySubTypeAr,
                          propertySubTypeEn: hasSubTypes ? '' : form.propertySubTypeEn,
                          unitCountShop: '',
                          unitCountShowroom: '',
                          unitCountApartment: '',
                        });
                      }}
                      className="admin-select w-full"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.ar} value={t.ar}>
                          {ar ? t.ar : t.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.propertyTypeAr in PROPERTY_SUB_TYPES && (
                    <div>
                      <label className="admin-input-label">
                        {ar ? 'نوع العقار الفرعي' : 'Property Sub-type'}
                        {['شقة', 'أرض', 'مبنى'].includes(form.propertyTypeAr) && ' *'}
                      </label>
                      <select
                        value={form.propertySubTypeAr}
                        className={`admin-select w-full ${fieldHighlight('propertySubTypeAr')}`}
                        onChange={(e) => {
                          const subAr = e.target.value;
                          const subEn = PROPERTY_SUB_TYPES[form.propertyTypeAr]?.find((s) => s.ar === subAr)?.en || '';
                          const isMultiUnit = form.propertyTypeAr === 'مبنى' && subAr === 'متعدد الوحدات';
                          setForm({
                            ...form,
                            propertySubTypeAr: subAr,
                            propertySubTypeEn: subEn,
                            ...(isMultiUnit ? {} : { unitCountShop: '', unitCountShowroom: '', unitCountApartment: '' }),
                          });
                        }}
                      >
                        <option value="">{ar ? 'اختر النوع الفرعي' : 'Select sub-type'}</option>
                        {PROPERTY_SUB_TYPES[form.propertyTypeAr]?.map((s) => (
                          <option key={s.ar} value={s.ar}>
                            {ar ? s.ar : s.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات' && (
                    <div
                      className={`md:col-span-2 p-4 rounded-xl border ${
                        highlightedFields.has('unitCounts')
                          ? isFieldValid('unitCounts') ? 'bg-green-50 border-green-400 ring-2 ring-green-300' : 'bg-red-50 border-red-400 ring-2 ring-red-300'
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        {ar ? 'عدد الوحدات' : 'Unit Counts'}
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">
                        {ar ? 'أدخل عدد كل نوع من الوحدات في المبنى' : 'Enter the number of each unit type in the building'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="admin-input-label">{ar ? 'عدد المحلات' : 'Shops'}</label>
                          <input
                            type="number"
                            min="0"
                            value={form.unitCountShop}
                            onChange={(e) => setForm({ ...form, unitCountShop: e.target.value })}
                            className="admin-input"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="admin-input-label">{ar ? 'عدد المعارض' : 'Showrooms'}</label>
                          <input
                            type="number"
                            min="0"
                            value={form.unitCountShowroom}
                            onChange={(e) => setForm({ ...form, unitCountShowroom: e.target.value })}
                            className="admin-input"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="admin-input-label">{ar ? 'عدد الشقق' : 'Apartments'}</label>
                          <input
                            type="number"
                            min="0"
                            value={form.unitCountApartment}
                            onChange={(e) => setForm({ ...form, unitCountApartment: e.target.value })}
                            className="admin-input"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Details */}
        {step === 2 && (
          <div className="property-form-step animate-fadeIn">
            <div className="admin-card shadow-lg border-0">
              <div className="admin-card-header bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="admin-card-title text-xl">
                  {ar ? 'الموقع والتفاصيل' : 'Location & Details'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ar ? 'حدد الموقع والمواصفات والسعر والوصف' : 'Specify location, specifications, price and description'}
                </p>
              </div>
              <div className="admin-card-body space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="admin-input-label">{ar ? 'المحافظة' : 'Governorate'}</label>
                    <select
                      value={form.governorateAr}
                      onChange={(e) => {
                        const g = omanLocations.find((x) => x.ar === e.target.value);
                        setForm({
                          ...form,
                          governorateAr: e.target.value,
                          governorateEn: g?.en || '',
                          stateAr: '',
                          stateEn: '',
                          areaAr: '',
                          areaEn: '',
                          villageAr: '',
                          villageEn: '',
                        });
                      }}
                      className={`admin-select w-full ${fieldHighlight('governorateAr')}`}
                    >
                      <option value="">{ar ? 'اختر المحافظة' : 'Select'}</option>
                      {omanLocations.map((g) => (
                        <option key={g.ar} value={g.ar}>{g.ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'الولاية' : 'State'}</label>
                    <select
                      value={form.stateAr}
                      onChange={(e) => {
                        const gov = omanLocations.find((x) => x.ar === form.governorateAr);
                        const s = gov?.states.find((st) => st.ar === e.target.value);
                        setForm({
                          ...form,
                          stateAr: e.target.value,
                          stateEn: s?.en || e.target.value,
                          areaAr: '',
                          areaEn: '',
                          villageAr: '',
                          villageEn: '',
                        });
                      }}
                      className={`admin-select w-full ${fieldHighlight('stateAr')}`}
                      disabled={!form.governorateAr}
                    >
                      <option value="">{ar ? 'اختر الولاية' : 'Select state'}</option>
                      {omanLocations
                        .find((g) => g.ar === form.governorateAr)
                        ?.states.map((s) => (
                          <option key={s.ar} value={s.ar}>{s.ar}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'المنطقة' : 'Area'}</label>
                    <select
                      value={form.areaAr}
                      onChange={(e) => setForm({ ...form, areaAr: e.target.value, areaEn: e.target.value })}
                      className={`admin-select w-full ${fieldHighlight('areaAr')}`}
                      disabled={!form.stateAr}
                    >
                      <option value="">{ar ? 'اختر المنطقة' : 'Select area'}</option>
                      {omanLocations
                        .find((g) => g.ar === form.governorateAr)
                        ?.states.find((s) => s.ar === form.stateAr)
                        ?.villages.map((v) => (
                          <option key={v.ar} value={v.ar}>{v.ar}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'القرية / الحي' : 'Village / Neighborhood'}</label>
                    <input
                      type="text"
                      value={form.villageAr}
                      onChange={(e) => setForm({ ...form, villageAr: e.target.value, villageEn: e.target.value })}
                      className="admin-input w-full"
                      placeholder={ar ? 'مثال: حي النهضة، شارع السلطان' : 'e.g. Al Nahda, Sultan St'}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-input-label">{ar ? 'رابط موقع العقار في خرائط جوجل' : 'Google Maps URL'}</label>
                  <input
                    type="url"
                    value={form.googleMapsUrl}
                    onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
                    className="admin-input w-full"
                    placeholder="https://www.google.com/maps/place/..."
                    dir="ltr"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {ar ? 'سيظهر هذا الرابط في صفحة العقار لفتح الموقع في خرائط جوجل' : 'This link will appear on the property page to open the location in Google Maps'}
                  </p>
                </div>

                {isMultiUnit ? (
                  <>
                    <div>
                      <label className="admin-input-label">{ar ? 'المساحة الإجمالية للمبنى (م²)' : 'Total Building Area (m²)'} *</label>
                      <input
                        type="number"
                        min="0"
                        value={form.multiUnitTotalArea}
                        onChange={(e) => setForm({ ...form, multiUnitTotalArea: e.target.value })}
                        className={`admin-input max-w-xs ${fieldHighlight('multiUnitTotalArea')}`}
                        placeholder="1000"
                      />
                    </div>

                    <div
                      className={`p-4 rounded-xl border transition-colors ${
                        (() => {
                          const unitIds = [...highlightedFields].filter((id) => id.startsWith('shop-') || id.startsWith('showroom-') || id.startsWith('apartment-'));
                          if (unitIds.length === 0) return 'bg-primary/5 border-primary/20';
                          const allValid = unitIds.every((id) => isFieldValid(id));
                          return allValid ? 'bg-green-50 border-green-400 ring-2 ring-green-300' : 'bg-red-50 border-red-400 ring-2 ring-red-300';
                        })()
                      }`}
                    >
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {ar ? 'بيانات الوحدات' : 'Unit Data'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {ar
                          ? 'أدخل بيانات كل وحدة (محلات، معارض، شقق) في جدول منظم. يمكنك نسخ بيانات الوحدة السابقة لتسريع الإدخال.'
                          : 'Enter data for each unit (shops, showrooms, apartments) in an organized table. You can copy from the previous unit to speed up entry.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowUnitModal(true)}
                        className="inline-flex items-center gap-2 admin-btn-primary"
                      >
                        <Icon name="archive" className="w-5 h-5" />
                        {ar ? 'إدارة بيانات الوحدات' : 'Manage Unit Data'}
                        {(form.multiUnitShops.length + form.multiUnitShowrooms.length + form.multiUnitApartments.length) > 0 && (
                          <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
                            {form.multiUnitShops.length + form.multiUnitShowrooms.length + form.multiUnitApartments.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <MultiUnitDataModal
                      open={showUnitModal}
                      onClose={() => setShowUnitModal(false)}
                      locale={locale}
                      shops={form.multiUnitShops}
                      showrooms={form.multiUnitShowrooms}
                      apartments={form.multiUnitApartments}
                      highlightedUnitIds={highlightedFields}
                      onSave={(shops, showrooms, apartments) => {
                        setForm((prev) => ({
                          ...prev,
                          multiUnitShops: shops,
                          multiUnitShowrooms: showrooms,
                          multiUnitApartments: apartments,
                        }));
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div className={`grid gap-4 ${(form.propertyTypeAr === 'فيلا' || form.propertyTypeAr === 'شقة' || (form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'مبنى كامل')) ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      <div>
                        <label className="admin-input-label">{ar ? 'السعر (ر.ع)' : 'Price (OMR)'} *</label>
                        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`admin-input ${fieldHighlight('price')}`} placeholder="1200" required />
                      </div>
                      {form.propertyTypeAr !== 'مزارع وشاليهات' && (
                        <div>
                          <label className="admin-input-label">{ar ? 'المساحة (م²)' : 'Area (m²)'}</label>
                          <input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={`admin-input ${fieldHighlight('area')}`} placeholder="350" />
                        </div>
                      )}
                      {(form.propertyTypeAr === 'فيلا' || form.propertyTypeAr === 'شقة' || (form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'مبنى كامل')) && (
                        <>
                          <div>
                            <label className="admin-input-label">{ar ? 'غرف النوم' : 'Bedrooms'}</label>
                            <input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className={`admin-input ${fieldHighlight('bedrooms')}`} placeholder="4" />
                          </div>
                          <div>
                            <label className="admin-input-label">{ar ? 'الحمامات' : 'Bathrooms'}</label>
                            <input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className={`admin-input ${fieldHighlight('bathrooms')}`} placeholder="3" />
                          </div>
                          <div>
                            <label className="admin-input-label">{ar ? 'الصالات' : 'Living Rooms'}</label>
                            <input type="number" value={form.livingRooms} onChange={(e) => setForm({ ...form, livingRooms: e.target.value })} className={`admin-input ${fieldHighlight('livingRooms')}`} placeholder="1" />
                          </div>
                          <div>
                            <label className="admin-input-label">{ar ? 'المجالس' : 'Majlis'}</label>
                            <input type="number" value={form.majlis} onChange={(e) => setForm({ ...form, majlis: e.target.value })} className={`admin-input ${fieldHighlight('majlis')}`} placeholder="1" />
                          </div>
                          <div>
                            <label className="admin-input-label">{ar ? 'مواقف السيارات' : 'Parking'}</label>
                            <input type="number" value={form.parkingSpaces} onChange={(e) => setForm({ ...form, parkingSpaces: e.target.value })} className={`admin-input ${fieldHighlight('parkingSpaces')}`} placeholder="2" />
                          </div>
                        </>
                      )}
                    </div>

                    {(form.propertyTypeAr === 'فيلا' || form.propertyTypeAr === 'شقة' || form.propertyTypeAr === 'مزارع وشاليهات' || (form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'مبنى كامل')) && (
                      <VillaApartmentDetails
                        data={form.villaApartment}
                        onChange={(villaApartment) => setForm({ ...form, villaApartment })}
                        locale={locale}
                        hideFloorCount={form.propertyTypeAr === 'مزارع وشاليهات'}
                      />
                    )}
                    {form.propertyTypeAr === 'أرض' && (
                      <LandDetails
                        data={form.villaApartment}
                        onChange={(villaApartment) => setForm({ ...form, villaApartment })}
                        locale={locale}
                      />
                    )}
                  </>
                )}

                <div className={`space-y-2 ${highlightedFields.has('descriptionAr') ? `rounded-lg p-3 -m-3 ${isFieldValid('descriptionAr') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="admin-input-label">{ar ? 'الوصف بالعربية' : 'Description (Arabic)'}</label>
                    <button
                      type="button"
                      onClick={() => {
                        const { descriptionAr, descriptionEn } = generatePropertyDescription(form);
                        setForm({ ...form, descriptionAr, descriptionEn });
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Icon name="sparkles" className="w-4 h-4" />
                      {ar ? 'توليد الوصف تلقائياً' : 'Auto-generate description'}
                    </button>
                  </div>
                  <TranslateField
                    value={form.descriptionAr}
                    onChange={(v) => setForm({ ...form, descriptionAr: v })}
                    label=""
                    placeholder={ar ? 'وصف تفصيلي للعقار' : 'Detailed property description'}
                    multiline
                    rows={4}
                    locale={locale}
                    sourceValue={form.descriptionEn}
                    onTranslateFromSource={(v) => setForm({ ...form, descriptionEn: v })}
                    translateFrom="en"
                  />
                </div>
                <div className={highlightedFields.has('descriptionEn') ? `rounded-lg p-3 -m-3 ${isFieldValid('descriptionEn') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}>
                  <TranslateField
                    value={form.descriptionEn}
                    onChange={(v) => setForm({ ...form, descriptionEn: v })}
                    label={ar ? 'الوصف بالإنجليزية' : 'Description (English)'}
                    placeholder="Detailed property description"
                    multiline
                    rows={4}
                    locale={locale}
                    sourceValue={form.descriptionAr}
                    onTranslateFromSource={(v) => setForm({ ...form, descriptionAr: v })}
                    translateFrom="ar"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <div className="property-form-step animate-fadeIn">
            <div className="admin-card shadow-lg border-0">
              <div className="admin-card-header bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="admin-card-title text-xl">
                  {ar ? 'الصور والفيديو' : 'Images & Video'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ar ? 'أضف صور العقار ورابط الفيديو' : 'Add property images and video link'}
                </p>
              </div>
              <div className="admin-card-body space-y-6">
                <div className={highlightedFields.has('images') ? `rounded-lg p-3 -m-3 ${isFieldValid('images') ? 'ring-2 ring-green-500 border border-green-500 bg-green-50' : 'ring-2 ring-red-500 border border-red-500 bg-red-50'}` : ''}>
                  <label className="admin-input-label">{ar ? 'الصور' : 'Images'} *</label>
                  <p className="text-sm text-gray-500 mb-3">
                    {ar ? 'اختر من الجهاز أو من الاستوديو. الصورة الأولى هي الرئيسية. (مطلوب صورة واحدة على الأقل)' : 'Select from device or studio. First image is the main image. (At least one image required)'}
                  </p>
                  <ImagePicker
                    images={form.images}
                    onImagesChange={(images) => setForm({ ...form, images })}
                    locale={locale}
                  />
                </div>

                <div>
                  <label className="admin-input-label">{ar ? 'رابط الفيديو' : 'Video URL'}</label>
                  <p className="text-sm text-gray-500 mb-2">{ar ? 'رابط فيديو من YouTube أو Vimeo' : 'YouTube or Vimeo video link'}</p>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="admin-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review - معاينة كاملة كما ستظهر في الموقع */}
        {step === 4 && (
          <div className="property-form-step animate-fadeIn">
            <div className="admin-card shadow-lg border-0">
              <div className="admin-card-header bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="admin-card-title text-xl">
                  {ar ? 'المراجعة والحفظ' : 'Review & Save'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ar ? 'راجع العقار كما سيظهر في الموقع ثم احفظ' : 'Review the property as it will appear on the website, then save'}
                </p>
              </div>
              <div className="admin-card-body">
                <PropertyFormReviewPreview form={form} locale={locale} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="admin-btn-secondary"
              >
                <Icon name="chevronLeft" className="w-5 h-5" />
                {ar ? 'السابق' : 'Previous'}
              </button>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-4">
            {step < 4 ? (
              <button
                type="submit"
                className="admin-btn-primary"
              >
                {ar ? 'التالي' : 'Next'}
                <Icon name={ar ? 'chevronLeft' : 'chevronRight'} className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (allMissingForPublish.length > 0) {
                      setModalMissingFields(allMissingForPublish);
                      setShowMissingModal(true);
                      return;
                    }
                    onSubmit(form, true);
                  }}
                  className="admin-btn-primary"
                >
                  <Icon name="check" className="w-5 h-5" />
                  {ar ? 'حفظ ونشر' : 'Save & Publish'}
                </button>
                <button type="button" onClick={() => onSubmit(form, false)} className="admin-btn-secondary">
                  <Icon name="archive" className="w-5 h-5" />
                  {ar ? 'حفظ كمسودة' : 'Save as Draft'}
                </button>
                <Link href={`/${locale}/admin/properties`} className="admin-btn-secondary">
                  {ar ? 'إلغاء' : 'Cancel'}
                </Link>
              </>
            )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
