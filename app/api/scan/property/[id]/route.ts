import { NextResponse } from 'next/server';
import { getPropertyById, getUnitSerialNumber } from '@/lib/data/properties';

/** API عامة لعرض تفاصيل العقار عند مسح الباركود - لا تتطلب تسجيل دخول */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const property = getPropertyById(id, {});
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const url = new URL(_req.url);
    const unitKey = url.searchParams.get('unit') || undefined;

    const base = property as {
      id: number;
      serialNumber?: string;
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
      multiUnitShops?: { unitNumber?: string; price: number; area: number }[];
      multiUnitShowrooms?: { unitNumber?: string; price: number; area: number }[];
      multiUnitApartments?: { unitNumber?: string; price: number; area: number; bedrooms?: number; bathrooms?: number }[];
    };

    let unitData: { unitKey: string; unitType: string; unitNumber: string; price: number; area: number; bedrooms?: number; bathrooms?: number } | null = null;

    if (unitKey) {
      const [type, idxStr] = unitKey.split('-');
      const idx = parseInt(idxStr || '0', 10);
      const baseSerial = base.serialNumber || '';
      if (type === 'shop' && base.multiUnitShops?.[idx]) {
        const u = base.multiUnitShops[idx];
        unitData = {
          unitKey,
          unitType: 'shop',
          unitNumber: String(u.unitNumber ?? idx + 1),
          price: u.price,
          area: u.area,
        };
      } else if (type === 'showroom' && base.multiUnitShowrooms?.[idx]) {
        const u = base.multiUnitShowrooms[idx];
        unitData = {
          unitKey,
          unitType: 'showroom',
          unitNumber: String(u.unitNumber ?? idx + 1),
          price: u.price,
          area: u.area,
        };
      } else if (type === 'apartment' && base.multiUnitApartments?.[idx]) {
        const u = base.multiUnitApartments[idx];
        unitData = {
          unitKey,
          unitType: 'apartment',
          unitNumber: String(u.unitNumber ?? idx + 1),
          price: u.price,
          area: u.area,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
        };
      }
    }

    const baseSerial = base.serialNumber || '';
    const unitSerial = unitData
      ? getUnitSerialNumber(
          baseSerial,
          unitData.unitType as 'shop' | 'showroom' | 'apartment',
          unitKey ? (parseInt(unitKey.split('-')[1] ?? '0', 10) || 0) : 0
        )
      : null;

    return NextResponse.json({
      id: property.id,
      serialNumber: base.serialNumber,
      unitSerial: unitSerial || undefined,
      titleAr: base.titleAr,
      titleEn: base.titleEn,
      descriptionAr: base.descriptionAr,
      descriptionEn: base.descriptionEn,
      type: base.type,
      propertyTypeAr: base.propertyTypeAr,
      propertyTypeEn: base.propertyTypeEn,
      propertySubTypeAr: base.propertySubTypeAr,
      propertySubTypeEn: base.propertySubTypeEn,
      locationAr: base.locationAr,
      locationEn: base.locationEn,
      governorateAr: base.governorateAr,
      governorateEn: base.governorateEn,
      stateAr: base.stateAr,
      stateEn: base.stateEn,
      villageAr: base.villageAr,
      villageEn: base.villageEn,
      price: unitData ? unitData.price : base.price,
      area: unitData ? unitData.area : base.area,
      bedrooms: unitData?.bedrooms ?? base.bedrooms,
      bathrooms: unitData?.bathrooms ?? base.bathrooms,
      parkingSpaces: base.parkingSpaces,
      unit: unitData,
    });
  } catch (e) {
    console.error('Scan property API error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
