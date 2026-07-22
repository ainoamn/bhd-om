import {
  enrichPayloadDepositFromAccounting,
  reconcileSavedContractsLifecycle,
  type ReconcileContractsResult,
} from '@/lib/server/contractLifecycle';
import { putLegacyKvBulk } from '@/lib/server/legacyKvStore';

type SavedContractEntry = {
  payload?: Record<string, unknown>;
  lifecycleStatus?: string;
  savedAt?: string;
  updatedAt?: string;
};

type RenewalDraftEntry = {
  payload?: Record<string, unknown>;
  renewal?: Record<string, unknown>;
  updatedAt?: string;
};

type AccountingRegistry = {
  deposits?: Array<Record<string, unknown>>;
};

type ManagedUnitRow = Record<string, unknown>;

export type LegacyOperationalRepairOptions = {
  /** افتراضي true — لا يكتب إلى Neon */
  dryRun?: boolean;
  /** تصفية التقرير لوحدة واحدة (الإصلاح يشمل كل KV) */
  building?: string;
  unit?: string;
};

export type LegacyOperationalRepairReport = {
  dryRun: boolean;
  contractsLifecycle: Pick<ReconcileContractsResult, 'changed' | 'groupsProcessed'>;
  depositsEnriched: number;
  renewalDraftsRemoved: string[];
  managedUnitsUpdated: number;
  managedUnitsAdded: number;
  persisted: boolean;
  keysWritten: string[];
  sample?: {
    building: string;
    unit: string;
    beforeManagedStatus?: string;
    afterManagedStatus?: string;
    depositAmount?: string;
    renewalDraftRemoved?: boolean;
  };
};

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizeUnit(unit: unknown): string {
  return str(unit).trim();
}

function normalizeBuilding(building: unknown): string {
  return str(building).trim();
}

function unitKey(building: unknown, unit: unknown): string {
  return `${normalizeBuilding(building)}\t${normalizeUnit(unit)}`;
}

function parseObject<T extends Record<string, unknown>>(raw: string): T {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function parseArray(raw: string): ManagedUnitRow[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? (v as ManagedUnitRow[]) : [];
  } catch {
    return [];
  }
}

function parseAccounting(raw: string): AccountingRegistry {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' ? (v as AccountingRegistry) : {};
  } catch {
    return {};
  }
}

function daysUntil(dateStr: unknown): number | null {
  const raw = str(dateStr);
  if (!raw) return null;
  const target = new Date(raw);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / 86400000);
}

function getLinkedContractUnitSlice(
  payload: Record<string, unknown>,
  flatNo: unknown
): Record<string, unknown> {
  const unit = normalizeUnit(flatNo);
  let linked: unknown[] = [];
  if (Array.isArray(payload.linkedContractUnits) && payload.linkedContractUnits.length) {
    linked = payload.linkedContractUnits;
  } else {
    try {
      const arr = JSON.parse(str(payload.linkedContractUnitsJson) || '[]');
      linked = Array.isArray(arr) ? arr : [];
    } catch {
      linked = [];
    }
  }
  const hit = linked.find(
    (row) => row && typeof row === 'object' && normalizeUnit((row as Record<string, unknown>).unit) === unit
  );
  return hit && typeof hit === 'object' ? (hit as Record<string, unknown>) : {};
}

export function contractPayloadToManagedUnitRow(payload: Record<string, unknown>): ManagedUnitRow | null {
  const building = normalizeBuilding(payload.buildingNo);
  const unit = normalizeUnit(payload.flatNo);
  if (!building || !unit) return null;
  const slice = getLinkedContractUnitSlice(payload, unit);
  const monthlyRent = slice.monthlyRent ?? payload.monthlyRent;
  return {
    serialNo: '',
    building,
    unit,
    floor: str(slice.floorDetails || payload.floorDetails),
    unitType: str(slice.unitType || payload.unitType),
    status: 'Rented',
    tenant: str(payload.tenantNameAr),
    tenantEn: str(payload.tenantNameEn),
    civilCard: str(payload.tenantId),
    contactNo: str(payload.tenantMobile),
    mobile: str(payload.tenantMobile),
    agreementNo: str(payload.agreementNo),
    monthlyRent: parseFloat(str(monthlyRent)) || 0,
    agreementRent: parseFloat(str(monthlyRent)) || 0,
    startDate: str(payload.startDate),
    endDate: str(payload.endDate),
    remainingDays: daysUntil(payload.endDate),
    monthsLeft:
      payload.endDate && daysUntil(payload.endDate) !== null
        ? (daysUntil(payload.endDate)! / 30)
        : null,
    evacuationDate: '',
    electricity: str(slice.electricityMeter || payload.electricityMeter),
    electricityReading: '',
    water: str(slice.waterMeter || payload.waterMeter),
    waterReading: '',
    remarks: '',
    ownerNames: '',
  };
}

export function isStaleCompletedRenewalDraft(
  draftEntry: RenewalDraftEntry,
  savedEntry: SavedContractEntry
): boolean {
  if (!draftEntry || !savedEntry?.payload) return false;
  const draftPayload =
    draftEntry.payload && typeof draftEntry.payload === 'object' ? draftEntry.payload : {};
  const draftRenewal =
    draftEntry.renewal && typeof draftEntry.renewal === 'object' ? draftEntry.renewal : {};
  const savedPayload =
    savedEntry.payload && typeof savedEntry.payload === 'object' ? savedEntry.payload : {};
  const draftAgreement = str(draftRenewal.agreementNo || draftPayload.agreementNo);
  const savedAgreement = str(savedPayload.agreementNo);
  const draftStart = str(draftRenewal.newStart || draftPayload.startDate);
  const draftEnd = str(draftRenewal.newEnd || draftPayload.endDate);
  const savedStart = str(savedPayload.startDate);
  const savedEnd = str(savedPayload.endDate);
  const sameAgreement = !!draftAgreement && draftAgreement === savedAgreement;
  const sameDates = !!draftStart && !!draftEnd && draftStart === savedStart && draftEnd === savedEnd;
  const savedStable =
    str(savedEntry.lifecycleStatus) === 'active' ||
    str(savedPayload.contractSavedStatus) === 'active' ||
    str(savedEntry.lifecycleStatus) === 'active_docs_pending' ||
    str(savedPayload.contractSavedStatus) === 'active_docs_pending' ||
    str(savedEntry.lifecycleStatus) === 'active_accounting_pending' ||
    str(savedPayload.contractSavedStatus) === 'active_accounting_pending';
  const draftMarkedFinal =
    draftPayload.isRenewalDraft === false ||
    str(draftPayload.isRenewalDraft) === 'false' ||
    str(draftPayload.contractSavedStatus) === 'active' ||
    str(draftPayload.contractSavedStatus) === 'active_docs_pending' ||
    str(draftPayload.contractSavedStatus) === 'active_accounting_pending';
  return (sameAgreement || sameDates) && savedStable && draftMarkedFinal;
}

export function enrichSavedContractsMapDeposits(
  map: Record<string, SavedContractEntry>,
  reg: AccountingRegistry
): { map: Record<string, SavedContractEntry>; enriched: number } {
  let enriched = 0;
  const next: Record<string, SavedContractEntry> = { ...map };
  Object.entries(map).forEach(([key, entry]) => {
    if (!entry?.payload || typeof entry.payload !== 'object') return;
    const before = str(entry.payload.depositAmount);
    const enrichedPayload = enrichPayloadDepositFromAccounting(entry.payload, reg);
    const after = str(enrichedPayload.depositAmount);
    if (before === after && str(enrichedPayload.depositReceiptRef) === str(entry.payload.depositReceiptRef)) {
      return;
    }
    enriched += 1;
    next[key] = {
      ...entry,
      payload: enrichedPayload,
      updatedAt: new Date().toISOString(),
    };
  });
  return { map: next, enriched };
}

export function cleanStaleRenewalDrafts(
  renewalMap: Record<string, RenewalDraftEntry>,
  savedMap: Record<string, SavedContractEntry>
): { map: Record<string, RenewalDraftEntry>; removed: string[] } {
  const next = { ...renewalMap };
  const removed: string[] = [];
  Object.keys(next).forEach((key) => {
    const draft = next[key];
    const saved = savedMap[key];
    if (!draft || !saved) return;
    if (isStaleCompletedRenewalDraft(draft, saved)) {
      delete next[key];
      removed.push(key);
    }
  });
  return { map: next, removed };
}

export function reconcileManagedUnitsFromSavedContracts(
  managedUnits: ManagedUnitRow[],
  savedMap: Record<string, SavedContractEntry>,
  reg: AccountingRegistry
): { units: ManagedUnitRow[]; updated: number; added: number } {
  const managed = Array.isArray(managedUnits) ? managedUnits.slice() : [];
  const byUnitKey = new Map<string, number>();
  managed.forEach((row, index) => {
    if (!row) return;
    byUnitKey.set(unitKey(row.building, row.unit), index);
  });
  let updated = 0;
  let added = 0;

  Object.entries(savedMap).forEach(([key, entry]) => {
    if (!entry?.payload || typeof entry.payload !== 'object') return;
    const payload = enrichPayloadDepositFromAccounting(entry.payload, reg);
    const row = contractPayloadToManagedUnitRow(payload);
    if (!row) return;
    const idx = byUnitKey.get(key);
    if (idx == null) {
      managed.push({ ...row, status: 'Rented' });
      byUnitKey.set(key, managed.length - 1);
      added += 1;
      return;
    }
    const prev = managed[idx] || {};
    const next = { ...prev, ...row, status: 'Rented' };
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      managed[idx] = next;
      updated += 1;
    }
  });

  return { units: managed, updated, added };
}

export function operationalRepairNeedsChanges(report: LegacyOperationalRepairReport): boolean {
  return (
    report.contractsLifecycle.changed ||
    report.depositsEnriched > 0 ||
    report.renewalDraftsRemoved.length > 0 ||
    report.managedUnitsUpdated > 0 ||
    report.managedUnitsAdded > 0
  );
}

export async function repairLegacyOperationalKv(
  options: LegacyOperationalRepairOptions = {}
): Promise<LegacyOperationalRepairReport> {
  const dryRun = options.dryRun !== false;
  const filterBuilding = normalizeBuilding(options.building);
  const filterUnit = normalizeUnit(options.unit);
  const filterKey = filterBuilding && filterUnit ? unitKey(filterBuilding, filterUnit) : '';

  const { prisma } = await import('@/lib/prisma');
  const keys = [
    'bhd_saved_contracts_by_unit',
    'bhd_accounting_registry',
    'bhd_managed_units',
    'bhd_contract_renewal_drafts',
  ] as const;

  let rows: Array<{ kvKey: string; data: string; updatedAt: Date }> = [];
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      rows = await prisma.legacyAppKvStore.findMany({
        where: { kvKey: { in: [...keys] } },
        select: { kvKey: true, data: true, updatedAt: true },
        orderBy: { kvKey: 'asc' },
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }
  if (lastError) throw lastError;

  const byKey = Object.fromEntries(rows.map((row) => [row.kvKey, row]));
  const contractsRaw = byKey['bhd_saved_contracts_by_unit']?.data ?? '{}';
  const accountingRaw = byKey['bhd_accounting_registry']?.data ?? '{}';
  const managedRaw = byKey['bhd_managed_units']?.data ?? '[]';
  const renewalRaw = byKey['bhd_contract_renewal_drafts']?.data ?? '{}';

  const reg = parseAccounting(accountingRaw);
  const lifecycle = reconcileSavedContractsLifecycle(contractsRaw, accountingRaw);
  const depositPass = enrichSavedContractsMapDeposits(lifecycle.updatedMap, reg);

  let savedMap = depositPass.map;
  if (depositPass.enriched > 0 || lifecycle.changed) {
    savedMap = depositPass.map;
  }

  const renewalBefore = parseObject<Record<string, RenewalDraftEntry>>(renewalRaw);
  const renewalClean = cleanStaleRenewalDrafts(renewalBefore, savedMap);
  const managedBefore = parseArray(managedRaw);
  const managedPass = reconcileManagedUnitsFromSavedContracts(managedBefore, savedMap, reg);

  const contractsChanged =
    lifecycle.changed ||
    depositPass.enriched > 0 ||
    JSON.stringify(lifecycle.updatedMap) !== contractsRaw;
  const renewalChanged = renewalClean.removed.length > 0;
  const managedChanged =
    managedPass.updated > 0 ||
    managedPass.added > 0 ||
    JSON.stringify(managedPass.units) !== managedRaw;

  const keysWritten: string[] = [];
  let persisted = false;

  if (!dryRun && (contractsChanged || renewalChanged || managedChanged)) {
    const payload: Record<string, string> = {};
    if (contractsChanged) {
      payload['bhd_saved_contracts_by_unit'] = JSON.stringify(savedMap);
      keysWritten.push('bhd_saved_contracts_by_unit');
    }
    if (renewalChanged) {
      payload['bhd_contract_renewal_drafts'] = JSON.stringify(renewalClean.map);
      keysWritten.push('bhd_contract_renewal_drafts');
    }
    if (managedChanged) {
      payload['bhd_managed_units'] = JSON.stringify(managedPass.units);
      keysWritten.push('bhd_managed_units');
    }
    if (keysWritten.length) {
      await putLegacyKvBulk(payload, { replace: true, userInitiated: true });
      persisted = true;
    }
  }

  let sample: LegacyOperationalRepairReport['sample'];
  if (filterKey) {
    const beforeRow = managedBefore.find((row) => unitKey(row.building, row.unit) === filterKey);
    const afterRow = managedPass.units.find((row) => unitKey(row.building, row.unit) === filterKey);
    const saved = savedMap[filterKey];
    sample = {
      building: filterBuilding,
      unit: filterUnit,
      beforeManagedStatus: str(beforeRow?.status),
      afterManagedStatus: str(afterRow?.status),
      depositAmount: str(saved?.payload?.depositAmount),
      renewalDraftRemoved: renewalClean.removed.includes(filterKey),
    };
  }

  return {
    dryRun,
    contractsLifecycle: {
      changed: lifecycle.changed,
      groupsProcessed: lifecycle.groupsProcessed,
    },
    depositsEnriched: depositPass.enriched,
    renewalDraftsRemoved: renewalClean.removed,
    managedUnitsUpdated: managedPass.updated,
    managedUnitsAdded: managedPass.added,
    persisted,
    keysWritten,
    sample,
  };
}
