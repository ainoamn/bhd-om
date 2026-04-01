/**
 * بيانات شيكات العقد - منفصلة عن صفحة المستندات المطلوبة
 * تُربط بالعقد (contractId) وتعكس بيانات صفحة العقود
 */

export interface ContractCheckEntry {
  checkTypeId: string;
  labelAr: string;
  labelEn: string;
  checkNumber: string;
  amount: number;
  date: string;
  accountNumber?: string;
  accountName?: string;
  /** صورة الشيك المرفوعة من المستأجر */
  imageUrl?: string;
}

const STORAGE_KEY = 'bhd_contract_checks';
const API_URL = '/api/settings/contract-checks';
let didHydrateFromServer = false;
let hydratingFromServer = false;
let didBulkSyncToServer = false;
let bulkSyncInProgress = false;
let contractChecksStore: { contractId: string; checks: ContractCheckEntry[] }[] = [];

function getStored(): { contractId: string; checks: ContractCheckEntry[] }[] {
  if (typeof window === 'undefined') return [];
  if (!didHydrateFromServer && !hydratingFromServer) {
    hydratingFromServer = true;
    fetch(API_URL, { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!Array.isArray(payload)) return;
        contractChecksStore = payload as { contractId: string; checks: ContractCheckEntry[] }[];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        didHydrateFromServer = true;
      })
      .catch(() => {})
      .finally(() => {
        hydratingFromServer = false;
      });
  }
  return contractChecksStore;
}

function save(list: { contractId: string; checks: ContractCheckEntry[] }[]) {
  if (typeof window === 'undefined') return;
  try {
    contractChecksStore = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(list),
    }).catch(() => {});
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      didHydrateFromServer = false;
      void getStored();
    }
  });
}

function syncAllToServerOnce(): void {
  if (typeof window === 'undefined') return;
  if (didBulkSyncToServer || bulkSyncInProgress) return;
  bulkSyncInProgress = true;
  try {
    const list = getStored();
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(list),
    }).catch(() => {});
    didBulkSyncToServer = true;
  } finally {
    bulkSyncInProgress = false;
  }
}

export function getChecksByContract(contractId: string): ContractCheckEntry[] {
  syncAllToServerOnce();
  const entry = getStored().find((e) => e.contractId === contractId);
  return entry?.checks ?? [];
}

export function saveContractChecks(
  contractId: string,
  checks: ContractCheckEntry[]
): void {
  const all = getStored();
  const idx = all.findIndex((e) => e.contractId === contractId);
  const newEntry = { contractId, checks };
  if (idx >= 0) {
    all[idx] = newEntry;
  } else {
    all.push(newEntry);
  }
  save(all);
}
