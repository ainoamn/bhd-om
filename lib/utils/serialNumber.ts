/** لا يُعرض البريد كرقم متسلسل (بيانات قديمة أو مسار احتياطي خاطئ) */
export function safeUserSerialForDisplay(serial: string | null | undefined): string {
  const s = String(serial ?? '').trim();
  if (!s) return '—';
  if (s.includes('@')) return '—';
  return s;
}

/**
 * اختصار الرقم المتسلسل للمستخدم:
 * - BHD-2026-USR-C-0001 → C-0001
 * - USR-C-2025-0001 → C-0001 (قديم)
 */
export function shortenUserSerial(serial: string | null | undefined): string {
  if (!serial?.trim()) return '—';
  const s = serial.trim();
  if (s.includes('@')) return '—';
  const bhd = s.match(/^BHD-\d{4}-USR-([A-Z])-(\d+)$/i);
  if (bhd) return `${bhd[1]}-${bhd[2]}`;
  const legacy = s.match(/^USR-([A-Z])-\d{4}-(\d+)$/i);
  if (legacy) return `${legacy[1]}-${legacy[2]}`;
  return s;
}

/** عرض مختصر لعقار: BHD-2026-PRP-R-0001 */
export function shortenPropertySerial(serial: string | null | undefined): string {
  if (!serial?.trim()) return '—';
  const s = serial.trim();
  const bhd = s.match(/^BHD-\d{4}-PRP-([RSI])-(\d+)$/i);
  if (bhd) return `PRP-${bhd[1]}-${bhd[2]}`;
  return s;
}

/** عرض مختصر لمشروع */
export function shortenProjectSerial(serial: string | null | undefined): string {
  if (!serial?.trim()) return '—';
  const s = serial.trim();
  const bhd = s.match(/^BHD-\d{4}-PRJ-(.+)-(\d+)$/i);
  if (bhd) return `PRJ-${bhd[1]}-${bhd[2]}`;
  return s;
}
