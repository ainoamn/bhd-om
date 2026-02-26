/**
 * التحقق من اكتمال البيانات الإضافية للمبنى
 * جميع الحقول إلزامية لإنشاء عقد الإيجار بعد اعتماد المستندات
 */

import { getPropertyById, getPropertyDataOverrides } from './properties';
import { hasPropertyLandlord } from './propertyLandlords';

const REQUIRED_EXTRA_FIELDS = [
  'governorateAr',
  'stateAr',
  'areaAr',
  'villageAr',
  'landParcelNumber',
  'propertyNumber',
  'complexNumber',
  'landUseType',
  'streetAlleyNumber',
  'electricityMeterNumber',
  'waterMeterNumber',
  'surveyMapNumber',
  'buildingManagementNumber',
  'responsiblePersonName',
  'buildingGuardNumber',
  'guardName',
  'maintenanceNumber',
  'maintenanceResponsibleName',
  'fireExtinguisherInfo',
  'buildingPhoneNumber',
  'internetNumber',
] as const;

/** هل البيانات الإضافية للمبنى مكتملة؟ (جميع الحقول إلزامية) */
export function isPropertyExtraDataComplete(propertyId: number): boolean {
  if (!hasPropertyLandlord(propertyId)) return false;
  const dataOverrides = getPropertyDataOverrides();
  const prop = getPropertyById(propertyId, dataOverrides);
  if (!prop) return false;
  const p = prop as Record<string, unknown>;
  for (const key of REQUIRED_EXTRA_FIELDS) {
    const val = p[key];
    if (val === undefined || val === null || String(val).trim() === '') return false;
  }
  return true;
}

const EXTRA_DATA_LABELS: Record<string, { ar: string; en: string }> = {
  governorateAr: { ar: 'المحافظة', en: 'Governorate' },
  stateAr: { ar: 'الولاية', en: 'State' },
  areaAr: { ar: 'المنطقة', en: 'Area' },
  villageAr: { ar: 'الحي', en: 'Neighborhood' },
  landParcelNumber: { ar: 'رقم القطعة', en: 'Land Parcel No.' },
  propertyNumber: { ar: 'رقم المبنى', en: 'Building No.' },
  complexNumber: { ar: 'رقم المجمع', en: 'Complex No.' },
  landUseType: { ar: 'نوع استعمال الأرض', en: 'Land Use Type' },
  streetAlleyNumber: { ar: 'رقم السكة/الزقاق', en: 'Street/Alley No.' },
  electricityMeterNumber: { ar: 'رقم عداد الكهرباء', en: 'Electricity Meter' },
  waterMeterNumber: { ar: 'رقم عداد الماء', en: 'Water Meter' },
  surveyMapNumber: { ar: 'رقم الرسم المساحي', en: 'Survey Map No.' },
  buildingManagementNumber: { ar: 'رقم إدارة المبنى', en: 'Management No.' },
  responsiblePersonName: { ar: 'أسم الشخص المسؤول', en: 'Responsible Person' },
  buildingGuardNumber: { ar: 'رقم حارس المبنى', en: 'Guard Phone' },
  guardName: { ar: 'أسم الحارس', en: 'Guard Name' },
  maintenanceNumber: { ar: 'رقم الصيانة', en: 'Maintenance No.' },
  maintenanceResponsibleName: { ar: 'أسم المسؤول عن الصيانة', en: 'Maintenance Responsible' },
  fireExtinguisherInfo: { ar: 'عداد الحريق', en: 'Fire Extinguisher' },
  buildingPhoneNumber: { ar: 'رقم الهاتف', en: 'Phone No.' },
  internetNumber: { ar: 'رقم الانترنت', en: 'Internet No.' },
};

/** حقول البيانات الإضافية المستثناة من العرض في ملخص العقد (غير ضرورية للمستأجر) */
export const EXCLUDED_EXTRA_DATA_DISPLAY_KEYS: readonly string[] = [
  'electricityMeterNumber',
  'waterMeterNumber',
  'buildingManagementNumber',
  'responsiblePersonName',
  'buildingGuardNumber',
  'guardName',
  'maintenanceNumber',
  'maintenanceResponsibleName',
  'fireExtinguisherInfo',
  'buildingPhoneNumber',
  'internetNumber',
];

/** الحصول على نص البيانات الإضافية للعرض (بيانات العقار الإضافية) */
export function getPropertyExtraDataDisplayText(propertyId: number | string, ar = true, excludeForSummary = false): string {
  const dataOverrides = getPropertyDataOverrides();
  const prop = getPropertyById(typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId, dataOverrides);
  if (!prop) return '';
  const p = prop as Record<string, unknown>;
  const excludeSet = excludeForSummary ? new Set(EXCLUDED_EXTRA_DATA_DISPLAY_KEYS) : new Set<string>();
  const lines: string[] = [];
  for (const key of REQUIRED_EXTRA_FIELDS) {
    if (excludeSet.has(key)) continue;
    const val = p[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const label = EXTRA_DATA_LABELS[key]?.[ar ? 'ar' : 'en'] ?? key;
      lines.push(`${label}: ${val}`);
    }
  }
  return lines.join('\n');
}

/** الحصول على البيانات الإضافية كأزواج [label, value] للعرض في جدول */
export function getPropertyExtraDataPairs(propertyId: number | string, ar = true, excludeForSummary = true): Array<{ label: string; value: string }> {
  const dataOverrides = getPropertyDataOverrides();
  const prop = getPropertyById(typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId, dataOverrides);
  if (!prop) return [];
  const p = prop as Record<string, unknown>;
  const excludeSet = excludeForSummary ? new Set(EXCLUDED_EXTRA_DATA_DISPLAY_KEYS) : new Set<string>();
  const pairs: Array<{ label: string; value: string }> = [];
  for (const key of REQUIRED_EXTRA_FIELDS) {
    if (excludeSet.has(key)) continue;
    const val = p[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const label = EXTRA_DATA_LABELS[key]?.[ar ? 'ar' : 'en'] ?? key;
      pairs.push({ label, value: String(val) });
    }
  }
  return pairs;
}

/** الحصول على قائمة الحقول الناقصة */
export function getMissingExtraDataFields(propertyId: number, ar = true): string[] {
  const missing: string[] = [];
  if (!hasPropertyLandlord(propertyId)) {
    missing.push(ar ? 'بيانات المالك' : 'Landlord');
  }
  const dataOverrides = getPropertyDataOverrides();
  const prop = getPropertyById(propertyId, dataOverrides);
  if (!prop) return missing;
  const p = prop as Record<string, unknown>;
  for (const key of REQUIRED_EXTRA_FIELDS) {
    const val = p[key];
    if (val === undefined || val === null || String(val).trim() === '') {
      missing.push(EXTRA_DATA_LABELS[key]?.[ar ? 'ar' : 'en'] ?? key);
    }
  }
  return missing;
}
