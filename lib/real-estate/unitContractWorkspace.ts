import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';
import { daysUntil, normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';
import type { ContractPayload, SavedContractEntry, TenancyDraftEntry } from '@/lib/real-estate/operationsUnit';

export type ContractWorkspaceMode = 'fill' | 'renew' | 'view';

export type UnitContractFormValues = {
  agreementNo: string;
  tenantNameAr: string;
  tenantNameEn: string;
  tenantMobile: string;
  civilCard: string;
  buildingNo: string;
  flatNo: string;
  floorDetails: string;
  unitType: string;
  contractType: 'residential' | 'commercial';
  monthlyRent: string;
  startDate: string;
  endDate: string;
  contractMonths: string;
  electricityMeter: string;
  waterMeter: string;
  municipalFormNo: string;
  municipalContractNo: string;
  remarks: string;
};

export type UnitContractWorkspace = {
  mode: ContractWorkspaceMode;
  values: UnitContractFormValues;
  hasSavedContract: boolean;
  hasTenancyDraft: boolean;
  hasRenewalDraft: boolean;
  canRenew: boolean;
  lifecycleStatus: string;
  previousAgreementNo: string;
};

function emptyFormValues(building: string, unit: string): UnitContractFormValues {
  return {
    agreementNo: '',
    tenantNameAr: '',
    tenantNameEn: '',
    tenantMobile: '',
    civilCard: '',
    buildingNo: building,
    flatNo: unit,
    floorDetails: '',
    unitType: 'Flat',
    contractType: 'residential',
    monthlyRent: '',
    startDate: '',
    endDate: '',
    contractMonths: '12',
    electricityMeter: '',
    waterMeter: '',
    municipalFormNo: '',
    municipalContractNo: '',
    remarks: '',
  };
}

function contractTypeFromUnitType(unitType: string): 'residential' | 'commercial' {
  const t = unitType.trim();
  return t === 'Shop' || t === 'Office' ? 'commercial' : 'residential';
}

export function proposeRenewalPeriod(previousEndDate: string): {
  startDate: string;
  endDate: string;
  contractMonths: string;
} {
  const fallback = new Date();
  const prevEnd = previousEndDate?.trim() ? new Date(previousEndDate) : fallback;
  const start = new Date(prevEnd.getTime() + 86400000);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    contractMonths: '12',
  };
}

function payloadToFormValues(payload: ContractPayload, base: UnitContractFormValues): UnitContractFormValues {
  const unitType = toStr(payload.unitType) || base.unitType;
  return {
    ...base,
    agreementNo: toStr(payload.agreementNo) || base.agreementNo,
    tenantNameAr: toStr(payload.tenantNameAr) || base.tenantNameAr,
    tenantNameEn: toStr(payload.tenantNameEn) || base.tenantNameEn,
    tenantMobile: toStr(payload.tenantMobile) || base.tenantMobile,
    civilCard: toStr(payload.tenantId) || base.civilCard,
    buildingNo: toStr(payload.buildingNo) || base.buildingNo,
    flatNo: toStr(payload.flatNo) || base.flatNo,
    floorDetails: toStr(payload.floorDetails) || base.floorDetails,
    unitType,
    contractType: contractTypeFromUnitType(unitType),
    monthlyRent:
      payload.monthlyRent != null && payload.monthlyRent !== ''
        ? String(payload.monthlyRent)
        : base.monthlyRent,
    startDate: toStr(payload.startDate) || base.startDate,
    endDate: toStr(payload.endDate) || base.endDate,
    contractMonths: toStr((payload as Record<string, unknown>).contractMonths) || base.contractMonths,
    electricityMeter: toStr(payload.electricityMeter) || base.electricityMeter,
    waterMeter: toStr(payload.waterMeter) || base.waterMeter,
    municipalFormNo: toStr((payload as Record<string, unknown>).municipalFormNo) || base.municipalFormNo,
    municipalContractNo:
      toStr((payload as Record<string, unknown>).municipalContractNo) || base.municipalContractNo,
    remarks: toStr((payload as Record<string, unknown>).remarks) || base.remarks,
  };
}

function getSavedEntry(
  map: Record<string, SavedContractEntry>,
  building: string,
  unit: string
): SavedContractEntry | null {
  const hk = unitRowKey(building, unit);
  if (map[hk]?.payload) return map[hk];
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  return map[kLeg]?.payload ? map[kLeg] : null;
}

function getTenancyDraftEntry(
  map: Record<string, TenancyDraftEntry>,
  building: string,
  unit: string
): TenancyDraftEntry | null {
  const hk = unitRowKey(building, unit);
  if (map[hk]?.payload) return map[hk];
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  return map[kLeg]?.payload ? map[kLeg] : null;
}

function getRenewalDraftEntry(
  map: Record<string, Record<string, unknown>>,
  building: string,
  unit: string
): Record<string, unknown> | null {
  const bk = normalizeBuildingKey(building);
  const uk = normalizeUnit(unit);
  for (const entry of Object.values(map)) {
    if (!entry) continue;
    const p = (entry.payload && typeof entry.payload === 'object' ? entry.payload : {}) as Record<
      string,
      unknown
    >;
    if (normalizeBuildingKey(p.buildingNo) === bk && normalizeUnit(p.flatNo) === uk) return entry;
  }
  return null;
}

function unitRowToBaseValues(
  row: Record<string, unknown> | null,
  building: string,
  unit: string
): UnitContractFormValues {
  const base = emptyFormValues(building, unit);
  if (!row) return base;
  const unitType = toStr(row.unitType) || base.unitType;
  return {
    ...base,
    tenantNameAr: toStr(row.tenant) || base.tenantNameAr,
    tenantNameEn: toStr(row.tenantEn) || base.tenantNameEn,
    tenantMobile: toStr(row.mobile || row.contactNo) || base.tenantMobile,
    civilCard: toStr(row.civilCard) || base.civilCard,
    agreementNo: toStr(row.agreementNo) || base.agreementNo,
    floorDetails: toStr(row.floor) || base.floorDetails,
    unitType,
    contractType: contractTypeFromUnitType(unitType),
    monthlyRent:
      row.monthlyRent != null && row.monthlyRent !== '' ? String(row.monthlyRent) : base.monthlyRent,
    startDate: toStr(row.startDate) || base.startDate,
    endDate: toStr(row.endDate) || base.endDate,
    electricityMeter: toStr(row.electricity) || base.electricityMeter,
    waterMeter: toStr(row.water) || base.waterMeter,
    remarks: toStr(row.remarks) || base.remarks,
  };
}

export function buildUnitContractWorkspace(
  kv: LegacyKvStringMap,
  building: string,
  unit: string,
  mode: ContractWorkspaceMode,
  unitRow?: Record<string, unknown> | null
): UnitContractWorkspace {
  const savedMap = parseJson<Record<string, SavedContractEntry>>(kv.bhd_saved_contracts_by_unit, {});
  const draftMap = parseJson<Record<string, TenancyDraftEntry>>(kv.bhd_tenancy_contract_drafts, {});
  const renewalMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_renewal_drafts, {});

  const savedEntry = getSavedEntry(savedMap, building, unit);
  const tenancyDraft = getTenancyDraftEntry(draftMap, building, unit);
  const renewalDraft = getRenewalDraftEntry(renewalMap, building, unit);

  let values = unitRowToBaseValues(unitRow ?? null, building, unit);

  if (savedEntry?.payload) {
    values = payloadToFormValues(savedEntry.payload, values);
  }
  if (tenancyDraft?.payload && mode !== 'renew') {
    values = payloadToFormValues(tenancyDraft.payload, values);
  }
  if (renewalDraft && mode === 'renew') {
    const p = (renewalDraft.payload && typeof renewalDraft.payload === 'object'
      ? renewalDraft.payload
      : {}) as ContractPayload;
    const r = (renewalDraft.renewal && typeof renewalDraft.renewal === 'object'
      ? renewalDraft.renewal
      : {}) as Record<string, unknown>;
    values = payloadToFormValues(p, values);
    if (toStr(r.agreementNo)) values.agreementNo = toStr(r.agreementNo);
    if (toStr(r.newStart)) values.startDate = toStr(r.newStart);
    if (toStr(r.newEnd)) values.endDate = toStr(r.newEnd);
  }

  const status = toStr(unitRow?.status);
  const endDate = toStr(values.endDate || unitRow?.endDate);
  const canRenew =
    !!savedEntry?.payload &&
    status.toLowerCase() === 'rented' &&
    !!endDate &&
    (daysUntil(endDate) ?? 1) >= -365;

  if (mode === 'renew' && canRenew && !renewalDraft) {
    const period = proposeRenewalPeriod(endDate);
    values.startDate = period.startDate;
    values.endDate = period.endDate;
    values.contractMonths = period.contractMonths;
    const prevAg = toStr(savedEntry?.payload?.agreementNo);
    if (prevAg && !values.agreementNo.includes('-R')) {
      values.agreementNo = `${prevAg}-R`;
    }
  }

  if (mode === 'view') {
    // read-only snapshot — prefer saved contract
    if (savedEntry?.payload) {
      values = payloadToFormValues(savedEntry.payload, values);
    }
  }

  return {
    mode,
    values,
    hasSavedContract: !!savedEntry?.payload,
    hasTenancyDraft: !!tenancyDraft?.payload,
    hasRenewalDraft: !!renewalDraft,
    canRenew,
    lifecycleStatus: toStr(savedEntry?.lifecycleStatus || savedEntry?.payload?.contractSavedStatus),
    previousAgreementNo: toStr(
      (savedEntry?.payload as Record<string, unknown> | undefined)?.previousAgreementNo ||
        savedEntry?.payload?.agreementNo
    ),
  };
}

export function formValuesToContractPayload(values: UnitContractFormValues): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    agreementNo: values.agreementNo.trim(),
    tenantNameAr: values.tenantNameAr.trim(),
    tenantNameEn: values.tenantNameEn.trim(),
    tenantMobile: values.tenantMobile.trim(),
    tenantId: values.civilCard.trim(),
    buildingNo: values.buildingNo.trim(),
    flatNo: values.flatNo.trim(),
    floorDetails: values.floorDetails.trim(),
    unitType: values.unitType.trim() || 'Flat',
    contractTypeSelect:
      values.contractType === 'commercial' ? 'تجاري Commercial' : 'سكني Residential',
    monthlyRent: values.monthlyRent.trim(),
    startDate: values.startDate.trim(),
    endDate: values.endDate.trim(),
    contractMonths: values.contractMonths.trim() || '12',
    electricityMeter: values.electricityMeter.trim(),
    waterMeter: values.waterMeter.trim(),
    municipalFormNo: values.municipalFormNo.trim(),
    municipalContractNo: values.municipalContractNo.trim(),
    remarks: values.remarks.trim(),
    _savedAt: now,
    _savedFromReact: true,
  };
}

export const UNIT_CONTRACT_KV_KEYS = [
  'bhd_saved_contracts_by_unit',
  'bhd_tenancy_contract_drafts',
  'bhd_contract_renewal_drafts',
  'bhd_managed_units',
] as const;
