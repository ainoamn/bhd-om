/**
 * بيانات العقارات المشتركة - تتضمن الرقم المتسلسل
 * تُحفظ التغييرات (isPublished, businessStatus) في localStorage للاستمرارية
 */

const STORAGE_KEY = 'bhd_property_overrides';
const COOKIE_KEY = 'bhd_property_overrides';
const OLD_DATA_KEY = 'bhd_property_data'; // للترحيل من النسخة القديمة

export interface VillaApartmentData {
  roomCount?: string;
  bathroomCount?: string;
  furnished?: string;
  buildingArea?: string;
  landArea?: string;
  floorCount?: string;
  buildingAge?: string;
  advertiser?: string;
  brokerName?: string;
  brokerPhone?: string;
  mainFeatures?: string[];
  additionalFeatures?: string[];
  customMainFeatures?: string[];
  customAdditionalFeatures?: string[];
  nearbyLocations?: string[];
  isMortgaged?: string;
  facing?: string;
}

/** حالة العقار: شاغر، مؤجر، مباع، محجوز، مسودة - هل العقار متاح أم لا */
export type PropertyBusinessStatus = 'AVAILABLE' | 'DRAFT' | 'INACTIVE' | 'RENTED' | 'SOLD' | 'RESERVED';

export interface UnitOverride {
  isPublished?: boolean;
  businessStatus?: PropertyBusinessStatus;
}

export interface PropertyOverrides {
  [id: string]: {
    isPublished?: boolean;
    businessStatus?: PropertyBusinessStatus;
    units?: { [unitKey: string]: UnitOverride };
    /** تعديلات بيانات العقار - تُدمج مع البيانات الأصلية */
    data?: Partial<Property>;
  };
}

/** تعديلات بيانات العقار المحفوظة (للتوافق) */
export type PropertyDataOverrides = Record<string, Partial<Property>>;

function getStoredPropertyData(): PropertyDataOverrides {
  const overrides = getStoredOverrides();
  const result: PropertyDataOverrides = {};
  for (const [id, o] of Object.entries(overrides)) {
    if (o?.data) result[id] = o.data;
  }
  return result;
}

export function getPropertyDataOverrides(cookieValue?: string | null): PropertyDataOverrides {
  const overrides = getPropertyOverrides(cookieValue);
  const result: PropertyDataOverrides = {};
  for (const [id, o] of Object.entries(overrides)) {
    if (o?.data) result[id] = o.data;
  }
  return result;
}

function getStoredOverrides(): PropertyOverrides {
  if (typeof window === 'undefined') return {};
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let overrides: PropertyOverrides = raw ? JSON.parse(raw) : {};
    // ترحيل البيانات القديمة من bhd_property_data إلى overrides
    const oldDataRaw = localStorage.getItem(OLD_DATA_KEY);
    if (oldDataRaw) {
      try {
        const oldData: PropertyDataOverrides = JSON.parse(oldDataRaw);
        for (const [id, data] of Object.entries(oldData)) {
          if (data && !overrides[id]?.data) {
            overrides[id] = { ...overrides[id], data };
          }
        }
        saveOverrides(overrides);
        localStorage.removeItem(OLD_DATA_KEY);
      } catch {}
    }
    return overrides;
  } catch {
    return {};
  }
}

function saveOverrides(overrides: PropertyOverrides): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(overrides);
    localStorage.setItem(STORAGE_KEY, json);
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(json)};path=/;max-age=31536000`;
  } catch {}
}

/** تشغيل ترحيل البيانات القديمة (يُستدعى من العميل عند التحميل) */
export function migratePropertyStorage(): void {
  if (typeof window === 'undefined') return;
  getStoredOverrides();
}

/** قراءة التعديلات من الكوكي (للخادم) أو localStorage (للعميل) */
export function getPropertyOverrides(cookieValue?: string | null): PropertyOverrides {
  if (typeof window !== 'undefined') return getStoredOverrides();
  if (cookieValue) {
    try {
      return JSON.parse(decodeURIComponent(cookieValue));
    } catch {}
  }
  return {};
}

/** دمج العقار مع التعديلات المحفوظة */
function getMergedProperty(base: Property, dataOverrides: PropertyDataOverrides): Property {
  const data = dataOverrides[String(base.id)];
  if (!data) return base;
  return { ...base, ...data } as Property;
}

export type Property = (typeof properties)[number] & {
  /** رقم قطعة الأرض - مطلوب */
  landParcelNumber?: string;
  /** رقم العقار - اختياري */
  propertyNumber?: string;
  /** رقم الرسم المساحي (الكروركي) - اختياري */
  surveyMapNumber?: string;
  areaAr?: string;
  areaEn?: string;
  /** حالة العقار: شاغر/مؤجر/مباع/محجوز/مسودة */
  businessStatus?: PropertyBusinessStatus;
  /** منشور في الموقع - يُفعّل فقط عندما يكون العقار شاغراً */
  isPublished?: boolean;
  videoUrl?: string;
  propertySubTypeAr?: string;
  propertySubTypeEn?: string;
  unitCountShop?: number;
  unitCountShowroom?: number;
  unitCountApartment?: number;
  multiUnitTotalArea?: number;
  multiUnitShops?: { unitNumber?: string; price: number; area: number; images?: string[] }[];
  multiUnitShowrooms?: { unitNumber?: string; price: number; area: number; images?: string[] }[];
  multiUnitApartments?: { unitNumber?: string; price: number; area: number; bedrooms: number; bathrooms: number; livingRooms: number; majlis: number; parkingSpaces: number; images?: string[] }[];
  villaApartment?: VillaApartmentData;
};

export const properties = [
  {
    id: 1,
    serialNumber: 'PRP-R-2025-0001', // إيجار - مبنى متعدد الوحدات
    titleAr: 'مبنى تجاري متعدد الوحدات - الخوض',
    titleEn: 'Multi-Unit Commercial Building - Al Khoudh',
    descriptionAr: 'مبنى تجاري متعدد الوحدات للإيجار في الخوض. يتضمن محلات تجارية بموقع استراتيجي.',
    descriptionEn: 'Multi-unit commercial building for rent in Al Khoudh. Includes commercial shops in a strategic location.',
    type: 'RENT' as const,
    propertyTypeAr: 'مبنى',
    propertyTypeEn: 'Building',
    propertySubTypeAr: 'متعدد الوحدات',
    propertySubTypeEn: 'Multi-Unit',
    unitCountShop: 2,
    unitCountShowroom: 0,
    unitCountApartment: 0,
    multiUnitTotalArea: 250,
    multiUnitShops: [
      { unitNumber: '1', price: 350, area: 100, images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'] },
      { unitNumber: '2', price: 450, area: 150, images: ['https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80'] },
    ],
    multiUnitShowrooms: [],
    multiUnitApartments: [],
    locationAr: 'مسقط',
    locationEn: 'Muscat',
    governorateAr: 'مسقط',
    governorateEn: 'Muscat',
    stateAr: 'مسقط',
    stateEn: 'Muscat',
    villageAr: 'الخوض',
    villageEn: 'Al Khoudh',
    price: 800,
    area: 250,
    bedrooms: 0,
    bathrooms: 0,
    livingRooms: 0,
    majlis: 0,
    parkingSpaces: 4,
    floors: 2,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    ],
    googleMapsUrl: 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: 23.5859,
    lng: 58.4059,
    status: 'ACTIVE' as const,
  },
  {
    id: 2,
    serialNumber: 'PRP-S-2025-0001', // بيع
    titleAr: 'شقة للبيع في السيب',
    titleEn: 'Apartment for Sale in Seeb',
    descriptionAr: 'شقة حديثة في مجمع سكني راقي. تتكون من 3 غرف نوم، 2 دورات مياه، صالة، ومطبخ مجهز بالكامل.',
    descriptionEn: 'Modern apartment in an upscale residential complex. Consists of 3 bedrooms, 2 bathrooms, living room, and fully equipped kitchen.',
    type: 'SALE' as const,
    propertyTypeAr: 'شقة',
    propertyTypeEn: 'Apartment',
    locationAr: 'مسقط',
    locationEn: 'Muscat',
    governorateAr: 'مسقط',
    governorateEn: 'Muscat',
    stateAr: 'مسقط',
    stateEn: 'Muscat',
    villageAr: 'السيب',
    villageEn: 'Seeb',
    price: 85000,
    area: 180,
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 1,
    majlis: 0,
    parkingSpaces: 1,
    floors: 1,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: 23.5859,
    lng: 58.4059,
    status: 'ACTIVE' as const,
  },
  {
    id: 3,
    serialNumber: 'PRP-I-2025-0001', // استثمار
    titleAr: 'مكتب تجاري للاستثمار',
    titleEn: 'Commercial Office for Rent',
    descriptionAr: 'مكتب تجاري للاستثمار في موقع استراتيجي بوسط المدينة. مناسب للشركات والمكاتب الاستشارية. يتكون من 3 غرف مكتب، استقبال، ومطبخ صغير.',
    descriptionEn: 'Commercial office for investment in a strategic location in the city center. Suitable for companies and consulting offices. Consists of 3 office rooms, reception, and small kitchen.',
    type: 'INVESTMENT' as const,
    propertyTypeAr: 'مكتب تجاري',
    propertyTypeEn: 'Commercial Office',
    locationAr: 'مسقط',
    locationEn: 'Muscat',
    governorateAr: 'مسقط',
    governorateEn: 'Muscat',
    stateAr: 'مسقط',
    stateEn: 'Muscat',
    villageAr: 'الرسيل',
    villageEn: 'Al Rusayl',
    price: 800,
    area: 200,
    bedrooms: 0,
    bathrooms: 2,
    livingRooms: 0,
    majlis: 0,
    parkingSpaces: 3,
    floors: 1,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: 23.5859,
    lng: 58.4059,
    status: 'ACTIVE' as const,
  },
  {
    id: 4,
    serialNumber: 'PRP-S-2025-0002', // بيع
    titleAr: 'أرض سكنية للبيع',
    titleEn: 'Residential Land for Sale',
    descriptionAr: 'أرض سكنية جاهزة للبناء في موقع ممتاز. المساحة 600 متر مربع مع إطلالة جميلة. مناسبة لبناء فيلا أو منزل عائلي.',
    descriptionEn: 'Residential land ready for construction in an excellent location. Area of 600 square meters with beautiful views. Suitable for building a villa or family home.',
    type: 'SALE' as const,
    propertyTypeAr: 'أرض سكنية',
    propertyTypeEn: 'Residential Land',
    locationAr: 'صلالة',
    locationEn: 'Salalah',
    governorateAr: 'ظفار',
    governorateEn: 'Dhofar',
    stateAr: 'صلالة',
    stateEn: 'Salalah',
    villageAr: 'الحافة',
    villageEn: 'Al Haffah',
    price: 45000,
    area: 600,
    bedrooms: 0,
    bathrooms: 0,
    livingRooms: 0,
    majlis: 0,
    parkingSpaces: 0,
    floors: 0,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Salalah,+Oman',
    lat: 17.0151,
    lng: 54.0924,
    status: 'ACTIVE' as const,
  },
  {
    id: 5,
    serialNumber: 'PRP-R-2025-0003', // إيجار
    titleAr: 'شقة للإيجار في نزوى',
    titleEn: 'Apartment for Rent in Nizwa',
    descriptionAr: 'شقة مريحة ومجهزة بالكامل للإيجار. تتكون من غرفتين نوم، دورة مياه، صالة، ومطبخ. مناسبة للعائلات الصغيرة.',
    descriptionEn: 'Comfortable and fully furnished apartment for rent. Consists of 2 bedrooms, bathroom, living room, and kitchen. Suitable for small families.',
    type: 'RENT' as const,
    propertyTypeAr: 'شقة',
    propertyTypeEn: 'Apartment',
    locationAr: 'نزوى',
    locationEn: 'Nizwa',
    governorateAr: 'الداخلية',
    governorateEn: 'Ad Dakhiliyah',
    stateAr: 'نزوى',
    stateEn: 'Nizwa',
    villageAr: 'الفلج',
    villageEn: 'Al Falaj',
    price: 450,
    area: 120,
    bedrooms: 2,
    bathrooms: 1,
    livingRooms: 1,
    majlis: 0,
    parkingSpaces: 1,
    floors: 1,
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Nizwa,+Oman',
    lat: 22.9333,
    lng: 57.5333,
    status: 'ACTIVE' as const,
  },
  {
    id: 6,
    serialNumber: 'PRP-R-2025-0004', // إيجار - مبنى متعدد الوحدات
    titleAr: 'مبنى تجاري متعدد الوحدات - الخوض',
    titleEn: 'Multi-Unit Commercial Building - Al Khoudh',
    descriptionAr: 'مبنى تجاري متعدد الوحدات للإيجار. يتضمن محلات ومعارض. موقع استراتيجي في الخوض.',
    descriptionEn: 'Multi-unit commercial building for rent. Includes shops and showrooms. Strategic location in Al Khoudh.',
    type: 'RENT' as const,
    propertyTypeAr: 'مبنى',
    propertyTypeEn: 'Building',
    propertySubTypeAr: 'متعدد الوحدات',
    propertySubTypeEn: 'Multi-Unit',
    unitCountShop: 2,
    unitCountShowroom: 0,
    unitCountApartment: 0,
    multiUnitTotalArea: 250,
    multiUnitShops: [
      { unitNumber: '1', price: 350, area: 100, images: ['https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&q=80'] },
      { unitNumber: '2', price: 450, area: 150, images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'] },
    ],
    multiUnitShowrooms: [],
    multiUnitApartments: [],
    locationAr: 'مسقط',
    locationEn: 'Muscat',
    governorateAr: 'مسقط',
    governorateEn: 'Muscat',
    stateAr: 'مسقط',
    stateEn: 'Muscat',
    villageAr: 'الخوض',
    villageEn: 'Al Khoudh',
    price: 800,
    area: 250,
    bedrooms: 0,
    bathrooms: 0,
    livingRooms: 0,
    majlis: 0,
    parkingSpaces: 4,
    floors: 2,
    image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&q=80', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: 23.5859,
    lng: 58.4059,
    status: 'ACTIVE' as const,
  },
  {
    id: 7,
    serialNumber: 'PRP-S-2025-0003', // بيع
    titleAr: 'محل تجاري للبيع',
    titleEn: 'Commercial Shop for Sale',
    descriptionAr: 'محل تجاري في موقع ممتاز بوسط السوق. مناسب للمشاريع التجارية المختلفة. المساحة 80 متر مربع مع مخزن صغير.',
    descriptionEn: 'Commercial shop in an excellent location in the market center. Suitable for various commercial projects. Area of 80 square meters with a small storage.',
    type: 'SALE' as const,
    propertyTypeAr: 'محل تجاري',
    propertyTypeEn: 'Commercial Shop',
    locationAr: 'مسقط',
    locationEn: 'Muscat',
    governorateAr: 'مسقط',
    governorateEn: 'Muscat',
    stateAr: 'مسقط',
    stateEn: 'Muscat',
    villageAr: 'الرسيل',
    villageEn: 'Al Rusayl',
    price: 55000,
    area: 80,
    bedrooms: 0,
    bathrooms: 1,
    livingRooms: 0,
    majlis: 0,
    parkingSpaces: 2,
    floors: 1,
    image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800&q=80'],
    googleMapsUrl: 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: 23.5859,
    lng: 58.4059,
    status: 'ACTIVE' as const,
  },
];

export function getPropertyById(id: number | string, dataOverrides?: PropertyDataOverrides | null): Property | undefined {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const base = properties.find((p) => p.id === numId);
  if (!base) return undefined;
  const data = dataOverrides ?? (typeof window !== 'undefined' ? getStoredPropertyData() : {});
  return getMergedProperty(base as Property, data) as Property;
}

/** عرض العقار حسب المستوى: رقم فقط أو عنوان كامل */
export function getPropertyDisplayByLevel(
  p: { id?: number; landParcelNumber?: string; propertyNumber?: string; serialNumber?: string; governorateAr?: string; stateAr?: string; areaAr?: string; villageAr?: string; street?: string; building?: string; fullAddress?: string } | null | undefined,
  level: 'numberOnly' | 'fullAddress'
): string {
  if (!p) return '—';
  if (level === 'numberOnly') {
    const num = p.landParcelNumber && p.propertyNumber
      ? `${p.landParcelNumber} - ${p.propertyNumber}`
      : (p.landParcelNumber || p.propertyNumber || p.serialNumber || String(p.id ?? ''));
    return num || '—';
  }
  return getPropertyDisplayText(p);
}

/** عرض العقار: رقم قطعة - رقم عقار | نوع العقار | محافظة - ولاية - منطقة - قرية */
export function getPropertyDisplayText(p: {
  id?: number;
  landParcelNumber?: string;
  propertyNumber?: string;
  serialNumber?: string;
  propertySubTypeAr?: string;
  propertyTypeAr?: string;
  governorateAr?: string;
  stateAr?: string;
  areaAr?: string;
  villageAr?: string;
}): string {
  const numPart = p.landParcelNumber && p.propertyNumber
    ? `${p.landParcelNumber} - ${p.propertyNumber}`
    : (p.landParcelNumber || p.propertyNumber || p.serialNumber || String(p.id ?? ''));
  const typeLabel = [p.propertyTypeAr, p.propertySubTypeAr].filter(Boolean).join(' ') || p.propertySubTypeAr || p.propertyTypeAr || '';
  const loc = [p.governorateAr, p.stateAr, p.areaAr, p.villageAr].filter(Boolean).join(' - ');
  const lines = [numPart, typeLabel, loc].filter(Boolean);
  return lines.join('\n');
}

export function updateProperty(id: number | string, updates: Partial<Property>): void {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const idx = properties.findIndex((p) => p.id === numId);
  if (idx >= 0) {
    Object.assign(properties[idx], updates);
    const key = String(numId);
    const { isPublished, businessStatus, ...dataUpdates } = updates as Partial<Property> & { isPublished?: boolean; businessStatus?: PropertyBusinessStatus };
    if (isPublished !== undefined || businessStatus !== undefined) {
      const overrides = getStoredOverrides();
      overrides[key] = { ...overrides[key], isPublished, businessStatus };
      saveOverrides(overrides);
    }
    if (Object.keys(dataUpdates).length > 0) {
      const overrides = getStoredOverrides();
      overrides[key] = { ...overrides[key], data: { ...overrides[key]?.data, ...dataUpdates } as Partial<Property> };
      saveOverrides(overrides);
    }
  }
}

/** تحديث حالة وحدة في عقار متعدد الوحدات */
export function updatePropertyUnit(propId: number | string, unitKey: string, updates: UnitOverride): void {
  const numId = typeof propId === 'string' ? parseInt(propId, 10) : propId;
  const overrides = getStoredOverrides();
  const key = String(numId);
  overrides[key] = overrides[key] || {};
  overrides[key].units = overrides[key].units || {};
  overrides[key].units![unitKey] = { ...overrides[key].units![unitKey], ...updates };
  saveOverrides(overrides);
}

/** الحصول على حالة وحدة */
export function getUnitOverride(overrides: PropertyOverrides, propId: number, unitKey: string): UnitOverride | undefined {
  return overrides[String(propId)]?.units?.[unitKey];
}

type UnitType = 'shop' | 'showroom' | 'apartment';

/** إضافة وحدة جديدة لعقار متعدد الوحدات - يُحفظ في التعديلات */
export function addPropertyUnit(
  propId: number, unitType: UnitType,
  unitData: { price: number; area: number; unitNumber?: string; bedrooms?: number; bathrooms?: number; livingRooms?: number; majlis?: number; parkingSpaces?: number }
): string {
  const dataOverrides = getPropertyDataOverrides();
  const prop = getPropertyById(propId, dataOverrides) as Property;
  const overrides = getStoredOverrides();
  const key = String(propId);
  const baseShops = (prop.multiUnitShops || []) as { unitNumber?: string; price: number; area: number; images?: string[] }[];
  const baseShowrooms = (prop.multiUnitShowrooms || []) as { unitNumber?: string; price: number; area: number; images?: string[] }[];
  const baseApartments = (prop.multiUnitApartments || []) as { unitNumber?: string; price: number; area: number; bedrooms: number; bathrooms: number; livingRooms: number; majlis: number; parkingSpaces: number; images?: string[] }[];
  const unitIndex = unitType === 'shop' ? baseShops.length : unitType === 'showroom' ? baseShowrooms.length : baseApartments.length;
  const unitKey = `${unitType}-${unitIndex}`;
  const unitNum = unitData.unitNumber || String(unitIndex + 1);

  type ShopUnit = { unitNumber?: string; price: number; area: number; images?: string[] };
  type AptUnit = { unitNumber?: string; price: number; area: number; bedrooms: number; bathrooms: number; livingRooms: number; majlis: number; parkingSpaces: number; images?: string[] };

  if (unitType === 'shop') {
    const shopUnit: ShopUnit = { unitNumber: unitNum, price: unitData.price, area: unitData.area, images: [] };
    updateProperty(propId, { multiUnitShops: [...baseShops, shopUnit] as Property['multiUnitShops'] });
  } else if (unitType === 'showroom') {
    const showroomUnit: ShopUnit = { unitNumber: unitNum, price: unitData.price, area: unitData.area, images: [] };
    updateProperty(propId, { multiUnitShowrooms: [...baseShowrooms, showroomUnit] as Property['multiUnitShowrooms'] });
  } else {
    const aptUnit: AptUnit = {
      unitNumber: unitNum,
      price: unitData.price,
      area: unitData.area,
      bedrooms: unitData.bedrooms ?? 0,
      bathrooms: unitData.bathrooms ?? 0,
      livingRooms: unitData.livingRooms ?? 0,
      majlis: unitData.majlis ?? 0,
      parkingSpaces: unitData.parkingSpaces ?? 0,
      images: [],
    };
    updateProperty(propId, { multiUnitApartments: [...baseApartments, aptUnit] as Property['multiUnitApartments'] });
  }
  updatePropertyUnit(propId, unitKey, { businessStatus: 'AVAILABLE', isPublished: true });
  return unitKey;
}

export function createProperty(data: Partial<Property> & Pick<Property, 'titleAr' | 'titleEn' | 'type' | 'propertyTypeAr' | 'propertyTypeEn' | 'price' | 'area'> & { landParcelNumber?: string; propertyNumber?: string; surveyMapNumber?: string }, options?: { businessStatus?: PropertyBusinessStatus; isPublished?: boolean }): Property {
  const maxId = Math.max(...properties.map((p) => p.id), 0);
  const typePrefix = data.type === 'RENT' ? 'R' : data.type === 'SALE' ? 'S' : 'I';
  const count = properties.filter((p) => p.type === data.type).length + 1;
  const serialNumber = `PRP-${typePrefix}-2025-${String(count).padStart(4, '0')}`;
  const newProp: Property = {
    id: maxId + 1,
    serialNumber,
    titleAr: data.titleAr,
    titleEn: data.titleEn || data.titleAr,
    landParcelNumber: data.landParcelNumber || '',
    propertyNumber: (data as { propertyNumber?: string }).propertyNumber || '',
    surveyMapNumber: data.surveyMapNumber || '',
    descriptionAr: data.descriptionAr || '',
    descriptionEn: data.descriptionEn || '',
    type: data.type,
    propertyTypeAr: data.propertyTypeAr,
    propertyTypeEn: data.propertyTypeEn,
    propertySubTypeAr: (data as { propertySubTypeAr?: string }).propertySubTypeAr,
    propertySubTypeEn: (data as { propertySubTypeEn?: string }).propertySubTypeEn,
    unitCountShop: (data as { unitCountShop?: number }).unitCountShop,
    unitCountShowroom: (data as { unitCountShowroom?: number }).unitCountShowroom,
    unitCountApartment: (data as { unitCountApartment?: number }).unitCountApartment,
    multiUnitTotalArea: (data as { multiUnitTotalArea?: number }).multiUnitTotalArea,
    multiUnitShops: (data as { multiUnitShops?: { price: number; area: number }[] }).multiUnitShops,
    multiUnitShowrooms: (data as { multiUnitShowrooms?: { price: number; area: number }[] }).multiUnitShowrooms,
    multiUnitApartments: (data as { multiUnitApartments?: { price: number; area: number; bedrooms: number; bathrooms: number; livingRooms: number; majlis: number; parkingSpaces: number }[] }).multiUnitApartments,
    locationAr: data.governorateAr || '',
    locationEn: data.governorateEn || '',
    governorateAr: data.governorateAr || '',
    governorateEn: data.governorateEn || '',
    stateAr: data.stateAr || '',
    stateEn: data.stateEn || '',
    areaAr: (data as { areaAr?: string }).areaAr || '',
    areaEn: (data as { areaEn?: string }).areaEn || '',
    villageAr: data.villageAr || '',
    villageEn: data.villageEn || '',
    price: data.price,
    area: data.area,
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    livingRooms: data.livingRooms ?? 0,
    majlis: data.majlis ?? 0,
    parkingSpaces: data.parkingSpaces ?? 0,
    floors: data.floors ?? 1,
    image: data.image || (data.images?.[0] ?? ''),
    images: data.images && data.images.length > 0 ? data.images : data.image ? [data.image] : [],
    googleMapsUrl: data.googleMapsUrl || 'https://www.google.com/maps/place/Muscat,+Oman',
    lat: data.lat ?? 23.5859,
    lng: data.lng ?? 58.4059,
    videoUrl: data.videoUrl,
    villaApartment: (data as { villaApartment?: VillaApartmentData }).villaApartment,
    businessStatus: (options?.businessStatus ?? (data as { businessStatus?: PropertyBusinessStatus }).businessStatus ?? 'DRAFT') as PropertyBusinessStatus,
    isPublished: (options?.businessStatus === 'AVAILABLE' && options?.isPublished) ?? false,
  } as Property;
  properties.push(newProp);
  if (typeof window !== 'undefined' && (options?.businessStatus || options?.isPublished !== undefined)) {
    const overrides = getStoredOverrides();
    overrides[String(newProp.id)] = {
      businessStatus: newProp.businessStatus,
      isPublished: newProp.isPublished,
    };
    saveOverrides(overrides);
  }
  return newProp;
}

/** توليد الرقم المتسلسل للوحدة: العقار الرئيسي يحتفظ برقمه، كل وحدة تحصل على رقم فريد */
export function getUnitSerialNumber(baseSerial: string, unitType: 'shop' | 'showroom' | 'apartment', unitIndex: number): string {
  const prefix = unitType === 'shop' ? 'S' : unitType === 'showroom' ? 'M' : 'A';
  return `${baseSerial}-${prefix}${unitIndex + 1}`;
}

/** عرض عقار منشور - إما عقار كامل أو وحدة من عقار متعدد الوحدات */
export type PropertyListing = Property & {
  /** مفتاح الوحدة إن كان عقاراً متعدد الوحدات (مثل shop-0, apartment-1) */
  unitKey?: string;
  /** حالة العقار للعرض (محجوز، شاغر، إلخ) */
  businessStatus?: PropertyBusinessStatus;
  /** بيانات الوحدة عند عرض وحدة منفردة */
  unitData?: {
    unitType: 'shop' | 'showroom' | 'apartment';
    unitNumber: string;
    price: number;
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    livingRooms?: number;
    majlis?: number;
    parkingSpaces?: number;
    images?: string[];
  };
};

/** العقارات المنشورة في الموقع - شاغر فقط ومنشور من قبل المدير. العقار متعدد الوحدات يُعاد كوحدات منفصلة. */
export function getPublishedProperties(overridesCookie?: string | null, _dataCookie?: string | null): PropertyListing[] {
  const overrides = getPropertyOverrides(overridesCookie);
  const dataOverrides = getPropertyDataOverrides(overridesCookie);
  const result: PropertyListing[] = [];

  for (const p of properties) {
    const baseProp = p as Property;
    const prop = getMergedProperty(baseProp, dataOverrides);
    const o = overrides[String(p.id)];
    const isMultiUnit = prop.propertyTypeAr === 'مبنى' && (prop as { propertySubTypeAr?: string }).propertySubTypeAr === 'متعدد الوحدات';

    if (isMultiUnit) {
      type UnitItem = { unitNumber?: string; price: number; area: number; images?: string[]; bedrooms?: number; bathrooms?: number; livingRooms?: number; majlis?: number; parkingSpaces?: number };
      const shops = (prop.multiUnitShops || []) as UnitItem[];
      const showrooms = (prop.multiUnitShowrooms || []) as UnitItem[];
      const apartments = (prop.multiUnitApartments || []) as UnitItem[];
      const propPublished = o?.isPublished ?? prop.isPublished;
      shops.forEach((u, i) => {
        const unitKey = `shop-${i}`;
        const unitOverride = o?.units?.[unitKey];
        const status = unitOverride?.businessStatus ?? 'AVAILABLE';
        const published = unitOverride?.isPublished ?? (status === 'RESERVED' ? true : (propPublished && !unitOverride));
        if ((status === 'AVAILABLE' || status === 'RESERVED') && published) {
          const unitNum = String(u.unitNumber || i + 1);
          const baseSerial = (prop as { serialNumber?: string }).serialNumber || '';
          result.push({
            ...prop,
            id: prop.id,
            businessStatus: status,
            serialNumber: getUnitSerialNumber(baseSerial, 'shop', i),
            titleAr: `${prop.titleAr} - محل ${unitNum}`,
            titleEn: `${prop.titleEn} - Shop ${unitNum}`,
            price: u.price,
            area: u.area,
            bedrooms: 0,
            bathrooms: 0,
            livingRooms: 0,
            majlis: 0,
            parkingSpaces: 0,
            image: u.images?.[0] || prop.image,
            images: u.images?.length ? u.images : prop.images,
            unitKey,
            unitData: { unitType: 'shop', unitNumber: unitNum, price: u.price, area: u.area, images: u.images },
          } as PropertyListing);
        }
      });
      showrooms.forEach((u, i) => {
        const unitKey = `showroom-${i}`;
        const unitOverride = o?.units?.[unitKey];
        const status = unitOverride?.businessStatus ?? 'AVAILABLE';
        const published = unitOverride?.isPublished ?? (status === 'RESERVED' ? true : (propPublished && !unitOverride));
        if ((status === 'AVAILABLE' || status === 'RESERVED') && published) {
          const unitNum = String(u.unitNumber || i + 1);
          const baseSerial = (prop as { serialNumber?: string }).serialNumber || '';
          result.push({
            ...prop,
            id: prop.id,
            businessStatus: status,
            serialNumber: getUnitSerialNumber(baseSerial, 'showroom', i),
            titleAr: `${prop.titleAr} - معرض ${unitNum}`,
            titleEn: `${prop.titleEn} - Showroom ${unitNum}`,
            price: u.price,
            area: u.area,
            bedrooms: 0,
            bathrooms: 0,
            livingRooms: 0,
            majlis: 0,
            parkingSpaces: 0,
            image: u.images?.[0] || prop.image,
            images: u.images?.length ? u.images : prop.images,
            unitKey,
            unitData: { unitType: 'showroom', unitNumber: unitNum, price: u.price, area: u.area, images: u.images },
          } as PropertyListing);
        }
      });
      apartments.forEach((u, i) => {
        const unitKey = `apartment-${i}`;
        const unitOverride = o?.units?.[unitKey];
        const status = unitOverride?.businessStatus ?? 'AVAILABLE';
        const published = unitOverride?.isPublished ?? (status === 'RESERVED' ? true : (propPublished && !unitOverride));
        if ((status === 'AVAILABLE' || status === 'RESERVED') && published) {
          const unitNum = String(u.unitNumber || i + 1);
          const baseSerial = (prop as { serialNumber?: string }).serialNumber || '';
          result.push({
            ...prop,
            id: prop.id,
            businessStatus: status,
            serialNumber: getUnitSerialNumber(baseSerial, 'apartment', i),
            titleAr: `${prop.titleAr} - شقة ${unitNum}`,
            titleEn: `${prop.titleEn} - Apartment ${unitNum}`,
            price: u.price,
            area: u.area,
            bedrooms: u.bedrooms ?? 0,
            bathrooms: u.bathrooms ?? 0,
            livingRooms: u.livingRooms ?? 0,
            majlis: u.majlis ?? 0,
            parkingSpaces: u.parkingSpaces ?? 0,
            image: u.images?.[0] || prop.image,
            images: u.images?.length ? u.images : prop.images,
            unitKey,
            unitData: {
              unitType: 'apartment',
              unitNumber: unitNum,
              price: u.price,
              area: u.area,
              bedrooms: u.bedrooms,
              bathrooms: u.bathrooms,
              livingRooms: u.livingRooms,
              majlis: u.majlis,
              parkingSpaces: u.parkingSpaces,
              images: u.images,
            },
          } as PropertyListing);
        }
      });
    } else {
      const businessStatus = o?.businessStatus ?? prop.businessStatus;
      const isPublished = o?.isPublished ?? prop.isPublished;
      if (businessStatus && businessStatus !== 'AVAILABLE' && businessStatus !== 'RESERVED') continue;
      if (isPublished === true || (isPublished === undefined && (businessStatus === undefined || businessStatus === 'AVAILABLE' || businessStatus === 'RESERVED') && !o)) {
        result.push({ ...prop, businessStatus: businessStatus || 'AVAILABLE' } as PropertyListing);
      }
    }
  }
  return result;
}
