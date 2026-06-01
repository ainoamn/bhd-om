'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getAccountBalance,
  getFiscalSettings,
  saveFiscalSettings,
  aiDetectAnomalies,
  lockPeriod,
  getNextDocumentSerial,
  getBankAccountBalance,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
  type AccountType,
  type DocumentType,
  type DocumentStatus,
} from '@/lib/data/accounting';

import { useServerAddressBookContacts } from '@/lib/hooks/useServerAddressBookContacts';
import InvoicePrint from './InvoicePrint';
import DocumentPrintModal from './DocumentPrintModal';
import SortSelect, { type SortOption } from './SortSelect';
import AccountingFilter from './AccountingFilter';
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
import AccountingAddAccountModal from './accounting/AccountingAddAccountModal';
import AccountingAddDocumentModal from './accounting/AccountingAddDocumentModal';
import AccountingAddJournalModal from './accounting/AccountingAddJournalModal';
import AccountingAddChequeModal from './accounting/AccountingAddChequeModal';
import AccountingInvoiceScanModal, { type InvoiceScanResult } from './accounting/AccountingInvoiceScanModal';
import { computeFinancialKpisFromAccounts } from '@/lib/accounting/dashboard/accountStats';
import styles from './accounting.module.css';
import {
  lockPeriod as apiLockPeriod,
} from '@/lib/accounting/api/client';
import { REPORT_URL_IDS, type ReportViewId } from '@/lib/accounting/ui/reportLabels';
import { useAccountingDbReports } from '@/lib/accounting/hooks/useAccountingDbReports';
import { useAccountingHub } from '@/lib/accounting/hooks/useAccountingHub';
import { clearDraft } from '@/lib/utils/draftStorage';
import { ACCOUNTING_DRAFT_KEYS } from '@/lib/accounting/ui/draftKeys';
import DraftBanner from '@/components/admin/DraftBanner';
import AccountingHubFilterBar from './accounting/AccountingHubFilterBar';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export type { AccountingInitialData };

import type { AccountingHubTabId as TabId } from './accounting/AccountingHubFilterBar';

export default function AccountingSection(props: { initialData?: AccountingInitialData }) {
  const { initialData } = props;
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const setTab = (tab: TabId, action?: string, report?: ReportViewId) => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (action) params.set('action', action);
    if (report && tab === 'reports') params.set('report', report);
    router.replace(`/${locale}/admin/accounting?${params.toString()}`, { scroll: false });
  };

  const tabFromUrl = (searchParams?.get('tab') || 'dashboard') as TabId;
  const actionFromUrl = searchParams?.get('action');

  const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl);
  const [mounted, setMounted] = useState(false);
  const [receiptConfirmKey, setReceiptConfirmKey] = useState(0);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCheque, setShowAddCheque] = useState(false);
  const [showInvoiceScan, setShowInvoiceScan] = useState(false);
  const [printDocument, setPrintDocument] = useState<AccountingDocument | null>(null);
  const [reportView, setReportView] = useState<ReportViewId>('trial');
  const [agingLedger, setAgingLedger] = useState<'ar' | 'ap'>('ar');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [reportPropertyId, setReportPropertyId] = useState<string>('');
  const [reportContactId, setReportContactId] = useState<string>('');
  const [fiscalForm, setFiscalForm] = useState(() => (typeof window !== 'undefined' ? getFiscalSettings() : { startMonth: 1, startDay: 1, currency: 'OMR', vatRate: 0 }));
  const [accountForm, setAccountForm] = useState({ code: '', nameAr: '', nameEn: '', type: 'EXPENSE' as AccountType });
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    descriptionAr: '',
    descriptionEn: '',
    lines: [{ accountId: '', debit: '', credit: '', desc: '' }] as Array<{ accountId: string; debit: string; credit: string; desc: string }>,
  });
  const [docForm, setDocForm] = useState({
    type: 'RECEIPT' as DocumentType,
    serialNumber: '',
    amount: '',
    contactId: '',
    bankAccountId: '',
    propertyId: '',
    projectId: '',
    descriptionAr: '',
    descriptionEn: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    currency: 'OMR',
    useLineItems: false,
    vatRate: 0,
    purchaseOrder: '',
    reference: '',
    branch: '',
    attachments: [] as { url: string; name: string }[],
    items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] as Array<{ descriptionAr: string; quantity: number; unitPrice: string; accountId: string }>,
  });

  const openDocumentModule = (docType: DocumentType, preset?: { descriptionAr?: string; descriptionEn?: string }) => {
    clearDraft(ACCOUNTING_DRAFT_KEYS.document);
    const today = new Date().toISOString().slice(0, 10);
    const useLineItems = ['INVOICE', 'QUOTE', 'PURCHASE_INV', 'PURCHASE_ORDER', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(docType);
    setDocForm({
      type: docType,
      serialNumber: getNextDocumentSerial(docType),
      amount: '',
      contactId: '',
      bankAccountId: '',
      propertyId: '',
      projectId: '',
      descriptionAr: preset?.descriptionAr ?? '',
      descriptionEn: preset?.descriptionEn ?? '',
      date: today,
      dueDate: today,
      currency: 'OMR',
      useLineItems,
      vatRate: 0,
      purchaseOrder: '',
      reference: '',
      branch: '',
      attachments: [],
      items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }],
    });
    setShowAddDocument(true);
    setTab('documents');
  };

  const applyInvoiceScan = (draft: InvoiceScanResult) => {
    clearDraft(ACCOUNTING_DRAFT_KEYS.document);
    const today = new Date().toISOString().slice(0, 10);
    const docType = draft.type;
    const useLineItems = ['INVOICE', 'QUOTE', 'PURCHASE_INV', 'PURCHASE_ORDER', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(docType);
    setDocForm({
      type: docType,
      serialNumber: getNextDocumentSerial(docType),
      amount: draft.amount || '',
      contactId: '',
      bankAccountId: '',
      propertyId: '',
      projectId: '',
      descriptionAr: draft.descriptionAr ?? '',
      descriptionEn: draft.descriptionEn ?? '',
      date: draft.date || today,
      dueDate: draft.dueDate || draft.date || today,
      currency: 'OMR',
      useLineItems,
      vatRate: draft.vatRate ?? 0,
      purchaseOrder: '',
      reference: draft.reference || '',
      branch: '',
      attachments: draft.attachments ?? [],
      items: [{ descriptionAr: draft.descriptionAr || '', quantity: 1, unitPrice: draft.amount || '', accountId: '' }],
    });
    setShowAddDocument(true);
    setTab('documents');
  };

  const [chequeForm, setChequeForm] = useState({
    chequeNumber: '',
    amount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    bankName: '',
    descriptionAr: '',
    contactId: '',
    propertyId: '',
    projectId: '',
    contractId: '',
    date: new Date().toISOString().slice(0, 10),
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

  const {
    accounts,
    setAccounts,
    journalEntries,
    setJournalEntries,
    documents,
    setDocuments,
    periods,
    setPeriods,
    auditLogs,
    setAuditLogs,
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
    const tab = (searchParams?.get('tab') || 'dashboard') as TabId;
    setActiveTab(tab);
    const report = searchParams?.get('report') as ReportViewId | null;
    if (tab === 'reports' && report && REPORT_URL_IDS.includes(report)) {
      setReportView(report);
    }
  }, [searchParams?.get('tab'), searchParams?.get('report')]);

  useEffect(() => {
    if (reportView === 'bankStatement' && !selectedBankAccountId && typeof window !== 'undefined') {
      const active = bankAccounts.filter((b) => b.isActive);
      setSelectedBankAccountId(active.length > 0 ? active[0].id : 'CASH');
    }
  }, [reportView, bankAccounts]);

  useEffect(() => {
    if (actionFromUrl === 'add') {
      if (tabFromUrl === 'journal') setShowAddJournal(true);
      else if (tabFromUrl === 'accounts') setShowAddAccount(true);
      else if (tabFromUrl === 'documents') setShowAddDocument(true);
      else if (tabFromUrl === 'cheques') {
        const propId = searchParams?.get('propertyId') || '';
        const projId = searchParams?.get('projectId') || '';
        const cntId = searchParams?.get('contractId') || '';
        setChequeForm((prev) => ({
          ...prev,
          propertyId: propId,
          projectId: projId,
          contractId: cntId,
          chequeNumber: '',
          amount: '',
          dueDate: new Date().toISOString().slice(0, 10),
          bankName: '',
          descriptionAr: '',
          contactId: '',
          date: new Date().toISOString().slice(0, 10),
        }));
        setShowAddCheque(true);
      }
    }
  }, [actionFromUrl, tabFromUrl, searchParams?.get('propertyId'), searchParams?.get('projectId')]);

  const reportFrom = filterFromDate || new Date().getFullYear() + '-01-01';
  const reportTo = filterToDate || new Date().toISOString().slice(0, 10);
  const reportAsOf = filterToDate || new Date().toISOString().slice(0, 10);

  /** استخدام بيانات الـ state للتقارير لضمان انعكاس التحديثات فوراً (محلي و API) */
  const entriesForReports = journalEntries;
  const accountsForReports = accounts;

  const {
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
  } = useAccountingDbReports({
    useDb,
    activeTab,
    reportView,
    reportFrom,
    reportTo,
    reportAsOf,
    agingLedger,
    journalEntries,
    accounts,
    selectedBankAccountId,
    reportPropertyId,
    reportContactId,
  });

  const dbKpis = useMemo(
    () => (useDb ? computeFinancialKpisFromAccounts(accounts) : null),
    [useDb, accounts]
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayStats = useMemo(() => {
    let received = 0;
    let expenses = 0;
    for (const doc of documents) {
      if (doc.date !== todayIso || doc.status === 'CANCELLED') continue;
      const amt = doc.totalAmount ?? doc.amount ?? 0;
      if (doc.type === 'RECEIPT' || doc.type === 'INVOICE') received += amt;
      if (doc.type === 'PAYMENT' || doc.type === 'PURCHASE_INV') expenses += amt;
    }
    return { received, expenses };
  }, [documents, todayIso]);

  const stats = useDb && dbKpis
    ? {
        totalEntries: dataMeta?.journalTotal ?? journalEntries.length,
        totalDocuments: dataMeta?.documentsTotal ?? documents.length,
        totalAssets: dbKpis.totalAssets,
        totalLiabilities: dbKpis.totalLiabilities,
        totalEquity: dbKpis.totalEquity,
        totalRevenue: dbKpis.totalRevenue,
        totalExpenses: dbKpis.totalExpenses,
        netIncome: dbKpis.netIncome,
      }
    : {
        totalEntries: journalEntries.length,
        totalDocuments: documents.length,
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity + balanceSheet.netIncome,
        totalRevenue: incomeStatement.revenue.total,
        totalExpenses: incomeStatement.expense.total,
        netIncome: incomeStatement.netIncome,
      };

  const anomalies = aiDetectAnomalies(entriesForReports, accountsForReports);

  const cashSnapshot = useDb && dbKpis
    ? { balance: dbKpis.cashBalance }
    : getBankAccountBalance('CASH', reportAsOf, entriesForReports);
  const banksTotal = useDb && dbKpis
    ? dbKpis.bankBalance
    : bankAccounts
        .filter((b) => b.isActive)
        .reduce((s, b) => s + getBankAccountBalance(b.id, reportAsOf, entriesForReports).balance, 0);
  /** لا نكرّر عرض قيد الإيصال في «أحدث القيود» — الإيصال يظهر في «أحدث المستندات» */
  const latestEntries = journalEntries.filter((e) => e.documentType !== 'RECEIPT').slice(0, 5);
  const latestDocs = documents.slice(0, 5);
  const monthlyLabels: string[] = [];
  const monthlyRevenue: number[] = [];
  const monthlyExpense: number[] = [];
  {
    const months = 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    for (let m = 0; m < months; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
      const label = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      monthlyLabels.push(label);
      let rev = 0, exp = 0;
      for (const entry of entriesForReports) {
        if (entry.status === 'CANCELLED' || entry.replacedBy) continue;
        const d = new Date(entry.date);
        if (d < monthStart || d > monthEnd) continue;
        for (const line of entry.lines) {
          const acc = accountsForReports.find((a) => a.id === line.accountId);
          if (!acc) continue;
          if (acc.type === 'REVENUE') rev += (line.credit || 0) - (line.debit || 0);
          if (acc.type === 'EXPENSE') exp += (line.debit || 0) - (line.credit || 0);
        }
      }
      monthlyRevenue.push(rev);
      monthlyExpense.push(exp);
    }
  }

  const receivables = useMemo(() => {
    if (useDb && dbKpis) return dbKpis.receivables;
    const invs = documents.filter((d) => d.type === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED');
    return invs.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents, useDb, dbKpis]);
  const chequesReceivable = useMemo(() => {
    if (useDb && dbKpis) return dbKpis.chequesReceivable;
    const cheques = documents.filter((d) => d.type === 'RECEIPT' && d.paymentMethod === 'CHEQUE');
    return cheques.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents, useDb, dbKpis]);
  const totalClaims = receivables + chequesReceivable;
  const paymentsTotal = useMemo(() => {
    const pays = documents.filter((d) => d.type === 'PAYMENT' || d.type === 'RECEIPT');
    return pays.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents]);

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
          onAddAccount={() => {
            setAccountForm({ code: '', nameAr: '', nameEn: '', type: 'EXPENSE' });
            setShowAddAccount(true);
          }}
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
          onAddJournal={() => {
            setJournalForm({
              date: new Date().toISOString().slice(0, 10),
              descriptionAr: '',
              descriptionEn: '',
              lines: [{ accountId: '', debit: '', credit: '', desc: '' }],
            });
            setShowAddJournal(true);
          }}
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
          onAddDocument={() => {
            const today = new Date().toISOString().slice(0, 10);
            setDocForm({
              type: 'RECEIPT',
              serialNumber: getNextDocumentSerial('RECEIPT'),
              amount: '',
              contactId: '',
              bankAccountId: '',
              propertyId: '',
              projectId: '',
              descriptionAr: '',
              descriptionEn: '',
              date: today,
              dueDate: today,
              currency: 'OMR',
              useLineItems: false,
              vatRate: 0,
              purchaseOrder: '',
              reference: '',
              branch: '',
              attachments: [],
              items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }],
            });
            setShowAddDocument(true);
          }}
          getPropertyDisplay={getPropertyDisplay}
        />
      )}

      <AccountingAddDocumentModal
        ar={ar}
        locale={locale}
        open={showAddDocument}
        onClose={() => setShowAddDocument(false)}
        docForm={docForm}
        setDocForm={setDocForm}
        contacts={contacts}
        accounts={accounts}
        bankAccounts={bankAccounts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
        useDb={useDb}
        onCreated={loadData}
      />

      <AccountingAddChequeModal
        ar={ar}
        locale={locale}
        open={showAddCheque}
        onClose={() => setShowAddCheque(false)}
        chequeForm={chequeForm}
        setChequeForm={setChequeForm}
        contacts={contacts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
        useDb={useDb}
        onCreated={async () => {
          await loadData();
          setTab('cheques');
        }}
      />

      <AccountingAddJournalModal
        ar={ar}
        locale={locale}
        open={showAddJournal}
        onClose={() => setShowAddJournal(false)}
        journalForm={journalForm}
        setJournalForm={setJournalForm}
        accounts={accounts}
        useDb={useDb}
        onCreated={loadData}
      />

      {/* Modal: طباعة مستند - قابلة للسحب وضمن حدود الشاشة */}
      {printDocument && (
        <DocumentPrintModal onClose={() => setPrintDocument(null)} ar={ar}>
          <InvoicePrint
            doc={printDocument}
            contact={printDocument.contactId ? contacts.find((c) => c.id === printDocument.contactId) ?? null : null}
            locale={locale}
            onClose={() => setPrintDocument(null)}
          />
        </DocumentPrintModal>
      )}

      <AccountingAddAccountModal
        ar={ar}
        open={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        onCreated={loadData}
      />

      <AccountingInvoiceScanModal
        ar={ar}
        open={showInvoiceScan}
        onClose={() => setShowInvoiceScan(false)}
        onApply={applyInvoiceScan}
      />
    </div>
  );
}
