import { getLegacyKvBulk, putLegacyKvBulk } from '@/lib/server/legacyKvStore';
import {
  formValuesToContractPayload,
  type ContractWorkspaceMode,
  type UnitContractFormValues,
} from '@/lib/real-estate/unitContractWorkspace';
import { normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';

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

type TenancyDraftEntry = {
  payload?: Record<string, unknown>;
  updatedAt?: string;
  lastActorUserId?: string;
  lastActorName?: string;
};

function draftStorageKey(building: string, unit: string): string {
  return `${normalizeBuildingKey(building)}\t${normalizeUnit(unit)}`;
}

export async function saveUnitContractDraftToKv(
  building: string,
  unit: string,
  mode: ContractWorkspaceMode,
  values: UnitContractFormValues,
  actor: Actor
): Promise<{ savedKey: string; mode: ContractWorkspaceMode }> {
  const now = new Date().toISOString();
  const payload = formValuesToContractPayload(values);
  const actorMeta = {
    lastActorUserId: actor.userId,
    lastActorName: actor.name || actor.userId,
    updatedAt: now,
  };

  if (mode === 'renew') {
    const kv = await getLegacyKvBulk('bhd_', ['bhd_saved_contracts_by_unit', 'bhd_contract_renewal_drafts']);
    const savedMap = parseJson<Record<string, SavedContractEntry>>(kv.bhd_saved_contracts_by_unit, {});
    const renewalMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_renewal_drafts, {});
    const hk = unitRowKey(building, unit);
    const savedEntry = savedMap[hk] || savedMap[`${toStr(building)}\t${normalizeUnit(unit)}`];
    const previousSnapshot = savedEntry?.payload ? { ...savedEntry.payload } : {};

    const storageKey = draftStorageKey(building, unit);
    renewalMap[storageKey] = {
      payload: { ...payload, previousAgreementNo: toStr(previousSnapshot.agreementNo) },
      renewal: {
        agreementNo: values.agreementNo.trim(),
        newStart: values.startDate.trim(),
        newEnd: values.endDate.trim(),
      },
      previousSnapshot,
      lifecycleStatus: 'renewal_pending',
      ...actorMeta,
    };

    await putLegacyKvBulk({ bhd_contract_renewal_drafts: JSON.stringify(renewalMap) });
    return { savedKey: 'bhd_contract_renewal_drafts', mode: 'renew' };
  }

  const draftMap = parseJson<Record<string, TenancyDraftEntry>>(
    (await getLegacyKvBulk('bhd_', ['bhd_tenancy_contract_drafts'])).bhd_tenancy_contract_drafts,
    {}
  );
  const storageKey = draftStorageKey(building, unit);
  draftMap[storageKey] = {
    payload,
    ...actorMeta,
  };

  await putLegacyKvBulk({ bhd_tenancy_contract_drafts: JSON.stringify(draftMap) });
  return { savedKey: 'bhd_tenancy_contract_drafts', mode: 'fill' };
}
