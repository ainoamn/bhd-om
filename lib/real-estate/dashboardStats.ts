import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';

export type RealEstateDashboardStats = {
  buildings: number;
  owners: number;
  totalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  monthlyRentOmr: number;
  yearlyRentOmr: number;
  expiring30: number;
  expiring60: number;
  expiring90: number;
  evictionQueue: number;
  moduleBadges: {
    accountingPending: number;
    maintenanceOpen: number;
    tasksOpen: number;
  };
};

type UnitRow = {
  status?: string;
  monthlyRent?: number | string;
  endDate?: string;
  building?: string;
  unit?: string;
};

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function daysUntil(endDate: string | undefined): number | null {
  if (!endDate?.trim()) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function reservedUnitKeys(kv: LegacyKvStringMap): Set<string> {
  const reservations = parseJson<Record<string, unknown>>(kv.bhd_unit_reservations, {});
  const keys = new Set<string>();
  for (const [building, floors] of Object.entries(reservations)) {
    if (!floors || typeof floors !== 'object') continue;
    for (const units of Object.values(floors as Record<string, unknown>)) {
      if (!units || typeof units !== 'object') continue;
      for (const unitNo of Object.keys(units as Record<string, unknown>)) {
        keys.add(`${building}::${unitNo}`);
      }
    }
  }
  return keys;
}

function isReservedUnit(u: UnitRow, reserved: Set<string>): boolean {
  return reserved.has(`${u.building || ''}::${u.unit || ''}`);
}

function countActiveBuildings(kv: LegacyKvStringMap): number {
  const profiles = parseJson<Record<string, { name?: string; archived?: boolean; deleted?: boolean }>>(
    kv.bhd_building_profiles,
    {}
  );
  const fromProfiles = Object.values(profiles).filter((p) => {
    const name = String(p?.name || '').trim();
    return name && !p?.archived && !p?.deleted;
  }).length;
  if (fromProfiles > 0) return fromProfiles;
  const list = parseJson<string[]>(kv.bhd_buildings_list, []);
  return list.filter((n) => String(n || '').trim()).length;
}

function countOwners(kv: LegacyKvStringMap): number {
  const list = parseJson<string[]>(kv.bhd_owners_list, []);
  return list.filter((n) => String(n || '').trim()).length;
}

function countAccountingPending(kv: LegacyKvStringMap): number {
  const reg = parseJson<{ entries?: Array<{ status?: string; approvalStatus?: string }> }>(
    kv.bhd_accounting_registry,
    {}
  );
  return (reg.entries || []).filter((e) => {
    const s = String(e?.status || e?.approvalStatus || '').toLowerCase();
    return s.includes('pending') || s.includes('draft');
  }).length;
}

function countMaintenanceOpen(kv: LegacyKvStringMap): number {
  const reg = parseJson<{ requests?: Array<{ status?: string }> }>(kv.bhd_maintenance_registry, {});
  return (reg.requests || []).filter((r) => {
    const s = String(r?.status || '').toLowerCase();
    return s && !['completed', 'cancelled', 'closed'].includes(s);
  }).length;
}

function countTasksOpen(kv: LegacyKvStringMap): number {
  const reg = parseJson<{ tasks?: Array<{ status?: string }> }>(kv.bhd_tasks_registry, {});
  return (reg.tasks || []).filter((t) =>
    ['open', 'in_progress', 'pending'].includes(String(t?.status || '').toLowerCase())
  ).length;
}

export function computeRealEstateDashboardStats(kv: LegacyKvStringMap): RealEstateDashboardStats {
  const units = parseJson<UnitRow[]>(kv.bhd_managed_units, []);
  const reserved = reservedUnitKeys(kv);
  const rented = units.filter((u) => String(u.status || '') === 'Rented');
  const vacant = units.filter(
    (u) => String(u.status || '') === 'Vacant' && !isReservedUnit(u, reserved)
  );
  const reservedUnits = units.filter((u) => isReservedUnit(u, reserved));
  const monthlyRentOmr = rented.reduce((sum, u) => sum + (parseFloat(String(u.monthlyRent)) || 0), 0);

  const expiring = (maxDays: number) =>
    units.filter((u) => {
      const d = daysUntil(u.endDate);
      return d !== null && d >= 0 && d <= maxDays;
    }).length;

  const evictions = parseJson<unknown[]>(kv.bhd_eviction_requests, []);

  return {
    buildings: countActiveBuildings(kv),
    owners: countOwners(kv),
    totalUnits: units.length,
    rentedUnits: rented.length,
    vacantUnits: vacant.length,
    reservedUnits: reservedUnits.length,
    monthlyRentOmr,
    yearlyRentOmr: monthlyRentOmr * 12,
    expiring30: expiring(30),
    expiring60: expiring(60),
    expiring90: expiring(90),
    evictionQueue: evictions.length,
    moduleBadges: {
      accountingPending: countAccountingPending(kv),
      maintenanceOpen: countMaintenanceOpen(kv),
      tasksOpen: countTasksOpen(kv),
    },
  };
}

export function formatOmr(amount: number, locale: 'ar' | 'en'): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);
}
