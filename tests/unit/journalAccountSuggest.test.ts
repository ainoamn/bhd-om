import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveJournalAccountSuggestion } from '@/lib/accounting/ai/journalAccountSuggest';
import type { ChartAccount } from '@/lib/data/accounting';

const accounts: ChartAccount[] = [
  { id: '1', code: '1000', nameAr: 'صندوق', nameEn: 'Cash', type: 'ASSET', isActive: true, sortOrder: 1 },
  { id: '4', code: '4000', nameAr: 'إيرادات', nameEn: 'Revenue', type: 'REVENUE', isActive: true, sortOrder: 4 },
  { id: '5', code: '5000', nameAr: 'مصروفات', nameEn: 'Expense', type: 'EXPENSE', isActive: true, sortOrder: 5 },
];

describe('resolveJournalAccountSuggestion', () => {
  it('suggests cash account for cash keywords', () => {
    const acc = resolveJournalAccountSuggestion('دفع نقداً للصندوق', '', accounts);
    assert.equal(acc?.code, '1000');
  });

  it('suggests revenue for rent keywords', () => {
    const acc = resolveJournalAccountSuggestion('إيراد إيجار شقة', '', accounts);
    assert.equal(acc?.code, '4000');
  });

  it('returns null for empty description', () => {
    assert.equal(resolveJournalAccountSuggestion('', '', accounts), null);
  });
});
