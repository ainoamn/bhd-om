import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  salesModuleDocType,
  purchasesModuleDocType,
  salesModulePreset,
  SALES_MODULES,
  PURCHASES_MODULES,
} from '@/lib/accounting/ui/salesPurchasesModules';

describe('salesPurchasesModules', () => {
  it('maps sales module ids to document types', () => {
    assert.equal(salesModuleDocType('invoices'), 'INVOICE');
    assert.equal(salesModuleDocType('receipts'), 'RECEIPT');
    assert.equal(salesModuleDocType('unknown'), null);
  });

  it('maps purchases module ids to document types', () => {
    assert.equal(purchasesModuleDocType('purch-inv'), 'PURCHASE_INV');
    assert.equal(purchasesModuleDocType('po'), 'PURCHASE_ORDER');
  });

  it('provides presets for special sales modules', () => {
    const preset = salesModulePreset('credit-notes');
    assert.equal(preset.descriptionEn, 'Credit note');
  });

  it('exports module lists with icons', () => {
    assert.ok(SALES_MODULES.length >= 6);
    assert.ok(PURCHASES_MODULES.length >= 4);
    assert.ok(SALES_MODULES.every((m) => m.icon));
  });
});
