/**
 * رقم الرسم المساحي (الكروكي) — تنسيق ثابت: 01-04-004-03-23
 * أقسام من اليسار لليمين: 2 - 2 - 3 - 2 - 2 أرقام
 */

const SEGMENTS = [2, 2, 3, 2, 2] as const;
const TOTAL_DIGITS = 11;

/** تنسيق المدخلات إلى الشكل XX-XX-XXX-XX-XX مع إضافة الشرطات تلقائياً */
export function formatSurveyMapNumber(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, TOTAL_DIGITS);
  if (digits.length === 0) return '';
  let pos = 0;
  const parts: string[] = [];
  for (const len of SEGMENTS) {
    const part = digits.slice(pos, pos + len);
    if (part.length === 0) break;
    parts.push(part);
    pos += len;
    if (pos >= digits.length) break;
  }
  return parts.join('-');
}

/** استخراج الأرقام فقط من القيمة (المنسقة أو غير المنسقة) */
export function getSurveyMapDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, TOTAL_DIGITS);
}

/** التحقق من اكتمال الرقم بالشكل 01-04-004-03-23 */
export function isSurveyMapComplete(value: string): boolean {
  return getSurveyMapDigits(value).length === TOTAL_DIGITS;
}
