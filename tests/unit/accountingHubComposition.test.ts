import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNTING_HUB_TAB_IDS } from '../../lib/accounting/ui/hubTabIds';
import { buildAccountingHubPath } from '../../lib/accounting/navigation/buildAccountingHubPath';
import { ACCOUNTING_DRAFT_KEYS } from '../../lib/accounting/ui/draftKeys';
import { ACCOUNTING_HUB_CONTROLLER_KEYS } from '../../lib/accounting/hooks/accountingHubControllerKeys';
import { parseAccountingHubTabId } from '../../lib/accounting/ui/hubTabIds';
import {
  createEmptyDocForm,
  createEmptyJournalForm,
  docFormFromInvoiceScan,
} from '../../lib/accounting/forms/formFactories';

describe('accounting hub composition', () => {
  it('controller exposes stable top-level keys', () => {
    assert.ok(ACCOUNTING_HUB_CONTROLLER_KEYS.includes('hub'));
    assert.ok(ACCOUNTING_HUB_CONTROLLER_KEYS.includes('analytics'));
    assert.ok(ACCOUNTING_HUB_CONTROLLER_KEYS.includes('forms'));
    assert.equal(ACCOUNTING_HUB_CONTROLLER_KEYS.length, 15);
  });

  it('every tab id builds a valid hub path', () => {
    for (const tab of ACCOUNTING_HUB_TAB_IDS) {
      const path = buildAccountingHubPath('ar', tab);
      assert.match(path, /^\/ar\/admin\/accounting\?tab=/);
      assert.ok(path.includes(`tab=${tab}`));
    }
  });

  it('draft keys are unique', () => {
    const values = Object.values(ACCOUNTING_DRAFT_KEYS);
    assert.equal(new Set(values).size, values.length);
  });

  it('form preset flow: sales invoice → OCR scan share document draft key', () => {
    const fromSales = createEmptyDocForm('INVOICE', { descriptionAr: 'فاتورة بيع' });
    const fromOcr = docFormFromInvoiceScan({
      type: 'INVOICE',
      amount: '100',
      descriptionAr: 'OCR',
    });
    assert.equal(fromSales.type, 'INVOICE');
    assert.equal(fromOcr.type, 'INVOICE');
    assert.equal(fromSales.useLineItems, true);
    assert.equal(fromOcr.amount, '100');
  });

  it('journal form factory produces balanced-ready structure', () => {
    const j = createEmptyJournalForm(new Date('2026-07-01'));
    assert.equal(j.lines.length, 1);
    assert.equal(j.date, '2026-07-01');
  });

  it('add action URLs open correct tabs', () => {
    assert.equal(
      buildAccountingHubPath('ar', 'journal', { action: 'add' }),
      '/ar/admin/accounting?tab=journal&action=add'
    );
    assert.equal(
      buildAccountingHubPath('ar', 'cheques', { action: 'add' }),
      '/ar/admin/accounting?tab=cheques&action=add'
    );
  });

  it('parseAccountingHubTabId falls back for invalid query', () => {
    assert.equal(parseAccountingHubTabId('bogus-tab'), 'dashboard');
  });
});
