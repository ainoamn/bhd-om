const LEGACY_BASE = '/api/admin/legacy-real-estate/bhd-real-estate.html';

export type LegacyUnitAction = 'details' | 'fill' | 'renew' | 'print';

/** Deep-link into legacy dashboard for a specific unit action (opens in new tab). */
export function buildLegacyUnitActionUrl(
  building: string,
  unit: string,
  action: LegacyUnitAction,
  locale: string
): string {
  const params = new URLSearchParams({
    mode: 'dashboard',
    unitAction: action,
    building,
    unit,
    locale,
  });
  return `${LEGACY_BASE}?${params.toString()}`;
}
