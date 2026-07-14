'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { REPORT_URL_IDS, type ReportViewId } from '@/lib/accounting/ui/reportLabels';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';
import { parseAccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';
import { buildAccountingHubPath } from '@/lib/accounting/navigation/buildAccountingHubPath';

export function useAccountingHubNavigation(locale: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = parseAccountingHubTabId(searchParams?.get('tab'));
  const actionFromUrl = searchParams?.get('action');

  const [activeTab, setActiveTab] = useState<AccountingHubTabId>(tabFromUrl);
  const [reportView, setReportView] = useState<ReportViewId>('trial');

  const setTab = useCallback(
    (tab: AccountingHubTabId, action?: string, report?: ReportViewId) => {
      setActiveTab(tab);
      router.replace(buildAccountingHubPath(locale, tab, { action, report }), { scroll: false });
    },
    [locale, router]
  );

  useEffect(() => {
    const tab = parseAccountingHubTabId(searchParams?.get('tab'));
    setActiveTab(tab);
    const report = searchParams?.get('report') as ReportViewId | null;
    if (tab === 'reports' && report && REPORT_URL_IDS.includes(report)) {
      setReportView(report);
    }
  }, [searchParams?.get('tab'), searchParams?.get('report')]);

  return {
    activeTab,
    setActiveTab,
    setTab,
    tabFromUrl,
    actionFromUrl,
    reportView,
    setReportView,
    urlPropertyId: searchParams?.get('propertyId') || '',
    urlProjectId: searchParams?.get('projectId') || '',
    urlContractId: searchParams?.get('contractId') || '',
  };
}
