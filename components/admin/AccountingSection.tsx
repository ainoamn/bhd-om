'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getChartOfAccounts,
  getAllJournalEntries,
  getAllDocuments,
  searchJournalEntries,
  searchDocuments,
  getAccountBalance,
  getFiscalSettings,
  saveFiscalSettings,
  aiDetectAnomalies,
  getAuditLog,
  getFiscalPeriods,
  lockPeriod,
  getNextDocumentSerial,
  postUnpostedDocuments,
  getBankAccountBalance,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
  type AccountType,
  type DocumentType,
  type DocumentStatus,
} from '@/lib/data/accounting';
import { ensureDefaultPeriods } from '@/lib/accounting/compliance/periodEngine';
import { getContactDisplayFull } from '@/lib/data/addressBook';
import { useServerAddressBookContacts } from '@/lib/hooks/useServerAddressBookContacts';
import { getAllBankAccounts, getBankAccountDisplay } from '@/lib/data/bankAccounts';
import { syncPaidBookingsToAccounting, type PropertyBooking } from '@/lib/data/bookings';
import { projects as projectsList, getProjectDisplayText } from '@/lib/data/projects';
import { properties as propertiesList, getPropertyById, getPropertyDisplayText } from '@/lib/data/properties';
import DateInput from '@/components/shared/DateInput';
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
  fetchAccountingData,
  fetchAccounts,
  fetchDocuments,
  fetchJournalEntries,
  fetchPeriods,
  fetchAuditLog,
  fetchForecast,
  fetchJournalEntriesPage,
  fetchDocumentsPage,
  lockPeriod as apiLockPeriod,
} from '@/lib/accounting/api/client';
import { REPORT_URL_IDS, type ReportViewId } from '@/lib/accounting/ui/reportLabels';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import { useAccountingDbReports } from '@/lib/accounting/hooks/useAccountingDbReports';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export type { AccountingInitialData };

type TabId = 'dashboard' | 'sales' | 'purchases' | 'accounts' | 'journal' | 'documents' | 'reports' | 'claims' | 'cheques' | 'payments' | 'settings' | 'audit' | 'periods';

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
  const [accounts, setAccounts] = useState<ChartAccount[]>(initialData?.accounts ?? []);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialData?.journalEntries ?? []);
  const [documents, setDocuments] = useState<AccountingDocument[]>(initialData?.documents ?? []);
  const [periods, setPeriods] = useState<Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>>(initialData?.periods ?? []);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; timestamp: string; action: string; entityType: string; entityId: string; reason?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterContactId, setFilterContactId] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterDocType, setFilterDocType] = useState<DocumentType | ''>('');
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
  const [loadingMoreJournal, setLoadingMoreJournal] = useState(false);
  const [loadingMoreDocs, setLoadingMoreDocs] = useState(false);
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
  const [sortDocuments, setSortDocuments] = useState<SortOption>('dateDesc');
  const [sortJournal, setSortJournal] = useState<SortOption>('dateDesc');

  const [dataSourceFromApi, setDataSourceFromApi] = useState<boolean | null>(initialData ? true : null);
  const [dataMeta, setDataMeta] = useState(initialData?.meta ?? null);
  const useDb = dataSourceFromApi === true;
  /** حجوزات بانتظار تأكيد المحاسب — من API عند استخدام قاعدة البيانات */
  const [pendingConfirmBookings, setPendingConfirmBookings] = useState<PropertyBooking[]>([]);
  const syncRetryRef = useRef(false);
  const skipFirstLoadRef = useRef(!!initialData);
  const { contacts } = useServerAddressBookContacts();
  const bankAccounts = typeof window !== 'undefined' ? getAllBankAccounts() : [];
  const mergedProperties = useMemo(() => propertiesList.map((p) => getPropertyById(p.id) || p), []);

  /** عرض المشروع: اسم المشروع - رقم المشروع */
  const getProjectDisplay = (p: { id: number; serialNumber?: string; titleAr?: string; titleEn?: string }) =>
    getProjectDisplayText(p);
  /** عرض العقار: رقم قطعة - رقم عقار | نوع | محافظة - ولاية - منطقة - قرية */
  const getPropertyDisplay = (p: Parameters<typeof getPropertyDisplayText>[0]) => getPropertyDisplayText(p);

  const loadData = async () => {
    try {
      const data = await fetchAccountingData({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
      });
      if (Array.isArray(data.accounts)) setAccounts(data.accounts as ChartAccount[]);
      if (Array.isArray(data.documents)) setDocuments(data.documents as AccountingDocument[]);
      if (Array.isArray(data.journalEntries)) setJournalEntries(data.journalEntries as JournalEntry[]);
      if (Array.isArray(data.periods)) setPeriods(data.periods as typeof periods);
      if (data.meta) setDataMeta(data.meta);
      setDataSourceFromApi(true);
      if (typeof window !== 'undefined') {
        const auditRes = await fetch('/api/accounting/audit?limit=50', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        if (Array.isArray(auditRes)) setAuditLogs(auditRes);
        else setAuditLogs(getAuditLog());
      }
    } catch {
      loadDataLocal();
      setDataSourceFromApi(false);
    }
  };

  const loadDataLocal = () => {
    if (typeof window !== 'undefined') {
      syncPaidBookingsToAccounting(); // مزامنة الحجوزات المدفوعة مع المحاسبة
      postUnpostedDocuments(); // ترحيل المستندات المعتمدة تلقائياً
    }
    setAccounts(getChartOfAccounts());
    setJournalEntries(getAllJournalEntries());
    setDocuments(getAllDocuments());
    if (typeof window !== 'undefined') {
      setPeriods(getFiscalPeriods());
      setAuditLogs(getAuditLog());
    }
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const tab = (searchParams?.get('tab') || 'dashboard') as TabId;
    setActiveTab(tab);
    const report = searchParams?.get('report') as ReportViewId | null;
    if (tab === 'reports' && report && REPORT_URL_IDS.includes(report)) {
      setReportView(report);
    }
  }, [searchParams?.get('tab'), searchParams?.get('report')]);

  const loadMoreJournal = async () => {
    if (!useDb || loadingMoreJournal) return;
    const total = dataMeta?.journalTotal ?? journalEntries.length;
    if (journalEntries.length >= total) return;
    setLoadingMoreJournal(true);
    try {
      const page = await fetchJournalEntriesPage({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        limit: 50,
        offset: journalEntries.length,
      });
      setJournalEntries((prev) => [...prev, ...(page.items as JournalEntry[])]);
    } finally {
      setLoadingMoreJournal(false);
    }
  };

  const loadMoreDocuments = async () => {
    if (!useDb || loadingMoreDocs) return;
    const total = dataMeta?.documentsTotal ?? documents.length;
    if (documents.length >= total) return;
    setLoadingMoreDocs(true);
    try {
      const page = await fetchDocumentsPage({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        type: filterDocType || undefined,
        limit: 50,
        offset: documents.length,
      });
      setDocuments((prev) => [...prev, ...(page.items as AccountingDocument[])]);
    } finally {
      setLoadingMoreDocs(false);
    }
  };

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
  useEffect(() => {
    if (skipFirstLoadRef.current && !filterFromDate && !filterToDate) {
      skipFirstLoadRef.current = false;
      return;
    }
    loadData();
  }, [filterFromDate, filterToDate]);
  useEffect(() => {
    if (useDb && documents.length === 0 && journalEntries.length === 0 && !syncRetryRef.current) {
      syncRetryRef.current = true;
      const t = setTimeout(() => {
        loadData();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [useDb, documents.length, journalEntries.length]);
  useEffect(() => {
    if (!useDb && typeof window !== 'undefined') ensureDefaultPeriods();
    if (!useDb) {
      const onStorage = (e: StorageEvent) => {
        if (['bhd_chart_of_accounts', 'bhd_journal_entries', 'bhd_accounting_documents', 'bhd_fiscal_periods', 'bhd_audit_log'].includes(e.key || '')) loadDataLocal();
        if (e.key === 'bhd_property_bookings' || e.key === 'bhd_booking_cancellation_requests') setReceiptConfirmKey((k) => k + 1);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, [useDb]);

  /** جلب الحجوزات بانتظار تأكيد المحاسب من الخادم عند فتح لوحة التحكم */
  useEffect(() => {
    if (!useDb || activeTab !== 'dashboard') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/bookings/pending-confirmation', { credentials: 'include', cache: 'no-store' });
        if (res.ok && !cancelled) {
          const list = await res.json();
          if (Array.isArray(list)) setPendingConfirmBookings(list as PropertyBooking[]);
        }
      } catch {
        // تجاهل
      }
    })();
    return () => { cancelled = true; };
  }, [useDb, activeTab, receiptConfirmKey]);

  const filteredEntries = useMemo(() => {
    if (useDb) {
      let e = journalEntries;
      if (filterFromDate) e = e.filter((x) => x.date >= filterFromDate);
      if (filterToDate) e = e.filter((x) => x.date <= filterToDate);
      if (filterContactId) e = e.filter((x) => x.contactId === filterContactId);
      if (filterBankId) e = e.filter((x) => (filterBankId === 'CASH' ? !x.bankAccountId : x.bankAccountId === filterBankId));
      if (filterPropertyId) e = e.filter((x) => x.propertyId === parseInt(filterPropertyId, 10));
      if (filterDocType) e = e.filter((x) => x.documentType === filterDocType);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        e = e.filter((x) => (x.serialNumber || '').toLowerCase().includes(q) || (x.descriptionAr || '').toLowerCase().includes(q) || (x.descriptionEn || '').toLowerCase().includes(q));
      }
      return e;
    }
    let e = searchJournalEntries({
      fromDate: filterFromDate || undefined,
      toDate: filterToDate || undefined,
      contactId: filterContactId || undefined,
      bankAccountId: filterBankId && filterBankId !== 'CASH' ? filterBankId : undefined,
      propertyId: filterPropertyId ? parseInt(filterPropertyId, 10) : undefined,
      documentType: filterDocType || undefined,
      query: searchQuery || undefined,
    });
    if (filterBankId === 'CASH') e = e.filter((x) => !x.bankAccountId);
    return e;
  }, [useDb, journalEntries, filterFromDate, filterToDate, filterContactId, filterBankId, filterPropertyId, filterDocType, searchQuery]);

  const filteredDocs = useMemo(() => {
    if (useDb) {
      let d = documents;
      if (filterFromDate) d = d.filter((x) => x.date >= filterFromDate);
      if (filterToDate) d = d.filter((x) => x.date <= filterToDate);
      if (filterContactId) d = d.filter((x) => x.contactId === filterContactId);
      if (filterBankId) d = d.filter((x) => (filterBankId === 'CASH' ? !x.bankAccountId : x.bankAccountId === filterBankId));
      if (filterPropertyId) d = d.filter((x) => x.propertyId === parseInt(filterPropertyId, 10));
      if (filterDocType) d = d.filter((x) => x.type === filterDocType);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        d = d.filter((x) => (x.serialNumber || '').toLowerCase().includes(q) || (x.descriptionAr || '').toLowerCase().includes(q) || (x.descriptionEn || '').toLowerCase().includes(q));
      }
      return d;
    }
    let d = searchDocuments({
      fromDate: filterFromDate || undefined,
      toDate: filterToDate || undefined,
      contactId: filterContactId || undefined,
      bankAccountId: filterBankId && filterBankId !== 'CASH' ? filterBankId : undefined,
      propertyId: filterPropertyId ? parseInt(filterPropertyId, 10) : undefined,
      type: filterDocType || undefined,
      query: searchQuery || undefined,
    });
    if (filterBankId === 'CASH') d = d.filter((x) => !x.bankAccountId);
    return d;
  }, [useDb, documents, filterFromDate, filterToDate, filterContactId, filterBankId, filterPropertyId, filterDocType, searchQuery]);

  /** المستندات مرتبة حسب خيار الفرز */
  const sortedDocs = useMemo(() => {
    const list = [...filteredDocs];
    const getContactName = (d: AccountingDocument) => {
      const c = contacts.find((x) => x.id === d.contactId);
      return c ? getContactDisplayFull(c, locale) : '';
    };
    const getPropDisplay = (d: AccountingDocument) => {
      const p = d.propertyId ? getPropertyById(d.propertyId) : null;
      return p ? getPropertyDisplay(p) : '';
    };
    list.sort((a, b) => {
      switch (sortDocuments) {
        case 'dateDesc': return b.date.localeCompare(a.date);
        case 'dateAsc': return a.date.localeCompare(b.date);
        case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        case 'property': return getPropDisplay(a).localeCompare(getPropDisplay(b));
        case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
        default: return 0;
      }
    });
    return list;
  }, [filteredDocs, sortDocuments, contacts, locale]);

  /** قيود اليومية مرتبة */
  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    const getContactName = (e: JournalEntry) => {
      const c = contacts.find((x) => x.id === e.contactId);
      return c ? getContactDisplayFull(c, locale) : '';
    };
    list.sort((a, b) => {
      switch (sortJournal) {
        case 'dateDesc': return b.date.localeCompare(a.date);
        case 'dateAsc': return a.date.localeCompare(b.date);
        case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        case 'property': return String(a.propertyId || '').localeCompare(String(b.propertyId || ''));
        case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
        default: return 0;
      }
    });
    return list;
  }, [filteredEntries, sortJournal, contacts, locale]);

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
  const setRangeThisMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setFilterFromDate(from);
    setFilterToDate(to);
  };
  const setRangeLast30 = () => {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    setFilterFromDate(from);
    setFilterToDate(to);
  };
  const setRangeYearToDate = () => {
    const from = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    setFilterFromDate(from);
    setFilterToDate(to);
  };
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
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>{ar ? 'بحث' : 'Search'}</label>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={ar ? 'رقم، وصف...' : 'Number, desc...'} className={styles.filterInput} />
          </div>
          <div className="w-40">
            <label className={styles.filterLabel}>{ar ? 'من' : 'From'}</label>
            <DateInput value={filterFromDate} onChange={setFilterFromDate} locale={locale} className={styles.filterInput} />
          </div>
          <div className="w-40">
            <label className={styles.filterLabel}>{ar ? 'إلى' : 'To'}</label>
            <DateInput value={filterToDate} onChange={setFilterToDate} locale={locale} className={styles.filterInput} />
          </div>
          <div className="w-44">
            <label className={styles.filterLabel}>{ar ? 'العميل' : 'Contact'}</label>
            <select value={filterContactId} onChange={(e) => setFilterContactId(e.target.value)} className={styles.filterInput}>
              <option value="">{ar ? 'الكل' : 'All'}</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>)}
            </select>
          </div>
            {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'cheques') && (
              <>
                {activeTab !== 'cheques' && (
                <div className="w-40">
                  <label className={styles.filterLabel}>{ar ? 'الحساب البنكي' : 'Bank'}</label>
                  <select value={filterBankId} onChange={(e) => setFilterBankId(e.target.value)} className={styles.filterInput}>
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    <option value="CASH">{ar ? 'الصندوق' : 'Cash'}</option>
                    {bankAccounts.filter((b) => b.isActive).map((b) => (
                      <option key={b.id} value={b.id}>{getBankAccountDisplay(b)}</option>
                    ))}
                  </select>
                </div>
                )}
                <div className="w-44">
                  <label className={styles.filterLabel}>{ar ? 'العقار' : 'Property'}</label>
                  <select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)} className={styles.filterInput}>
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    {mergedProperties.map((p) => (
                      <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                    ))}
                  </select>
                </div>
                {activeTab === 'cheques' && (
                <div className="w-44">
                  <label className={styles.filterLabel}>{ar ? 'المشروع' : 'Project'}</label>
                  <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className={styles.filterInput}>
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    {projectsList.map((p) => <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>)}
                  </select>
                </div>
                )}
              </>
            )}
            {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'sales' || activeTab === 'purchases') && (
              <div className="w-36">
                <label className={styles.filterLabel}>{ar ? 'النوع' : 'Type'}</label>
                <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value as DocumentType | '')} className={styles.filterInput}>
                  <option value="">{ar ? 'الكل' : 'All'}</option>
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => <option key={t} value={t}>{ar ? DOC_TYPE_LABELS[t].ar : DOC_TYPE_LABELS[t].en}</option>)}
                </select>
              </div>
            )}
        </div>

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
