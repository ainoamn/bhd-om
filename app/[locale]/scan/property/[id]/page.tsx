'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ScanProperty {
  id: number;
  serialNumber?: string;
  unitSerial?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  type: string;
  propertyTypeAr?: string;
  propertyTypeEn?: string;
  propertySubTypeAr?: string;
  propertySubTypeEn?: string;
  locationAr?: string;
  locationEn?: string;
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
  parkingSpaces?: number;
  unit?: { unitKey: string; unitType: string; unitNumber: string; price: number; area: number; bedrooms?: number; bathrooms?: number };
}

export default function ScanPropertyPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [property, setProperty] = useState<ScanProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError(ar ? 'معرف غير صالح' : 'Invalid ID');
      return;
    }
    const unitKey = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('unit') : null;
    const url = unitKey ? `/api/scan/property/${id}?unit=${encodeURIComponent(unitKey)}` : `/api/scan/property/${id}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setProperty(data);
        setError(null);
      })
      .catch(() => {
        setError(ar ? 'العقار غير موجود' : 'Property not found');
        setProperty(null);
      })
      .finally(() => setLoading(false));
  }, [id, ar]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl mx-auto mb-4">⚠</div>
          <p className="text-gray-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const typeLabels: Record<string, { ar: string; en: string }> = {
    RENT: { ar: 'للإيجار', en: 'For Rent' },
    SALE: { ar: 'للبيع', en: 'For Sale' },
    INVESTMENT: { ar: 'للاستثمار', en: 'For Investment' },
  };
  const typeLabel = typeLabels[property.type] || { ar: property.type, en: property.type };
  const unitTypeLabels: Record<string, { ar: string; en: string }> = {
    shop: { ar: 'محل', en: 'Shop' },
    showroom: { ar: 'معرض', en: 'Showroom' },
    apartment: { ar: 'شقة', en: 'Apartment' },
  };
  const title = ar ? property.titleAr : property.titleEn;
  const location = [property.governorateAr, property.stateAr, property.villageAr].filter(Boolean).join(' - ') ||
    (ar ? property.locationAr : property.locationEn) || '—';
  const propertyType = ar
    ? [property.propertyTypeAr, property.propertySubTypeAr].filter(Boolean).join(' - ')
    : [property.propertyTypeEn, property.propertySubTypeEn].filter(Boolean).join(' - ');
  const unitLabel = property.unit
    ? `${ar ? unitTypeLabels[property.unit.unitType]?.ar : unitTypeLabels[property.unit.unitType]?.en} ${property.unit.unitNumber}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-[#8B6F47] px-6 py-5 text-white">
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
              {ar ? 'بطاقة العقار — تفاصيل كاملة' : 'Property Card — Full Details'}
            </p>
            <h1 className="text-xl font-bold mt-1">{title}{unitLabel ? ` - ${unitLabel}` : ''}</h1>
            <p className="font-mono text-sm opacity-90 mt-1">{property.unitSerial || property.serialNumber || property.id}</p>
            <p className="text-sm opacity-85 mt-2 border-t border-white/20 pt-2">
              {[propertyType, location, `${property.price.toLocaleString()} ر.ع.`, `${property.area} ${ar ? 'م²' : 'sqm'}`].filter(Boolean).join(' | ')}
            </p>
          </div>
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
              {ar ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'الرقم المتسلسل' : 'Serial Number'}</p>
                <p className="font-mono text-[#8B6F47] font-medium">{property.unitSerial || property.serialNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'النوع' : 'Type'}</p>
                <p className="font-medium">{ar ? typeLabel.ar : typeLabel.en}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'نوع العقار' : 'Property Type'}</p>
                <p className="font-medium">{propertyType || '—'}</p>
              </div>
            </div>
          </div>
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
              {ar ? 'الموقع والمواصفات' : 'Location & Specs'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'الموقع' : 'Location'}</p>
                <p className="font-medium">{location}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'السعر' : 'Price'}</p>
                <p className="font-semibold text-[#8B6F47]">{property.price.toLocaleString()} ر.ع.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'المساحة' : 'Area'}</p>
                <p className="font-medium">{property.area} {ar ? 'متر مربع' : 'sqm'}</p>
              </div>
              {property.bedrooms != null && property.bedrooms > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'غرف النوم' : 'Bedrooms'}</p>
                  <p className="font-medium">{property.bedrooms}</p>
                </div>
              )}
              {property.bathrooms != null && property.bathrooms > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'دورات المياه' : 'Bathrooms'}</p>
                  <p className="font-medium">{property.bathrooms}</p>
                </div>
              )}
              {property.parkingSpaces != null && property.parkingSpaces > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{ar ? 'مواقف السيارات' : 'Parking'}</p>
                  <p className="font-medium">{property.parkingSpaces}</p>
                </div>
              )}
            </div>
          </div>
          {(property.descriptionAr || property.descriptionEn) && (
            <div className="p-6">
              <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
                {ar ? 'الوصف' : 'Description'}
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                {ar ? property.descriptionAr : property.descriptionEn}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
