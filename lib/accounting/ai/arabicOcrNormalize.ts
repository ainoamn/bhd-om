/** Normalize Arabic OCR text — Eastern Arabic numerals, whitespace, common OCR noise */
export function normalizeArabicOcrText(text: string): string {
  let s = text.normalize('NFKC');
  const eastern = '٠١٢٣٤٥٦٧٨٩';
  for (let i = 0; i < eastern.length; i++) {
    s = s.replaceAll(eastern[i], String(i));
  }
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  for (let i = 0; i < persian.length; i++) {
    s = s.replaceAll(persian[i], String(i));
  }
  s = s.replace(/[٫،]/g, '.');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}
