import { daysUntil, toStr } from '@/lib/real-estate/kvParse';
import type {
  ContractPayload,
  ManagedUnitKvRow,
  SavedContractEntry,
  TenancyDraftEntry,
  UnitStatusToken,
} from '@/lib/real-estate/operationsUnit';

export type ContractLifecycleKey =
  | 'active'
  | 'active_pending'
  | 'active_docs_pending'
  | 'active_accounting_pending'
  | 'draft'
  | 'renewal_pending'
  | 'cancellation_pending'
  | 'cancelled'
  | 'reservation_draft'
  | 'reservation_confirmed';

const LIFECYCLE_LABELS: Record<ContractLifecycleKey, { ar: string; en: string }> = {
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  draft: { ar: 'مسودة عقد', en: 'Contract draft' },
  reservation_draft: { ar: 'مسودة حجز', en: 'Reservation draft' },
  reservation_confirmed: { ar: 'حجز مؤكّد', en: 'Confirmed reservation' },
  renewal_pending: { ar: 'تجديد — مطلوب بيانات إضافية', en: 'Renewal — additional data required' },
  cancellation_pending: { ar: 'في انتظار إلغاء العقد', en: 'Awaiting contract cancellation' },
  active_pending: { ar: 'نشط — مطلوب بيانات إضافية', en: 'Active — additional data required' },
  active_docs_pending: {
    ar: 'نشط — مطلوب البلدية والمستندات الكاملة',
    en: 'Active — municipal refs & full documents required',
  },
  active_accounting_pending: { ar: 'نشط — بانتظار اعتماد المحاسب', en: 'Active — awaiting accountant approval' },
  active: { ar: 'نشط', en: 'Active' },
};

export function getContractLifecycleLabel(key: ContractLifecycleKey): { ar: string; en: string } {
  return LIFECYCLE_LABELS[key] ?? LIFECYCLE_LABELS.active;
}

export function getContractLifecycleStateRank(k: ContractLifecycleKey): number {
  const ranks: Record<ContractLifecycleKey, number> = {
    draft: 0,
    reservation_draft: 1,
    reservation_confirmed: 2,
    cancellation_pending: 6,
    renewal_pending: 7,
    active_pending: 8,
    active_docs_pending: 9,
    active_accounting_pending: 9,
    active: 10,
    cancelled: 5,
  };
  return ranks[k] ?? 9;
}

function normalizeLifecycleStatus(raw: unknown): ContractLifecycleKey | null {
  const s = toStr(raw).toLowerCase();
  if (!s) return null;
  const known: ContractLifecycleKey[] = [
    'active',
    'active_pending',
    'active_docs_pending',
    'active_accounting_pending',
    'draft',
    'renewal_pending',
    'cancellation_pending',
    'cancelled',
    'reservation_draft',
    'reservation_confirmed',
  ];
  return known.find((k) => k === s) ?? null;
}

function resolveSavedContractLifecycle(saved: SavedContractEntry | null): ContractLifecycleKey {
  if (!saved?.payload) return 'active_pending';
  const fromEntry =
    normalizeLifecycleStatus(saved.lifecycleStatus) ||
    normalizeLifecycleStatus(saved.payload.contractSavedStatus);
  if (fromEntry) return fromEntry;
  return 'active';
}

function unitInReservations(
  unit: ManagedUnitKvRow,
  reservations: Record<string, Record<string, Record<string, unknown>>>
): { state?: string } | null {
  const building = normalizeBuildingKey(unit.building);
  const floors = reservations[building];
  if (!floors) return null;
  const unitNorm = normalizeUnit(unit.unit);
  for (const units of Object.values(floors)) {
    if (!units || typeof units !== 'object') continue;
    for (const [unitNo, rec] of Object.entries(units)) {
      if (normalizeUnit(unitNo) === unitNorm) {
        return rec && typeof rec === 'object' ? (rec as { state?: string }) : null;
      }
    }
  }
  return null;
}

function normalizeUnit(u: string): string {
  return toStr(u).replace(/\s+/g, '').replace(/[-_]/g, '').toUpperCase();
}

function normalizeBuildingKey(v: string): string {
  return toStr(String(v).replace(/[\u200c\u200d\u200e\u200f]/g, '')).replace(/\s+/g, ' ');
}

export function getContractLifecycleStateKey(
  unit: ManagedUnitKvRow,
  ctx: {
    savedEntry: SavedContractEntry | null;
    draftEntry: TenancyDraftEntry | null;
    reservation: { state?: string } | null;
    hasRenewalDraft?: boolean;
  }
): ContractLifecycleKey {
  if (ctx.hasRenewalDraft) return 'renewal_pending';
  if (ctx.savedEntry) return resolveSavedContractLifecycle(ctx.savedEntry);
  if (ctx.draftEntry?.payload) return 'draft';
  if (ctx.reservation) {
    return toStr(ctx.reservation.state) === 'confirmed' ? 'reservation_confirmed' : 'reservation_draft';
  }
  if (toStr(unit.status).toLowerCase() === 'vacant') return 'cancelled';
  return 'active';
}

export function getStatusToken(u: ManagedUnitKvRow, days: number | null): UnitStatusToken {
  if (!u.endDate) {
    const st = toStr(u.status).toLowerCase();
    if (st === 'vacant') return 'Vacant';
    if (st === 'rented') return 'Rented';
    return 'NoEndDate';
  }
  if (days !== null && days < 0) return 'Overdue';
  if (days !== null && days >= 0 && days <= 90) return 'Expiring';
  return (toStr(u.status) === 'Vacant' ? 'Vacant' : 'Rented') as UnitStatusToken;
}

export function getStatusLabel(token: UnitStatusToken, locale: 'ar' | 'en'): string {
  const map: Record<UnitStatusToken, { ar: string; en: string }> = {
    Expiring: { ar: 'قريب الانتهاء', en: 'Expiring soon' },
    Overdue: { ar: 'منتهي', en: 'Overdue' },
    NoEndDate: { ar: 'بدون تاريخ', en: 'No end date' },
    Vacant: { ar: 'شاغر', en: 'Vacant' },
    Rented: { ar: 'مؤجر', en: 'Rented' },
  };
  const hit = map[token];
  return locale === 'ar' ? hit.ar : hit.en;
}

export function contractPayloadToUnitRow(
  d: ContractPayload,
  ownerNames: string
): ManagedUnitKvRow | null {
  if (!toStr(d.buildingNo) || !toStr(d.flatNo)) return null;
  const endDate = toStr(d.endDate);
  return {
    serialNo: '',
    building: d.buildingNo || '',
    unit: d.flatNo || '',
    floor: d.floorDetails || '',
    unitType: d.unitType || '',
    status: 'Rented',
    tenant: d.tenantNameAr || '',
    tenantEn: d.tenantNameEn || '',
    civilCard: d.tenantId || '',
    contactNo: d.tenantMobile || '',
    mobile: d.tenantMobile || '',
    agreementNo: d.agreementNo || '',
    monthlyRent: parseFloat(String(d.monthlyRent)) || 0,
    agreementRent: parseFloat(String(d.monthlyRent)) || 0,
    startDate: d.startDate || '',
    endDate,
    remainingDays: daysUntil(endDate) ?? '',
    monthsLeft: endDate && daysUntil(endDate) !== null ? (daysUntil(endDate)! / 30) : null,
    evacuationDate: '',
    electricity: d.electricityMeter || '',
    electricityReading: '',
    water: d.waterMeter || '',
    waterReading: '',
    remarks: '',
    ownerNames,
  };
}
