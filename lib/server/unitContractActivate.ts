import { contractPayloadToUnitRow } from '@/lib/real-estate/contractLifecycle';
import {
  formValuesToContractPayload,
  type ContractWorkspaceMode,
  type UnitContractFormValues,
} from '@/lib/real-estate/unitContractWorkspace';
import { daysUntil, normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';
import type { ContractPayload, ManagedUnitKvRow } from '@/lib/real-estate/operationsUnit';
import { getLegacyKvBulk, putLegacyKvBulk } from '@/lib/server/legacyKvStore';
import { mergeContractPayloads } from '@/lib/server/legacyKvMerge';
import { resolveCanonicalContractLifecycleStatus } from '@/lib/server/contractLifecycle';
import {
  ensureAccountingRegistry,
  syncAccountingFromContractPayload,
} from '@/lib/server/syncAccountingFromContract';

type Actor = {
  userId: string;
  name: string;
};

type SavedContractEntry = {
  payload?: Record<string, unknown>;
  lifecycleStatus?: string;
  savedAt?: string;
  updatedAt?: string;
  lastActorUserId?: string;
  lastActorName?: string;
};

function draftStorageKey(building: string, unit: string): string {
  return `${normalizeBuildingKey(building)}\t${normalizeUnit(unit)}`;
}

function getSavedEntry(
  map: Record<string, SavedContractEntry>,
  building: string,
  unit: string
): { key: string; entry: SavedContractEntry } | null {
  const hk = unitRowKey(building, unit);
  if (map[hk]?.payload) return { key: hk, entry: map[hk] };
  const kLeg = `${toStr(building)}\t${normalizeUnit(unit)}`;
  if (map[kLeg]?.payload) return { key: kLeg, entry: map[kLeg] };
  return null;
}

function validateActivateValues(values: UnitContractFormValues, arMessages = false): string | null {
  if (!values.agreementNo.trim()) {
    return arMessages ? 'رقم العقد مطلوب.' : 'Agreement number is required.';
  }
  if (!values.tenantNameAr.trim()) {
    return arMessages ? 'اسم المستأجر (عربي) مطلوب.' : 'Tenant name (Arabic) is required.';
  }
  if (!values.startDate.trim() || !values.endDate.trim()) {
    return arMessages ? 'تاريخ البداية والنهاية مطلوبان.' : 'Start and end dates are required.';
  }
  if (!values.monthlyRent.trim() || !(parseFloat(values.monthlyRent) > 0)) {
    return arMessages ? 'الإيجار الشهري مطلوب.' : 'Monthly rent is required.';
  }
  return null;
}

function syncManagedUnitsRow(
  units: ManagedUnitKvRow[],
  payload: Record<string, unknown>,
  ownerNames: string
): ManagedUnitKvRow[] {
  const mapped = contractPayloadToUnitRow(payload as ContractPayload, ownerNames);
  if (!mapped) return units;
  const bk = normalizeBuildingKey(mapped.building);
  const uk = normalizeUnit(mapped.unit);
  const idx = units.findIndex(
    (u) => normalizeBuildingKey(u.building) === bk && normalizeUnit(u.unit) === uk
  );
  const endDate = toStr(mapped.endDate);
  const dLeft = daysUntil(endDate);
  const enriched: ManagedUnitKvRow = {
    ...mapped,
    ownerNames: ownerNames || mapped.ownerNames || '',
    remainingDays: dLeft ?? '',
    monthsLeft: dLeft !== null ? (dLeft / 30).toFixed(2) : null,
    remarks: toStr(payload.remarks) || mapped.remarks || '',
  };
  if (idx >= 0) {
    const next = [...units];
    next[idx] = { ...next[idx], ...enriched, ownerNames: next[idx].ownerNames || enriched.ownerNames };
    return next;
  }
  return [...units, enriched];
}

function removeDraftKey<T extends Record<string, unknown>>(map: T, building: string, unit: string): T {
  const next = { ...map };
  const keys = [draftStorageKey(building, unit), `${toStr(building)}\t${normalizeUnit(unit)}`];
  keys.forEach((k) => {
    delete next[k];
  });
  return next;
}

export async function activateUnitContractToKv(
  building: string,
  unit: string,
  mode: ContractWorkspaceMode,
  values: UnitContractFormValues,
  actor: Actor
): Promise<{
  lifecycleStatus: string;
  savedKey: string;
  archivedPrevious: boolean;
  accountingSynced: { cheques: number; deposits: number };
}> {
  const validationError = validateActivateValues(values);
  if (validationError) {
    throw new Error(validationError);
  }

  const now = new Date().toISOString();
  const basePayload = formValuesToContractPayload(values);
  const keys = [
    'bhd_saved_contracts_by_unit',
    'bhd_managed_units',
    'bhd_owner_building_map',
    'bhd_tenancy_contract_drafts',
    'bhd_contract_renewal_drafts',
    'bhd_contract_history_by_unit',
    'bhd_contract_renewal_log',
    'bhd_accounting_registry',
  ];
  const kv = await getLegacyKvBulk('bhd_', keys);

  const savedMap = parseJson<Record<string, SavedContractEntry>>(kv.bhd_saved_contracts_by_unit, {});
  const managedUnits = parseJson<ManagedUnitKvRow[]>(kv.bhd_managed_units, []);
  const ownerMap = parseJson<Record<string, string[]>>(kv.bhd_owner_building_map, {});
  const accountingRaw = kv.bhd_accounting_registry ?? '{}';
  const accountingReg = ensureAccountingRegistry(accountingRaw);

  const existing = getSavedEntry(savedMap, building, unit);
  const prevPayload = existing?.entry?.payload;
  let archivedPrevious = false;

  if (mode === 'renew') {
    if (!prevPayload) {
      throw new Error('Renewal requires an existing saved contract.');
    }
    basePayload.previousAgreementNo = toStr(prevPayload.agreementNo);
  }

  const mergedPayload = prevPayload
    ? mergeContractPayloads(prevPayload, basePayload)
    : basePayload;

  const lifecycleStatusBeforeSync = resolveCanonicalContractLifecycleStatus(mergedPayload, accountingReg);
  let enrichedPayload: Record<string, unknown> = {
    ...mergedPayload,
    contractSavedAt: toStr(mergedPayload.contractSavedAt) || now,
    contractSavedStatus: lifecycleStatusBeforeSync,
    contractActivatedFromReact: true,
  };

  const accountingSync = syncAccountingFromContractPayload(building, unit, enrichedPayload, accountingReg);
  const lifecycleStatus = resolveCanonicalContractLifecycleStatus(
    enrichedPayload,
    accountingSync.registry
  );
  enrichedPayload = {
    ...enrichedPayload,
    contractSavedStatus: lifecycleStatus,
  };

  const storageKey = existing?.key ?? draftStorageKey(building, unit);
  savedMap[storageKey] = {
    payload: enrichedPayload,
    lifecycleStatus,
    savedAt: toStr(enrichedPayload.contractSavedAt),
    updatedAt: now,
    lastActorUserId: actor.userId,
    lastActorName: actor.name || actor.userId,
  };

  let historyMap = parseJson<Record<string, Record<string, unknown>[]>>(kv.bhd_contract_history_by_unit, {});
  if (mode === 'renew' && prevPayload) {
    const hk = unitRowKey(building, unit);
    const hist = Array.isArray(historyMap[hk]) ? [...historyMap[hk]] : [];
    hist.push({
      payload: { ...prevPayload },
      archivedAt: now,
      archivedBy: actor.name || actor.userId,
      supersededBy: toStr(enrichedPayload.agreementNo),
    });
    historyMap = { ...historyMap, [hk]: hist };
    archivedPrevious = true;

    const renewalLog = parseJson<Record<string, unknown>[]>(kv.bhd_contract_renewal_log, []);
    renewalLog.unshift({
      id: `crl_${Date.now()}`,
      eventType: 'completed',
      building,
      unit,
      agreementNo: toStr(enrichedPayload.agreementNo),
      prevAgreementNo: toStr(prevPayload.agreementNo),
      from: toStr(enrichedPayload.startDate),
      to: toStr(enrichedPayload.endDate),
      prevFrom: toStr(prevPayload.startDate),
      prevTo: toStr(prevPayload.endDate),
      party: toStr(enrichedPayload.tenantNameAr),
      rent: toStr(enrichedPayload.monthlyRent),
      at: now,
      staffName: actor.name || actor.userId,
      staffUserId: actor.userId,
      note: 'Activated from React dashboard',
    });
    await putLegacyKvBulk({ bhd_contract_renewal_log: JSON.stringify(renewalLog) });
  }

  const ownerNames =
    ownerMap[building]?.join(' - ') ||
    managedUnits.find(
      (u) =>
        normalizeBuildingKey(u.building) === normalizeBuildingKey(building) &&
        normalizeUnit(u.unit) === normalizeUnit(unit)
    )?.ownerNames ||
    '';

  const nextManaged = syncManagedUnitsRow(managedUnits, enrichedPayload, ownerNames);

  let tenancyDrafts = parseJson<Record<string, unknown>>(kv.bhd_tenancy_contract_drafts, {});
  tenancyDrafts = removeDraftKey(tenancyDrafts, building, unit);

  let renewalDrafts = parseJson<Record<string, unknown>>(kv.bhd_contract_renewal_drafts, {});
  renewalDrafts = removeDraftKey(renewalDrafts, building, unit);

  await putLegacyKvBulk({
    bhd_saved_contracts_by_unit: JSON.stringify(savedMap),
    bhd_managed_units: JSON.stringify(nextManaged),
    bhd_contract_history_by_unit: JSON.stringify(historyMap),
    bhd_tenancy_contract_drafts: JSON.stringify(tenancyDrafts),
    bhd_contract_renewal_drafts: JSON.stringify(renewalDrafts),
    bhd_accounting_registry: JSON.stringify(accountingSync.registry),
  });

  return {
    lifecycleStatus,
    savedKey: 'bhd_saved_contracts_by_unit',
    archivedPrevious,
    accountingSynced: {
      cheques: accountingSync.chequesSynced,
      deposits: accountingSync.depositsSynced,
    },
  };
}
