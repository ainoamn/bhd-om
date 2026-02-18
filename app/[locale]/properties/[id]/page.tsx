import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import PropertyDetails from '@/components/properties/PropertyDetails';
import PropertyDetailLoader from '@/components/properties/PropertyDetailLoader';
import { getPropertyById, getPublishedProperties, getPropertyOverrides, getPropertyDataOverrides, properties } from '@/lib/data/properties';
import type { PropertyListing } from '@/lib/data/properties';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  const params: { locale: string; id: string }[] = [];
  for (const locale of routing.locales) {
    for (const p of properties) {
      params.push({ locale, id: String(p.id) });
    }
  }
  return params;
}

export const dynamicParams = true;
/** إجبار التحميل الديناميكي لقراءة الكوكي (حالة المحجوز) في كل طلب */
export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ unit?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const { id } = resolvedParams;
  const unitKey = resolvedSearch.unit;
  const cookieStore = await cookies();
  const overridesCookie = cookieStore.get('bhd_property_overrides')?.value ?? null;
  const overrides = getPropertyOverrides(overridesCookie);
  const dataOverrides = getPropertyDataOverrides(overridesCookie);

  if (unitKey) {
    return (
      <PropertyDetailLoader
        id={id}
        unitKey={unitKey}
        locale={resolvedParams.locale}
      />
    );
  }

  const property = getPropertyById(id, dataOverrides);
  if (!property) notFound();

  const isMultiUnit = (property as { propertyTypeAr?: string }).propertyTypeAr === 'مبنى' &&
    (property as { propertySubTypeAr?: string }).propertySubTypeAr === 'متعدد الوحدات';

  if (isMultiUnit) {
    notFound();
  }

  const o = overrides[String(id)];
  if (o) {
    const businessStatus = o.businessStatus ?? (property as { businessStatus?: string })?.businessStatus ?? 'AVAILABLE';
    const isPublished = o.isPublished ?? (property as { isPublished?: boolean })?.isPublished ?? true;
    if ((businessStatus !== 'AVAILABLE' && businessStatus !== 'RESERVED') || isPublished === false) notFound();
  }

  const published = getPublishedProperties(overridesCookie);
  const similarProperties = published
    .filter((p) => (p as PropertyListing).unitKey ? p.id !== property.id : true)
    .filter((p) => p.id !== property.id || (p as PropertyListing).unitKey)
    .filter((p) => p.type === property.type)
    .filter((p) =>
      (p.governorateAr === property.governorateAr && p.governorateEn === property.governorateEn) ||
      (p.stateAr === property.stateAr && p.stateEn === property.stateEn)
    )
    .slice(0, 3);

  const businessStatus = o?.businessStatus ?? (property as { businessStatus?: string })?.businessStatus ?? 'AVAILABLE';
  const propertyWithStatus = { ...property, businessStatus };

  return <PropertyDetails property={propertyWithStatus as any} locale={resolvedParams.locale} similarProperties={similarProperties as any} />;
}
