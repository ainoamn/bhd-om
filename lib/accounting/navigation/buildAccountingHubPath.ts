import type { ReportViewId } from '@/lib/accounting/ui/reportLabels';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';

/** Build admin accounting hub query path (no origin). */
export function buildAccountingHubPath(
  locale: string,
  tab: AccountingHubTabId,
  options?: { action?: string; report?: ReportViewId }
): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (options?.action) params.set('action', options.action);
  if (options?.report && tab === 'reports') params.set('report', options.report);
  const qs = params.toString();
  return `/${locale}/admin/accounting${qs ? `?${qs}` : ''}`;
}
