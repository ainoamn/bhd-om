import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNTING_HUB_TAB_IDS } from '../../lib/accounting/ui/hubTabIds';

describe('ACCOUNTING_HUB_TAB_IDS', () => {
  it('lists 13 tabs including dashboard and settings', () => {
    assert.equal(ACCOUNTING_HUB_TAB_IDS.length, 13);
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('dashboard'));
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('reports'));
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('settings'));
  });

  it('matches E2E accounting-hub tab list order', () => {
    const e2eTabs = [
      'dashboard',
      'sales',
      'purchases',
      'journal',
      'documents',
      'reports',
      'accounts',
      'claims',
      'cheques',
      'payments',
      'periods',
      'audit',
      'settings',
    ];
    assert.deepEqual([...ACCOUNTING_HUB_TAB_IDS].sort(), [...e2eTabs].sort());
  });
});
