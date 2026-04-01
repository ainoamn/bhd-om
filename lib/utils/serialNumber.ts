/**
 * اختصار الرقم المتسلسل للمستخدم:
 * - BHD-2026-USR-C-0001 -> C-0001
 * - USR-C-2026-0001 -> C-0001 (دعم قديم)
 */
export function shortenUserSerial(serial: string | null | undefined): string {
  if (!serial?.trim()) return '—';
  const m = serial.match(/(?:BHD-\d{4}-)?USR-([A-Z])-\d{4}-(\d+)/i);
  return m ? `${m[1]}-${m[2]}` : serial;
}
