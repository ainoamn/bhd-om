import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyDocForm,
  createEmptyJournalForm,
  docFormFromInvoiceScan,
  docTypeUsesLineItems,
} from '../../lib/accounting/forms/formFactories';

describe('formFactories', () => {
  it('docTypeUsesLineItems identifies invoice types', () => {
    assert.equal(docTypeUsesLineItems('INVOICE'), true);
    assert.equal(docTypeUsesLineItems('RECEIPT'), false);
  });

  it('createEmptyDocForm sets serial and line items flag', () => {
    const form = createEmptyDocForm('INVOICE', { descriptionAr: 'اختبار' }, new Date('2026-05-01'));
    assert.equal(form.type, 'INVOICE');
    assert.equal(form.descriptionAr, 'اختبار');
    assert.equal(form.useLineItems, true);
    assert.ok(form.serialNumber.length > 0);
    assert.equal(form.date, '2026-05-01');
  });

  it('docFormFromInvoiceScan maps OCR draft fields', () => {
    const form = docFormFromInvoiceScan(
      {
        type: 'PURCHASE_INV',
        amount: '150',
        descriptionAr: 'فاتورة',
        reference: 'REF-1',
        vatRate: 5,
      },
      new Date('2026-05-10')
    );
    assert.equal(form.type, 'PURCHASE_INV');
    assert.equal(form.amount, '150');
    assert.equal(form.reference, 'REF-1');
    assert.equal(form.vatRate, 5);
    assert.equal(form.items[0].unitPrice, '150');
  });

  it('createEmptyJournalForm has one blank line', () => {
    const form = createEmptyJournalForm(new Date('2026-06-01'));
    assert.equal(form.date, '2026-06-01');
    assert.equal(form.lines.length, 1);
    assert.equal(form.lines[0].accountId, '');
  });
});
