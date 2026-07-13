import {
  contractPayloadToUnitRow,
  getContractLifecycleLabel,
  getContractLifecycleStateKey,
  getStatusToken,
} from '@/lib/real-estate/contractLifecycle';
import { daysUntil, normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';
import type {
  ManagedUnitKvRow,
  OperationsUnitRow,
  SavedContractEntry,
  TenancyDraftEntry,
} from '@/lib/real-estate/operationsUnit';
import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';

const BUILDING_STATUS_ACTIVE = 'نشط';

type BuildingProfile = {
  name?: string;
  buildingStatus?: string;
  archived?: boolean;
  deleted?: boolean;
};

function normalizeBuildingStatus(status: unknown): string {
  const s = toStr(status);
  const valid = ['نشط', 'مباع', 'موقوف', 'منتهي'];
  return valid.includes(s) ? s : BUILDING_STATUS_ACTIVE;
}

function isBuildingProfileActive(profile: BuildingProfile | null): boolean {
  if (!profile) return true;
  if (profile.archived || profile.deleted) return false;
  return normalizeBuildingStatus(profile.buildingStatus) === BUILDING_STATUS_ACTIVE;
}

function resolveBuildingProfileKey(
  buildingName: string,
  profiles: Record<string, BuildingProfile>
): string {
  const target = toStr(buildingName);
  if (!target) return '';
  if (profiles[target]) return target;
  const targetLc = target.toLowerCase();
  const keys = Object.keys(profiles);
  const direct = keys.find((k) => toStr(k).toLowerCase() === targetLc);
  if (direct) return direct;
  const byName = keys.find((k) => toStr(profiles[k]?.name).toLowerCase() === targetLc);
  return byName || '';
}

function getBuildingProfile(
  buildingName: string,
  profiles: Record<string, BuildingProfile>
): BuildingProfile | null {
  const key = resolveBuildingProfileKey(buildingName, profiles) || buildingName;
  return profiles[key] || profiles[buildingName] || null;
}

function isBuildingNameActive(buildingName: string, profiles: Record<string, BuildingProfile>): boolean {
  const b = toStr(buildingName);
  if (!b) return true;
  const profile = getBuildingProfile(b, profiles);
  if (!profile) return true;
  return isBuildingProfileActive(profile);
}

function getOwnerNamesForBuilding(
  buildingName: string,
  ownerBuildingMap: Record<string, string[]>
): string[] {
  const b = toStr(buildingName);
  if (!b) return [];
  return Object.keys(ownerBuildingMap)
    .filter((owner) => (ownerBuildingMap[owner] || []).includes(b))
    .sort((a, c) => a.localeCompare(c, 'ar'));
}

function formatOwnerNamesForBuilding(
  buildingName: string,
  ownerBuildingMap: Record<string, string[]>
): string {
  const names = getOwnerNamesForBuilding(buildingName, ownerBuildingMap);
  return names.length ? names.join('، ') : '';
}

function getSavedContractMapEntry(
  map: Record<string, SavedContractEntry>,
  building: string,
  unit: string
): SavedContractEntry | null {
  const kNorm = unitRowKey(building, unit);
  if (map[kNorm]) return map[kNorm];
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  return map[kLeg] || null;
}

function getTenancyDraftMapEntry(
  map: Record<string, TenancyDraftEntry>,
  building: string,
  unit: string
): TenancyDraftEntry | null {
  const kNorm = unitRowKey(building, unit);
  if (map[kNorm]) return map[kNorm];
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  return map[kLeg] || null;
}

function unitInReservations(
  building: string,
  unit: string,
  reservations: Record<string, Record<string, Record<string, unknown>>>
): { state?: string } | null {
  const bKey = normalizeBuildingKey(building);
  const floors = reservations[bKey];
  if (!floors) return null;
  const unitNorm = normalizeUnit(unit);
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

function mergeContractRows(
  combined: ManagedUnitKvRow[],
  savedMap: Record<string, SavedContractEntry>,
  ownerBuildingMap: Record<string, string[]>,
  profiles: Record<string, BuildingProfile>
): void {
  Object.values(savedMap).forEach((e) => {
    if (!e?.payload) return;
    const dr0 = contractPayloadToUnitRow(
      e.payload,
      formatOwnerNamesForBuilding(e.payload.buildingNo || '', ownerBuildingMap)
    );
    if (!dr0 || !isBuildingNameActive(dr0.building, profiles)) return;
    dr0.status = 'Rented';
    const j = combined.findIndex(
      (u) =>
        normalizeBuildingKey(u.building) === normalizeBuildingKey(dr0.building) &&
        normalizeUnit(u.unit) === normalizeUnit(dr0.unit)
    );
    if (j >= 0) {
      combined[j] = { ...combined[j], ...dr0, status: 'Rented' };
    } else {
      combined.unshift(dr0);
    }
  });
}

function mergeDraftRows(
  combined: ManagedUnitKvRow[],
  draftMap: Record<string, TenancyDraftEntry>,
  savedMap: Record<string, SavedContractEntry>,
  ownerBuildingMap: Record<string, string[]>,
  profiles: Record<string, BuildingProfile>
): void {
  Object.values(draftMap).forEach((e) => {
    if (!e?.payload) return;
    const dr0 = contractPayloadToUnitRow(
      e.payload,
      formatOwnerNamesForBuilding(e.payload.buildingNo || '', ownerBuildingMap)
    );
    if (!dr0 || !isBuildingNameActive(dr0.building, profiles)) return;
    if (getSavedContractMapEntry(savedMap, dr0.building, dr0.unit)) return;
    const j = combined.findIndex(
      (u) =>
        normalizeBuildingKey(u.building) === normalizeBuildingKey(dr0.building) &&
        normalizeUnit(u.unit) === normalizeUnit(dr0.unit)
    );
    if (j >= 0) {
      combined[j] = dr0;
    } else {
      combined.unshift(dr0);
    }
  });
}

function dedupeUnits(rows: ManagedUnitKvRow[]): ManagedUnitKvRow[] {
  const out: ManagedUnitKvRow[] = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    const rk = unitRowKey(row.building, row.unit);
    if (seen.has(rk)) return;
    seen.add(rk);
    out.push(row);
  });
  return out;
}

function toOperationsRow(
  row: ManagedUnitKvRow,
  savedMap: Record<string, SavedContractEntry>,
  draftMap: Record<string, TenancyDraftEntry>,
  reservations: Record<string, Record<string, Record<string, unknown>>>,
  renewalDraftKeys: Set<string>,
  index: number
): OperationsUnitRow {
  const daysLeft = daysUntil(row.endDate);
  const statusToken = getStatusToken(row, daysLeft);
  const savedEntry = getSavedContractMapEntry(savedMap, row.building, row.unit);
  const draftEntry = getTenancyDraftMapEntry(draftMap, row.building, row.unit);
  const reservation = unitInReservations(row.building, row.unit, reservations);
  const hasRenewalDraft = renewalDraftKeys.has(unitRowKey(row.building, row.unit));
  const contractStateKey = getContractLifecycleStateKey(row, {
    savedEntry,
    draftEntry,
    reservation,
    hasRenewalDraft,
  });
  const labels = getContractLifecycleLabel(contractStateKey);
  return {
    ...row,
    ownerNames: row.ownerNames || '',
    daysLeft,
    statusToken,
    contractStateKey,
    contractStateLabelAr: labels.ar,
    contractStateLabelEn: labels.en,
    rowIndex: index,
  };
}

function collectRenewalDraftKeys(raw: string | undefined): Set<string> {
  const map = parseJson<Record<string, { building?: string; unit?: string }>>(raw, {});
  const keys = new Set<string>();
  Object.values(map).forEach((e) => {
    if (e?.building && e?.unit) keys.add(unitRowKey(e.building, e.unit));
  });
  Object.keys(map).forEach((k) => {
    if (k.includes('\t')) keys.add(k);
  });
  return keys;
}

export function buildOperationsUnitsFromKv(kv: LegacyKvStringMap): {
  rows: OperationsUnitRow[];
  buildings: string[];
} {
  const managedUnits = parseJson<ManagedUnitKvRow[]>(kv.bhd_managed_units, []);
  const savedMap = parseJson<Record<string, SavedContractEntry>>(kv.bhd_saved_contracts_by_unit, {});
  const draftMap = parseJson<Record<string, TenancyDraftEntry>>(kv.bhd_tenancy_contract_drafts, {});
  const profiles = parseJson<Record<string, BuildingProfile>>(kv.bhd_building_profiles, {});
  const ownerBuildingMap = parseJson<Record<string, string[]>>(kv.bhd_owner_building_map, {});
  const reservations = parseJson<Record<string, Record<string, Record<string, unknown>>>>(
    kv.bhd_unit_reservations,
    {}
  );
  const renewalDraftKeys = collectRenewalDraftKeys(kv.bhd_contract_renewal_drafts);

  const combined: ManagedUnitKvRow[] = managedUnits
    .filter((u) => isBuildingNameActive(u.building, profiles))
    .map((u) => ({
      ...u,
      ownerNames: u.ownerNames || formatOwnerNamesForBuilding(u.building, ownerBuildingMap),
    }));

  mergeContractRows(combined, savedMap, ownerBuildingMap, profiles);
  mergeDraftRows(combined, draftMap, savedMap, ownerBuildingMap, profiles);

  const deduped = dedupeUnits(combined).filter((u) => isBuildingNameActive(u.building, profiles));
  const rows = deduped.map((row, index) =>
    toOperationsRow(row, savedMap, draftMap, reservations, renewalDraftKeys, index)
  );

  const buildings = [...new Set(rows.map((r) => r.building).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ar')
  );

  return { rows, buildings };
}

export const OPERATIONS_UNITS_KV_KEYS = [
  'bhd_managed_units',
  'bhd_saved_contracts_by_unit',
  'bhd_tenancy_contract_drafts',
  'bhd_building_profiles',
  'bhd_owner_building_map',
  'bhd_unit_reservations',
  'bhd_contract_renewal_drafts',
] as const;
