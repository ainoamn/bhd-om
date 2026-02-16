'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PropertyForm from '@/components/admin/PropertyForm';
import { getPropertyById, updateProperty, updatePropertyUnit, type Property } from '@/lib/data/properties';
import type { PropertyFormData } from '@/components/admin/PropertyForm';

function formToUpdatePayload(form: PropertyFormData, property: NonNullable<ReturnType<typeof getPropertyById>>) {
  const image = form.images[0] || property.image;
  const images = form.images.length > 0 ? form.images : image ? [image] : property.images;
  const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
  const price = isMultiUnit
    ? (form.multiUnitShops?.reduce((s, u) => s + (Number(u.price) || 0), 0) ?? 0) +
      (form.multiUnitShowrooms?.reduce((s, u) => s + (Number(u.price) || 0), 0) ?? 0) +
      (form.multiUnitApartments?.reduce((s, u) => s + (Number(u.price) || 0), 0) ?? 0)
    : Number(form.price) || 0;
  const area = isMultiUnit ? Number(form.multiUnitTotalArea) || 0 : Number(form.area) || 0;
  return {
    titleAr: form.titleAr,
    titleEn: form.titleEn,
    landParcelNumber: form.landParcelNumber.trim() || undefined,
    propertyNumber: form.propertyNumber.trim() || undefined,
    surveyMapNumber: form.surveyMapNumber.trim() || undefined,
    descriptionAr: form.descriptionAr,
    descriptionEn: form.descriptionEn,
    type: form.type,
    propertyTypeAr: form.propertyTypeAr,
    propertyTypeEn: form.propertyTypeEn,
    propertySubTypeAr: form.propertySubTypeAr || undefined,
    propertySubTypeEn: form.propertySubTypeEn || undefined,
    unitCountShop: form.unitCountShop ? Number(form.unitCountShop) : undefined,
    unitCountShowroom: form.unitCountShowroom ? Number(form.unitCountShowroom) : undefined,
    unitCountApartment: form.unitCountApartment ? Number(form.unitCountApartment) : undefined,
    multiUnitTotalArea: form.multiUnitTotalArea ? Number(form.multiUnitTotalArea) : undefined,
    multiUnitShops: form.multiUnitShops?.length ? form.multiUnitShops.map((u) => ({ unitNumber: u.unitNumber || undefined, price: Number(u.price) || 0, area: Number(u.area) || 0, images: u.images ?? [] })) : undefined,
    multiUnitShowrooms: form.multiUnitShowrooms?.length ? form.multiUnitShowrooms.map((u) => ({ unitNumber: u.unitNumber || undefined, price: Number(u.price) || 0, area: Number(u.area) || 0, images: u.images ?? [] })) : undefined,
    multiUnitApartments: form.multiUnitApartments?.length ? form.multiUnitApartments.map((u) => ({
      unitNumber: u.unitNumber || undefined,
      price: Number(u.price) || 0,
      area: Number(u.area) || 0,
      bedrooms: Number(u.bedrooms) || 0,
      bathrooms: Number(u.bathrooms) || 0,
      livingRooms: Number(u.livingRooms) || 0,
      majlis: Number(u.majlis) || 0,
      parkingSpaces: Number(u.parkingSpaces) || 0,
      images: u.images ?? [],
    })) : undefined,
    governorateAr: form.governorateAr,
    governorateEn: form.governorateEn,
    stateAr: form.stateAr,
    stateEn: form.stateEn,
    areaAr: form.areaAr,
    areaEn: form.areaEn,
    villageAr: form.villageAr,
    villageEn: form.villageEn,
    googleMapsUrl: form.googleMapsUrl || undefined,
    price,
    area,
    bedrooms: isMultiUnit ? 0 : Number(form.bedrooms) || 0,
    bathrooms: isMultiUnit ? 0 : Number(form.bathrooms) || 0,
    livingRooms: isMultiUnit ? 0 : Number(form.livingRooms) || 0,
    majlis: isMultiUnit ? 0 : Number(form.majlis) || 0,
    parkingSpaces: isMultiUnit ? 0 : Number(form.parkingSpaces) || 0,
    image,
    images,
    videoUrl: form.videoUrl || undefined,
    villaApartment: (form.propertyTypeAr === 'فيلا' || form.propertyTypeAr === 'شقة' || form.propertyTypeAr === 'مزارع وشاليهات' || form.propertyTypeAr === 'أرض' || (form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'مبنى كامل')) ? form.villaApartment : undefined,
  };
}

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<ReturnType<typeof getPropertyById>>(undefined);

  useEffect(() => {
    const prop = getPropertyById(id);
    setProperty(prop);
    setLoading(false);
  }, [id]);

  const handleSubmit = (form: PropertyFormData, publish: boolean) => {
    if (!property) return;
    const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
    updateProperty(id, {
      ...formToUpdatePayload(form, property),
      businessStatus: publish ? 'AVAILABLE' : 'DRAFT',
      isPublished: publish,
    } as Partial<Property>);
    if (isMultiUnit && publish) {
      form.multiUnitShops?.forEach((_, i) => updatePropertyUnit(id, `shop-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
      form.multiUnitShowrooms?.forEach((_, i) => updatePropertyUnit(id, `showroom-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
      form.multiUnitApartments?.forEach((_, i) => updatePropertyUnit(id, `apartment-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
    }
    router.push(`/${locale}/admin/properties`);
  };

  const handleAutoSave = useCallback((form: PropertyFormData) => {
    if (!property) return;
    updateProperty(id, {
      ...formToUpdatePayload(form, property),
      businessStatus: ((property as { businessStatus?: string }).businessStatus || 'DRAFT') as import('@/lib/data/properties').PropertyBusinessStatus,
      isPublished: (property as { isPublished?: boolean }).isPublished,
    } as Partial<Property>);
  }, [id, property]);

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-card-body text-center py-16">
          <p className="text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{locale === 'ar' ? 'عقار غير موجود' : 'Property not found'}</h1>
        <p className="text-gray-500 mb-4">{locale === 'ar' ? 'لم يتم العثور على العقار المطلوب.' : 'The requested property was not found.'}</p>
        <a href={`/${locale}/admin/properties`} className="admin-btn-primary">
          {locale === 'ar' ? 'العودة للقائمة' : 'Back to list'}
        </a>
      </div>
    );
  }

  return (
    <PropertyForm
      property={property}
      locale={locale}
      onSubmit={handleSubmit}
      onAutoSave={handleAutoSave}
      submitLabel={locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
      title={locale === 'ar' ? 'تعديل العقار' : 'Edit Property'}
      subtitle={locale === 'ar' ? 'تعديل بيانات العقار' : 'Edit property details'}
    />
  );
}
