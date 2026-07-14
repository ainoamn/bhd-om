'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  getFiscalSettings,
  saveFiscalSettings,
  lockPeriod,
} from '@/lib/data/accounting';

import { useServerAddressBookContacts } from '@/lib/hooks/useServerAddressBookContacts';
import AccountingReportsTab from './accounting/AccountingReportsTab';
import AccountingClaimsTab from './accounting/AccountingClaimsTab';
import AccountingChequesTab from './accounting/AccountingChequesTab';
import AccountingPaymentsTab from './accounting/AccountingPaymentsTab';
import AccountingJournalTab from './accounting/AccountingJournalTab';
import AccountingPeriodsTab from './accounting/AccountingPeriodsTab';
import AccountingAuditTab from './accounting/AccountingAuditTab';
import AccountingDashboardTab from './accounting/AccountingDashboardTab';
import AccountingDocumentsTab from './accounting/AccountingDocumentsTab';
import AccountingSalesTab from './accounting/AccountingSalesTab';
import AccountingPurchasesTab from './accounting/AccountingPurchasesTab';
import AccountingAccountsTab from './accounting/AccountingAccountsTab';
import AccountingSettingsTab from './accounting/AccountingSettingsTab';
import AccountingHubModals from './accounting/AccountingHubModals';
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
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [reportPropertyId, setReportPropertyId] = useState<string>('');
  const [reportContactId, setReportContactId] = useState<string>('');
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

  const {
    showAddDocument,
    setShowAddDocument,
    showAddJournal,
    setShowAddJournal,
    showAddAccount,
    setShowAddAccount,
    showAddCheque,
    setShowAddCheque,
    showInvoiceScan,
    setShowInvoiceScan,
    printDocument,
    setPrintDocument,
    accountForm,
    setAccountForm,
    journalForm,
    setJournalForm,
    docForm,
    setDocForm,
    chequeForm,
    setChequeForm,
    openDocumentModule,
    applyInvoiceScan,
    openAddDocument,
    openAddJournal,
    openAddAccount,
    openAddCheque,
  } = forms;

  const { contacts } = useServerAddressBookContacts();

  const hub = useAccountingHub({
    initialData,
    locale,
    contacts,
    activeTab,
    receiptConfirmKey,
    onBookingStorageChange: () => setReceiptConfirmKey((k) => k + 1),
  });

  const {
    accounts,
    journalEntries,
    documents,
    periods,
    auditLogs,
    searchQuery,
    setSearchQuery,
    filterFromDate,
    setFilterFromDate,
    filterToDate,
    setFilterToDate,
    filterContactId,
    setFilterContactId,
    filterBankId,
    setFilterBankId,
    filterPropertyId,
    setFilterPropertyId,
    filterProjectId,
    setFilterProjectId,
    filterDocType,
    setFilterDocType,
    sortDocuments,
    setSortDocuments,
    sortJournal,
    setSortJournal,
    loadingMoreJournal,
    loadingMoreDocs,
    useDb,
    dataMeta,
    pendingConfirmBookings,
    setPendingConfirmBookings,
    bankAccounts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    loadData,
    loadMoreJournal,
    loadMoreDocuments,
    sortedDocs,
    sortedEntries,
    setRangeThisMonth,
    setRangeLast30,
    setRangeYearToDate,
  } = hub;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reportView === 'bankStatement' && !selectedBankAccountId && typeof window !== 'undefined') {
      const active = bankAccounts.filter((b) => b.isActive);
      setSelectedBankAccountId(active.length > 0 ? active[0].id : 'CASH');
    }
  }, [reportView, bankAccounts, selectedBankAccountId]);

  const analytics = useAccountingHubAnalytics({
    useDb,
    activeTab,
    filterFromDate,
    filterToDate,
    reportView,
    agingLedger,
    journalEntries,
    accounts,
    documents,
    bankAccounts,
    dataMeta,
    selectedBankAccountId,
    reportPropertyId,
    reportContactId,
  });

  const {
    entriesForReports,
    accountsForReports,
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow,
    loadingCore,
    vatReportData,
    loadingVat,
    agingReportData,
    loadingAging,
    cashFlowDb,
    loadingCashFlow,
    compareReportData,
    loadingCompare,
    bankStatementDb,
    loadingBankStatement,
    propertyLedgerDb,
    loadingPropertyLedger,
    stats,
    todayStats,
    anomalies,
    cashSnapshot,
    banksTotal,
    latestEntries,
    latestDocs,
    monthlyLabels,
    monthlyRevenue,
    monthlyExpense,
    receivables,
    chequesReceivable,
    totalClaims,
    paymentsTotal,
    reportFrom,
    reportTo,
  } = analytics;

  return (
    <div className="space-y-6" data-testid="accounting-hub">
      <DraftBanner />
      <AccountingHubFilterBar
        ar={ar}
        locale={locale}
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterFromDate={filterFromDate}
        setFilterFromDate={setFilterFromDate}
        filterToDate={filterToDate}
        setFilterToDate={setFilterToDate}
        filterContactId={filterContactId}
        setFilterContactId={setFilterContactId}
        filterBankId={filterBankId}
        setFilterBankId={setFilterBankId}
        filterPropertyId={filterPropertyId}
        setFilterPropertyId={setFilterPropertyId}
        filterProjectId={filterProjectId}
        setFilterProjectId={setFilterProjectId}
        filterDocType={filterDocType}
        setFilterDocType={setFilterDocType}
        contacts={contacts}
        bankAccounts={bankAccounts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
      />

      {activeTab === 'dashboard' && (
        <AccountingDashboardTab
          ar={ar}
          locale={locale}
          mounted={mounted}
          useDb={useDb}
          documents={documents}
          journalEntries={journalEntries}
          accounts={accounts}
          accountsForReports={accountsForReports}
          entriesForReports={entriesForReports}
          dataMeta={dataMeta}
          stats={stats}
          todayStats={todayStats}
          cashSnapshot={cashSnapshot}
          banksTotal={banksTotal}
          receivables={receivables}
          chequesReceivable={chequesReceivable}
          monthlyLabels={monthlyLabels}
          monthlyRevenue={monthlyRevenue}
          monthlyExpense={monthlyExpense}
          anomalies={anomalies}
          latestEntries={latestEntries}
          latestDocs={latestDocs}
          pendingConfirmBookings={pendingConfirmBookings}
          setPendingConfirmBookings={setPendingConfirmBookings}
          setTab={setTab}
          onNewInvoice={() => openDocumentModule('INVOICE')}
          onNewReceipt={() => openDocumentModule('RECEIPT')}
          onNewExpense={() => openDocumentModule('PAYMENT', { descriptionAr: 'مصروف', descriptionEn: 'Expense' })}
          onScanInvoice={() => setShowInvoiceScan(true)}
          setRangeThisMonth={setRangeThisMonth}
          setRangeLast30={setRangeLast30}
          setRangeYearToDate={setRangeYearToDate}
          onReceiptConfirmed={() => setReceiptConfirmKey((k) => k + 1)}
          loadData={loadData}
        />
      )}

      {activeTab === 'sales' && (
        <AccountingSalesTab ar={ar} onOpenDocument={(docType, preset) => openDocumentModule(docType, preset)} />
      )}

      {activeTab === 'purchases' && (
        <AccountingPurchasesTab ar={ar} onOpenDocument={(docType) => openDocumentModule(docType)} />
      )}

      {activeTab === 'accounts' && (
        <AccountingAccountsTab
          ar={ar}
          accounts={accounts}
          journalEntries={journalEntries}
          filterFromDate={filterFromDate}
          filterToDate={filterToDate}
          onAddAccount={openAddAccount}
        />
      )}

      {activeTab === 'journal' && (
        <AccountingJournalTab
          ar={ar}
          sortedEntries={sortedEntries}
          sortJournal={sortJournal}
          setSortJournal={setSortJournal}
          useDb={useDb}
          journalCount={journalEntries.length}
          journalTotal={dataMeta?.journalTotal}
          loadingMoreJournal={loadingMoreJournal}
          loadMoreJournal={loadMoreJournal}
          onAddJournal={openAddJournal}
        />
      )}

      {activeTab === 'documents' && (
        <AccountingDocumentsTab
          ar={ar}
          locale={locale}
          contacts={contacts}
          bankAccounts={bankAccounts}
          sortedDocs={sortedDocs}
          searchQuery={searchQuery}
          filterDocType={filterDocType}
          filterFromDate={filterFromDate}
          filterToDate={filterToDate}
          filterContactId={filterContactId}
          setSearchQuery={setSearchQuery}
          setFilterDocType={setFilterDocType}
          setFilterFromDate={setFilterFromDate}
          setFilterToDate={setFilterToDate}
          setFilterContactId={setFilterContactId}
          sortDocuments={sortDocuments}
          setSortDocuments={setSortDocuments}
          useDb={useDb}
          documentsCount={documents.length}
          documentsTotal={dataMeta?.documentsTotal}
          loadingMoreDocs={loadingMoreDocs}
          loadMoreDocuments={loadMoreDocuments}
          setPrintDocument={setPrintDocument}
          onAddDocument={openAddDocument}
          getPropertyDisplay={getPropertyDisplay}
        />
      )}

      {activeTab === 'reports' && (
        <AccountingReportsTab
          ar={ar}
          locale={locale}
          reportView={reportView}
          setReportView={setReportView}
          reportFrom={reportFrom}
          reportTo={reportTo}
          useDb={useDb}
          loadingCore={loadingCore}
          loadingVat={loadingVat}
          loadingAging={loadingAging}
          loadingCashFlow={loadingCashFlow}
          loadingCompare={loadingCompare}
          loadingBankStatement={loadingBankStatement}
          loadingPropertyLedger={loadingPropertyLedger}
          trialBalance={trialBalance}
          incomeStatement={incomeStatement}
          balanceSheet={balanceSheet}
          cashFlow={cashFlow}
          vatReportData={vatReportData}
          agingLedger={agingLedger}
          setAgingLedger={setAgingLedger}
          agingReportData={agingReportData}
          cashFlowDb={cashFlowDb}
          compareReportData={compareReportData}
          bankStatementDb={bankStatementDb}
          propertyLedgerDb={propertyLedgerDb}
          bankAccounts={bankAccounts}
          selectedBankAccountId={selectedBankAccountId}
          setSelectedBankAccountId={setSelectedBankAccountId}
          reportPropertyId={reportPropertyId}
          setReportPropertyId={setReportPropertyId}
          reportContactId={reportContactId}
          setReportContactId={setReportContactId}
          entriesForReports={entriesForReports}
          contacts={contacts}
          mergedProperties={mergedProperties}
        />
      )}

      {activeTab === 'claims' && (
        <AccountingClaimsTab
          ar={ar}
          locale={locale}
          documents={documents}
          contacts={contacts}
          sortDocuments={sortDocuments}
          setSortDocuments={setSortDocuments}
          totalClaims={totalClaims}
          receivables={receivables}
          chequesReceivable={chequesReceivable}
          getPropertyDisplay={getPropertyDisplay}
        />
      )}

      {activeTab === 'cheques' && (
        <AccountingChequesTab
          ar={ar}
          locale={locale}
          documents={documents}
          contacts={contacts}
          sortDocuments={sortDocuments}
          setSortDocuments={setSortDocuments}
          filterFromDate={filterFromDate}
          filterToDate={filterToDate}
          filterContactId={filterContactId}
          filterPropertyId={filterPropertyId}
          filterProjectId={filterProjectId}
          searchQuery={searchQuery}
          projectsList={projectsList}
          getPropertyDisplay={getPropertyDisplay}
          getProjectDisplay={getProjectDisplay}
          setPrintDocument={setPrintDocument}
          onAddCheque={openAddCheque}
        />
      )}

      {activeTab === 'payments' && (
        <AccountingPaymentsTab
          ar={ar}
          locale={locale}
          documents={documents}
          contacts={contacts}
          bankAccounts={bankAccounts}
          sortDocuments={sortDocuments}
          setSortDocuments={setSortDocuments}
          paymentsTotal={paymentsTotal}
          getPropertyDisplay={getPropertyDisplay}
        />
      )}

      {activeTab === 'periods' && (
        <AccountingPeriodsTab
          ar={ar}
          periods={periods}
          onLockPeriod={async (periodId) => {
            if (useDb) await apiLockPeriod(periodId);
            else lockPeriod(periodId);
            await loadData();
          }}
        />
      )}

      {activeTab === 'audit' && <AccountingAuditTab ar={ar} auditLogs={auditLogs} />}

      {activeTab === 'settings' && (
        <AccountingSettingsTab
          ar={ar}
          fiscalForm={fiscalForm}
          setFiscalForm={setFiscalForm}
          onSave={() => {
            saveFiscalSettings(fiscalForm);
            void loadData();
          }}
        />
      )}

      <AccountingHubModals
        ar={ar}
        locale={locale}
        useDb={useDb}
        contacts={contacts}
        accounts={accounts}
        bankAccounts={bankAccounts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
        loadData={loadData}
        setTab={setTab}
        showAddDocument={showAddDocument}
        setShowAddDocument={setShowAddDocument}
        showAddJournal={showAddJournal}
        setShowAddJournal={setShowAddJournal}
        showAddAccount={showAddAccount}
        setShowAddAccount={setShowAddAccount}
        showAddCheque={showAddCheque}
        setShowAddCheque={setShowAddCheque}
        showInvoiceScan={showInvoiceScan}
        setShowInvoiceScan={setShowInvoiceScan}
        printDocument={printDocument}
        setPrintDocument={setPrintDocument}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        journalForm={journalForm}
        setJournalForm={setJournalForm}
        docForm={docForm}
        setDocForm={setDocForm}
        chequeForm={chequeForm}
        setChequeForm={setChequeForm}
        applyInvoiceScan={applyInvoiceScan}
      />
    </div>
  );
}
