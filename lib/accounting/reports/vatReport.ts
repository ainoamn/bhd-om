/**
 * VAT Report — Oman-style summary from accounting documents
 * Server-safe pure aggregation
 */

export type VatReportLine = {
  documentId?: string;
  serialNumber: string;
  date: string;
  type: string;
  netAmount: number;
  vatAmount: number;
  direction: 'OUTPUT' | 'INPUT';
};

export type VatReportSummary = {
  vatOutput: number;
  vatInput: number;
  netVatPayable: number;
  taxableSales: number;
  taxablePurchases: number;
  documentCount: number;
  standardRate: number;
};

export type VatReportResult = {
  report: 'vat';
  fromDate: string;
  toDate: string;
  summary: VatReportSummary;
  lines: VatReportLine[];
};

type DocRow = {
  id?: string;
  serialNumber: string;
  type: string;
  date: string;
  status?: string;
  vatAmount?: number | null;
  totalAmount?: number | null;
  netAmount?: number | null;
};

const OUTPUT_TYPES = new Set(['INVOICE', 'RECEIPT']);
const INPUT_TYPES = new Set(['PURCHASE_INV']);

export function buildVatReportFromDocuments(
  docs: DocRow[],
  fromDate: string,
  toDate: string,
  standardRate = 0.05
): VatReportResult {
  let vatOutput = 0;
  let vatInput = 0;
  let taxableSales = 0;
  let taxablePurchases = 0;
  const lines: VatReportLine[] = [];

  for (const doc of docs) {
    if (doc.status === 'CANCELLED') continue;
    const vat = Math.abs(doc.vatAmount ?? 0);
    const total = doc.totalAmount ?? 0;
    const net = doc.netAmount ?? Math.max(0, total - vat);
    const sign = doc.type === 'CREDIT_NOTE' || doc.type === 'DEBIT_NOTE' ? -1 : 1;

    if (OUTPUT_TYPES.has(doc.type) || doc.type === 'CREDIT_NOTE') {
      const mult = doc.type === 'CREDIT_NOTE' ? -1 : 1;
      vatOutput += vat * mult;
      taxableSales += net * mult;
      if (vat > 0) {
        lines.push({
          documentId: doc.id,
          serialNumber: doc.serialNumber,
          date: doc.date,
          type: doc.type,
          netAmount: net * mult,
          vatAmount: vat * mult,
          direction: 'OUTPUT',
        });
      }
    } else if (INPUT_TYPES.has(doc.type) || doc.type === 'DEBIT_NOTE') {
      const mult = doc.type === 'DEBIT_NOTE' ? -1 : 1;
      vatInput += vat * mult;
      taxablePurchases += net * mult;
      if (vat > 0) {
        lines.push({
          documentId: doc.id,
          serialNumber: doc.serialNumber,
          date: doc.date,
          type: doc.type,
          netAmount: net * mult,
          vatAmount: vat * mult,
          direction: 'INPUT',
        });
      }
    }
    void sign;
  }

  return {
    report: 'vat',
    fromDate,
    toDate,
    summary: {
      vatOutput: round2(vatOutput),
      vatInput: round2(vatInput),
      netVatPayable: round2(vatOutput - vatInput),
      taxableSales: round2(taxableSales),
      taxablePurchases: round2(taxablePurchases),
      documentCount: lines.length,
      standardRate,
    },
    lines,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
