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
import type { DocumentType, ChartAccount, JournalEntry, AccountingDocument } from '@/lib/data/accounting';
import type { Contact } from '@/lib/data/addressBook';
import type { BankAccount } from '@/lib/data/bankAccounts';
import type { Property } from '@/lib/data/properties';
import type { PropertyBooking } from '@/lib/data/bookings';
import type { SortOption } from '@/components/admin/SortSelect';
import type { AccountingHubStats } from '@/lib/accounting/hooks/useAccountingHubAnalytics';
import type { ComponentProps } from 'react';

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

type DashboardTabProps = ComponentProps<typeof AccountingDashboardTab>;
type SettingsTabProps = ComponentProps<typeof AccountingSettingsTab>;

export type AccountingHubTabsProps = {
  ar: boolean;
  locale: string;
  activeTab: AccountingHubTabId;
  mounted: boolean;
  setTab: (tab: AccountingHubTabId, action?: string, report?: ReportViewId) => void;
  useDb: boolean;
  accounts: ChartAccount[];
  journalEntries: JournalEntry[];
  documents: AccountingDocument[];
  periods: Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>;
  auditLogs: Array<{ id: string; timestamp: string; action: string; entityType: string; entityId: string; reason?: string }>;
  contacts: Contact[];
  bankAccounts: BankAccount[];
  mergedProperties: Property[];
  projectsList: ProjectListItem[];
  getPropertyDisplay: (p: Property) => string;
  getProjectDisplay: (p: ProjectListItem) => string;
  dataMeta: { journalTotal?: number; documentsTotal?: number } | null;
  pendingConfirmBookings: PropertyBooking[];
  setPendingConfirmBookings: React.Dispatch<React.SetStateAction<PropertyBooking[]>>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterFromDate: string;
  setFilterFromDate: (v: string) => void;
  filterToDate: string;
  setFilterToDate: (v: string) => void;
  filterContactId: string;
  setFilterContactId: (v: string) => void;
  filterPropertyId: string;
  filterProjectId: string;
  filterDocType: DocumentType | '';
  setFilterDocType: (v: DocumentType | '') => void;
  sortDocuments: SortOption;
  setSortDocuments: (v: SortOption) => void;
  sortJournal: SortOption;
  setSortJournal: (v: SortOption) => void;
  loadingMoreJournal: boolean;
  loadingMoreDocs: boolean;
  loadData: () => void | Promise<void>;
  loadMoreJournal: () => void | Promise<void>;
  loadMoreDocuments: () => void | Promise<void>;
  sortedDocs: AccountingDocument[];
  sortedEntries: JournalEntry[];
  setRangeThisMonth: () => void;
  setRangeLast30: () => void;
  setRangeYearToDate: () => void;
  entriesForReports: JournalEntry[];
  accountsForReports: ChartAccount[];
  stats: AccountingHubStats;
  todayStats: { received: number; expenses: number };
  cashSnapshot: { balance: number };
  banksTotal: number;
  receivables: number;
  chequesReceivable: number;
  monthlyLabels: string[];
  monthlyRevenue: number[];
  monthlyExpense: number[];
  anomalies: DashboardTabProps['anomalies'];
  latestEntries: JournalEntry[];
  latestDocs: AccountingDocument[];
  totalClaims: number;
  paymentsTotal: number;
  reports: Omit<AccountingReportsTabProps, 'ar' | 'locale'>;
  fiscalForm: SettingsTabProps['fiscalForm'];
  setFiscalForm: SettingsTabProps['setFiscalForm'];
  openDocumentModule: (docType: DocumentType, preset?: { descriptionAr?: string; descriptionEn?: string }) => void;
  openAddDocument: () => void;
  openAddJournal: () => void;
  openAddAccount: () => void;
  openAddCheque: () => void;
  setShowInvoiceScan: (open: boolean) => void;
  setPrintDocument: (doc: AccountingDocument | null) => void;
  onReceiptConfirmed: () => void;
  onLockPeriod: (periodId: string) => void | Promise<void>;
  onSaveSettings: () => void;
};

export default function AccountingHubTabs(props: AccountingHubTabsProps) {
  const { ar, locale, activeTab, reports, ...p } = props;

  switch (activeTab) {
    case 'dashboard':
      return (
        <AccountingDashboardTab
          ar={ar}
          locale={locale}
          mounted={p.mounted}
          useDb={p.useDb}
          documents={p.documents}
          journalEntries={p.journalEntries}
          accounts={p.accounts}
          accountsForReports={p.accountsForReports}
          entriesForReports={p.entriesForReports}
          dataMeta={p.dataMeta}
          stats={p.stats}
          todayStats={p.todayStats}
          cashSnapshot={p.cashSnapshot}
          banksTotal={p.banksTotal}
          receivables={p.receivables}
          chequesReceivable={p.chequesReceivable}
          monthlyLabels={p.monthlyLabels}
          monthlyRevenue={p.monthlyRevenue}
          monthlyExpense={p.monthlyExpense}
          anomalies={p.anomalies}
          latestEntries={p.latestEntries}
          latestDocs={p.latestDocs}
          pendingConfirmBookings={p.pendingConfirmBookings}
          setPendingConfirmBookings={p.setPendingConfirmBookings}
          setTab={p.setTab}
          onNewInvoice={() => p.openDocumentModule('INVOICE')}
          onNewReceipt={() => p.openDocumentModule('RECEIPT')}
          onNewExpense={() => p.openDocumentModule('PAYMENT', { descriptionAr: 'مصروف', descriptionEn: 'Expense' })}
          onScanInvoice={() => p.setShowInvoiceScan(true)}
          setRangeThisMonth={p.setRangeThisMonth}
          setRangeLast30={p.setRangeLast30}
          setRangeYearToDate={p.setRangeYearToDate}
          onReceiptConfirmed={p.onReceiptConfirmed}
          loadData={p.loadData}
        />
      );
    case 'sales':
      return <AccountingSalesTab ar={ar} onOpenDocument={(docType, preset) => p.openDocumentModule(docType, preset)} />;
    case 'purchases':
      return <AccountingPurchasesTab ar={ar} onOpenDocument={(docType) => p.openDocumentModule(docType)} />;
    case 'accounts':
      return (
        <AccountingAccountsTab
          ar={ar}
          accounts={p.accounts}
          journalEntries={p.journalEntries}
          filterFromDate={p.filterFromDate}
          filterToDate={p.filterToDate}
          onAddAccount={p.openAddAccount}
        />
      );
    case 'journal':
      return (
        <AccountingJournalTab
          ar={ar}
          sortedEntries={p.sortedEntries}
          sortJournal={p.sortJournal}
          setSortJournal={p.setSortJournal}
          useDb={p.useDb}
          journalCount={p.journalEntries.length}
          journalTotal={p.dataMeta?.journalTotal}
          loadingMoreJournal={p.loadingMoreJournal}
          loadMoreJournal={p.loadMoreJournal}
          onAddJournal={p.openAddJournal}
        />
      );
    case 'documents':
      return (
        <AccountingDocumentsTab
          ar={ar}
          locale={locale}
          contacts={p.contacts}
          bankAccounts={p.bankAccounts}
          sortedDocs={p.sortedDocs}
          searchQuery={p.searchQuery}
          filterDocType={p.filterDocType}
          filterFromDate={p.filterFromDate}
          filterToDate={p.filterToDate}
          filterContactId={p.filterContactId}
          setSearchQuery={p.setSearchQuery}
          setFilterDocType={p.setFilterDocType}
          setFilterFromDate={p.setFilterFromDate}
          setFilterToDate={p.setFilterToDate}
          setFilterContactId={p.setFilterContactId}
          sortDocuments={p.sortDocuments}
          setSortDocuments={p.setSortDocuments}
          useDb={p.useDb}
          documentsCount={p.documents.length}
          documentsTotal={p.dataMeta?.documentsTotal}
          loadingMoreDocs={p.loadingMoreDocs}
          loadMoreDocuments={p.loadMoreDocuments}
          setPrintDocument={p.setPrintDocument}
          onAddDocument={p.openAddDocument}
          getPropertyDisplay={p.getPropertyDisplay}
        />
      );
    case 'reports':
      return <AccountingReportsTab ar={ar} locale={locale} {...reports} />;
    case 'claims':
      return (
        <AccountingClaimsTab
          ar={ar}
          locale={locale}
          documents={p.documents}
          contacts={p.contacts}
          sortDocuments={p.sortDocuments}
          setSortDocuments={p.setSortDocuments}
          totalClaims={p.totalClaims}
          receivables={p.receivables}
          chequesReceivable={p.chequesReceivable}
          getPropertyDisplay={p.getPropertyDisplay}
        />
      );
    case 'cheques':
      return (
        <AccountingChequesTab
          ar={ar}
          locale={locale}
          documents={p.documents}
          contacts={p.contacts}
          sortDocuments={p.sortDocuments}
          setSortDocuments={p.setSortDocuments}
          filterFromDate={p.filterFromDate}
          filterToDate={p.filterToDate}
          filterContactId={p.filterContactId}
          filterPropertyId={p.filterPropertyId}
          filterProjectId={p.filterProjectId}
          searchQuery={p.searchQuery}
          projectsList={p.projectsList}
          getPropertyDisplay={p.getPropertyDisplay}
          getProjectDisplay={p.getProjectDisplay}
          setPrintDocument={p.setPrintDocument}
          onAddCheque={p.openAddCheque}
        />
      );
    case 'payments':
      return (
        <AccountingPaymentsTab
          ar={ar}
          locale={locale}
          documents={p.documents}
          contacts={p.contacts}
          bankAccounts={p.bankAccounts}
          sortDocuments={p.sortDocuments}
          setSortDocuments={p.setSortDocuments}
          paymentsTotal={p.paymentsTotal}
          getPropertyDisplay={p.getPropertyDisplay}
        />
      );
    case 'periods':
      return <AccountingPeriodsTab ar={ar} periods={p.periods} onLockPeriod={p.onLockPeriod} />;
    case 'audit':
      return <AccountingAuditTab ar={ar} auditLogs={p.auditLogs} />;
    case 'settings':
      return (
        <AccountingSettingsTab
          ar={ar}
          fiscalForm={p.fiscalForm}
          setFiscalForm={p.setFiscalForm}
          onSave={p.onSaveSettings}
        />
      );
    default:
      return null;
  }
}
