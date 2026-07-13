import { getContractLifecycleStateRank } from '@/lib/real-estate/contractLifecycle';
import { compareSmart } from '@/lib/real-estate/kvParse';
import { paginateUnitsRows } from '@/lib/real-estate/unitsTableFilters';
import type {
  ContractsSortState,
  ContractsTableFilters,
  SavedContractListRow,
} from '@/lib/real-estate/savedContractListRow';

export function filterContractsRows(
  rows: SavedContractListRow[],
  filters: ContractsTableFilters
): SavedContractListRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((r) => {
    const fullText = [
      r.agreementNo,
      r.tenantNameAr,
      r.tenantNameEn,
      r.building,
      r.unit,
      r.ownerNames,
      r.civilCard,
      r.tenantMobile,
    ]
      .join(' ')
      .toLowerCase();
    const matchSearch = !search || fullText.includes(search);
    const matchBuilding = filters.building === 'all' || r.building === filters.building;
    const matchLifecycle =
      filters.lifecycle === 'all' || r.lifecycleStatus === filters.lifecycle;
    const matchExpire =
      filters.expire === 'all' ||
      (r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= Number(filters.expire));
    const matchVat =
      filters.vat === 'all' ||
      (filters.vat === 'yes' && r.contractSubjectToVat === 'yes') ||
      (filters.vat === 'no' && r.contractSubjectToVat !== 'yes');
    return matchSearch && matchBuilding && matchLifecycle && matchExpire && matchVat;
  });
}

export function sortContractsRows(
  rows: SavedContractListRow[],
  sort: ContractsSortState
): SavedContractListRow[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (sort.key) {
      case 'building':
        va = a.building;
        vb = b.building;
        break;
      case 'unit':
        va = a.unit;
        vb = b.unit;
        break;
      case 'agreementNo':
        va = a.agreementNo;
        vb = b.agreementNo;
        break;
      case 'tenant':
        va = a.tenantNameAr || a.tenantNameEn;
        vb = b.tenantNameAr || b.tenantNameEn;
        break;
      case 'owner':
        va = a.ownerNames;
        vb = b.ownerNames;
        break;
      case 'startDate':
        va = a.startDate || '9999-12-31';
        vb = b.startDate || '9999-12-31';
        break;
      case 'endDate':
        va = a.endDate || '9999-12-31';
        vb = b.endDate || '9999-12-31';
        break;
      case 'days':
        va = a.daysLeft ?? 99999;
        vb = b.daysLeft ?? 99999;
        break;
      case 'rent':
        va = parseFloat(a.monthlyRent) || 0;
        vb = parseFloat(b.monthlyRent) || 0;
        break;
      case 'lifecycle':
        va = getContractLifecycleStateRank(a.lifecycleStatus);
        vb = getContractLifecycleStateRank(b.lifecycleStatus);
        break;
      default:
        va = a.daysLeft ?? 99999;
        vb = b.daysLeft ?? 99999;
    }
    return compareSmart(va, vb) * dir;
  });
}

export { paginateUnitsRows as paginateContractsRows };
