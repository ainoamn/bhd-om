import { parseJson, toStr } from '@/lib/real-estate/kvParse';

export type ReservationUnitEntry = {
  unit: string;
  floor?: string;
  unitType?: string;
  monthlyRent?: string | number;
  electricity?: string;
  water?: string;
};

export type ReservationRecord = Record<string, unknown> & {
  building?: string;
  unit?: string;
  reservedBy?: string;
  phone?: string;
  since?: string;
  state?: string;
  agreementNo?: string;
  units?: ReservationUnitEntry[];
  formData?: Record<string, unknown>;
  reservationGroupId?: string;
  staffName?: string;
};

function normalizeReservationUnitEntry(raw: unknown): ReservationUnitEntry {
  if (!raw || typeof raw !== 'object') return { unit: '' };
  const row = raw as Record<string, unknown>;
  return {
    unit: toStr(row.unit),
    floor: toStr(row.floor || row.floorDetails),
    unitType: toStr(row.unitType),
    monthlyRent: row.monthlyRent as string | number | undefined,
    electricity: toStr(row.electricity || row.electricityMeter),
    water: toStr(row.water || row.waterMeter),
  };
}

/** Supports flat array (current) and legacy nested map in KV. */
export function flattenReservations(raw: string | undefined): ReservationRecord[] {
  const parsed = parseJson<unknown>(raw ?? '', null);
  if (Array.isArray(parsed)) {
    return parsed.filter((r) => r && typeof r === 'object') as ReservationRecord[];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const out: ReservationRecord[] = [];
  for (const [b, floors] of Object.entries(parsed as Record<string, unknown>)) {
    if (!floors || typeof floors !== 'object') continue;
    for (const units of Object.values(floors as Record<string, unknown>)) {
      if (!units || typeof units !== 'object') continue;
      for (const [unitNo, rec] of Object.entries(units as Record<string, unknown>)) {
        if (!rec || typeof rec !== 'object') continue;
        const row = rec as ReservationRecord;
        out.push({
          ...row,
          building: row.building ?? b,
          unit: row.unit ?? unitNo,
        });
      }
    }
  }
  return out;
}

export function getReservationUnitsList(r: ReservationRecord): ReservationUnitEntry[] {
  if (Array.isArray(r.units) && r.units.length) {
    return r.units.map(normalizeReservationUnitEntry).filter((x) => x.unit);
  }
  const fd = r.formData && typeof r.formData === 'object' ? r.formData : {};
  try {
    if (fd.linkedUnitsJson) {
      const parsed = JSON.parse(toStr(fd.linkedUnitsJson) || '[]');
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeReservationUnitEntry).filter((x) => x.unit);
      }
    }
  } catch {
    // ignore
  }
  const legacy = toStr(r.unit);
  if (!legacy) return [];
  return [
    normalizeReservationUnitEntry({
      unit: r.unit,
      floor: fd.floorDetails,
      unitType: fd.unitType,
      monthlyRent: fd.monthlyRent,
      electricity: fd.electricityMeter,
      water: fd.waterMeter,
    }),
  ];
}

export function formatReservationUnitsLabel(r: ReservationRecord): string {
  const list = getReservationUnitsList(r);
  if (list.length > 1) {
    return list.map((x) => x.unit).join(', ');
  }
  return toStr(r.unit) || list[0]?.unit || '—';
}

export function reservationStateLabel(state: unknown, ar: boolean): string {
  return toStr(state) === 'confirmed'
    ? ar
      ? 'مكتمل'
      : 'Completed'
    : ar
      ? 'مسودة'
      : 'Draft';
}
