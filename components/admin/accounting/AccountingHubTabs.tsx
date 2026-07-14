'use client';

import AccountingReportsTab, { type AccountingReportsTabProps } from '@/components/admin/accounting/AccountingReportsTab';
import AccountingClaimsTab from '@/components/admin/accounting/AccountingClaimsTab';
import AccountingChequesTab from '@/components/admin/accounting/AccountingChequesTab';
import AccountingPaymentsTab from '@/components/admin/accounting/AccountingPaymentsTab';
import AccountingJournalTab from '@/components/admin/accounting/AccountingJournalTab';
import AccountingPeriodsTab from '@/components/admin/accounting/AccountingPeriodsTab';
import AccountingAuditTab from '@/components/admin/accounting/AccountingAuditTab';
import AccountingDashboardTab from '@/components/admin/accounting/AccountingDashboardTab';
import AccountingDocumentsTab from '@/components/admin/accounting/AccountingDocumentsTab';
import AccountingSalesTab from '@/components/admin/accounting/AccountingSalesTab';
import AccountingPurchasesTab from '@/components/admin/accounting/AccountingPurchasesTab';
import AccountingAccountsTab from '@/components/admin/accounting/AccountingAccountsTab';
import AccountingSettingsTab from '@/components/admin/accounting/AccountingSettingsTab';
import type { AccountingHubTabId } from '@/components/admin/accounting/AccountingHubFilterBar';
import type { ReportViewId } from '@/lib/accounting/ui/reportLabels';
import type { Contact } from '@/lib/data/addressBook';
import type { useAccountingHub } from '@/lib/accounting/hooks/useAccountingHub';
import type { useAccountingHubAnalytics } from '@/lib/accounting/hooks/useAccountingHubAnalytics';
import type { useAccountingHubForms } from '@/lib/accounting/hooks/useAccountingHubForms';
import type { ComponentProps } from 'react';

type SettingsTabProps = ComponentProps<typeof AccountingSettingsTab>;

export type AccountingHubTabsProps = {
  ar: boolean;
  locale: string;
  activeTab: AccountingHubTabId;
  mounted: boolean;
  setTab: (tab: AccountingHubTabId, action?: string, report?: ReportViewId) => void;
  contacts: Contact[];
  hub: ReturnType<typeof useAccountingHub>;
  analytics: ReturnType<typeof useAccountingHubAnalytics>;
  forms: ReturnType<typeof useAccountingHubForms>;
  reports: Omit<AccountingReportsTabProps, 'ar' | 'locale'>;
  fiscalForm: SettingsTabProps['fiscalForm'];
  setFiscalForm: SettingsTabProps['setFiscalForm'];
  onReceiptConfirmed: () => void;
  onLockPeriod: (periodId: string) => void | Promise<void>;
  onSaveSettings: () => void;
};

export default function AccountingHubTabs(props: AccountingHubTabsProps) {
  const {
    ar,
    locale,
    activeTab,
    mounted,
    setTab,
    contacts,
    hub,
    analytics,
    forms,
    reports,
    fiscalForm,
    setFiscalForm,
    onReceiptConfirmed,
    onLockPeriod,
    onSaveSettings,
  } = props;

  switch (activeTab) {
    case 'dashboard':
      return (
        <AccountingDashboardTab
          ar={ar}
          locale={locale}
          mounted={mounted}
          useDb={hub.useDb}
          documents={hub.documents}
          journalEntries={hub.journalEntries}
          accounts={hub.accounts}
          accountsForReports={analytics.accountsForReports}
          entriesForReports={analytics.entriesForReports}
          dataMeta={hub.dataMeta}
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
          pendingConfirmBookings={hub.pendingConfirmBookings}
          setPendingConfirmBookings={hub.setPendingConfirmBookings}
          setTab={setTab}
          onNewInvoice={() => forms.openDocumentModule('INVOICE')}
          onNewReceipt={() => forms.openDocumentModule('RECEIPT')}
          onNewExpense={() => forms.openDocumentModule('PAYMENT', { descriptionAr: 'مصروف', descriptionEn: 'Expense' })}
          onScanInvoice={() => forms.setShowInvoiceScan(true)}
          setRangeThisMonth={hub.setRangeThisMonth}
          setRangeLast30={hub.setRangeLast30}
          setRangeYearToDate={hub.setRangeYearToDate}
          onReceiptConfirmed={onReceiptConfirmed}
          loadData={hub.loadData}
        />
      );
    case 'sales':
      return (
        <AccountingSalesTab ar={ar} onOpenDocument={(docType, preset) => forms.openDocumentModule(docType, preset)} />
      );
    case 'purchases':
      return <AccountingPurchasesTab ar={ar} onOpenDocument={(docType) => forms.openDocumentModule(docType)} />;
    case 'accounts':
      return (
        <AccountingAccountsTab
          ar={ar}
          accounts={hub.accounts}
          journalEntries={hub.journalEntries}
          filterFromDate={hub.filterFromDate}
          filterToDate={hub.filterToDate}
          onAddAccount={forms.openAddAccount}
        />
      );
    case 'journal':
      return (
        <AccountingJournalTab
          ar={ar}
          sortedEntries={hub.sortedEntries}
          sortJournal={hub.sortJournal}
          setSortJournal={hub.setSortJournal}
          useDb={hub.useDb}
          journalCount={hub.journalEntries.length}
          journalTotal={hub.dataMeta?.journalTotal}
          loadingMoreJournal={hub.loadingMoreJournal}
          loadMoreJournal={hub.loadMoreJournal}
          onAddJournal={forms.openAddJournal}
        />
      );
    case 'documents':
      return (
        <AccountingDocumentsTab
          ar={ar}
          locale={locale}
          contacts={contacts}
          bankAccounts={hub.bankAccounts}
          sortedDocs={hub.sortedDocs}
          searchQuery={hub.searchQuery}
          filterDocType={hub.filterDocType}
          filterFromDate={hub.filterFromDate}
          filterToDate={hub.filterToDate}
          filterContactId={hub.filterContactId}
          setSearchQuery={hub.setSearchQuery}
          setFilterDocType={hub.setFilterDocType}
          setFilterFromDate={hub.setFilterFromDate}
          setFilterToDate={hub.setFilterToDate}
          setFilterContactId={hub.setFilterContactId}
          sortDocuments={hub.sortDocuments}
          setSortDocuments={hub.setSortDocuments}
          useDb={hub.useDb}
          documentsCount={hub.documents.length}
          documentsTotal={hub.dataMeta?.documentsTotal}
          loadingMoreDocs={hub.loadingMoreDocs}
          loadMoreDocuments={hub.loadMoreDocuments}
          setPrintDocument={forms.setPrintDocument}
          onAddDocument={forms.openAddDocument}
          getPropertyDisplay={hub.getPropertyDisplay}
        />
      );
    case 'reports':
      return <AccountingReportsTab ar={ar} locale={locale} {...reports} />;
    case 'claims':
      return (
        <AccountingClaimsTab
          ar={ar}
          locale={locale}
          documents={hub.documents}
          contacts={contacts}
          sortDocuments={hub.sortDocuments}
          setSortDocuments={hub.setSortDocuments}
          totalClaims={analytics.totalClaims}
          receivables={analytics.receivables}
          chequesReceivable={analytics.chequesReceivable}
          getPropertyDisplay={hub.getPropertyDisplay}
        />
      );
    case 'cheques':
      return (
        <AccountingChequesTab
          ar={ar}
          locale={locale}
          documents={hub.documents}
          contacts={contacts}
          sortDocuments={hub.sortDocuments}
          setSortDocuments={hub.setSortDocuments}
          filterFromDate={hub.filterFromDate}
          filterToDate={hub.filterToDate}
          filterContactId={hub.filterContactId}
          filterPropertyId={hub.filterPropertyId}
          filterProjectId={hub.filterProjectId}
          searchQuery={hub.searchQuery}
          projectsList={hub.projectsList}
          getPropertyDisplay={hub.getPropertyDisplay}
          getProjectDisplay={hub.getProjectDisplay}
          setPrintDocument={forms.setPrintDocument}
          onAddCheque={forms.openAddCheque}
        />
      );
    case 'payments':
      return (
        <AccountingPaymentsTab
          ar={ar}
          locale={locale}
          documents={hub.documents}
          contacts={contacts}
          bankAccounts={hub.bankAccounts}
          sortDocuments={hub.sortDocuments}
          setSortDocuments={hub.setSortDocuments}
          paymentsTotal={analytics.paymentsTotal}
          getPropertyDisplay={hub.getPropertyDisplay}
        />
      );
    case 'periods':
      return <AccountingPeriodsTab ar={ar} periods={hub.periods} onLockPeriod={onLockPeriod} />;
    case 'audit':
      return <AccountingAuditTab ar={ar} auditLogs={hub.auditLogs} />;
    case 'settings':
      return (
        <AccountingSettingsTab ar={ar} fiscalForm={fiscalForm} setFiscalForm={setFiscalForm} onSave={onSaveSettings} />
      );
    default:
      return null;
  }
}
