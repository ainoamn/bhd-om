import type { AccountType } from '@/lib/data/accounting';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, { ar: string; en: string }> = {
  ASSET: { ar: 'أصول', en: 'Assets' },
  LIABILITY: { ar: 'التزامات', en: 'Liabilities' },
  EQUITY: { ar: 'حقوق الملكية', en: 'Equity' },
  REVENUE: { ar: 'إيرادات', en: 'Revenue' },
  EXPENSE: { ar: 'مصروفات', en: 'Expenses' },
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
