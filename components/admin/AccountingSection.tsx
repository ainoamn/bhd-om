'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getFiscalSettings, saveFiscalSettings, lockPeriod } from '@/lib/data/accounting';
import { useServerAddressBookContacts } from '@/lib/hooks/useServerAddressBookContacts';
import AccountingHubModals from './accounting/AccountingHubModals';
import AccountingHubTabs from './accounting/AccountingHubTabs';
import { lockPeriod as apiLockPeriod } from '@/lib/accounting/api/client';
import { useAccountingHubAnalytics } from '@/lib/accounting/hooks/useAccountingHubAnalytics';
import { useAccountingHub } from '@/lib/accounting/hooks/useAccountingHub';
import { useAccountingHubForms } from '@/lib/accounting/hooks/useAccountingHubForms';
import { useAccountingHubNavigation } from '@/lib/accounting/hooks/useAccountingHubNavigation';
import DraftBanner from '@/components/admin/DraftBanner';
import AccountingHubFilterBar from './accounting/AccountingHubFilterBar';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export type { AccountingInitialData };

export default function AccountingSection(props: { initialData?: AccountingInitialData }) {
  const { initialData } = props;
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const navigation = useAccountingHubNavigation(locale);
  const { activeTab, setTab, tabFromUrl, actionFromUrl, reportView, setReportView, urlPropertyId, urlProjectId, urlContractId } = navigation;

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

  return (
    <div className="space-y-6" data-testid="accounting-hub">
      <DraftBanner />
      <AccountingHubFilterBar
        ar={ar}
        locale={locale}
        activeTab={activeTab}
        searchQuery={hub.searchQuery}
        setSearchQuery={hub.setSearchQuery}
        filterFromDate={hub.filterFromDate}
        setFilterFromDate={hub.setFilterFromDate}
        filterToDate={hub.filterToDate}
        setFilterToDate={hub.setFilterToDate}
        filterContactId={hub.filterContactId}
        setFilterContactId={hub.setFilterContactId}
        filterBankId={hub.filterBankId}
        setFilterBankId={hub.setFilterBankId}
        filterPropertyId={hub.filterPropertyId}
        setFilterPropertyId={hub.setFilterPropertyId}
        filterProjectId={hub.filterProjectId}
        setFilterProjectId={hub.setFilterProjectId}
        filterDocType={hub.filterDocType}
        setFilterDocType={hub.setFilterDocType}
        contacts={contacts}
        bankAccounts={hub.bankAccounts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
      />

      <AccountingHubTabs
        ar={ar}
        locale={locale}
        activeTab={activeTab}
        mounted={mounted}
        setTab={setTab}
        useDb={hub.useDb}
        accounts={hub.accounts}
        journalEntries={hub.journalEntries}
        documents={hub.documents}
        periods={hub.periods}
        auditLogs={hub.auditLogs}
        contacts={contacts}
        bankAccounts={hub.bankAccounts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
        dataMeta={hub.dataMeta}
        pendingConfirmBookings={hub.pendingConfirmBookings}
        setPendingConfirmBookings={hub.setPendingConfirmBookings}
        searchQuery={hub.searchQuery}
        setSearchQuery={hub.setSearchQuery}
        filterFromDate={hub.filterFromDate}
        setFilterFromDate={hub.setFilterFromDate}
        filterToDate={hub.filterToDate}
        setFilterToDate={hub.setFilterToDate}
        filterContactId={hub.filterContactId}
        setFilterContactId={hub.setFilterContactId}
        filterPropertyId={hub.filterPropertyId}
        filterProjectId={hub.filterProjectId}
        filterDocType={hub.filterDocType}
        setFilterDocType={hub.setFilterDocType}
        sortDocuments={hub.sortDocuments}
        setSortDocuments={hub.setSortDocuments}
        sortJournal={hub.sortJournal}
        setSortJournal={hub.setSortJournal}
        loadingMoreJournal={hub.loadingMoreJournal}
        loadingMoreDocs={hub.loadingMoreDocs}
        loadData={hub.loadData}
        loadMoreJournal={hub.loadMoreJournal}
        loadMoreDocuments={hub.loadMoreDocuments}
        sortedDocs={hub.sortedDocs}
        sortedEntries={hub.sortedEntries}
        setRangeThisMonth={hub.setRangeThisMonth}
        setRangeLast30={hub.setRangeLast30}
        setRangeYearToDate={hub.setRangeYearToDate}
        entriesForReports={analytics.entriesForReports}
        accountsForReports={analytics.accountsForReports}
        stats={analytics.stats}
        todayStats={analytics.todayStats}
        cashSnapshot={analytics.cashSnapshot}
        banksTotal={analytics.banksTotal}
        receivables={analytics.receivables}
        chequesReceivable={analytics.chequesReceivable}
        monthlyLabels={analytics.monthlyLabels}
        monthlyRevenue={analytics.monthlyRevenue}
        monthlyExpense={analytics.monthlyExpense}
        anomalies={analytics.anomalies}
        latestEntries={analytics.latestEntries}
        latestDocs={analytics.latestDocs}
        totalClaims={analytics.totalClaims}
        paymentsTotal={analytics.paymentsTotal}
        reports={reportsProps}
        fiscalForm={fiscalForm}
        setFiscalForm={setFiscalForm}
        openDocumentModule={forms.openDocumentModule}
        openAddDocument={forms.openAddDocument}
        openAddJournal={forms.openAddJournal}
        openAddAccount={forms.openAddAccount}
        openAddCheque={forms.openAddCheque}
        setShowInvoiceScan={forms.setShowInvoiceScan}
        setPrintDocument={forms.setPrintDocument}
        onReceiptConfirmed={() => setReceiptConfirmKey((k) => k + 1)}
        onLockPeriod={async (periodId) => {
          if (hub.useDb) await apiLockPeriod(periodId);
          else lockPeriod(periodId);
          await hub.loadData();
        }}
        onSaveSettings={() => {
          saveFiscalSettings(fiscalForm);
          void hub.loadData();
        }}
      />

      <AccountingHubModals
        ar={ar}
        locale={locale}
        useDb={hub.useDb}
        contacts={contacts}
        accounts={hub.accounts}
        bankAccounts={hub.bankAccounts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
        loadData={hub.loadData}
        setTab={setTab}
        showAddDocument={forms.showAddDocument}
        setShowAddDocument={forms.setShowAddDocument}
        showAddJournal={forms.showAddJournal}
        setShowAddJournal={forms.setShowAddJournal}
        showAddAccount={forms.showAddAccount}
        setShowAddAccount={forms.setShowAddAccount}
        showAddCheque={forms.showAddCheque}
        setShowAddCheque={forms.setShowAddCheque}
        showInvoiceScan={forms.showInvoiceScan}
        setShowInvoiceScan={forms.setShowInvoiceScan}
        printDocument={forms.printDocument}
        setPrintDocument={forms.setPrintDocument}
        accountForm={forms.accountForm}
        setAccountForm={forms.setAccountForm}
        journalForm={forms.journalForm}
        setJournalForm={forms.setJournalForm}
        docForm={forms.docForm}
        setDocForm={forms.setDocForm}
        chequeForm={forms.chequeForm}
        setChequeForm={forms.setChequeForm}
        applyInvoiceScan={forms.applyInvoiceScan}
      />
    </div>
  );
}
