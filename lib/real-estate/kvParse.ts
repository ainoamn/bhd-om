export function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function daysUntil(endDate: string | undefined): number | null {
  if (!endDate?.trim()) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

export function normalizeUnit(u: unknown): string {
  return toStr(u).replace(/\s+/g, '').replace(/[-_]/g, '').toUpperCase();
}

export function normalizeBuildingKey(v: unknown): string {
  return toStr(String(v).replace(/[\u200c\u200d\u200e\u200f]/g, '')).replace(/\s+/g, ' ');
}

export function unitRowKey(building: string, unit: string): string {
  return `${normalizeBuildingKey(building)}\t${normalizeUnit(unit)}`;
}

export function compareSmart(a: unknown, b: unknown): number {
  const ax = (a ?? '').toString().toLowerCase();
  const bx = (b ?? '').toString().toLowerCase();
  const na = parseFloat(ax);
  const nb = parseFloat(bx);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return ax.localeCompare(bx, 'ar');
}
