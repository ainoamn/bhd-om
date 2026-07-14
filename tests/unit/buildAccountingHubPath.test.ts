import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAccountingHubPath } from '../../lib/accounting/navigation/buildAccountingHubPath';

describe('buildAccountingHubPath', () => {
  it('builds dashboard path', () => {
    assert.equal(buildAccountingHubPath('ar', 'dashboard'), '/ar/admin/accounting?tab=dashboard');
  });

  it('includes action query', () => {
    assert.equal(
      buildAccountingHubPath('ar', 'documents', { action: 'add' }),
      '/ar/admin/accounting?tab=documents&action=add'
    );
  });

  it('includes report only for reports tab', () => {
    assert.equal(
      buildAccountingHubPath('ar', 'reports', { report: 'trial' }),
      '/ar/admin/accounting?tab=reports&report=trial'
    );
    assert.equal(
      buildAccountingHubPath('ar', 'journal', { report: 'trial' }),
      '/ar/admin/accounting?tab=journal'
    );
  });
});
