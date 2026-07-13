import type { ContractLifecycleKey } from '@/lib/real-estate/contractLifecycle';

export type ManagedUnitKvRow = {
  serialNo?: string;
  building: string;
  unit: string;
  floor?: string;
  unitType?: string;
  status: string;
  tenant?: string;
  tenantEn?: string;
  civilCard?: string;
  contactNo?: string;
  mobile?: string;
  agreementNo?: string;
  monthlyRent?: number | string;
  agreementRent?: number | string;
  rentAmount?: number | string;
  startDate?: string;
  endDate?: string;
  remainingDays?: number | string;
  monthsLeft?: number | string | null;
  evacuationDate?: string;
  electricity?: string;
  electricityReading?: string;
  water?: string;
  waterReading?: string;
  remarks?: string;
  ownerNames?: string;
};

export type OperationsUnitRow = ManagedUnitKvRow & {
  ownerNames: string;
  daysLeft: number | null;
  statusToken: UnitStatusToken;
  contractStateKey: ContractLifecycleKey;
  contractStateLabelAr: string;
  contractStateLabelEn: string;
  rowIndex: number;
};

export type UnitStatusToken = 'Rented' | 'Vacant' | 'Expiring' | 'Overdue' | 'NoEndDate';

export type UnitsTableFilters = {
  search: string;
  building: string;
  status: string;
  expire: string;
  utilities: string;
};

export type UnitsSortKey =
  | 'building'
  | 'owner'
  | 'unit'
  | 'tenant'
  | 'status'
  | 'contractState'
  | 'endDate'
  | 'days'
  | 'electricity'
  | 'water';

export type UnitsSortState = {
  key: UnitsSortKey;
  dir: 'asc' | 'desc';
};

export type ContractPayload = {
  buildingNo?: string;
  flatNo?: string;
  floorDetails?: string;
  unitType?: string;
  tenantNameAr?: string;
  tenantNameEn?: string;
  tenantId?: string;
  tenantMobile?: string;
  agreementNo?: string;
  monthlyRent?: number | string;
  startDate?: string;
  endDate?: string;
  electricityMeter?: string;
  waterMeter?: string;
  contractSavedStatus?: string;
};

export type SavedContractEntry = {
  payload?: ContractPayload;
  lifecycleStatus?: string;
};

export type TenancyDraftEntry = {
  payload?: ContractPayload;
};
