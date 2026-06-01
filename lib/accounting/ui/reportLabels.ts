/** Accounting report tab labels — shared by hub and export */
export type ReportViewId =
  | 'trial'
  | 'income'
  | 'balance'
  | 'cashflow'
  | 'bankStatement'
  | 'propertyLedger'
  | 'vat'
  | 'aging'
  | 'reconciliation'
  | 'compare';

export const REPORT_LABELS: Record<ReportViewId, { ar: string; en: string }> = {
  trial: { ar: 'ميزان المراجعة', en: 'Trial Balance' },
  income: { ar: 'قائمة الدخل', en: 'Income Statement (P&L)' },
  balance: { ar: 'الميزانية العمومية', en: 'Balance Sheet' },
  cashflow: { ar: 'التدفق النقدي', en: 'Cash Flow' },
  bankStatement: { ar: 'كشف الحساب البنكي', en: 'Bank Statement' },
  propertyLedger: { ar: 'كشف العقار / المستأجر', en: 'Property / Tenant Ledger' },
  vat: { ar: 'إقرار ضريبة القيمة المضافة', en: 'VAT Return Summary' },
  aging: { ar: 'أعمار الذمم', en: 'AR/AP Aging' },
  reconciliation: { ar: 'مطابقة البنك', en: 'Bank Reconciliation' },
  compare: { ar: 'مقارنة الفترات', en: 'Period Comparison' },
};

export const REPORT_TAB_ORDER: ReportViewId[] = [
  'trial',
  'income',
  'balance',
  'compare',
  'vat',
  'aging',
  'reconciliation',
  'cashflow',
  'bankStatement',
  'propertyLedger',
];

export const REPORT_URL_IDS = REPORT_TAB_ORDER as readonly string[];
