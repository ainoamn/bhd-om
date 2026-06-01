import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInvoiceFromText } from '../../lib/accounting/ai/invoiceOcrEngine';
import { buildVatFtaExportPayload, buildVatFtaExportXml } from '../../lib/accounting/reports/vatFtaExport';

describe('parseInvoiceFromText', () => {
  it('parses Arabic invoice with Eastern Arabic digits', () => {
    const result = parseInvoiceFromText(
      'فاتورة\nالتاريخ 2026-05-15\nالإجمالي ١٠٥٫٠٠ ر.ع\nVAT 5%',
      'scan.pdf'
    );
    assert.ok(result);
    assert.equal(result!.amount, 105);
    assert.equal(result!.date, '2026-05-15');
    assert.equal(result!.type, 'INVOICE');
  });

  it('detects purchase invoice keywords', () => {
    const result = parseInvoiceFromText('فاتورة مشتريات من مورد\nTotal 50.000 OMR');
    assert.ok(result);
    assert.equal(result!.type, 'PURCHASE_INV');
  });
});

describe('vatFtaExport', () => {
  it('builds JSON payload with transactions', () => {
    const payload = buildVatFtaExportPayload(
      {
        fromDate: '2026-01-01',
        toDate: '2026-03-31',
        summary: {
          vatOutput: 10,
          vatInput: 3,
          netVatPayable: 7,
          taxableSales: 200,
          taxablePurchases: 60,
          documentCount: 1,
          standardRate: 0.05,
        },
        lines: [
          {
            serialNumber: 'INV-001',
            date: '2026-02-01',
            type: 'INVOICE',
            netAmount: 100,
            vatAmount: 5,
            direction: 'OUTPUT',
          },
        ],
      },
      { vatNumber: 'OM123', nameAr: 'شركة', nameEn: 'Co', crNumber: 'CR1' }
    );
    assert.equal(payload.format, 'BHD-OM-VAT-RETURN');
    assert.equal(payload.transactions.length, 1);
    assert.equal(payload.taxpayer.vatNumber, 'OM123');
  });

  it('builds valid XML with escaped taxpayer name', () => {
    const payload = buildVatFtaExportPayload(
      {
        fromDate: '2026-01-01',
        toDate: '2026-03-31',
        summary: {
          vatOutput: 0,
          vatInput: 0,
          netVatPayable: 0,
          taxableSales: 0,
          taxablePurchases: 0,
          documentCount: 0,
          standardRate: 0.05,
        },
        lines: [],
      },
      { nameAr: 'A & B', nameEn: 'A & B' }
    );
    const xml = buildVatFtaExportXml(payload);
    assert.match(xml, /^<\?xml version="1.0"/);
    assert.match(xml, /A &amp; B/);
    assert.match(xml, /<NetVatPayable>0<\/NetVatPayable>/);
  });
});
