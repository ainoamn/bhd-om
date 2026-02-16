'use client';

import { useParams, useRouter } from 'next/navigation';
import PropertyForm from '@/components/admin/PropertyForm';
import { createProperty, updatePropertyUnit } from '@/lib/data/properties';
import type { PropertyFormData } from '@/components/admin/PropertyForm';

function formToCreatePayload(form: PropertyFormData) {
  const image = form.images[0] || '';
  const images = form.images.length > 0 ? form.images : image ? [image] : [];
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

export default function AddPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  const handleSubmit = (form: PropertyFormData, publish: boolean) => {
    const isMultiUnit = form.propertyTypeAr === 'مبنى' && form.propertySubTypeAr === 'متعدد الوحدات';
    const created = createProperty(formToCreatePayload(form) as Parameters<typeof createProperty>[0], {
      businessStatus: publish ? 'AVAILABLE' : 'DRAFT',
      isPublished: publish,
    });
    if (isMultiUnit && publish) {
      form.multiUnitShops?.forEach((_, i) => updatePropertyUnit(created.id, `shop-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
      form.multiUnitShowrooms?.forEach((_, i) => updatePropertyUnit(created.id, `showroom-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
      form.multiUnitApartments?.forEach((_, i) => updatePropertyUnit(created.id, `apartment-${i}`, { businessStatus: 'AVAILABLE', isPublished: true }));
    }
    router.push(`/${locale}/admin/properties`);
  };

  const handleBeforeNextFromStep = (step: number, form: PropertyFormData): boolean => {
    if (step !== 2) return true;
    const created = createProperty(formToCreatePayload(form) as Parameters<typeof createProperty>[0], { businessStatus: 'DRAFT' });
    router.replace(`/${locale}/admin/properties/${created.id}`);
    return false;
  };

  return (
    <PropertyForm
      locale={locale}
      onSubmit={handleSubmit}
      onBeforeNextFromStep={handleBeforeNextFromStep}
      submitLabel={locale === 'ar' ? 'حفظ العقار' : 'Save Property'}
      title={locale === 'ar' ? 'إضافة عقار جديد' : 'Add New Property'}
      subtitle={locale === 'ar' ? 'إدراج عقار للإيجار أو البيع' : 'Add a property for rent or sale'}
    />
  );
}
