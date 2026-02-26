'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

import { properties, updateProperty, updatePropertyUnit, getPropertyOverrides, getPropertyById, getPropertyDataOverrides, getUnitSerialNumber, type PropertyBusinessStatus, type Property } from '@/lib/data/properties';
import PropertyBarcode from '@/components/admin/PropertyBarcode';
import { getBookingsByProperty } from '@/lib/data/bookings';

type PropertyWithStatus = (typeof properties)[number] & { businessStatus?: PropertyBusinessStatus; isPublished?: boolean; propertySubTypeAr?: string };

const BUSINESS_STATUS_LABELS: Record<PropertyBusinessStatus, { ar: string; en: string }> = {
  AVAILABLE: { ar: 'شاغر', en: 'Available' },
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  INACTIVE: { ar: 'غير نشط', en: 'Inactive' },
  RENTED: { ar: 'مؤجر', en: 'Rented' },
  SOLD: { ar: 'مباع', en: 'Sold' },
  RESERVED: { ar: 'محجوز', en: 'Reserved' },
};

type UnitInfo = { unitKey: string; unitType: string; unitNumber: string; price: number; area: number; bedrooms?: number; bathrooms?: number };

type MultiUnitItem = { unitNumber?: string; price: number; area: number; bedrooms?: number; bathrooms?: number };

function getUnits(prop: Property): UnitInfo[] {
  const units: UnitInfo[] = [];
  const p = prop as Property;
  ((p.multiUnitShops || []) as MultiUnitItem[]).forEach((u, i) =>
    units.push({ unitKey: `shop-${i}`, unitType: 'محل', unitNumber: String(u.unitNumber || i + 1), price: u.price, area: u.area })
  );
  ((p.multiUnitShowrooms || []) as MultiUnitItem[]).forEach((u, i) =>
    units.push({ unitKey: `showroom-${i}`, unitType: 'معرض', unitNumber: String(u.unitNumber || i + 1), price: u.price, area: u.area })
  );
  ((p.multiUnitApartments || []) as MultiUnitItem[]).forEach((u, i) =>
    units.push({
      unitKey: `apartment-${i}`,
      unitType: 'شقة',
      unitNumber: String(u.unitNumber || i + 1),
      price: u.price,
      area: u.area,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
    })
  );
  return units;
}

export default function PropertiesAdminPage() {
  const [filter, setFilter] = useState<'all' | 'rent' | 'sale' | 'investment'>('all');
  const [businessFilter, setBusinessFilter] = useState<'all' | PropertyBusinessStatus>('all');
  const [searchSerial, setSearchSerial] = useState('');
  const [overrides, setOverrides] = useState<Record<string, { businessStatus?: PropertyBusinessStatus; isPublished?: boolean; units?: Record<string, { businessStatus?: PropertyBusinessStatus; isPublished?: boolean }> }>>({});
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const dataOverrides = getPropertyDataOverrides();
  const displayProperties = properties.map((p) => getPropertyById(p.id, dataOverrides) ?? p) as Property[];

  useEffect(() => {
    const refresh = () => setOverrides(getPropertyOverrides() as any);
    refresh();
    // مزامنة عند تغيير البيانات من تاب آخر (حجز عميل أو تغيير من صفحة الحجوزات)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_property_overrides' || e.key === 'bhd_property_bookings') refresh();
    };
    const onFocus = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const getBusinessStatus = (p: PropertyWithStatus, unitKey?: string): PropertyBusinessStatus => {
    const o = overrides[String(p.id)];
    if (unitKey && o?.units?.[unitKey]) return o.units[unitKey].businessStatus ?? 'AVAILABLE';
    return o?.businessStatus ?? (p.businessStatus ?? 'AVAILABLE');
  };

  const getIsPublished = (p: PropertyWithStatus, unitKey?: string): boolean => {
    const o = overrides[String(p.id)];
    if (unitKey && o?.units?.[unitKey]) return o.units[unitKey].isPublished ?? false;
    return o?.isPublished ?? (p.isPublished ?? false);
  };

  const canBePublished = (p: PropertyWithStatus, unitKey?: string) => getBusinessStatus(p, unitKey) === 'AVAILABLE';

  /** هل للعقار/الوحدة حجز نشط (محجوز/مؤجر) - التعديل يكون من صفحة الحجوزات فقط */
  const hasActiveBooking = (propertyId: number, unitKey?: string) => {
    const bookings = getBookingsByProperty(propertyId);
    return bookings.some(
      (b) =>
        b.type === 'BOOKING' &&
        b.paymentConfirmed &&
        b.status !== 'CANCELLED' &&
        (unitKey !== undefined ? b.unitKey === unitKey : !b.unitKey)
    );
  };

  const handleUnitStatusClickWhenLocked = () => {
    alert(
      'لا يمكن تعديل حالة العقار من هنا.\n\nإدارة العقار المحجوز أو المؤجر تتم من صفحة الحجوزات فقط.\n\nلإلغاء الحجز وإرجاع العقار إلى "شاغر"، يرجى الذهاب إلى صفحة الحجوزات وتغيير حالة الحجز إلى "ملغى".'
    );
  };

  const handleBusinessStatusChange = (id: number, newStatus: PropertyBusinessStatus, unitKey?: string) => {
    if (unitKey) {
      const p = properties.find((x) => x.id === id) as PropertyWithStatus;
      const wasPublished = getIsPublished(p, unitKey);
      // AVAILABLE و RESERVED يظهران في الموقع - نحتفظ بـ isPublished أو نفعّله
      const keepPublished = newStatus === 'AVAILABLE' || newStatus === 'RESERVED';
      const newPublished = keepPublished ? (wasPublished ?? true) : false;
      updatePropertyUnit(id, unitKey, { businessStatus: newStatus, isPublished: newPublished });
      setOverrides((prev) => {
        const next = { ...prev };
        next[String(id)] = { ...next[String(id)], units: { ...next[String(id)]?.units, [unitKey]: { businessStatus: newStatus, isPublished: newPublished } } };
        return next;
      });
    } else {
      const wasPublished = getIsPublished(properties.find((x) => x.id === id) as PropertyWithStatus);
      updateProperty(id, { businessStatus: newStatus, isPublished: newStatus === 'AVAILABLE' ? wasPublished : false });
      setOverrides((prev) => ({ ...prev, [String(id)]: { ...prev[String(id)], businessStatus: newStatus, isPublished: newStatus === 'AVAILABLE' ? wasPublished : false } }));
    }
  };

  const handlePublishToggle = (id: number, unitKey?: string) => {
    const p = properties.find((x) => x.id === id) as PropertyWithStatus;
    if (getBusinessStatus(p, unitKey) !== 'AVAILABLE') return;
    const newVal = !getIsPublished(p, unitKey);
    if (unitKey) {
      updatePropertyUnit(id, unitKey, { isPublished: newVal });
      setOverrides((prev) => {
        const next = { ...prev };
        next[String(id)] = { ...next[String(id)], units: { ...next[String(id)]?.units, [unitKey]: { ...next[String(id)]?.units?.[unitKey], isPublished: newVal } } };
        return next;
      });
    } else {
      updateProperty(id, { isPublished: newVal });
      setOverrides((prev) => ({ ...prev, [String(id)]: { ...prev[String(id)], isPublished: newVal } }));
    }
  };
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  return (
    <div>
      <AdminPageHeader
        title="إدارة العقارات"
        subtitle="إضافة، تعديل، حذف وحجز العقارات"
        actions={
          <Link href={`/${locale}/admin/properties/new`} className="admin-btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            إضافة عقار
          </Link>
        }
      />

      <div className="admin-card mb-6">
        <div className="admin-card-body flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">البحث بالرقم:</label>
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="PRP-R-2025-0001"
              className="admin-input w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">النوع:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="admin-select">
              <option value="all">الكل</option>
              <option value="rent">للإيجار</option>
              <option value="sale">للبيع</option>
              <option value="investment">للاستثمار</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">حالة العقار:</label>
            <select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value as any)} className="admin-select">
              <option value="all">الكل</option>
              <option value="AVAILABLE">شاغر</option>
              <option value="RENTED">مؤجر</option>
              <option value="SOLD">مباع</option>
              <option value="RESERVED">محجوز</option>
              <option value="DRAFT">مسودة</option>
              <option value="INACTIVE">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>العقار</th>
                <th>النوع</th>
                <th>السعر</th>
                <th>حالة العقار</th>
                <th>منشور</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayProperties
                .filter((p) => {
                  const typeMatch = filter === 'all' || (filter === 'rent' && p.type === 'RENT') || (filter === 'sale' && p.type === 'SALE') || (filter === 'investment' && p.type === 'INVESTMENT');
                  const biz = getBusinessStatus(p as PropertyWithStatus);
                  const bizMatch = businessFilter === 'all' || biz === businessFilter;
                  const serialMatch = !searchSerial || (p as { serialNumber?: string }).serialNumber?.toUpperCase().includes(searchSerial.toUpperCase());
                  return typeMatch && bizMatch && serialMatch;
                })
                .map((property) => {
                  const isMultiUnit = (property as PropertyWithStatus).propertyTypeAr === 'مبنى' && (property as PropertyWithStatus).propertySubTypeAr === 'متعدد الوحدات';
                  const units = isMultiUnit ? getUnits(property as Property) : [];
                  const hasUnits = units.length > 0;
                  const isExpanded = expandedIds.has(property.id);
                  const bizStatus = getBusinessStatus(property as PropertyWithStatus);
                  const isPub = getIsPublished(property as PropertyWithStatus);
                  const canPub = canBePublished(property as PropertyWithStatus);
                  const propertyLocked = !isMultiUnit && hasActiveBooking(property.id);
                  return (
                    <React.Fragment key={property.id}>
                      <tr
                        key={property.id}
                        className={isMultiUnit ? 'bg-amber-50/50 border-l-4 border-l-amber-500' : ''}
                      >
                        <td className="font-mono text-sm text-primary font-semibold">
                          {(property as { serialNumber?: string }).serialNumber || '--'}
                          {isMultiUnit && (
                            <span className="mr-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-900">
                              متعدد
                            </span>
                          )}
                        </td>
                        <td className="font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <PropertyBarcode propertyId={property.id} locale={locale} size={28} className="shrink-0" />
                            <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-[#8B6F47]">
                              {[
                                (property as { landParcelNumber?: string }).landParcelNumber,
                                (property as { propertyNumber?: string }).propertyNumber || (property as { serialNumber?: string }).serialNumber,
                              ]
                                .filter(Boolean)
                                .join(' - ') || '--'}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {(property as { propertySubTypeAr?: string }).propertySubTypeAr
                                ? `${(property as { propertyTypeAr?: string }).propertyTypeAr || ''} ${(property as { propertySubTypeAr?: string }).propertySubTypeAr}`.trim()
                                : (property as { propertyTypeAr?: string }).propertyTypeAr || property.titleAr}
                            </span>
                            <span className="text-xs text-gray-500">
                              {[property.governorateAr, property.stateAr, (property as { areaAr?: string }).areaAr, property.villageAr]
                                .filter(Boolean)
                                .join(' - ') || '—'}
                            </span>
                            {hasUnits && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedIds((prev) => (prev.has(property.id) ? new Set([...prev].filter((x) => x !== property.id)) : new Set([...prev, property.id])))}
                                  className="text-amber-700 hover:text-amber-900 p-1 rounded hover:bg-amber-100"
                                  title={isExpanded ? 'إخفاء الوحدات' : 'عرض الوحدات'}
                                >
                                  <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <span className="text-xs text-amber-700 font-medium">عرض الوحدات</span>
                              </div>
                            )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${property.type === 'RENT' ? 'admin-badge-info' : property.type === 'SALE' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {property.type === 'RENT' ? 'إيجار' : property.type === 'SALE' ? 'بيع' : 'استثمار'}
                          </span>
                        </td>
                        <td className="font-semibold">
                          {isMultiUnit && hasUnits ? '—' : `${property.price.toLocaleString()} ر.ع.`}
                        </td>
                        <td>
                          {!isMultiUnit && (
                            propertyLocked ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-amber-700">{BUSINESS_STATUS_LABELS[bizStatus]?.ar ?? bizStatus}</span>
                                <Link href={`/${locale}/admin/properties/${property.id}/bookings`} className="text-xs text-violet-600 hover:underline font-medium">
                                  إدارة من صفحة الحجوزات ←
                                </Link>
                                <button type="button" onClick={handleUnitStatusClickWhenLocked} className="text-xs text-gray-500 hover:text-gray-700 underline">
                                  لماذا لا أستطيع التعديل؟
                                </button>
                              </div>
                            ) : (
                              <select
                                value={bizStatus}
                                onChange={(e) => handleBusinessStatusChange(property.id, e.target.value as PropertyBusinessStatus)}
                                className="admin-select text-sm py-1 px-2 w-24"
                              >
                                <option value="AVAILABLE">شاغر</option>
                                <option value="RENTED">مؤجر</option>
                                <option value="SOLD">مباع</option>
                                <option value="RESERVED">محجوز</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="INACTIVE">غير نشط</option>
                              </select>
                            )
                          )}
                          {isMultiUnit && <span className="text-gray-500 text-sm">—</span>}
                        </td>
                        <td>
                          {!isMultiUnit && (
                            canPub ? (
                              <button
                                type="button"
                                onClick={() => handlePublishToggle(property.id)}
                                className={`text-sm font-medium px-2 py-1 rounded ${isPub ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                              >
                                {isPub ? 'منشور' : 'غير منشور'}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">غير منشور</span>
                            )
                          )}
                          {isMultiUnit && <span className="text-gray-500 text-sm">—</span>}
                        </td>
                        <td>
                          <div className="flex gap-2 items-center flex-wrap">
                            <Link href={`/${locale}/admin/properties/${property.id}`} className="text-sm font-medium text-[#8B6F47] hover:underline">تعديل</Link>
                            <Link href={`/${locale}/admin/properties/${property.id}/extra-data`} className="text-sm font-medium text-blue-600 hover:underline">البيانات الإضافية</Link>
                            <Link href={`/${locale}/admin/properties/${property.id}/bookings`} className="text-sm font-medium text-violet-600 hover:underline">الحجوزات</Link>
                            <button className="text-sm font-medium text-red-600 hover:underline">حذف</button>
                          </div>
                        </td>
                      </tr>
                      {hasUnits && isExpanded && (
                        <tr key={`${property.id}-units`}>
                          <td colSpan={7} className="p-0 bg-gray-50">
                            <div className="p-4 border-t border-gray-200">
                              <table className="admin-table w-full text-sm">
                                <thead>
                                  <tr>
                                    <th>الرقم</th>
                                    <th>العقار</th>
                                    <th>النوع</th>
                                    <th>السعر</th>
                                    <th>حالة العقار</th>
                                    <th>منشور</th>
                                    <th>الإجراءات</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {units.map((u) => {
                                    const uBiz = getBusinessStatus(property as PropertyWithStatus, u.unitKey);
                                    const uPub = getIsPublished(property as PropertyWithStatus, u.unitKey);
                                    const uCanPub = canBePublished(property as PropertyWithStatus, u.unitKey);
                                    const unitLocked = hasActiveBooking(property.id, u.unitKey);
                                    const baseSerial = (property as { serialNumber?: string }).serialNumber || '';
                                    const unitSerial = getUnitSerialNumber(baseSerial, u.unitKey.startsWith('shop') ? 'shop' : u.unitKey.startsWith('showroom') ? 'showroom' : 'apartment', parseInt(u.unitKey.split('-')[1], 10));
                                    const unitTypePrefix = u.unitKey.startsWith('shop') ? 'S' : u.unitKey.startsWith('showroom') ? 'M' : 'A';
                                    const propNum = (property as { propertyNumber?: string }).propertyNumber || (property as { serialNumber?: string }).serialNumber || '';
                                    const unitCode = propNum ? `${unitTypePrefix}${propNum}` : u.unitNumber;
                                    const landNum = (property as { landParcelNumber?: string }).landParcelNumber;
                                    const unitTitleLine1 = [landNum, propNum, unitCode].filter(Boolean).join(' - ');
                                    return (
                                      <tr key={u.unitKey} className="bg-white">
                                        <td className="font-mono text-xs text-primary">{unitSerial}</td>
                                        <td>
                                          <div className="flex items-center gap-2">
                                            <PropertyBarcode propertyId={property.id} unitKey={u.unitKey} locale={locale} size={28} className="shrink-0" />
                                            <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-semibold text-[#8B6F47]">
                                              {unitTitleLine1 || unitSerial}
                                            </span>
                                            <span className="text-sm font-medium text-gray-800">
                                              {(property as { propertySubTypeAr?: string }).propertySubTypeAr
                                                ? `${(property as { propertyTypeAr?: string }).propertyTypeAr || ''} ${(property as { propertySubTypeAr?: string }).propertySubTypeAr}`.trim()
                                                : (property as { propertyTypeAr?: string }).propertyTypeAr || property.titleAr}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {[property.governorateAr, property.stateAr, (property as { areaAr?: string }).areaAr, property.villageAr]
                                                .filter(Boolean)
                                                .join(' - ') || '—'}
                                            </span>
                                          </div>
                                        </td>
                                        <td><span className="admin-badge admin-badge-info">{u.unitType}</span></td>
                                        <td className="font-semibold">{u.price.toLocaleString()} ر.ع</td>
                                        <td>
                                          {unitLocked ? (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-sm font-semibold text-amber-700">{BUSINESS_STATUS_LABELS[uBiz]?.ar ?? uBiz}</span>
                                              <Link
                                                href={`/${locale}/admin/properties/${property.id}/bookings`}
                                                className="text-xs text-violet-600 hover:underline font-medium"
                                              >
                                                إدارة من صفحة الحجوزات ←
                                              </Link>
                                              <button
                                                type="button"
                                                onClick={handleUnitStatusClickWhenLocked}
                                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                                              >
                                                لماذا لا أستطيع التعديل؟
                                              </button>
                                            </div>
                                          ) : (
                                            <select
                                              value={uBiz}
                                              onChange={(e) => handleBusinessStatusChange(property.id, e.target.value as PropertyBusinessStatus, u.unitKey)}
                                              className="admin-select text-sm py-1 px-2 w-24"
                                            >
                                              <option value="AVAILABLE">شاغر</option>
                                              <option value="RENTED">مؤجر</option>
                                              <option value="SOLD">مباع</option>
                                              <option value="RESERVED">محجوز</option>
                                              <option value="DRAFT">مسودة</option>
                                              <option value="INACTIVE">غير نشط</option>
                                            </select>
                                          )}
                                        </td>
                                        <td>
                                          {uCanPub ? (
                                            <button
                                              type="button"
                                              onClick={() => handlePublishToggle(property.id, u.unitKey)}
                                              className={`text-sm font-medium px-2 py-1 rounded ${uPub ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                              {uPub ? 'منشور' : 'غير منشور'}
                                            </button>
                                          ) : uBiz === 'RESERVED' ? (
                                            <span className="text-sm font-medium px-2 py-1 rounded bg-green-100 text-green-800">منشور</span>
                                          ) : (
                                            <span className="text-sm text-gray-400">غير منشور</span>
                                          )}
                                        </td>
                                        <td>
                                          <Link href={`/${locale}/properties/${property.id}?unit=${u.unitKey}`} target="_blank" className="text-sm font-medium text-primary hover:underline">عرض</Link>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {properties.length === 0 && (
        <div className="admin-card">
          <div className="admin-card-body text-center py-16">
            <p className="text-gray-500 font-medium">لا توجد عقارات. يمكنك إضافة عقار جديد.</p>
            <Link href={`/${locale}/admin/properties/new`} className="admin-btn-primary mt-4 inline-block">إضافة عقار</Link>
          </div>
        </div>
      )}
    </div>
  );
}
