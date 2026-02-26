/**
 * التحقق من اكتمال البيانات الإضافية للمبنى
 * جميع الحقول إلزامية ولا يُسمح بإنشاء عقد إيجار إلا بعد اكتمالها
 */

import { getPropertyById, getPropertyDataOverrides } from './properties';
import { hasPropertyLandlord } from './propertyLandlords';

export function isPropertyExtraDataComplete(
  propertyId: number,
  cookieValue?: string | null
): boolean {
  const dataOverrides = getPropertyDataOverrides(cookieValue);
  const prop = getPropertyById(propertyId, dataOverrides);
  if (!prop) return false;

  if (!hasPropertyLandlord(propertyId)) return false;

  const p = prop as {
    governorateAr?: string;
    stateAr?: string;
    areaAr?: string;
    villageAr?: string;
    landParcelNumber?: string;
    propertyNumber?: string;
    surveyMapNumber?: string;
    complexNumber?: string;
    landUseType?: string;
    streetAlleyNumber?: string;
    electricityMeterNumber?: string;
    waterMeterNumber?: string;
    buildingManagementNumber?: string;
    responsiblePersonName?: string;
    buildingGuardNumber?: string;
    guardName?: string;
    maintenanceNumber?: string;
    maintenanceResponsibleName?: string;
    fireExtinguisherInfo?: string;
    buildingPhoneNumber?: string;
    internetNumber?: string;
  };

  const required = [
    p.governorateAr,
    p.stateAr,
    p.areaAr,
    p.villageAr,
    p.landParcelNumber,
    p.propertyNumber,
    p.surveyMapNumber,
    p.complexNumber,
    p.landUseType,
    p.streetAlleyNumber,
    p.electricityMeterNumber,
    p.waterMeterNumber,
    p.buildingManagementNumber,
    p.responsiblePersonName,
    p.buildingGuardNumber,
    p.guardName,
    p.maintenanceNumber,
    p.maintenanceResponsibleName,
    p.fireExtinguisherInfo,
    p.buildingPhoneNumber,
    p.internetNumber,
  ];

  return required.every((v) => typeof v === 'string' && v.trim().length > 0);
}
