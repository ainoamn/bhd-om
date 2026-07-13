import {
  getContractLifecycleStateRank,
} from '@/lib/real-estate/contractLifecycle';
import { compareSmart, daysUntil } from '@/lib/real-estate/kvParse';
import type { ManagedUnitKvRow, OperationsUnitRow, UnitsSortState, UnitsTableFilters } from '@/lib/real-estate/operationsUnit';

export function filterUnitsRows(rows: OperationsUnitRow[], filters: UnitsTableFilters): OperationsUnitRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((u) => {
    const days = u.daysLeft;
    const normalizedStatus = u.statusToken;
    const hasUtilities = !!String(u.electricity || '').trim() && !!String(u.water || '').trim();
    const fullText = `${u.tenant || ''} ${u.unit || ''} ${u.building || ''} ${u.ownerNames || ''} ${u.electricity || ''} ${u.water || ''}`.toLowerCase();
    const matchSearch = !search || fullText.includes(search);
    const matchBuilding = filters.building === 'all' || u.building === filters.building;
    const matchStatus = filters.status === 'all' || normalizedStatus === filters.status;
    const matchExpire =
      filters.expire === 'all' || (days !== null && days >= 0 && days <= Number(filters.expire));
    const matchUtilities =
      filters.utilities === 'all' ||
      (filters.utilities === 'complete' && hasUtilities) ||
      (filters.utilities === 'missing' && !hasUtilities);
    return matchSearch && matchBuilding && matchStatus && matchExpire && matchUtilities;
  });
}

export function sortUnitsRows(rows: OperationsUnitRow[], sort: UnitsSortState): OperationsUnitRow[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (sort.key) {
      case 'building':
        va = a.building;
        vb = b.building;
        break;
      case 'owner':
        va = a.ownerNames;
        vb = b.ownerNames;
        break;
      case 'unit':
        va = a.unit;
        vb = b.unit;
        break;
      case 'tenant':
        va = a.tenant || '';
        vb = b.tenant || '';
        break;
      case 'status':
        va = a.statusToken;
        vb = b.statusToken;
        break;
      case 'contractState':
        va = getContractLifecycleStateRank(a.contractStateKey);
        vb = getContractLifecycleStateRank(b.contractStateKey);
        break;
      case 'endDate':
        va = a.endDate || '9999-12-31';
        vb = b.endDate || '9999-12-31';
        break;
      case 'days':
        va = a.daysLeft === null ? 99999 : a.daysLeft;
        vb = b.daysLeft === null ? 99999 : b.daysLeft;
        break;
      case 'electricity':
        va = a.electricity || '';
        vb = b.electricity || '';
        break;
      case 'water':
        va = a.water || '';
        vb = b.water || '';
        break;
      default:
        va = a.daysLeft === null ? 99999 : a.daysLeft;
        vb = b.daysLeft === null ? 99999 : b.daysLeft;
    }
    return compareSmart(va, vb) * dir;
  });
}

export function paginateUnitsRows<T>(rows: T[], page: number, pageSize: number): { rows: T[]; total: number; totalPages: number } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    totalPages,
  };
}
