'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getFiscalSettings, saveFiscalSettings, lockPeriod } from '@/lib/data/accounting';
import { useServerAddressBookContacts } from '@/lib/hooks/useServerAddressBookContacts';
import { lockPeriod as apiLockPeriod } from '@/lib/accounting/api/client';
import { useAccountingHubAnalytics } from '@/lib/accounting/hooks/useAccountingHubAnalytics';
import { useAccountingHub } from '@/lib/accounting/hooks/useAccountingHub';
import { useAccountingHubForms } from '@/lib/accounting/hooks/useAccountingHubForms';
import { useAccountingHubNavigation } from '@/lib/accounting/hooks/useAccountingHubNavigation';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export function useAccountingHubController(initialData?: AccountingInitialData) {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const navigation = useAccountingHubNavigation(locale);
  const {
    activeTab,
    setTab,
    tabFromUrl,
    actionFromUrl,
    reportView,
    setReportView,
    urlPropertyId,
    urlProjectId,
    urlContractId,
  } = navigation;

  const [mounted, setMounted] = useState(false);
  const [receiptConfirmKey, setReceiptConfirmKey] = useState(0);
  const [agingLedger, setAgingLedger] = useState<'ar' | 'ap'>('ar');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [reportPropertyId, setReportPropertyId] = useState('');
  const [reportContactId, setReportContactId] = useState('');
  const [fiscalForm, setFiscalForm] = useState(() =>
    typeof window !== 'undefined' ? getFiscalSettings() : { startMonth: 1, startDay: 1, currency: 'OMR', vatRate: 0 }
  );

  const forms = useAccountingHubForms({
    navigate: (tab) => setTab(tab),
    tabFromUrl,
    actionFromUrl,
    urlPropertyId,
    urlProjectId,
    urlContractId,
  });

  const { contacts } = useServerAddressBookContacts();

  const hub = useAccountingHub({
    initialData,
    locale,
    contacts,
    activeTab,
    receiptConfirmKey,
    onBookingStorageChange: () => setReceiptConfirmKey((k) => k + 1),
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reportView === 'bankStatement' && !selectedBankAccountId && typeof window !== 'undefined') {
      const active = hub.bankAccounts.filter((b) => b.isActive);
      setSelectedBankAccountId(active.length > 0 ? active[0].id : 'CASH');
    }
  }, [reportView, hub.bankAccounts, selectedBankAccountId]);

  const analytics = useAccountingHubAnalytics({
    useDb: hub.useDb,
    activeTab,
    filterFromDate: hub.filterFromDate,
    filterToDate: hub.filterToDate,
    reportView,
    agingLedger,
    journalEntries: hub.journalEntries,
    accounts: hub.accounts,
    documents: hub.documents,
    bankAccounts: hub.bankAccounts,
    dataMeta: hub.dataMeta,
    selectedBankAccountId,
    reportPropertyId,
    reportContactId,
  });

  const reportsProps = useMemo(
    () => ({
      reportView,
      setReportView,
      reportFrom: analytics.reportFrom,
      reportTo: analytics.reportTo,
      useDb: hub.useDb,
      loadingCore: analytics.loadingCore,
      loadingVat: analytics.loadingVat,
      loadingAging: analytics.loadingAging,
      loadingCashFlow: analytics.loadingCashFlow,
      loadingCompare: analytics.loadingCompare,
      loadingBankStatement: analytics.loadingBankStatement,
      loadingPropertyLedger: analytics.loadingPropertyLedger,
      trialBalance: analytics.trialBalance,
      incomeStatement: analytics.incomeStatement,
      balanceSheet: analytics.balanceSheet,
      cashFlow: analytics.cashFlow,
      vatReportData: analytics.vatReportData,
      agingLedger,
      setAgingLedger,
      agingReportData: analytics.agingReportData,
      cashFlowDb: analytics.cashFlowDb,
      compareReportData: analytics.compareReportData,
      bankStatementDb: analytics.bankStatementDb,
      propertyLedgerDb: analytics.propertyLedgerDb,
      bankAccounts: hub.bankAccounts,
      selectedBankAccountId,
      setSelectedBankAccountId,
      reportPropertyId,
      setReportPropertyId,
      reportContactId,
      setReportContactId,
      entriesForReports: analytics.entriesForReports,
      contacts,
      mergedProperties: hub.mergedProperties,
    }),
    [
      reportView,
      setReportView,
      analytics,
      hub.useDb,
      hub.bankAccounts,
      hub.mergedProperties,
      agingLedger,
      selectedBankAccountId,
      reportPropertyId,
      reportContactId,
      contacts,
    ]
  );

  const onReceiptConfirmed = useCallback(() => setReceiptConfirmKey((k) => k + 1), []);

  const onLockPeriod = useCallback(
    async (periodId: string) => {
      if (hub.useDb) await apiLockPeriod(periodId);
      else lockPeriod(periodId);
      await hub.loadData();
    },
    [hub]
  );

  const onSaveSettings = useCallback(() => {
    saveFiscalSettings(fiscalForm);
    void hub.loadData();
  }, [fiscalForm, hub]);

  return {
    ar,
    locale,
    activeTab,
    setTab,
    contacts,
    hub,
    analytics,
    forms,
    reportsProps,
    mounted,
    fiscalForm,
    setFiscalForm,
    onReceiptConfirmed,
    onLockPeriod,
    onSaveSettings,
  };
}

export type AccountingHubController = ReturnType<typeof useAccountingHubController>;
