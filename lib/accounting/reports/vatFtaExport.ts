import type { VatReportResult } from './vatReport';

export type VatFtaExportPayload = {
  schemaVersion: '1.0';
  format: 'BHD-OM-VAT-RETURN';
  jurisdiction: 'OM';
  currency: 'OMR';
  period: { startDate: string; endDate: string };
  taxpayer: {
    vatNumber: string;
    legalNameAr: string;
    legalNameEn: string;
    crNumber: string;
  };
  totals: {
    standardRate: number;
    outputVat: number;
    inputVat: number;
    netVatPayable: number;
    taxableSales: number;
    taxablePurchases: number;
    documentCount: number;
  };
  transactions: Array<{
    reference: string;
    transactionDate: string;
    documentType: string;
    supplyDirection: 'OUTPUT' | 'INPUT';
    netAmount: number;
    vatAmount: number;
  }>;
  generatedAt: string;
};

export function buildVatFtaExportPayload(
  report: Pick<VatReportResult, 'fromDate' | 'toDate' | 'summary' | 'lines'>,
  taxpayer?: { vatNumber?: string; nameAr?: string; nameEn?: string; crNumber?: string }
): VatFtaExportPayload {
  return {
    schemaVersion: '1.0',
    format: 'BHD-OM-VAT-RETURN',
    jurisdiction: 'OM',
    currency: 'OMR',
    period: { startDate: report.fromDate, endDate: report.toDate },
    taxpayer: {
      vatNumber: taxpayer?.vatNumber ?? '',
      legalNameAr: taxpayer?.nameAr ?? '',
      legalNameEn: taxpayer?.nameEn ?? '',
      crNumber: taxpayer?.crNumber ?? '',
    },
    totals: {
      standardRate: report.summary.standardRate,
      outputVat: report.summary.vatOutput,
      inputVat: report.summary.vatInput,
      netVatPayable: report.summary.netVatPayable,
      taxableSales: report.summary.taxableSales,
      taxablePurchases: report.summary.taxablePurchases,
      documentCount: report.summary.documentCount,
    },
    transactions: report.lines.map((l) => ({
      reference: l.serialNumber,
      transactionDate: l.date,
      documentType: l.type,
      supplyDirection: l.direction,
      netAmount: l.netAmount,
      vatAmount: l.vatAmount,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Structured XML for FTA filing prep / third-party tools */
export function buildVatFtaExportXml(payload: VatFtaExportPayload): string {
  const txRows = payload.transactions
    .map(
      (t) =>
        `    <Transaction reference="${escapeXml(t.reference)}" date="${escapeXml(t.transactionDate)}" type="${escapeXml(t.documentType)}" direction="${t.supplyDirection}">` +
        `<NetAmount>${t.netAmount}</NetAmount><VatAmount>${t.vatAmount}</VatAmount></Transaction>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<VatReturn xmlns="https://bhd-om.local/schemas/vat-return/1.0" schemaVersion="${payload.schemaVersion}">
  <Jurisdiction>${payload.jurisdiction}</Jurisdiction>
  <Currency>${payload.currency}</Currency>
  <Period start="${escapeXml(payload.period.startDate)}" end="${escapeXml(payload.period.endDate)}"/>
  <Taxpayer vatNumber="${escapeXml(payload.taxpayer.vatNumber)}" crNumber="${escapeXml(payload.taxpayer.crNumber)}">
    <LegalName lang="ar">${escapeXml(payload.taxpayer.legalNameAr)}</LegalName>
    <LegalName lang="en">${escapeXml(payload.taxpayer.legalNameEn)}</LegalName>
  </Taxpayer>
  <Totals standardRate="${payload.totals.standardRate}">
    <OutputVat>${payload.totals.outputVat}</OutputVat>
    <InputVat>${payload.totals.inputVat}</InputVat>
    <NetVatPayable>${payload.totals.netVatPayable}</NetVatPayable>
    <TaxableSales>${payload.totals.taxableSales}</TaxableSales>
    <TaxablePurchases>${payload.totals.taxablePurchases}</TaxablePurchases>
    <DocumentCount>${payload.totals.documentCount}</DocumentCount>
  </Totals>
  <Transactions count="${payload.transactions.length}">
${txRows}
  </Transactions>
  <GeneratedAt>${escapeXml(payload.generatedAt)}</GeneratedAt>
</VatReturn>`;
}
