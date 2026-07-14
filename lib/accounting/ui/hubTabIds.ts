/** All accounting hub tab ids — keep in sync with AccountingHubTabs switch and E2E. */
export const ACCOUNTING_HUB_TAB_IDS = [
  'dashboard',
  'sales',
  'purchases',
  'accounts',
  'journal',
  'documents',
  'reports',
  'claims',
  'cheques',
  'payments',
  'settings',
  'audit',
  'periods',
] as const;

export type AccountingHubTabIdConst = (typeof ACCOUNTING_HUB_TAB_IDS)[number];
