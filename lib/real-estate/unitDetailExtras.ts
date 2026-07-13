import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';
import { normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';

export type UnitDetailExtras = {
  renewalNoteAr?: string;
  renewalNoteEn?: string;
  cancellationNoteAr?: string;
  cancellationNoteEn?: string;
  requestedCancelDate?: string;
  previousAgreementNo?: string;
  municipalFormNo?: string;
  municipalContractNo?: string;
  openMaintenanceCount: number;
  pendingChequesCount: number;
};

function unitMatches(building: string, unit: string, bRaw: unknown, uRaw: unknown): boolean {
  return normalizeBuildingKey(bRaw) === building && normalizeUnit(uRaw) === unit;
}

function maintenanceUnitKey(building: string, unit: string): string {
  return `${toStr(building)}\t${toStr(unit)}`;
}

function accountingUnitKey(building: string, unit: string): string {
  return `${toStr(building)}\t${toStr(unit)}`;
}

export function resolveUnitDetailExtras(
  kv: LegacyKvStringMap,
  buildingRaw: string,
  unitRaw: string
): UnitDetailExtras {
  const bk = normalizeBuildingKey(buildingRaw);
  const uk = normalizeUnit(unitRaw);
  const hk = unitRowKey(buildingRaw, unitRaw);
  const extras: UnitDetailExtras = {
    openMaintenanceCount: 0,
    pendingChequesCount: 0,
  };

  const savedMap = parseJson<Record<string, { payload?: Record<string, unknown> }>>(
    kv.bhd_saved_contracts_by_unit,
    {}
  );
  const savedPayload = savedMap[hk]?.payload;
  if (savedPayload) {
    extras.previousAgreementNo = toStr(savedPayload.previousAgreementNo) || undefined;
    extras.municipalFormNo = toStr(savedPayload.municipalFormNo) || undefined;
    extras.municipalContractNo = toStr(savedPayload.municipalContractNo) || undefined;
    if (extras.previousAgreementNo) {
      extras.renewalNoteAr = `تجديد — العقد السابق: ${extras.previousAgreementNo}`;
      extras.renewalNoteEn = `Renewal — previous contract: ${extras.previousAgreementNo}`;
    }
  }

  const renewalDraftMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_renewal_drafts, {});
  const hasRenewalDraft = Object.values(renewalDraftMap).some((e) => {
    if (!e) return false;
    const p = (e.payload && typeof e.payload === 'object' ? e.payload : {}) as Record<string, unknown>;
    return unitMatches(bk, uk, p.buildingNo, p.flatNo);
  });
  if (hasRenewalDraft && !extras.renewalNoteAr) {
    extras.renewalNoteAr =
      'يوجد مسودة تجديد — أكمل «حفظ التجديد» لتفعيل العقد الجديد في النظام.';
    extras.renewalNoteEn =
      'Renewal draft in progress — complete «Save renewal» to activate the new contract in the system.';
  }

  const cancelReqMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_cancellation_requests, {});
  for (const [rk, req] of Object.entries(cancelReqMap)) {
    if (!req || toStr(req.status) !== 'pending') continue;
    const parts = rk.split('\t');
    if (!unitMatches(bk, uk, parts[0], parts[1])) continue;
    extras.requestedCancelDate = toStr(req.cancelDate) || undefined;
    const form07 = !!(req.signedForm07 || req.form07Uploaded);
    extras.cancellationNoteAr = `في انتظار إلغاء العقد — التاريخ المطلوب: ${toStr(req.cancelDate)}${form07 ? '' : ' — مطلوب رفع استمارة 07'}`;
    extras.cancellationNoteEn = `Awaiting cancellation — requested date: ${toStr(req.cancelDate)}${form07 ? '' : ' — signed form 07 required'}`;
    break;
  }

  const mntReg = parseJson<{ requests?: Record<string, unknown>[] }>(kv.bhd_maintenance_registry, { requests: [] });
  const mntUk = maintenanceUnitKey(buildingRaw, unitRaw);
  const mntUkNorm = `${bk}\t${uk}`;
  extras.openMaintenanceCount = (mntReg.requests ?? []).filter((r) => {
    if (!r || typeof r !== 'object') return false;
    const row = r as Record<string, unknown>;
    const key = toStr(row.unitKey);
    if (key !== mntUk && key !== mntUkNorm) return false;
    const st = toStr(row.status);
    return st !== 'completed' && st !== 'cancelled';
  }).length;

  const accReg = parseJson<{ cheques?: Record<string, unknown>[] }>(kv.bhd_accounting_registry, { cheques: [] });
  const accUk = accountingUnitKey(buildingRaw, unitRaw);
  extras.pendingChequesCount = (accReg.cheques ?? []).filter((c) => {
    if (!c || typeof c !== 'object') return false;
    if (toStr((c as Record<string, unknown>).unitKey) !== accUk) return false;
    const st = toStr((c as Record<string, unknown>).status);
    return st === 'pending' || st === 'deferred' || st === 'partial';
  }).length;

  return extras;
}

export const UNIT_DETAIL_KV_KEYS = [
  'bhd_saved_contracts_by_unit',
  'bhd_contract_renewal_drafts',
  'bhd_contract_cancellation_requests',
  'bhd_maintenance_registry',
  'bhd_accounting_registry',
] as const;
