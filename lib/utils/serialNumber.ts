/**
 * اختصار الرقم المتسلسل للمستخدم: USR-C-2025-0001 → C-0001
 */
export function shortenUserSerial(serial: string | null | undefined): string {
  if (!serial?.trim()) return '—';
  const m = serial.match(/USR-([A-Z])-\d{4}-(\d+)/i);
  return m ? `${m[1]}-${m[2]}` : serial;
}
