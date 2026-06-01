/**
 * Invoice OCR v1 — rule-based text parsing (human review required before save)
 * Accepts pasted OCR text or filename hints; no external OCR dependency.
 */

export type ScannedInvoiceDraft = {
  type: 'INVOICE' | 'PURCHASE_INV';
  date?: string;
  dueDate?: string;
  amount?: number;
  netAmount?: number;
  vatAmount?: number;
  vatRate?: number;
  reference?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  vendorHint?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanationAr: string;
  explanationEn: string;
};

const DATE_PATTERNS = [
  /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g,
  /\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/g,
];

function normalizeDate(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function extractDates(text: string): string[] {
  const found: string[] = [];
  for (const re of DATE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[1].length === 4) {
        found.push(normalizeDate(m[1], m[2], m[3]));
      } else {
        found.push(normalizeDate(m[3], m[2], m[1]));
      }
    }
  }
  return [...new Set(found)].sort();
}

function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  const re = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,3})?|\d+(?:\.\d{1,3})?)\s*(?:ر\.?\s*ع|OMR|rial|ريال)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) amounts.push(n);
  }
  return amounts;
}

function extractReference(text: string): string | undefined {
  const patterns = [
    /(?:invoice|فاتورة|inv|bill|ref|reference|رقم)[\s#:]*([A-Z0-9\-/]{4,})/i,
    /\b(ACC-(?:INV|PINV|RCP)-[\d-]+)\b/i,
    /\b(INV-\d+)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function extractVendorHint(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const skip = /^(invoice|فاتورة|tax|vat|total|amount|date|tel|phone|email)/i;
  for (const line of lines.slice(0, 8)) {
    if (line.length < 4 || line.length > 80) continue;
    if (skip.test(line)) continue;
    if (/\d{4}[-/]\d/.test(line)) continue;
    return line.slice(0, 80);
  }
  return undefined;
}

function isPurchase(text: string) {
  return /(مشتريات|purchase|supplier|vendor|مورد|bill\s+from|فاتورة\s+شراء)/i.test(text);
}

function pickTotalAmount(text: string, amounts: number[]): number | undefined {
  if (amounts.length === 0) return undefined;
  const totalLine = text.match(/(?:total|grand\s+total|الإجمالي|المجموع|amount\s+due|الاجمالي|المبلغ\s*الاجمالي)[^\d]{0,30}(\d[\d,.\s]*)/i);
  if (totalLine) {
    const n = parseFloat(totalLine[1].replace(/[,\s]/g, ''));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 1000) / 1000;
  }
  return Math.max(...amounts);
}

function extractDueDate(text: string, dates: string[], invoiceDate?: string): string | undefined {
  const dueMatch = text.match(
    /(?:due\s*date|payment\s*due|تاريخ\s*الاستحقاق|استحقاق)[^\d]{0,20}(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})/i
  );
  if (dueMatch) {
    const part = dueMatch[1];
    const iso = part.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) return normalizeDate(iso[1], iso[2], iso[3]);
    const dmy = part.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) return normalizeDate(dmy[3], dmy[2], dmy[1]);
  }
  const future = dates.filter((d) => !invoiceDate || d > invoiceDate);
  return future.length > 0 ? future[future.length - 1] : undefined;
}

import { normalizeArabicOcrText } from './arabicOcrNormalize';

export function parseInvoiceFromText(text: string, fileName?: string): ScannedInvoiceDraft | null {
  const combined = normalizeArabicOcrText([text, fileName || ''].filter(Boolean).join('\n'));
  if (combined.length < 3) return null;

  const dates = extractDates(combined);
  const invoiceDate = dates[0];
  const dueDate = extractDueDate(combined, dates, invoiceDate);
  const amounts = extractAmounts(combined);
  const total = pickTotalAmount(combined, amounts);
  if (!total && amounts.length === 0 && !invoiceDate) return null;

  const type = isPurchase(combined) ? 'PURCHASE_INV' : 'INVOICE';
  const reference = extractReference(combined);
  const vendorHint = extractVendorHint(combined);

  let vatRate: number | undefined;
  let vatAmount: number | undefined;
  let netAmount: number | undefined;
  if (/\b5\s*%|\bvat\b|ضريبة|ق\.?\s*م/i.test(combined) && total) {
    vatRate = 5;
    netAmount = Math.round((total / 1.05) * 1000) / 1000;
    vatAmount = Math.round((total - netAmount) * 1000) / 1000;
  }

  const hasDate = !!invoiceDate;
  const hasAmount = !!total;
  const confidence: ScannedInvoiceDraft['confidence'] =
    hasDate && hasAmount && reference ? 'HIGH' : hasAmount ? 'MEDIUM' : 'LOW';

  const desc = vendorHint || reference || (type === 'PURCHASE_INV' ? 'فاتورة مشتريات' : 'فاتورة بيع');

  return {
    type,
    date: invoiceDate,
    dueDate: dueDate || invoiceDate,
    amount: total,
    netAmount,
    vatAmount,
    vatRate,
    reference,
    descriptionAr: desc,
    descriptionEn: desc,
    vendorHint,
    confidence,
    explanationAr: `تم استخراج ${hasAmount ? `${total} ر.ع` : '—'}${hasDate ? ` · تاريخ ${invoiceDate}` : ''} — راجع قبل الحفظ`,
    explanationEn: `Extracted ${hasAmount ? `${total} OMR` : '—'}${hasDate ? ` · date ${invoiceDate}` : ''} — review before save`,
  };
}
