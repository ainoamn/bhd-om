'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import PropertyDetails from './PropertyDetails';
import {
  getPropertyById,
  getPublishedProperties,
  getPropertyOverrides,
  getPropertyDataOverrides,
  getUnitSerialNumber,
  type PropertyListing,
} from '@/lib/data/properties';

interface PropertyDetailLoaderProps {
  id: string;
  unitKey?: string;
  locale: string;
}

/** يحمّل تفاصيل العقار من localStorage (للعميل) - يُستخدم عند فشل الخادم في قراءة الكوكي */
export default function PropertyDetailLoader({ id, unitKey, locale }: PropertyDetailLoaderProps) {
  const [listing, setListing] = useState<PropertyListing | null | 'loading'>('loading');

  useEffect(() => {
    const dataOverrides = getPropertyDataOverrides();
    const overrides = getPropertyOverrides();
    const property = getPropertyById(id, dataOverrides);
    if (!property) {
      setListing(null);
      return;
    }

    const isMultiUnit =
      (property as { propertyTypeAr?: string }).propertyTypeAr === 'مبنى' &&
      (property as { propertySubTypeAr?: string }).propertySubTypeAr === 'متعدد الوحدات';

    if (isMultiUnit && unitKey) {
      const unitOverride = overrides[String(id)]?.units?.[unitKey];
      const propPublished = overrides[String(id)]?.isPublished ?? true;
      const status = unitOverride?.businessStatus ?? 'AVAILABLE';
      const published = unitOverride?.isPublished ?? propPublished ?? true;
      if ((status !== 'AVAILABLE' && status !== 'RESERVED') || !published) {
        setListing(null);
        return;
      }

      const publishedList = getPublishedProperties();
      let found = publishedList.find((p) => p.id === parseInt(id) && (p as PropertyListing).unitKey === unitKey);
      if (!found) {
        const [unitType, unitIndex] = unitKey.split('-');
        const idx = parseInt(unitIndex, 10);
        const apartments = (property as { multiUnitApartments?: { unitNumber?: string; price: number; area: number; bedrooms?: number; bathrooms?: number; livingRooms?: number; majlis?: number; parkingSpaces?: number; images?: string[] }[] }).multiUnitApartments || [];
        const shops = (property as { multiUnitShops?: { unitNumber?: string; price: number; area: number; images?: string[] }[] }).multiUnitShops || [];
        const showrooms = (property as { multiUnitShowrooms?: { unitNumber?: string; price: number; area: number; images?: string[] }[] }).multiUnitShowrooms || [];
        const u = unitType === 'apartment' ? apartments[idx] : unitType === 'shop' ? shops[idx] : showrooms[idx];
        if (u) {
          const unitNum = String(u.unitNumber ?? idx + 1);
          const labels = { shop: ['محل', 'Shop'], showroom: ['معرض', 'Showroom'], apartment: ['شقة', 'Apartment'] };
          const [arLabel, enLabel] = labels[unitType as keyof typeof labels] || ['', ''];
          const baseSerial = (property as { serialNumber?: string }).serialNumber || '';
          found = {
            ...property,
            id: parseInt(id),
            businessStatus: status,
            serialNumber: getUnitSerialNumber(baseSerial, unitType as 'shop' | 'showroom' | 'apartment', idx),
            titleAr: `${property.titleAr} - ${arLabel} ${unitNum}`,
            titleEn: `${property.titleEn} - ${enLabel} ${unitNum}`,
            price: u.price,
            area: u.area,
            bedrooms: (u as { bedrooms?: number }).bedrooms ?? 0,
            bathrooms: (u as { bathrooms?: number }).bathrooms ?? 0,
            livingRooms: (u as { livingRooms?: number }).livingRooms ?? 0,
            majlis: (u as { majlis?: number }).majlis ?? 0,
            parkingSpaces: (u as { parkingSpaces?: number }).parkingSpaces ?? 0,
            image: (u as { images?: string[] }).images?.[0] || property.image,
            images: (u as { images?: string[] }).images?.length ? (u as { images?: string[] }).images : property.images,
            unitKey,
            unitData: unitType === 'apartment'
              ? {
                  unitType: 'apartment',
                  unitNumber: unitNum,
                  price: u.price,
                  area: u.area,
                  bedrooms: (u as { bedrooms?: number }).bedrooms,
                  bathrooms: (u as { bathrooms?: number }).bathrooms,
                  livingRooms: (u as { livingRooms?: number }).livingRooms,
                  majlis: (u as { majlis?: number }).majlis,
                  parkingSpaces: (u as { parkingSpaces?: number }).parkingSpaces,
                  images: (u as { images?: string[] }).images,
                }
              : { unitType: unitType as 'shop' | 'showroom', unitNumber: unitNum, price: u.price, area: u.area, images: (u as { images?: string[] }).images },
          } as PropertyListing;
        }
      }
      if (found) {
        const similarProperties = publishedList
          .filter((p) => p.id !== parseInt(id))
          .filter((p) => p.type === property.type)
          .filter(
            (p) =>
              (p.governorateAr === property.governorateAr && p.governorateEn === property.governorateEn) ||
              (p.stateAr === property.stateAr && p.stateEn === property.stateEn)
          )
          .slice(0, 3);
        setListing({ ...found, businessStatus: status, _similarProperties: similarProperties } as PropertyListing & { _similarProperties?: PropertyListing[] });
      } else {
        setListing(null);
      }
    } else {
      setListing(null);
    }
  }, [id, unitKey]);

  if (listing === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    notFound();
  }

  const similarProperties = (listing as PropertyListing & { _similarProperties?: PropertyListing[] })._similarProperties ?? [];
  const { _similarProperties, ...cleanListing } = listing as PropertyListing & { _similarProperties?: PropertyListing[] };

  return <PropertyDetails property={cleanListing as any} locale={locale} similarProperties={similarProperties as any} />;
}
