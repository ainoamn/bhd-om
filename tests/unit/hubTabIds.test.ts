import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNTING_HUB_TAB_IDS,
  ACCOUNTING_HUB_E2E_TAB_ORDER,
  ACCOUNTING_HUB_MODAL_ACTION_TABS,
  isAccountingHubTabId,
  parseAccountingHubTabId,
  isAccountingHubModalActionTab,
} from '../../lib/accounting/ui/hubTabIds';

describe('ACCOUNTING_HUB_TAB_IDS', () => {
  it('lists 13 tabs including dashboard and settings', () => {
    assert.equal(ACCOUNTING_HUB_TAB_IDS.length, 13);
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('dashboard'));
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('reports'));
    assert.ok(ACCOUNTING_HUB_TAB_IDS.includes('settings'));
  });

  it('E2E tab order matches hub tab ids (same set)', () => {
    assert.equal(ACCOUNTING_HUB_E2E_TAB_ORDER.length, ACCOUNTING_HUB_TAB_IDS.length);
    assert.deepEqual([...ACCOUNTING_HUB_E2E_TAB_ORDER].sort(), [...ACCOUNTING_HUB_TAB_IDS].sort());
  });

  it('parseAccountingHubTabId rejects unknown tabs', () => {
    assert.equal(parseAccountingHubTabId('not-a-tab'), 'dashboard');
    assert.equal(parseAccountingHubTabId(null), 'dashboard');
    assert.equal(parseAccountingHubTabId('journal'), 'journal');
  });

  it('isAccountingHubTabId validates membership', () => {
    assert.equal(isAccountingHubTabId('sales'), true);
    assert.equal(isAccountingHubTabId('invalid'), false);
  });

  it('modal action tabs are valid hub tabs', () => {
    for (const tab of ACCOUNTING_HUB_MODAL_ACTION_TABS) {
      assert.ok(isAccountingHubTabId(tab));
      assert.ok(isAccountingHubModalActionTab(tab));
    }
    assert.equal(isAccountingHubModalActionTab('dashboard'), false);
  });
});
