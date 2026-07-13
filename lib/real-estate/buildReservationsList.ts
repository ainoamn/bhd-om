import { compareSmart, toStr } from '@/lib/real-estate/kvParse';
import {
  flattenReservations,
  formatReservationUnitsLabel,
  getReservationUnitsList,
  reservationStateLabel,
  type ReservationRecord,
} from '@/lib/real-estate/reservationsParse';

export type ReservationListRow = {
  index: number;
  building: string;
  unitsLabel: string;
  unitCount: number;
  reservedBy: string;
  phone: string;
  since: string;
  state: string;
  stateLabelAr: string;
  stateLabelEn: string;
  agreementNo: string;
  staffName: string;
  raw: ReservationRecord;
};

export type ReservationsTableFilters = {
  search: string;
  building: string;
  state: string;
};

export type ReservationsSortKey =
  | 'building'
  | 'unit'
  | 'reservedBy'
  | 'phone'
  | 'since'
  | 'state';

export type ReservationsSortState = {
  key: ReservationsSortKey;
  dir: 'asc' | 'desc';
};

export function buildReservationsListFromKv(raw: string | undefined): {
  rows: ReservationListRow[];
  buildings: string[];
} {
  const records = flattenReservations(raw);
  const rows: ReservationListRow[] = records.map((r, index) => {
    const units = getReservationUnitsList(r);
    return {
      index,
      building: toStr(r.building),
      unitsLabel: formatReservationUnitsLabel(r),
      unitCount: units.length,
      reservedBy: toStr(r.reservedBy),
      phone: toStr(r.phone),
      since: toStr(r.since),
      state: toStr(r.state) || 'draft',
      stateLabelAr: reservationStateLabel(r.state, true),
      stateLabelEn: reservationStateLabel(r.state, false),
      agreementNo: toStr(r.agreementNo),
      staffName: toStr(r.staffName),
      raw: r,
    };
  });

  rows.sort((a, b) => compareSmart(a.since, b.since) * -1);

  const buildings = [...new Set(rows.map((r) => r.building).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ar')
  );

  return { rows, buildings };
}

export function filterReservationsRows(
  rows: ReservationListRow[],
  filters: ReservationsTableFilters
): ReservationListRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((r) => {
    const blob = [r.building, r.unitsLabel, r.reservedBy, r.phone, r.since, r.state, r.agreementNo]
      .join(' ')
      .toLowerCase();
    const matchSearch = !search || blob.includes(search);
    const matchBuilding = filters.building === 'all' || r.building === filters.building;
    const matchState =
      filters.state === 'all' ||
      (filters.state === 'confirmed' && r.state === 'confirmed') ||
      (filters.state === 'draft' && r.state !== 'confirmed');
    return matchSearch && matchBuilding && matchState;
  });
}

export function sortReservationsRows(
  rows: ReservationListRow[],
  sort: ReservationsSortState
): ReservationListRow[] {
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
        va = a.unitsLabel;
        vb = b.unitsLabel;
        break;
      case 'reservedBy':
        va = a.reservedBy;
        vb = b.reservedBy;
        break;
      case 'phone':
        va = a.phone;
        vb = b.phone;
        break;
      case 'since':
        va = a.since;
        vb = b.since;
        break;
      case 'state':
        va = a.state;
        vb = b.state;
        break;
      default:
        va = a.building;
        vb = b.building;
    }
    return compareSmart(va, vb) * dir;
  });
}

export { paginateUnitsRows as paginateReservationsRows } from '@/lib/real-estate/unitsTableFilters';
