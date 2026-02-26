/**
 * تحويل التاريخ لصيغة YYYY-MM-DD المناسبة لحقل input type="date"
 * يدعم ISO، YYYY-MM-DD، DD/MM/YYYY
 */
export function normalizeDateForInput(val: string | undefined): string {
  if (!val || !String(val).trim()) return '';
  const s = String(val).trim();
  // صيغة YYYY-MM-DD جاهزة
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // ISO كامل - نأخذ الجزء الأول
  if (s.includes('T')) {
    const part = s.split('T')[0];
    const m = part.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  // DD/MM/YYYY أو DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // محاولة التحليل العام (قد يعمل مع locale)
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00');
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}
