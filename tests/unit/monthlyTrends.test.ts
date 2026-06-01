import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthlyTrendSeries } from '../../lib/accounting/dashboard/monthlyTrends';
import type { ChartAccount, JournalEntry } from '../../lib/data/accounting';

const revenueAccount: ChartAccount = {
  id: 'rev1',
  code: '4000',
  nameAr: 'إيراد',
  type: 'REVENUE',
  isActive: true,
  sortOrder: 1,
};

const expenseAccount: ChartAccount = {
  id: 'exp1',
  code: '5000',
  nameAr: 'مصروف',
  type: 'EXPENSE',
  isActive: true,
  sortOrder: 2,
};

describe('computeMonthlyTrendSeries', () => {
  it('returns six months by default', () => {
    const result = computeMonthlyTrendSeries([], [revenueAccount, expenseAccount], 6, new Date('2026-05-15'));
    assert.equal(result.labels.length, 6);
    assert.equal(result.revenue.length, 6);
    assert.equal(result.expense.length, 6);
  });

  it('aggregates revenue and expense from journal lines in range', () => {
    const entry: JournalEntry = {
      id: 'e1',
      serialNumber: 'J-1',
      date: '2026-05-10',
      status: 'APPROVED',
      documentType: 'JOURNAL',
      lines: [
        { accountId: 'rev1', debit: 0, credit: 100 },
        { accountId: 'exp1', debit: 40, credit: 0 },
      ],
    };
    const result = computeMonthlyTrendSeries([entry], [revenueAccount, expenseAccount], 6, new Date('2026-05-31'));
    const mayIdx = result.labels.indexOf('2026-05');
    assert.ok(mayIdx >= 0);
    assert.equal(result.revenue[mayIdx], 100);
    assert.equal(result.expense[mayIdx], 40);
  });

  it('skips cancelled entries', () => {
    const entry: JournalEntry = {
      id: 'e2',
      serialNumber: 'J-2',
      date: '2026-05-10',
      status: 'CANCELLED',
      documentType: 'JOURNAL',
      lines: [{ accountId: 'rev1', debit: 0, credit: 500 }],
    };
    const result = computeMonthlyTrendSeries([entry], [revenueAccount], 6, new Date('2026-05-31'));
    const mayIdx = result.labels.indexOf('2026-05');
    assert.equal(result.revenue[mayIdx], 0);
  });
});
