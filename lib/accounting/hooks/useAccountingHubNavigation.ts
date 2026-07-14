'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { REPORT_URL_IDS, type ReportViewId } from '@/lib/accounting/ui/reportLabels';
import type { AccountingHubTabId } from '@/components/admin/accounting/AccountingHubFilterBar';
import { buildAccountingHubPath } from '@/lib/accounting/navigation/buildAccountingHubPath';

export function useAccountingHubNavigation(locale: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = (searchParams?.get('tab') || 'dashboard') as AccountingHubTabId;
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
    const tab = (searchParams?.get('tab') || 'dashboard') as AccountingHubTabId;
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
