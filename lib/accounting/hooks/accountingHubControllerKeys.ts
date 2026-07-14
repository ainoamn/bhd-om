/** Public contract: keys returned by useAccountingHubController (for docs/tests). */
export const ACCOUNTING_HUB_CONTROLLER_KEYS = [
  'ar',
  'locale',
  'activeTab',
  'setTab',
  'contacts',
  'hub',
  'analytics',
  'forms',
  'reportsProps',
  'mounted',
  'fiscalForm',
  'setFiscalForm',
  'onReceiptConfirmed',
  'onLockPeriod',
  'onSaveSettings',
] as const;

export type AccountingHubControllerKey = (typeof ACCOUNTING_HUB_CONTROLLER_KEYS)[number];
