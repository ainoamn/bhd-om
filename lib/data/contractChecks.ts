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

function getStored(): { contractId: string; checks: ContractCheckEntry[] }[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: { contractId: string; checks: ContractCheckEntry[] }[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getChecksByContract(contractId: string): ContractCheckEntry[] {
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
