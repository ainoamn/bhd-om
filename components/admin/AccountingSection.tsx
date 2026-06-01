'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import {
  getChartOfAccounts,
  getAllJournalEntries,
  getAllDocuments,
  searchJournalEntries,
  searchDocuments,
  getAccountById,
  getAccountBalance,
  getAccountLedger,
  getAccountLedgerWithBalance,
  createDocument,
  createJournalEntry,
  createAccount,
  updateAccount,
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
import { getContactDisplayFull, searchContacts } from '@/lib/data/addressBook';
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
  suggestJournalEntry,
  createDocument as apiCreateDocument,
  createJournalEntry as apiCreateJournalEntry,
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
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestMsg, setAiSuggestMsg] = useState('');
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
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
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

  const filteredContacts = useMemo(() => searchContacts(contactSearchQuery), [contactSearchQuery]);
  const selectedContact = docForm.contactId ? contacts.find((c) => c.id === docForm.contactId) : null;

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

  const handleAiSuggestEntry = async () => {
    const desc = journalForm.descriptionAr.trim();
    if (!desc || !useDb) return;
    setAiSuggestLoading(true);
    setAiSuggestMsg('');
    try {
      const result = await suggestJournalEntry(desc);
      setJournalForm({
        ...journalForm,
        descriptionAr: desc,
        lines: result.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit > 0 ? String(l.debit) : '',
          credit: l.credit > 0 ? String(l.credit) : '',
          desc: l.descriptionAr || desc,
        })),
      });
      setAiSuggestMsg(ar ? result.explanationAr : result.explanationEn);
    } catch (err) {
      setAiSuggestMsg(err instanceof Error ? err.message : (ar ? 'تعذّر الاقتراح' : 'Suggest failed'));
    } finally {
      setAiSuggestLoading(false);
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
    if (showAddDocument) {
      setContactSearchQuery('');
      setContactDropdownOpen(false);
    }
  }, [showAddDocument]);
  useEffect(() => {
    if (showAddDocument) {
      setDocForm((prev) => ({ ...prev, serialNumber: getNextDocumentSerial(prev.type) }));
    }
  }, [showAddDocument, docForm.type]);
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

  const aiSuggestedAccount = useMemo(() => {
    const text = (journalForm.descriptionAr + ' ' + (journalForm.descriptionEn || '')).toLowerCase();
    if (!text.trim()) return null;
    if (/\b(صندوق|cash|نقد)\b/.test(text)) return accounts.find((a) => a.code === '1000');
    if (/\b(بنك|bank)\b/.test(text)) return accounts.find((a) => a.code === '1100');
    if (/\b(إيجار|rent|إيراد)\b/.test(text)) return accounts.find((a) => a.code === '4000');
    if (/\b(عميل|عميلين|عملاء|receivable)\b/.test(text)) return accounts.find((a) => a.code === '1200');
    if (/\b(مورد|موردين|موردون|payable)\b/.test(text)) return accounts.find((a) => a.code === '2000');
    if (/\b(مصروف|expense|صيانة)\b/.test(text)) return accounts.find((a) => a.code === '5000');
    return null;
  }, [journalForm.descriptionAr, journalForm.descriptionEn, accounts]);

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

      {/* Modal: إضافة مستند */}
      {showAddDocument && (
        <div className={styles.modalOverlay} onClick={() => setShowAddDocument(false)}>
          <div className={`${styles.modalContent} ${styles.modalContentExtraWide} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {docForm.type === 'PURCHASE_INV' ? (ar ? 'فاتورة مشتريات' : 'Purchase Invoice') : docForm.type === 'PURCHASE_ORDER' ? (ar ? 'أمر شراء' : 'Purchase Order') : (ar ? 'إضافة مستند محاسبي' : 'Add accounting document')}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let amount = 0;
                let items: { descriptionAr: string; descriptionEn?: string; quantity: number; unitPrice: number; amount: number; accountId?: string }[] | undefined;
                if (docForm.useLineItems && docForm.items.length > 0) {
                  items = docForm.items
                    .filter((i) => i.descriptionAr.trim() && !isNaN(parseFloat(i.unitPrice)))
                    .map((i) => {
                      const qty = i.quantity || 1;
                      const unitPrice = parseFloat(i.unitPrice) || 0;
                      return { descriptionAr: i.descriptionAr, quantity: qty, unitPrice, amount: qty * unitPrice, accountId: i.accountId || undefined };
                    });
                  amount = items.reduce((s, i) => s + i.amount, 0);
                } else {
                  amount = parseFloat(docForm.amount) || 0;
                }
                if (isNaN(amount) || amount <= 0) return;
                if (['PURCHASE_INV', 'PURCHASE_ORDER', 'INVOICE'].includes(docForm.type) && !docForm.contactId) {
                  alert(ar ? 'الرجاء اختيار العميل/المورد' : 'Please select contact/supplier');
                  return;
                }
                const vatRate = docForm.vatRate || 0;
                const vatAmount = amount * (vatRate / 100);
                const totalAmount = amount + vatAmount;
                const docData = {
                  type: docForm.type,
                  status: 'APPROVED' as DocumentStatus,
                  date: docForm.date,
                  dueDate: docForm.dueDate || undefined,
                  contactId: docForm.contactId || undefined,
                  bankAccountId: docForm.bankAccountId || undefined,
                  propertyId: docForm.propertyId ? parseInt(docForm.propertyId, 10) : undefined,
                  projectId: docForm.projectId && !isNaN(parseInt(docForm.projectId, 10)) ? parseInt(docForm.projectId, 10) : undefined,
                  amount,
                  currency: docForm.currency || 'OMR',
                  vatRate: vatRate > 0 ? vatRate : undefined,
                  vatAmount: vatAmount > 0 ? vatAmount : undefined,
                  totalAmount,
                  descriptionAr: docForm.descriptionAr || undefined,
                  descriptionEn: docForm.descriptionEn || undefined,
                  items,
                  ...(docForm.serialNumber?.trim() && { serialNumber: docForm.serialNumber.trim() }),
                  purchaseOrder: docForm.purchaseOrder?.trim() || undefined,
                  reference: docForm.reference?.trim() || undefined,
                  branch: docForm.branch?.trim() || undefined,
                  attachments: docForm.attachments?.length ? docForm.attachments : undefined,
                };
                try {
                  if (useDb) {
                    await apiCreateDocument(docData);
                  } else {
                    createDocument(docData);
                  }
                  await loadData();
                  setShowAddDocument(false);
                } catch (err) {
                  alert(err instanceof Error ? err.message : ar ? 'فشل إنشاء المستند' : 'Failed to create document');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'نوع المستند' : 'Document type'}</label>
                <select value={docForm.type} onChange={(e) => {
                  const t = e.target.value as DocumentType;
                  const useItems = ['INVOICE', 'QUOTE', 'PURCHASE_INV', 'PURCHASE_ORDER'].includes(t);
                  setDocForm({ ...docForm, type: t, useLineItems: docForm.useLineItems || useItems });
                }} className="admin-select w-full">
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).filter((t) => ['INVOICE', 'RECEIPT', 'QUOTE', 'DEPOSIT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OTHER', 'PURCHASE_INV', 'PURCHASE_ORDER'].includes(t)).map((t) => (
                    <option key={t} value={t}>{ar ? DOC_TYPE_LABELS[t].ar : DOC_TYPE_LABELS[t].en}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الفاتورة' : 'Invoice number'}</label>
                  <input type="text" value={docForm.serialNumber} onChange={(e) => setDocForm({ ...docForm, serialNumber: e.target.value })} className="admin-input w-full" placeholder={ar ? 'يُولّد تلقائياً - يمكن التعديل' : 'Auto-generated - editable'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العملة' : 'Currency'}</label>
                  <select value={docForm.currency} onChange={(e) => setDocForm({ ...docForm, currency: e.target.value })} className="admin-select w-full">
                    <option value="OMR">OMR ر.ع</option>
                    <option value="USD">USD $</option>
                    <option value="AED">AED د.إ</option>
                    <option value="SAR">SAR ر.س</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ *' : 'Date *'}</label>
                  <DateInput value={docForm.date} onChange={(v) => setDocForm({ ...docForm, date: v })} locale={locale} className="w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'تاريخ الاستحقاق *' : 'Due date *'}</label>
                  <DateInput value={docForm.dueDate} onChange={(v) => setDocForm({ ...docForm, dueDate: v })} locale={locale} className="w-full" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER') ? (ar ? 'المورد *' : 'Supplier *') : (ar ? 'العميل / المستلم *' : 'Contact *')}
                </label>
                <input
                  type="text"
                  value={selectedContact ? getContactDisplayFull(selectedContact, locale) : contactSearchQuery}
                  onChange={(e) => {
                    if (selectedContact) {
                      setDocForm({ ...docForm, contactId: '' });
                      setContactSearchQuery(e.target.value);
                    } else {
                      setContactSearchQuery(e.target.value);
                      if (!e.target.value) setDocForm({ ...docForm, contactId: '' });
                    }
                    setContactDropdownOpen(true);
                  }}
                  onFocus={() => setContactDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setContactDropdownOpen(false), 200)}
                  placeholder={ar ? 'ابحث بالاسم أو الهاتف أو الرقم المدني...' : 'Search by name, phone, or civil ID...'}
                  className="admin-input w-full"
                  autoComplete="off"
                />
                {['PURCHASE_INV', 'PURCHASE_ORDER', 'INVOICE'].includes(docForm.type) && !docForm.contactId && (
                  <p className="text-red-500 text-xs mt-1">{ar ? 'مطلوب' : 'Required'}</p>
                )}
                {selectedContact && (
                  <button type="button" onClick={() => { setDocForm({ ...docForm, contactId: '' }); setContactSearchQuery(''); }} className="absolute top-9 end-2 text-gray-400 hover:text-red-600 text-sm">
                    ✕
                  </button>
                )}
                {contactDropdownOpen && (
                  <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                    {filteredContacts.slice(0, 20).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setDocForm({ ...docForm, contactId: c.id });
                            setContactSearchQuery('');
                            setContactDropdownOpen(false);
                          }}
                          className="w-full text-right px-4 py-2.5 hover:bg-gray-50 text-sm"
                        >
                          <span className="font-medium">{getContactDisplayFull(c, locale)}</span>
                          {c.phone && <span className="text-gray-500 block text-xs mt-0.5">{c.phone}</span>}
                          {c.civilId && <span className="text-gray-400 text-xs">{ar ? 'مدني:' : 'Civil:'} {c.civilId}</span>}
                        </button>
                      </li>
                    ))}
                    {filteredContacts.length === 0 && <li className="px-4 py-3 text-gray-500 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</li>}
                  </ul>
                )}
              </div>
              {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER' || docForm.type === 'INVOICE' || docForm.type === 'QUOTE') && (
                <div className="grid grid-cols-2 gap-4">
                  {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'أمر شراء' : 'Purchase order'}</label>
                      <input type="text" value={docForm.purchaseOrder} onChange={(e) => setDocForm({ ...docForm, purchaseOrder: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري' : 'Optional'} />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المرجع (يُملأ تلقائياً من العقار/المشروع أو يدوياً)' : 'Reference (auto from property/project or manual)'}</label>
                    <input type="text" value={docForm.reference} onChange={(e) => setDocForm({ ...docForm, reference: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري - أو اختر عقار/مشروع' : 'Optional - or select property/project'} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الفرع' : 'Branch'}</label>
                    <input type="text" value={docForm.branch} onChange={(e) => setDocForm({ ...docForm, branch: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري' : 'Optional'} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العقار (المرجع)' : 'Property (Reference)'}</label>
                    <select value={docForm.propertyId} onChange={(e) => {
                      const val = e.target.value;
                      const p = val ? mergedProperties.find((x) => String(x.id) === val) : null;
                      setDocForm({ ...docForm, propertyId: val, reference: p ? getPropertyDisplay(p) : docForm.reference });
                    }} className="admin-select w-full">
                      <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                      {mergedProperties.map((p) => (
                        <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المشروع (المرجع)' : 'Project (Reference)'}</label>
                    <select value={docForm.projectId} onChange={(e) => {
                      const val = e.target.value;
                      const p = val ? projectsList.find((x) => String(x.id) === val) : null;
                      setDocForm({ ...docForm, projectId: val, reference: p ? getProjectDisplay(p) : docForm.reference });
                    }} className="admin-select w-full">
                      <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                      {projectsList.map((p) => (
                        <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="useLineItems" checked={docForm.useLineItems} onChange={(e) => setDocForm({ ...docForm, useLineItems: e.target.checked })} className="rounded" />
                <label htmlFor="useLineItems" className="text-sm font-semibold text-gray-700">{ar ? 'تجميع بنود الفاتورة' : 'Use line items (detailed invoice)'}</label>
              </div>
              {!docForm.useLineItems ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المبلغ *' : 'Amount *'}</label>
                  <input type="number" step="0.01" min="0" required value={docForm.amount} onChange={(e) => setDocForm({ ...docForm, amount: e.target.value })} className="admin-input w-full" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'منتج/منتجات' : 'Line items'}</label>
                  <div className="overflow-x-auto">
                    <table className="admin-table text-sm">
                      <thead>
                        <tr>
                          <th>{ar ? 'الوصف *' : 'Description *'}</th>
                          <th>{ar ? 'حساب *' : 'Account *'}</th>
                          <th>{ar ? 'الكمية *' : 'Qty *'}</th>
                          <th>{ar ? 'السعر * (خال من الضريبة)' : 'Price * (tax-free)'}</th>
                          <th>{ar ? 'المجموع' : 'Total'}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {docForm.items.map((item, i) => {
                          const qty = item.quantity || 1;
                          const price = parseFloat(item.unitPrice) || 0;
                          const total = qty * price;
                          return (
                            <tr key={i}>
                              <td><input type="text" value={item.descriptionAr} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], descriptionAr: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-full min-w-[120px]" placeholder={ar ? 'الوصف' : 'Description'} required /></td>
                              <td>
                                <select value={item.accountId} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], accountId: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-select min-w-[140px]">
                                  <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                                  {accounts.filter((a) => a.isActive).map((a) => (
                                    <option key={a.id} value={a.id}>{a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}</option>
                                  ))}
                                </select>
                              </td>
                              <td><input type="number" min="1" value={item.quantity} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], quantity: parseInt(e.target.value, 10) || 1 }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-16" /></td>
                              <td><input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], unitPrice: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-24" placeholder={ar ? 'السعر' : 'Price'} required /></td>
                              <td className="font-semibold">{total.toFixed(2)}</td>
                              <td><button type="button" onClick={() => setDocForm({ ...docForm, items: docForm.items.filter((_, j) => j !== i) })} className="text-red-600 p-1 hover:bg-red-50 rounded">✕</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setDocForm({ ...docForm, items: [...docForm.items, { descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm admin-accent-text hover:underline font-semibold">{ar ? 'أضف بند' : 'Add line'}</button>
                    <button type="button" onClick={() => setDocForm({ ...docForm, items: docForm.items.length > 1 ? docForm.items.slice(0, -1) : [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm text-red-600 hover:underline">{ar ? 'حذف آخر بند' : 'Delete last line'}</button>
                    <button type="button" onClick={() => setDocForm({ ...docForm, items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm text-amber-600 hover:underline">{ar ? 'مسح الكل' : 'Clear all'}</button>
                  </div>
                  {(() => {
                    const sub = docForm.items.reduce((s, i) => s + (i.quantity || 1) * (parseFloat(i.unitPrice) || 0), 0);
                    const vat = sub * (docForm.vatRate || 0) / 100;
                    const tot = sub + vat;
                    return (
                      <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between"><span>{ar ? 'المجموع الفرعي' : 'Subtotal'}</span><span>{sub.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>
                        {vat > 0 && <div className="flex justify-between"><span>{ar ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT'}</span><span>{vat.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>}
                        <div className="flex justify-between font-bold pt-2 border-t border-gray-200"><span>{ar ? 'المجموع' : 'Total'}</span><span>{tot.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ضريبة القيمة المضافة (%)' : 'VAT (%)'}</label>
                <select value={docForm.vatRate} onChange={(e) => setDocForm({ ...docForm, vatRate: parseInt(e.target.value, 10) })} className="admin-select w-full">
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={15}>15%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'مرفقات' : 'Attachments'}</label>
                <div className="flex flex-wrap gap-2">
                  {docForm.attachments.map((att, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-sm">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="admin-accent-text hover:underline truncate max-w-[120px]">{att.name}</a>
                      <button type="button" onClick={() => setDocForm({ ...docForm, attachments: docForm.attachments.filter((_, j) => j !== i) })} className="text-red-600">✕</button>
                    </span>
                  ))}
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 admin-accent-border-hover cursor-pointer text-sm font-medium text-gray-600">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" className="hidden" onChange={async (ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      try {
                        const res = await fetch('/api/upload/accounting', { method: 'POST', body: fd });
                        const json = await res.json();
                        if (json.url) setDocForm({ ...docForm, attachments: [...docForm.attachments, { url: json.url, name: json.name || file.name }] });
                      } catch { alert(ar ? 'فشل رفع الملف' : 'Upload failed'); }
                      ev.target.value = '';
                    }} />
                    <Icon name="archive" className="h-4 w-4" />
                    {ar ? 'رفع ملف' : 'Upload file'}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الحساب البنكي' : 'Bank account'}</label>
                <select value={docForm.bankAccountId} onChange={(e) => setDocForm({ ...docForm, bankAccountId: e.target.value })} className="admin-select w-full">
                  <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                  {bankAccounts.filter((a) => a.isActive).map((a) => (
                    <option key={a.id} value={a.id}>{getBankAccountDisplay(a)}{a.branch ? ` (${a.branch})` : ''}</option>
                  ))}
                </select>
                {(docForm.propertyId || docForm.projectId || docForm.reference) && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                    <span className="font-medium text-blue-800">{ar ? 'المرجع في الحساب البنكي:' : 'Reference in bank account:'}</span>
                    <p className="text-blue-700 mt-1 whitespace-pre-wrap">
                      {docForm.reference || (() => {
                        if (docForm.propertyId) {
                          const p = mergedProperties.find((x) => String(x.id) === docForm.propertyId);
                          return p ? getPropertyDisplay(p) : '';
                        }
                        if (docForm.projectId) {
                          const p = projectsList.find((x) => String(x.id) === docForm.projectId);
                          return p ? getProjectDisplay(p) : '';
                        }
                        return '';
                      })()}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
                <textarea value={docForm.descriptionAr} onChange={(e) => setDocForm({ ...docForm, descriptionAr: e.target.value })} className="admin-input w-full min-h-[100px] resize-y" placeholder={ar ? 'وصف المستند' : 'Document description'} rows={4} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddDocument(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: إضافة شيك */}
      {showAddCheque && (
        <div className={styles.modalOverlay} onClick={() => setShowAddCheque(false)}>
          <div className={`${styles.modalContent} ${styles.modalContentWide}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{ar ? 'إضافة شيك' : 'Add Cheque'}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amount = parseFloat(chequeForm.amount) || 0;
                if (amount <= 0) {
                  alert(ar ? 'أدخل المبلغ' : 'Enter amount');
                  return;
                }
                const docData = {
                  type: 'RECEIPT' as const,
                  status: 'APPROVED' as DocumentStatus,
                  date: chequeForm.date,
                  dueDate: chequeForm.dueDate || undefined,
                  contactId: chequeForm.contactId || undefined,
                  propertyId: chequeForm.propertyId ? parseInt(chequeForm.propertyId, 10) : undefined,
                  projectId: chequeForm.projectId && !isNaN(parseInt(chequeForm.projectId, 10)) ? parseInt(chequeForm.projectId, 10) : undefined,
                  contractId: chequeForm.contractId?.trim() || undefined,
                  amount,
                  currency: 'OMR',
                  totalAmount: amount,
                  descriptionAr: chequeForm.descriptionAr || undefined,
                  paymentMethod: 'CHEQUE' as const,
                  paymentReference: chequeForm.chequeNumber?.trim() || undefined,
                  chequeNumber: chequeForm.chequeNumber?.trim() || undefined,
                  chequeDueDate: chequeForm.dueDate || undefined,
                  chequeBankName: chequeForm.bankName?.trim() || undefined,
                  serialNumber: getNextDocumentSerial('RECEIPT'),
                };
                try {
                  if (useDb) {
                    await apiCreateDocument(docData);
                  } else {
                    createDocument(docData);
                  }
                  await loadData();
                  setShowAddCheque(false);
                  setTab('cheques');
                } catch (err) {
                  alert(err instanceof Error ? err.message : ar ? 'فشل إنشاء الشيك' : 'Failed to create cheque');
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الشيك *' : 'Cheque # *'}</label>
                  <input type="text" value={chequeForm.chequeNumber} onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })} className="admin-input w-full" placeholder={ar ? 'رقم الشيك' : 'Cheque number'} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المبلغ *' : 'Amount *'}</label>
                  <input type="number" step="0.01" min="0" value={chequeForm.amount} onChange={(e) => setChequeForm({ ...chequeForm, amount: e.target.value })} className="admin-input w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                  <DateInput value={chequeForm.dueDate} onChange={(v) => setChequeForm({ ...chequeForm, dueDate: v })} locale={locale} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'اسم البنك' : 'Bank Name'}</label>
                  <input type="text" value={chequeForm.bankName} onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })} className="admin-input w-full" placeholder={ar ? 'البنك' : 'Bank'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                  <DateInput value={chequeForm.date} onChange={(v) => setChequeForm({ ...chequeForm, date: v })} locale={locale} className="w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العميل' : 'Contact'}</label>
                  <select value={chequeForm.contactId} onChange={(e) => setChequeForm({ ...chequeForm, contactId: e.target.value })} className="admin-select w-full">
                    <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العقار' : 'Property'}</label>
                  <select value={chequeForm.propertyId} onChange={(e) => setChequeForm({ ...chequeForm, propertyId: e.target.value })} className="admin-select w-full">
                    <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                    {mergedProperties.map((p) => <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المشروع' : 'Project'}</label>
                  <select value={chequeForm.projectId} onChange={(e) => setChequeForm({ ...chequeForm, projectId: e.target.value })} className="admin-select w-full">
                    <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                    {projectsList.map((p) => <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
                <textarea value={chequeForm.descriptionAr} onChange={(e) => setChequeForm({ ...chequeForm, descriptionAr: e.target.value })} className="admin-input w-full" rows={2} placeholder={ar ? 'وصف اختياري' : 'Optional description'} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddCheque(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة شيك' : 'Add Cheque'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: قيد يومية يدوي */}
      {showAddJournal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddJournal(false)}>
          <div className={`${styles.modalContent} ${styles.modalContentWide}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{ar ? 'قيد يومية يدوي' : 'Manual journal entry'}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const lines = journalForm.lines
                  .filter((l) => l.accountId && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
                  .map((l) => ({
                    accountId: l.accountId,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    descriptionAr: l.desc || undefined,
                    descriptionEn: l.desc || undefined,
                  }));
                if (lines.length < 2) {
                  alert(ar ? 'أضف سطرين على الأقل (مدين ودائن)' : 'Add at least 2 lines (debit and credit)');
                  return;
                }
                try {
                  const entryData = {
                    date: journalForm.date,
                    lines,
                    descriptionAr: journalForm.descriptionAr || undefined,
                    descriptionEn: journalForm.descriptionEn || undefined,
                    documentType: 'JOURNAL' as const,
                    status: 'APPROVED' as DocumentStatus,
                  };
                  if (useDb) {
                    await apiCreateJournalEntry(entryData);
                  } else {
                    createJournalEntry(entryData);
                  }
                  await loadData();
                  setShowAddJournal(false);
                } catch (err) {
                  alert(err instanceof Error ? err.message : ar ? 'قيد غير متوازن' : 'Unbalanced entry');
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                  <DateInput value={journalForm.date} onChange={(v) => setJournalForm({ ...journalForm, date: v })} locale={locale} className="w-full" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
                  <input type="text" value={journalForm.descriptionAr} onChange={(e) => setJournalForm({ ...journalForm, descriptionAr: e.target.value })} className="admin-input w-full" placeholder={ar ? 'وصف القيد' : 'Entry description'} />
                  {aiSuggestedAccount && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <span>✨ {ar ? 'اقتراح ذكي:' : 'AI suggestion:'}</span>
                      <button type="button" onClick={() => { const n = [...journalForm.lines]; if (!n[0].accountId) n[0] = { ...n[0], accountId: aiSuggestedAccount.id }; setJournalForm({ ...journalForm, lines: n }); }} className="font-semibold underline hover:no-underline">
                        {aiSuggestedAccount.code} - {ar ? aiSuggestedAccount.nameAr : aiSuggestedAccount.nameEn}
                      </button>
                    </p>
                  )}
                  {useDb && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiSuggestEntry}
                        disabled={aiSuggestLoading || !journalForm.descriptionAr.trim()}
                        className="text-xs font-semibold admin-btn-secondary !py-1.5 !px-3"
                      >
                        {aiSuggestLoading ? (ar ? 'جاري التحليل...' : 'Analyzing...') : (ar ? '✨ اقتراح قيد كامل بالذكاء' : '✨ AI suggest full entry')}
                      </button>
                      {aiSuggestMsg && <span className="text-xs text-gray-600">{aiSuggestMsg}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">{ar ? 'بنود القيد' : 'Entry lines'}</label>
                  <button
                    type="button"
                    onClick={() => setJournalForm({ ...journalForm, lines: [...journalForm.lines, { accountId: '', debit: '', credit: '', desc: '' }] })}
                    className="text-xs font-semibold admin-accent-text hover:underline"
                  >
                    {ar ? '+ سطر' : '+ Line'}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {journalForm.lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={line.accountId}
                        onChange={(e) => {
                          const next = [...journalForm.lines];
                          next[i] = { ...next[i], accountId: e.target.value };
                          setJournalForm({ ...journalForm, lines: next });
                        }}
                        className="admin-select flex-1 min-w-0"
                        required
                      >
                        <option value="">{ar ? '— الحساب —' : '— Account —'}</option>
                        {accounts.filter((a) => a.isActive).map((a) => (
                          <option key={a.id} value={a.id}>{a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" min="0" placeholder={ar ? 'مدين' : 'Debit'} value={line.debit} onChange={(e) => { const n = [...journalForm.lines]; n[i] = { ...n[i], debit: e.target.value, credit: '' }; setJournalForm({ ...journalForm, lines: n }); }} className="admin-input w-24" />
                      <input type="number" step="0.01" min="0" placeholder={ar ? 'دائن' : 'Credit'} value={line.credit} onChange={(e) => { const n = [...journalForm.lines]; n[i] = { ...n[i], credit: e.target.value, debit: '' }; setJournalForm({ ...journalForm, lines: n }); }} className="admin-input w-24" />
                      <button type="button" onClick={() => setJournalForm({ ...journalForm, lines: journalForm.lines.filter((_, j) => j !== i) })} className="text-red-600 hover:text-red-700 p-1" title={ar ? 'حذف' : 'Remove'}>✕</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{ar ? 'المدين = الدائن (قيد مزدوج)' : 'Debit = Credit (double-entry)'}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddJournal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة القيد' : 'Add entry'}</button>
              </div>
            </form>
          </div>
        </div>
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
          onAddCheque={() => {
            setChequeForm({
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
            setShowAddCheque(true);
          }}
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
          onLockPeriod={(periodId) => {
            lockPeriod(periodId);
            loadData();
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
            loadData();
          }}
        />
      )}

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
