import {
  getContractLifecycleLabel,
  getContractLifecycleStateKey,
} from '@/lib/real-estate/contractLifecycle';
import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';
import {
  daysUntil,
  normalizeBuildingKey,
  normalizeUnit,
  parseJson,
  toStr,
  unitRowKey,
} from '@/lib/real-estate/kvParse';
import type {
  ManagedUnitKvRow,
  SavedContractEntry,
  TenancyDraftEntry,
} from '@/lib/real-estate/operationsUnit';
import type { SavedContractListRow } from '@/lib/real-estate/savedContractListRow';

type SavedContractEntryExtended = SavedContractEntry & {
  savedAt?: string;
  updatedAt?: string;
};

function parseBuildingUnitFromKey(key: string): { building: string; unit: string } | null {
  const parts = key.split('\t');
  if (parts.length >= 2) {
    return { building: parts[0], unit: parts.slice(1).join('\t') };
  }
  return null;
}

function getOwnerNames(building: string, ownerMap: Record<string, string[]>): string {
  const b = toStr(building);
  if (!b) return '';
  const owners = Object.keys(ownerMap)
    .filter((owner) => (ownerMap[owner] || []).includes(b))
    .sort((a, c) => a.localeCompare(c, 'ar'));
  return owners.join(' - ');
}

function getManagedUnit(
  managed: ManagedUnitKvRow[],
  building: string,
  unit: string
): ManagedUnitKvRow | null {
  const bk = normalizeBuildingKey(building);
  const uk = normalizeUnit(unit);
  return (
    managed.find(
      (u) => normalizeBuildingKey(u.building) === bk && normalizeUnit(u.unit) === uk
    ) ?? null
  );
}

function getMapEntry<T extends { payload?: unknown }>(
  map: Record<string, T>,
  building: string,
  unit: string
): T | null {
  const hk = unitRowKey(building, unit);
  if (map[hk]?.payload) return map[hk];
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  if (map[kLeg]?.payload) return map[kLeg];
  for (const [key, entry] of Object.entries(map)) {
    if (!entry?.payload || typeof entry.payload !== 'object') continue;
    const p = entry.payload as Record<string, unknown>;
    if (
      normalizeBuildingKey(p.buildingNo) === normalizeBuildingKey(building) &&
      normalizeUnit(p.flatNo) === normalizeUnit(unit)
    ) {
      return entry;
    }
    const fromKey = parseBuildingUnitFromKey(key);
    if (
      fromKey &&
      normalizeBuildingKey(fromKey.building) === normalizeBuildingKey(building) &&
      normalizeUnit(fromKey.unit) === normalizeUnit(unit)
    ) {
      return entry;
    }
  }
  return null;
}

function collectRenewalDraftKeys(raw: string | undefined): Set<string> {
  const map = parseJson<Record<string, { building?: string; unit?: string; payload?: Record<string, unknown> }>>(
    raw,
    {}
  );
  const keys = new Set<string>();
  Object.values(map).forEach((e) => {
    const p = e?.payload;
    if (p?.buildingNo && p?.flatNo) {
      keys.add(unitRowKey(toStr(p.buildingNo), toStr(p.flatNo)));
    } else if (e?.building && e?.unit) {
      keys.add(unitRowKey(e.building, e.unit));
    }
  });
  Object.keys(map).forEach((k) => {
    if (k.includes('\t')) keys.add(k);
  });
  return keys;
}

export function buildSavedContractsListFromKv(kv: LegacyKvStringMap): {
  rows: SavedContractListRow[];
  buildings: string[];
} {
  const savedMap = parseJson<Record<string, SavedContractEntryExtended>>(kv.bhd_saved_contracts_by_unit, {});
  const managedUnits = parseJson<ManagedUnitKvRow[]>(kv.bhd_managed_units, []);
  const draftMap = parseJson<Record<string, TenancyDraftEntry>>(kv.bhd_tenancy_contract_drafts, {});
  const ownerMap = parseJson<Record<string, string[]>>(kv.bhd_owner_building_map, {});
  const renewalDraftKeys = collectRenewalDraftKeys(kv.bhd_contract_renewal_drafts);

  const rows: SavedContractListRow[] = [];
  const seen = new Set<string>();

  Object.entries(savedMap).forEach(([storageKey, entry]) => {
    if (!entry?.payload || typeof entry.payload !== 'object') return;
    const p = entry.payload as Record<string, unknown>;
    const fromKey = parseBuildingUnitFromKey(storageKey);
    const building = toStr(p.buildingNo || fromKey?.building);
    const unit = toStr(p.flatNo || fromKey?.unit);
    if (!building || !unit) return;

    const dedupeKey = unitRowKey(building, unit);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const managed = getManagedUnit(managedUnits, building, unit);
    const unitRow: ManagedUnitKvRow = managed ?? {
      building,
      unit,
      status: 'Rented',
      tenant: toStr(p.tenantNameAr),
      agreementNo: toStr(p.agreementNo),
      startDate: toStr(p.startDate),
      endDate: toStr(p.endDate),
      monthlyRent: toStr(p.monthlyRent),
      ownerNames: getOwnerNames(building, ownerMap),
    };

    const draftEntry = getMapEntry(draftMap, building, unit);
    const lifecycleKey = getContractLifecycleStateKey(unitRow, {
      savedEntry: entry,
      draftEntry,
      reservation: null,
      hasRenewalDraft: renewalDraftKeys.has(dedupeKey),
    });
    const labels = getContractLifecycleLabel(lifecycleKey);
    const endDate = toStr(p.endDate || unitRow.endDate);
    const daysLeft = daysUntil(endDate);

    rows.push({
      storageKey,
      building,
      unit,
      agreementNo: toStr(p.agreementNo),
      tenantNameAr: toStr(p.tenantNameAr || unitRow.tenant),
      tenantNameEn: toStr(p.tenantNameEn || unitRow.tenantEn),
      civilCard: toStr(p.tenantId || unitRow.civilCard),
      tenantMobile: toStr(p.tenantMobile || unitRow.mobile || unitRow.contactNo),
      ownerNames: unitRow.ownerNames || getOwnerNames(building, ownerMap),
      startDate: toStr(p.startDate),
      endDate,
      monthlyRent: toStr(p.monthlyRent),
      paymentMethod: toStr(p.paymentMethod),
      contractSubjectToVat: toStr(p.contractSubjectToVat) === 'yes' ? 'yes' : 'no',
      lifecycleStatus: lifecycleKey,
      lifecycleLabelAr: labels.ar,
      lifecycleLabelEn: labels.en,
      savedAt: toStr(entry.savedAt || p._savedAt || p.contractSavedAt),
      updatedAt: toStr(entry.updatedAt || p._savedAt),
      daysLeft,
      hasRenewalDraft: renewalDraftKeys.has(dedupeKey),
      hasTenancyDraft: !!draftEntry?.payload,
      rowIndex: 0,
    });
  });

  rows.sort((a, b) => {
    const da = a.daysLeft ?? 99999;
    const db = b.daysLeft ?? 99999;
    if (da !== db) return da - db;
    return a.building.localeCompare(b.building, 'ar');
  });

  rows.forEach((r, i) => {
    r.rowIndex = i;
  });

  const buildings = [...new Set(rows.map((r) => r.building).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ar')
  );

  return { rows, buildings };
}

export const SAVED_CONTRACTS_KV_KEYS = [
  'bhd_saved_contracts_by_unit',
  'bhd_managed_units',
  'bhd_tenancy_contract_drafts',
  'bhd_owner_building_map',
  'bhd_contract_renewal_drafts',
] as const;
