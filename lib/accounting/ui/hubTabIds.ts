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

export type AccountingHubTabId = (typeof ACCOUNTING_HUB_TAB_IDS)[number];

/** @deprecated Use AccountingHubTabId */
export type AccountingHubTabIdConst = AccountingHubTabId;

export const DEFAULT_ACCOUNTING_HUB_TAB: AccountingHubTabId = 'dashboard';

/** Tab order for E2E smoke — same ids as ACCOUNTING_HUB_TAB_IDS, nav-friendly order. */
export const ACCOUNTING_HUB_E2E_TAB_ORDER = [
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
] as const satisfies readonly AccountingHubTabId[];

/** Tabs that open a modal when `?action=add` is in the URL. */
export const ACCOUNTING_HUB_MODAL_ACTION_TABS = ['documents', 'journal', 'accounts', 'cheques'] as const;

export type AccountingHubModalActionTab = (typeof ACCOUNTING_HUB_MODAL_ACTION_TABS)[number];

const TAB_ID_SET = new Set<string>(ACCOUNTING_HUB_TAB_IDS);

export function isAccountingHubTabId(value: string | null | undefined): value is AccountingHubTabId {
  return typeof value === 'string' && TAB_ID_SET.has(value);
}

export function parseAccountingHubTabId(
  value: string | null | undefined,
  fallback: AccountingHubTabId = DEFAULT_ACCOUNTING_HUB_TAB
): AccountingHubTabId {
  return isAccountingHubTabId(value) ? value : fallback;
}

export function isAccountingHubModalActionTab(tab: AccountingHubTabId): tab is AccountingHubModalActionTab {
  return (ACCOUNTING_HUB_MODAL_ACTION_TABS as readonly string[]).includes(tab);
}
