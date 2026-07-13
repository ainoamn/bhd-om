import type { ContractLifecycleKey } from '@/lib/real-estate/contractLifecycle';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';

export type SavedContractListRow = {
  storageKey: string;
  building: string;
  unit: string;
  agreementNo: string;
  tenantNameAr: string;
  tenantNameEn: string;
  civilCard: string;
  tenantMobile: string;
  ownerNames: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  paymentMethod: string;
  contractSubjectToVat: string;
  lifecycleStatus: ContractLifecycleKey;
  lifecycleLabelAr: string;
  lifecycleLabelEn: string;
  savedAt: string;
  updatedAt: string;
  daysLeft: number | null;
  hasRenewalDraft: boolean;
  hasTenancyDraft: boolean;
  rowIndex: number;
};

export type ContractsTableFilters = {
  search: string;
  building: string;
  lifecycle: string;
  expire: string;
  vat: string;
};

export type ContractsSortKey =
  | 'building'
  | 'unit'
  | 'agreementNo'
  | 'tenant'
  | 'owner'
  | 'startDate'
  | 'endDate'
  | 'days'
  | 'rent'
  | 'lifecycle';

export type ContractsSortState = {
  key: ContractsSortKey;
  dir: 'asc' | 'desc';
};

export function savedContractToOperationsUnit(row: SavedContractListRow): OperationsUnitRow {
  return {
    building: row.building,
    unit: row.unit,
    tenant: row.tenantNameAr,
    tenantEn: row.tenantNameEn,
    civilCard: row.civilCard,
    mobile: row.tenantMobile,
    contactNo: row.tenantMobile,
    agreementNo: row.agreementNo,
    monthlyRent: row.monthlyRent,
    startDate: row.startDate,
    endDate: row.endDate,
    ownerNames: row.ownerNames,
    status: 'Rented',
    daysLeft: row.daysLeft,
    statusToken: row.daysLeft !== null && row.daysLeft < 0 ? 'Overdue' : row.daysLeft !== null && row.daysLeft <= 90 ? 'Expiring' : 'Rented',
    contractStateKey: row.lifecycleStatus,
    contractStateLabelAr: row.lifecycleLabelAr,
    contractStateLabelEn: row.lifecycleLabelEn,
    rowIndex: row.rowIndex,
  };
}
