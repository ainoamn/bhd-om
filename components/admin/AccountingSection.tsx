'use client';

import { useState, useEffect, useMemo } from 'react';
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
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
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
  getBankAccountLedger,
  getBankAccountBalance,
  getPropertyOrContactLedger,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
  type AccountType,
  type DocumentType,
  type DocumentStatus,
} from '@/lib/data/accounting';
import { ensureDefaultPeriods } from '@/lib/accounting/compliance/periodEngine';
import { getAllContacts, getContactDisplayFull, searchContacts } from '@/lib/data/addressBook';
import { getAllBankAccounts, getBankAccountDisplay } from '@/lib/data/bankAccounts';
import { syncPaidBookingsToAccounting, getBookingsPendingAccountantConfirmation, confirmBookingReceiptByAccountant, getBookingsPendingCancellation, completeCancellationByAccountant, getBookingDisplayName } from '@/lib/data/bookings';
import { getDocumentUploadLink, getDocumentLinkMessage, openWhatsAppWithMessage, openEmailWithMessage } from '@/lib/documentUploadLink';
import { projects as projectsList, getProjectDisplayText } from '@/lib/data/projects';
import { properties as propertiesList, getPropertyById, getPropertyDisplayText } from '@/lib/data/properties';
import InvoicePrint from './InvoicePrint';
import ReportExportButtons from './ReportExportButtons';
import ClaimsPaymentsExportButtons from './ClaimsPaymentsExportButtons';
import DocumentPrintModal from './DocumentPrintModal';
import SortSelect, { type SortOption } from './SortSelect';
import AccountingFilter from './AccountingFilter';
import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { LOGO_SIZE_DEFAULT } from '@/lib/data/documentTemplateConstants';
import styles from './accounting.module.css';
import {
  fetchAccounts,
  fetchDocuments,
  fetchJournalEntries,
  fetchPeriods,
  fetchAuditLog,
  fetchForecast,
  createDocument as apiCreateDocument,
  createJournalEntry as apiCreateJournalEntry,
  lockPeriod as apiLockPeriod,
} from '@/lib/accounting/api/client';

const ACCOUNT_TYPE_LABELS: Record<AccountType, { ar: string; en: string }> = {
  ASSET: { ar: 'أصول', en: 'Assets' },
  LIABILITY: { ar: 'التزامات', en: 'Liabilities' },
  EQUITY: { ar: 'حقوق الملكية', en: 'Equity' },
  REVENUE: { ar: 'إيرادات', en: 'Revenue' },
  EXPENSE: { ar: 'مصروفات', en: 'Expenses' },
};

const DOC_TYPE_LABELS: Record<DocumentType, { ar: string; en: string }> = {
  INVOICE: { ar: 'فاتورة', en: 'Invoice' },
  RECEIPT: { ar: 'إيصال', en: 'Receipt' },
  QUOTE: { ar: 'عرض سعر', en: 'Quote' },
  DEPOSIT: { ar: 'عربون', en: 'Deposit' },
  PAYMENT: { ar: 'دفعة', en: 'Payment' },
  JOURNAL: { ar: 'قيد', en: 'Journal' },
  CREDIT_NOTE: { ar: 'إشعار دائن', en: 'Credit Note' },
  DEBIT_NOTE: { ar: 'إشعار مدين', en: 'Debit Note' },
  PURCHASE_INV: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
  PURCHASE_ORDER: { ar: 'أمر شراء', en: 'Purchase Order' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};

const REPORT_LABELS: Record<'trial' | 'income' | 'balance' | 'cashflow' | 'bankStatement' | 'propertyLedger', { ar: string; en: string }> = {
  trial: { ar: 'ميزان المراجعة', en: 'Trial Balance' },
  income: { ar: 'قائمة الدخل', en: 'Income Statement (P&L)' },
  balance: { ar: 'الميزانية العمومية', en: 'Balance Sheet' },
  cashflow: { ar: 'التدفق النقدي', en: 'Cash Flow' },
  bankStatement: { ar: 'كشف الحساب البنكي', en: 'Bank Statement' },
  propertyLedger: { ar: 'كشف العقار / المستأجر', en: 'Property / Tenant Ledger' },
};

/** المبيعات - وحدات منفصلة */
const SALES_MODULES = [
  { id: 'quotes', labelAr: 'عروض أسعار وفواتير مبدئية', labelEn: 'Quotes & Proforma Invoices', icon: 'documentText' as const },
  { id: 'invoices', labelAr: 'فواتير بيع', labelEn: 'Sales Invoices', icon: 'archive' as const },
  { id: 'receipts', labelAr: 'سندات العملاء', labelEn: 'Customer Receipts', icon: 'archive' as const },
  { id: 'scheduled', labelAr: 'فواتير مجدولة', labelEn: 'Scheduled Invoices', icon: 'calendar' as const },
  { id: 'credit-notes', labelAr: 'إشعارات دائنة', labelEn: 'Credit Notes', icon: 'documentText' as const },
  { id: 'cash-inv', labelAr: 'فواتير نقدية', labelEn: 'Cash Invoices', icon: 'archive' as const },
  { id: 'delivery', labelAr: 'إشعارات تسليم', labelEn: 'Delivery Notes', icon: 'documentText' as const },
  { id: 'api-inv', labelAr: 'فواتير بيع من ال API', labelEn: 'Sales Invoices from API', icon: 'cog' as const },
];

/** المشتريات - وحدات منفصلة */
const PURCHASES_MODULES = [
  { id: 'purch-inv', labelAr: 'فواتير مشتريات', labelEn: 'Purchase Invoices', icon: 'archive' as const },
  { id: 'supp-receipts', labelAr: 'سندات الموردين', labelEn: 'Supplier Receipts', icon: 'archive' as const },
  { id: 'cash-exp', labelAr: 'مصروفات نقدية', labelEn: 'Cash Expenses', icon: 'archive' as const },
  { id: 'debit-notes', labelAr: 'إشعارات مدينة', labelEn: 'Debit Notes', icon: 'documentText' as const },
  { id: 'po', labelAr: 'أوامر شراء', labelEn: 'Purchase Orders', icon: 'documentText' as const },
];

type TabId = 'dashboard' | 'sales' | 'purchases' | 'accounts' | 'journal' | 'documents' | 'reports' | 'claims' | 'cheques' | 'payments' | 'settings' | 'audit' | 'periods';

function BookingCancellationCompleteForm({ requestId, onComplete, ar }: { requestId: string; onComplete: () => void; ar: boolean }) {
  const [note, setNote] = useState('');
  const handleComplete = () => {
    const result = completeCancellationByAccountant(requestId, note.trim() || (ar ? 'تم استرداد/خصم المبلغ' : 'Amount refunded/deducted'));
    if (result) {
      setNote('');
      onComplete();
    }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={ar ? 'ملاحظة المحاسب (تُعرض في الحجز)' : 'Accountant note (shown on booking)'}
        className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#8B6F47]/20 focus:border-[#8B6F47]"
      />
      <button
        type="button"
        onClick={handleComplete}
        className="px-4 py-2 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors shrink-0"
      >
        {ar ? 'تمت العملية' : 'Done'}
      </button>
    </div>
  );
}

export default function AccountingSection() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const setTab = (tab: TabId, action?: string, report?: 'trial' | 'income' | 'balance' | 'cashflow' | 'bankStatement' | 'propertyLedger') => {
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
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);
  const [periods, setPeriods] = useState<Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; timestamp: string; action: string; entityType: string; entityId: string; reason?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterContactId, setFilterContactId] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterDocType, setFilterDocType] = useState<DocumentType | ''>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [receiptConfirmKey, setReceiptConfirmKey] = useState(0);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCheque, setShowAddCheque] = useState(false);
  const [printDocument, setPrintDocument] = useState<AccountingDocument | null>(null);
  const [reportView, setReportView] = useState<'trial' | 'income' | 'balance' | 'cashflow' | 'bankStatement' | 'propertyLedger'>('trial');
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
  const [sortAccounts, setSortAccounts] = useState<SortOption>('number');

  const useDb = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ACCOUNTING_USE_DB === 'true';
  const contacts = typeof window !== 'undefined' ? getAllContacts() : [];
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
    if (useDb) {
      try {
        const [accs, entries, docs, perds, audit] = await Promise.all([
          fetchAccounts(),
          fetchJournalEntries({ fromDate: filterFromDate || undefined, toDate: filterToDate || undefined }),
          fetchDocuments({ fromDate: filterFromDate || undefined, toDate: filterToDate || undefined }),
          fetchPeriods(),
          fetchAuditLog({ limit: 50 }),
        ]);
        setAccounts(accs);
        setJournalEntries(entries);
        setDocuments(docs);
        setPeriods(perds);
        setAuditLogs(audit);
      } catch {
        loadDataLocal();
      }
    } else {
      loadDataLocal();
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
    const report = searchParams?.get('report') as 'trial' | 'income' | 'balance' | 'cashflow' | 'bankStatement' | 'propertyLedger' | null;
    if (tab === 'reports' && report && ['trial', 'income', 'balance', 'cashflow', 'bankStatement', 'propertyLedger'].includes(report)) {
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
    loadData();
    if (!useDb && typeof window !== 'undefined') ensureDefaultPeriods();
    if (!useDb) {
      const onStorage = (e: StorageEvent) => {
        if (['bhd_chart_of_accounts', 'bhd_journal_entries', 'bhd_accounting_documents', 'bhd_fiscal_periods', 'bhd_audit_log'].includes(e.key || '')) loadDataLocal();
        if (e.key === 'bhd_property_bookings' || e.key === 'bhd_booking_cancellation_requests') setReceiptConfirmKey((k) => k + 1);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, [useDb, filterFromDate, filterToDate]);

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

  /** الحسابات مرتبة */
  const sortedAccounts = useMemo(() => {
    const list = [...accounts];
    list.sort((a, b) => {
      switch (sortAccounts) {
        case 'dateDesc':
        case 'dateAsc': return 0;
        case 'number': return (a.code || '').localeCompare(b.code || '');
        case 'property': return (a.nameAr || '').localeCompare(b.nameAr || '');
        case 'alphabetical': return (a.nameAr || a.nameEn || '').localeCompare(b.nameAr || b.nameEn || '');
        default: return 0;
      }
    });
    return list;
  }, [accounts, sortAccounts]);

  const reportFrom = filterFromDate || new Date().getFullYear() + '-01-01';
  const reportTo = filterToDate || new Date().toISOString().slice(0, 10);
  const reportAsOf = filterToDate || new Date().toISOString().slice(0, 10);

  const ledgerLines = selectedAccountId
    ? getAccountLedger(selectedAccountId, filterFromDate || undefined, filterToDate || undefined)
    : [];
  /** استخدام بيانات الـ state للتقارير لضمان انعكاس التحديثات فوراً (محلي و API) */
  const entriesForReports = journalEntries;
  const accountsForReports = accounts;

  const ledgerWithBalance = selectedAccountId
    ? getAccountLedgerWithBalance(selectedAccountId, filterFromDate || undefined, filterToDate || undefined, entriesForReports, accountsForReports)
    : [];

  const trialBalance = getTrialBalance(reportFrom, reportTo, entriesForReports, accountsForReports);
  const incomeStatement = getIncomeStatement(reportFrom, reportTo, entriesForReports, accountsForReports);
  const balanceSheet = getBalanceSheet(reportAsOf, entriesForReports, accountsForReports);
  const cashFlow = getCashFlowStatement(reportFrom, reportTo, entriesForReports, accountsForReports);

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

  const stats = {
    totalEntries: journalEntries.length,
    totalDocuments: documents.length,
    totalAssets: balanceSheet.totalAssets,
    totalLiabilities: balanceSheet.totalLiabilities,
    totalEquity: balanceSheet.totalEquity + balanceSheet.netIncome,
    totalRevenue: incomeStatement.revenue.total,
    totalExpenses: incomeStatement.expense.total,
    netIncome: incomeStatement.netIncome,
  };

  const anomalies = aiDetectAnomalies();

  const receivables = useMemo(() => {
    const invs = documents.filter((d) => d.type === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED');
    return invs.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents]);
  const chequesReceivable = useMemo(() => {
    const cheques = documents.filter((d) => d.type === 'RECEIPT' && d.paymentMethod === 'CHEQUE');
    return cheques.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents]);
  const totalClaims = receivables + chequesReceivable;
  const paymentsTotal = useMemo(() => {
    const pays = documents.filter((d) => d.type === 'PAYMENT' || d.type === 'RECEIPT');
    return pays.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents]);

  return (
    <div className="space-y-6">
        {/* الفلاتر - مدمجة وبسيطة */}
        <div className="rounded-xl bg-white border border-gray-200/80 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'بحث' : 'Search'}</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={ar ? 'رقم، وصف...' : 'Number, desc...'} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20" />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'من' : 'From'}</label>
              <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'إلى' : 'To'}</label>
              <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'العميل' : 'Contact'}</label>
              <select value={filterContactId} onChange={(e) => setFilterContactId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="">{ar ? 'الكل' : 'All'}</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>)}
              </select>
            </div>
            {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'cheques') && (
              <>
                {activeTab !== 'cheques' && (
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'الحساب البنكي' : 'Bank'}</label>
                  <select value={filterBankId} onChange={(e) => setFilterBankId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    <option value="CASH">{ar ? 'الصندوق' : 'Cash'}</option>
                    {bankAccounts.filter((b) => b.isActive).map((b) => (
                      <option key={b.id} value={b.id}>{getBankAccountDisplay(b)}</option>
                    ))}
                  </select>
                </div>
                )}
                <div className="w-44">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'العقار' : 'Property'}</label>
                  <select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    {mergedProperties.map((p) => (
                      <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                    ))}
                  </select>
                </div>
                {activeTab === 'cheques' && (
                <div className="w-44">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'المشروع' : 'Project'}</label>
                  <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="">{ar ? 'الكل' : 'All'}</option>
                    {projectsList.map((p) => <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>)}
                  </select>
                </div>
                )}
              </>
            )}
            {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'sales' || activeTab === 'purchases') && (
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-500 mb-1">{ar ? 'النوع' : 'Type'}</label>
                <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value as DocumentType | '')} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                  <option value="">{ar ? 'الكل' : 'All'}</option>
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => <option key={t} value={t}>{ar ? DOC_TYPE_LABELS[t].ar : DOC_TYPE_LABELS[t].en}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

      {activeTab === 'dashboard' && (
        <div className={`space-y-6 transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className={styles.statGrid}>
            <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'إجمالي الأصول' : 'Total Assets'}</p>
              <p className={styles.statCardValue}>{stats.totalAssets.toLocaleString()} ر.ع</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'إجمالي الالتزامات' : 'Liabilities'}</p>
              <p className={styles.statCardValue}>{stats.totalLiabilities.toLocaleString()} ر.ع</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'حقوق الملكية' : 'Equity'}</p>
              <p className={styles.statCardValue}>{stats.totalEquity.toLocaleString()} ر.ع</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'الإيرادات' : 'Revenue'}</p>
              <p className={`${styles.statCardValue} ${styles.statCardPositive}`}>{stats.totalRevenue.toLocaleString()} ر.ع</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'المصروفات' : 'Expenses'}</p>
              <p className={`${styles.statCardValue} ${styles.statCardNegative}`}>{stats.totalExpenses.toLocaleString()} ر.ع</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
              <p className={styles.statCardLabel}>{ar ? 'صافي الدخل' : 'Net Income'}</p>
              <p className={`${styles.statCardValue} ${stats.netIncome >= 0 ? styles.statCardPositive : styles.statCardNegative}`}>{stats.netIncome.toLocaleString()} ر.ع</p>
            </button>
          </div>
          {/* Revenue vs Expense bar */}
          {(stats.totalRevenue > 0 || stats.totalExpenses > 0) && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-gray-700">{ar ? 'الإيرادات vs المصروفات' : 'Revenue vs Expenses'}</p>
              <div className="flex gap-8 items-end h-20">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full max-w-32 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500 min-h-[8px]"
                    style={{ height: `${Math.max(8, (stats.totalRevenue / Math.max(stats.totalRevenue + stats.totalExpenses, 1)) * 72)}px` }}
                  />
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">{stats.totalRevenue.toLocaleString()} ر.ع</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full max-w-32 rounded-t-lg bg-gradient-to-t from-red-500 to-red-400 transition-all duration-500 min-h-[8px]"
                    style={{ height: `${Math.max(8, (stats.totalExpenses / Math.max(stats.totalRevenue + stats.totalExpenses, 1)) * 72)}px` }}
                  />
                  <span className="text-sm font-bold text-red-700 tabular-nums">{stats.totalExpenses.toLocaleString()} ر.ع</span>
                </div>
              </div>
              <div className="mt-4 flex gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {ar ? 'إيرادات' : 'Revenue'}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {ar ? 'مصروفات' : 'Expenses'}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button type="button" onClick={() => setTab('journal')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
              <p className="text-xs font-semibold text-gray-500">{ar ? 'عدد القيود' : 'Journal Entries'}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{stats.totalEntries}</p>
            </button>
            <button type="button" onClick={() => setTab('documents')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
              <p className="text-xs font-semibold text-gray-500">{ar ? 'المستندات' : 'Documents'}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{stats.totalDocuments}</p>
            </button>
            <button type="button" onClick={() => setTab('accounts')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
              <p className="text-xs font-semibold text-gray-500">{ar ? 'الحسابات' : 'Accounts'}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{accounts.length}</p>
            </button>
            <button type="button" onClick={() => setTab('reports', undefined, 'bankStatement')} className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
              <p className="text-xs font-semibold text-emerald-700">{ar ? 'كشف الحساب البنكي' : 'Bank Statement'}</p>
              <p className="mt-1 text-sm font-medium text-emerald-800">{ar ? 'عرض الإيداعات والسحوبات' : 'View deposits & withdrawals'}</p>
            </button>
            <button type="button" onClick={() => setTab('cheques')} className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
              <p className="text-xs font-semibold text-amber-700">{ar ? 'الشيكات' : 'Cheques'}</p>
              <p className="mt-1 text-2xl font-bold text-amber-800 tabular-nums">{documents.filter((d) => d.paymentMethod === 'CHEQUE').length}</p>
            </button>
            <div className="rounded-2xl border border-[#8B6F47]/30 bg-[#8B6F47]/5 p-5 shadow-sm">
              <p className="text-xs font-semibold text-[#8B6F47]">{ar ? 'معايير محاسبية عالمية' : 'Global Standards'}</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#6B5535]">{ar ? 'قيد مزدوج • ميزان مراجعة • قائمة دخل • ميزانية عمومية' : 'Double-entry • Trial Balance • P&L • Balance Sheet'}</p>
            </div>
          </div>
          {typeof window !== 'undefined' && (() => {
            const pendingReceipts = getBookingsPendingAccountantConfirmation();
            return pendingReceipts.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                <h5 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
                  <span className="text-xl">⚠️</span>
                  {ar ? 'تأكيد استلام مبالغ الحجز (الإيصال مُنشأ، غير مقيد)' : 'Confirm booking receipt (receipt created, unposted)'}
                </h5>
                <p className="text-sm text-amber-700 mb-4">
                  {ar ? 'الإيصال مُنشأ تلقائياً عند الحجز. تحقّق من استلام المبلغ واضغط للتأكيد — سيُقيد الإيصال في الحسابات بنفس التاريخ والمرجع.' : 'Receipt was created at booking. Verify amount received and click to confirm — it will be posted with same date and reference.'}
                </p>
                <ul className="space-y-3">
                  {pendingReceipts.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-200/80">
                      <div>
                        <p className="font-semibold text-gray-900">{getBookingDisplayName(b, locale)}</p>
                        <p className="text-sm text-gray-600">{b.propertyTitleAr || b.propertyTitleEn} • {(b.priceAtBooking ?? 0).toLocaleString()} ر.ع</p>
                        {b.paymentMethod && (
                          <p className="text-xs text-gray-500">
                            {b.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : b.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل' : 'Transfer') : (ar ? 'شيك' : 'Cheque')}
                            {b.paymentReferenceNo && ` • ${b.paymentReferenceNo}`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          confirmBookingReceiptByAccountant(b.id);
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          const link = getDocumentUploadLink(origin, locale, b.propertyId, b.id, b.email);
                          const msg = getDocumentLinkMessage(link, ar);
                          if (b.phone) openWhatsAppWithMessage(b.phone, msg);
                          if (b.email) openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link - Contract documentation', msg);
                          setReceiptConfirmKey((k) => k + 1);
                          loadData();
                        }}
                        className="px-4 py-2 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors shrink-0"
                      >
                        {ar ? 'تأكيد الاستلام وتقيد الطلب' : 'Confirm receipt & post'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          {typeof window !== 'undefined' && (() => {
            const pendingCancellations = getBookingsPendingCancellation();
            return pendingCancellations.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm">
                <h5 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
                  <span className="text-xl">↩️</span>
                  {ar ? 'طلبات إلغاء الحجوزات (استرداد/خصم)' : 'Booking cancellation requests (refund/deduction)'}
                </h5>
                <p className="text-sm text-red-700 mb-4">
                  {ar ? '1) ألغِ الإيصال/السند المرتبط بالحجز إن وجد. 2) استرد أو اخصم المبلغ للعميل. 3) أدخل الملاحظة واضغط تمت العملية لإلغاء الحجز وإظهار الملاحظة في النظام.' : '1) Cancel the linked receipt/document if any. 2) Refund/deduct amount to customer. 3) Enter note and click Done to cancel booking and show note in system.'}
                </p>
                <ul className="space-y-4">
                  {pendingCancellations.map(({ id, bookingId, amountToRefund, booking }) => {
                    const linkedDocs = typeof window !== 'undefined' ? searchDocuments({ bookingId }) : [];
                    return (
                    <li key={id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white rounded-xl border border-red-200/80">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{getBookingDisplayName(booking, locale)}</p>
                        <p className="text-sm text-gray-600">{booking.propertyTitleAr || booking.propertyTitleEn} • {(amountToRefund).toLocaleString()} ر.ع {ar ? 'للاسترداد/الخصم' : 'to refund/deduct'}</p>
                        {booking.paymentMethod && (
                          <p className="text-xs text-gray-500">
                            {booking.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : booking.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل' : 'Transfer') : (ar ? 'شيك' : 'Cheque')}
                            {booking.paymentReferenceNo && ` • ${booking.paymentReferenceNo}`}
                          </p>
                        )}
                        {linkedDocs.filter((d) => d.status !== 'CANCELLED').length > 0 && (
                          <p className="text-xs text-amber-700 mt-1">
                            {ar ? 'إلغِ الإيصال أولاً:' : 'Cancel receipt first:'}{' '}
                            <button type="button" onClick={() => setTab('documents')} className="underline font-medium">
                              {linkedDocs.filter((d) => d.status !== 'CANCELLED').map((d) => d.serialNumber).join(', ')}
                            </button>
                          </p>
                        )}
                      </div>
                      <BookingCancellationCompleteForm
                        requestId={id}
                        onComplete={() => {
                          setReceiptConfirmKey((k) => k + 1);
                          loadData();
                        }}
                        ar={ar}
                      />
                    </li>
                  );
                  })}
                </ul>
              </div>
            );
          })()}
          {anomalies.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm">
              <h5 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
                <Icon name="sparkles" className="h-5 w-5" />
                {ar ? 'تنبيهات الذكاء الاصطناعي' : 'AI Alerts'}
              </h5>
              <ul className="space-y-2 text-sm text-red-700">
                {anomalies.map((a) => (
                  <li key={a.accountId} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <span><strong>{a.accountCode}</strong> — {a.accountNameAr}: {a.message} ({a.balance.toLocaleString()} ر.ع)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 shadow-sm">
            <p className="flex items-start gap-3 text-sm leading-relaxed text-amber-900">
              <Icon name="information" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <span>{ar ? 'النظام مرتبط بـ: دفتر العناوين، التفاصيل البنكية، العقارات، المشاريع. قيد مزدوج • ميزان مراجعة • قائمة دخل • ميزانية عمومية • اقتراح ذكي للحسابات.' : 'System linked to: Address Book, Bank Details, Properties, Projects. Double-entry • Trial Balance • P&L • Balance Sheet • AI account suggestions.'}</span>
            </p>
          </div>
        </div>
      )}

      {/* المبيعات - وحدات منظمة */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon name="archive" className="h-5 w-5 text-emerald-600" />
                {ar ? 'المبيعات' : 'Sales'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{ar ? 'عروض أسعار، فواتير بيع، سندات عملاء، إشعارات دائنة' : 'Quotes, sales invoices, customer receipts, credit notes'}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {SALES_MODULES.map((m) => {
                  const docType = m.id === 'invoices' ? 'INVOICE' : m.id === 'receipts' ? 'RECEIPT' : m.id === 'quotes' ? 'QUOTE' : null;
                  const canOpen = docType && (m.id === 'invoices' || m.id === 'receipts' || m.id === 'quotes');
                  return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={canOpen ? () => {
                      const today = new Date().toISOString().slice(0, 10);
                      const t = docType as DocumentType;
                      setDocForm({
                        ...docForm,
                        type: t,
                        serialNumber: getNextDocumentSerial(t),
                        date: today,
                        dueDate: today,
                        useLineItems: true,
                        items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }],
                      });
                      setShowAddDocument(true);
                      setTab('documents');
                    } : undefined}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-right group ${canOpen ? 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 cursor-pointer transition-all' : 'border-gray-100 bg-gray-50/50 cursor-default'}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200">
                      <Icon name={m.icon} className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-gray-900">{ar ? m.labelAr : m.labelEn}</span>
                    {canOpen ? <span className="text-xs text-emerald-600">✓ {ar ? 'متاح' : 'Available'}</span> : <span className="text-xs text-amber-600">{ar ? 'قريباً' : 'Coming soon'}</span>}
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* المشتريات - وحدات منظمة */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon name="archive" className="h-5 w-5 text-blue-600" />
                {ar ? 'المشتريات' : 'Purchases'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{ar ? 'فواتير مشتريات، سندات موردين، مصروفات، إشعارات مدينة، أوامر شراء' : 'Purchase invoices, supplier receipts, expenses, debit notes, purchase orders'}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {PURCHASES_MODULES.map((m) => {
                  const purchDocType = m.id === 'purch-inv' ? 'PURCHASE_INV' : m.id === 'po' ? 'PURCHASE_ORDER' : null;
                  const canOpen = purchDocType !== null;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={canOpen ? () => {
                        const today = new Date().toISOString().slice(0, 10);
                        const t = purchDocType as DocumentType;
                        setDocForm({
                          type: t,
                          serialNumber: getNextDocumentSerial(t),
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
                          useLineItems: true,
                          vatRate: 0,
                          purchaseOrder: '',
                          reference: '',
                          branch: '',
                          attachments: [],
                          items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }],
                        });
                        setShowAddDocument(true);
                        setTab('documents');
                      } : undefined}
                      className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-right group ${canOpen ? 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all' : 'border-gray-100 bg-gray-50/50 cursor-default'}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200">
                        <Icon name={m.icon} className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-gray-900">{ar ? m.labelAr : m.labelEn}</span>
                      {canOpen ? <span className="text-xs text-blue-600">✓ {ar ? 'متاح' : 'Available'}</span> : <span className="text-xs text-amber-600">{ar ? 'قريباً' : 'Coming soon'}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h4 className="flex items-center gap-2 font-bold text-gray-900">
              <Icon name="archive" className="h-5 w-5 text-[#8B6F47]" />
              {ar ? 'دليل الحسابات' : 'Chart of Accounts'}
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <SortSelect value={sortAccounts} onChange={setSortAccounts} ar={ar} />
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  setAccountForm({ code: '', nameAr: '', nameEn: '', type: 'EXPENSE' });
                  setShowAddAccount(true);
                }}
              >
                <Icon name="plus" className="h-4 w-4" />
                {ar ? 'إضافة حساب' : 'Add account'}
              </button>
              <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value || null)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20"
            >
              <option value="">{ar ? '— عرض كشف حساب —' : '— View ledger —'}</option>
              {sortedAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}</option>
              ))}
            </select>
            </div>
          </div>
          {selectedAccountId ? (
            <div className="p-6">
              <h5 className="font-semibold text-gray-900 mb-4">
                {(() => {
                  const acc = getAccountById(selectedAccountId);
                  return acc ? `${acc.code} - ${ar ? acc.nameAr : acc.nameEn || acc.nameAr}` : '';
                })()}
              </h5>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{ar ? 'التاريخ' : 'Date'}</th>
                      <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                      <th>{ar ? 'الوصف' : 'Description'}</th>
                      <th>{ar ? 'مدين' : 'Debit'}</th>
                      <th>{ar ? 'دائن' : 'Credit'}</th>
                      <th>{ar ? 'الرصيد الجاري' : 'Running Balance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerWithBalance.map(({ entry, debit, credit, runningBalance }, i) => (
                      <tr key={`${entry.id}-${i}`}>
                        <td>{new Date(entry.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                        <td className="font-mono text-sm">{entry.serialNumber}</td>
                        <td>{ar ? entry.descriptionAr : entry.descriptionEn || entry.descriptionAr || '—'}</td>
                        <td>{debit > 0 ? debit.toLocaleString() : '—'}</td>
                        <td>{credit > 0 ? credit.toLocaleString() : '—'}</td>
                        <td className="font-semibold">{runningBalance.toLocaleString()} ر.ع</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledgerWithBalance.length === 0 && (
                <p className="text-center text-gray-500 py-8">{ar ? 'لا توجد حركات' : 'No transactions'}</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{ar ? 'الرمز' : 'Code'}</th>
                    <th>{ar ? 'اسم الحساب' : 'Account'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الرصيد' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAccounts.map((a) => {
                    const bal = getAccountBalance(a.id);
                    return (
                      <tr key={a.id}>
                        <td className="font-mono">{a.code}</td>
                        <td className="font-semibold">{ar ? a.nameAr : a.nameEn || a.nameAr}</td>
                        <td><span className="admin-badge">{ar ? ACCOUNT_TYPE_LABELS[a.type].ar : ACCOUNT_TYPE_LABELS[a.type].en}</span></td>
                        <td className={bal.balance >= 0 ? 'text-emerald-700' : 'text-red-600'}>{bal.balance.toLocaleString()} ر.ع</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h4 className="flex items-center gap-2 font-bold text-gray-900">
              <Icon name="documentText" className="h-5 w-5 text-[#8B6F47]" />
              {ar ? 'قيود اليومية' : 'Journal Entries'}
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              <SortSelect value={sortJournal} onChange={setSortJournal} ar={ar} />
              <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B6F47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6B5535] hover:shadow-md"
              onClick={() => {
                setJournalForm({
                  date: new Date().toISOString().slice(0, 10),
                  descriptionAr: '',
                  descriptionEn: '',
                  lines: [{ accountId: '', debit: '', credit: '', desc: '' }],
                });
                setShowAddJournal(true);
              }}
            >
              <Icon name="plus" className="h-4 w-4" />
              {ar ? 'قيد يومية يدوي' : 'Add journal entry'}
            </button>
            </div>
          </div>
          {sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <Icon name="documentText" className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">{ar ? 'لا توجد قيود' : 'No journal entries'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                    <th>{ar ? 'الوصف' : 'Description'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'الرابط' : 'Link'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e) => (
                    <tr key={e.id}>
                      <td>{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                      <td className="font-mono text-sm">{e.serialNumber}</td>
                      <td>{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr || '—'}</td>
                      <td>{e.documentType ? (ar ? DOC_TYPE_LABELS[e.documentType].ar : DOC_TYPE_LABELS[e.documentType].en) : '—'}</td>
                      <td>{e.totalDebit.toLocaleString()} ر.ع</td>
                      <td className="text-xs">
                        {e.contactId && <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800">{ar ? 'عميل' : 'Contact'}</span>}
                        {e.bankAccountId && <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{ar ? 'بنك' : 'Bank'}</span>}
                        {e.propertyId && <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800">{ar ? 'عقار' : 'Property'}</span>}
                        {e.projectId && <span className="inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-800">{ar ? 'مشروع' : 'Project'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <AccountingFilter
            fields={[
              { key: 'search', labelAr: 'بحث', labelEn: 'Search', type: 'text', placeholderAr: 'رقم، وصف...', placeholderEn: 'Number, description...' },
              { key: 'type', labelAr: 'نوع المستند', labelEn: 'Document type', type: 'select', options: Object.entries(DOC_TYPE_LABELS).map(([k, v]) => ({ value: k, labelAr: v.ar, labelEn: v.en })) },
              { key: 'date', labelAr: 'الفترة', labelEn: 'Period', type: 'daterange' },
              { key: 'contact', labelAr: 'العميل/المورد', labelEn: 'Contact', type: 'select', options: contacts.slice(0, 50).map((c) => ({ value: c.id, labelAr: `${c.firstName} ${c.familyName}`, labelEn: c.nameEn || `${c.firstName} ${c.familyName}` })) },
            ]}
            values={{
              search: searchQuery,
              type: filterDocType,
              dateFrom: filterFromDate,
              dateTo: filterToDate,
              contact: filterContactId,
            }}
            onChange={(k, v) => {
              if (k === 'search') setSearchQuery(v);
              else if (k === 'type') setFilterDocType(v as DocumentType | '');
              else if (k === 'dateFrom') setFilterFromDate(v);
              else if (k === 'dateTo') setFilterToDate(v);
              else if (k === 'contact') setFilterContactId(v);
            }}
            onReset={() => {
              setSearchQuery('');
              setFilterDocType('');
              setFilterFromDate('');
              setFilterToDate('');
              setFilterContactId('');
            }}
            ar={ar}
            resultCount={sortedDocs.length}
          />
          <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <h4 className="font-bold text-gray-900">{ar ? 'الفواتير والإيصالات وعروض الأسعار' : 'Invoices, Receipts & Quotes'}</h4>
            <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
            <button
              type="button"
              className="text-sm font-semibold text-[#8B6F47] hover:underline"
              onClick={() => {
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
            >
              {ar ? '➕ إضافة مستند' : '➕ Add document'}
            </button>
          </div>
          {sortedDocs.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-gray-500 font-medium">{ar ? 'لا توجد مستندات' : 'No documents'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'الرقم' : 'Number'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'العميل' : 'Contact'}</th>
                    <th>{ar ? 'الحساب البنكي' : 'Bank'}</th>
                    <th>{ar ? 'العقار' : 'Property'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                    <th>{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDocs.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                      <td className="font-mono text-sm">{d.serialNumber}</td>
                      <td>{ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en}</td>
                      <td>
                        {d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}
                      </td>
                      <td className="text-sm">
                        {d.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : d.bankAccountId; })() : (ar ? 'صندوق' : 'Cash')}
                      </td>
                      <td className="text-sm align-top">
                        {d.propertyId ? (() => {
                          const p = getPropertyById(d.propertyId);
                          return p ? <span className="whitespace-pre-line block text-left">{getPropertyDisplay(p)}</span> : d.propertyId;
                        })() : '—'}
                      </td>
                      <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                      <td>
                        <span className="admin-badge">{d.status}</span>
                        {(d.status === 'APPROVED' || d.status === 'PAID') && !d.journalEntryId && (
                          <span className="mr-1 inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800" title={ar ? 'لم يُرحّل بعد' : 'Not posted yet'}>
                            {ar ? 'غير مرحّل' : 'unposted'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setPrintDocument(d)}
                          className="text-sm text-[#8B6F47] hover:underline"
                        >
                          📄 {ar ? 'عرض / طباعة / تنزيل' : 'View / Print / Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
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
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).filter((t) => ['INVOICE', 'RECEIPT', 'QUOTE', 'DEPOSIT', 'PAYMENT', 'PURCHASE_INV', 'PURCHASE_ORDER'].includes(t)).map((t) => (
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
                  <input type="date" value={docForm.date} onChange={(e) => setDocForm({ ...docForm, date: e.target.value })} className="admin-input w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'تاريخ الاستحقاق *' : 'Due date *'}</label>
                  <input type="date" value={docForm.dueDate} onChange={(e) => setDocForm({ ...docForm, dueDate: e.target.value })} className="admin-input w-full" />
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
                    <button type="button" onClick={() => setDocForm({ ...docForm, items: [...docForm.items, { descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm text-[#8B6F47] hover:underline font-semibold">{ar ? 'أضف بند' : 'Add line'}</button>
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
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] hover:underline truncate max-w-[120px]">{att.name}</a>
                      <button type="button" onClick={() => setDocForm({ ...docForm, attachments: docForm.attachments.filter((_, j) => j !== i) })} className="text-red-600">✕</button>
                    </span>
                  ))}
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#8B6F47] cursor-pointer text-sm font-medium text-gray-600">
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
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">{ar ? 'إضافة' : 'Add'}</button>
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
                  <input type="date" value={chequeForm.dueDate} onChange={(e) => setChequeForm({ ...chequeForm, dueDate: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'اسم البنك' : 'Bank Name'}</label>
                  <input type="text" value={chequeForm.bankName} onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })} className="admin-input w-full" placeholder={ar ? 'البنك' : 'Bank'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                  <input type="date" value={chequeForm.date} onChange={(e) => setChequeForm({ ...chequeForm, date: e.target.value })} className="admin-input w-full" required />
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
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">{ar ? 'إضافة شيك' : 'Add Cheque'}</button>
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
                  <input type="date" value={journalForm.date} onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })} className="admin-input w-full" required />
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
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">{ar ? 'بنود القيد' : 'Entry lines'}</label>
                  <button
                    type="button"
                    onClick={() => setJournalForm({ ...journalForm, lines: [...journalForm.lines, { accountId: '', debit: '', credit: '', desc: '' }] })}
                    className="text-xs font-semibold text-[#8B6F47] hover:underline"
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
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">{ar ? 'إضافة القيد' : 'Add entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(['trial', 'income', 'balance', 'cashflow', 'bankStatement', 'propertyLedger'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReportView(r)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportView === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {ar ? REPORT_LABELS[r].ar : REPORT_LABELS[r].en}
              </button>
            ))}
          </div>
          <div className="admin-card overflow-hidden print:shadow-none" id="accounting-report-print">
            {(() => {
              const company = typeof window !== 'undefined' ? getCompanyData() : null;
              const reportTpl = typeof window !== 'undefined' ? getDefaultTemplate('report') : getDefaultTemplate('invoice');
              const tpl = reportTpl || (typeof window !== 'undefined' ? getDefaultTemplate('invoice') : null);
              const logoSize = tpl?.logoSize ?? LOGO_SIZE_DEFAULT;
              const titleColor = tpl?.titleColor ?? '#354058';
              const bilingual = !!tpl?.bilingual;
              const headerCentered = (tpl?.headerLayout || 'left') === 'centered';
              return company ? (
                <div className="px-6 pt-6 pb-2 border-b-2 print:block" style={{ borderColor: titleColor }}>
                  {headerCentered && bilingual ? (
                    <div className="flex justify-between items-start gap-4">
                      {ar ? (
                        <>
                          <div className="flex-1 text-right min-w-0" dir="rtl">
                            <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameAr}</h2>
                            <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
                          </div>
                          {company.logoUrl && (
                            <div className="shrink-0 overflow-hidden mx-2" style={{ width: logoSize, height: logoSize }}>
                              <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <div className="flex-1 text-left min-w-0">
                            <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameEn}</h2>
                            <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 text-left min-w-0">
                            <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameEn}</h2>
                            <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
                          </div>
                          {company.logoUrl && (
                            <div className="shrink-0 overflow-hidden mx-2" style={{ width: logoSize, height: logoSize }}>
                              <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <div className="flex-1 text-right min-w-0" dir="rtl">
                            <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameAr}</h2>
                            <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {company.logoUrl && (
                        <div className="shrink-0 overflow-hidden" style={{ width: logoSize, height: logoSize }}>
                          <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h2 className="font-bold text-lg" style={{ color: titleColor }}>{ar ? company.nameAr : company.nameEn}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{ar ? company.addressAr : company.addressEn}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null;
            })()}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 print:block">
              <h4 className="font-bold text-gray-900">
                {ar ? REPORT_LABELS[reportView].ar : REPORT_LABELS[reportView].en}
                <span className="text-sm font-normal text-gray-500 mr-2">
                  ({reportFrom} {ar ? 'إلى' : 'to'} {reportTo})
                </span>
              </h4>
              <div className="print:hidden">
                <ReportExportButtons
                  reportView={reportView}
                  reportFrom={reportFrom}
                  reportTo={reportTo}
                  trialBalance={trialBalance}
                  incomeStatement={incomeStatement}
                  balanceSheet={balanceSheet}
                  cashFlow={cashFlow}
                  ar={ar}
                />
              </div>
            </div>
            <div className="p-6">
              {reportView === 'trial' && (
                <div className="overflow-x-auto">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>{ar ? 'الرمز' : 'Code'}</th>
                        <th>{ar ? 'الاسم' : 'Account'}</th>
                        <th>{ar ? 'مدين' : 'Debit'}</th>
                        <th>{ar ? 'دائن' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.map((row) => (
                        <tr key={row.accountId}>
                          <td className="font-mono">{row.accountCode}</td>
                          <td>{ar ? row.accountNameAr : row.accountNameEn}</td>
                          <td>{row.debit > 0 ? row.debit.toLocaleString() : '—'}</td>
                          <td>{row.credit > 0 ? row.credit.toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td colSpan={2}>{ar ? 'الإجمالي' : 'Total'}</td>
                        <td>{trialBalance.reduce((s, r) => s + r.debit, 0).toLocaleString()}</td>
                        <td>{trialBalance.reduce((s, r) => s + r.credit, 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {reportView === 'income' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h5 className="font-semibold text-emerald-700 mb-2">{ar ? 'الإيرادات' : 'Revenue'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {incomeStatement.revenue.items.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-emerald-50">
                          <td colSpan={2}>{ar ? 'إجمالي الإيرادات' : 'Total Revenue'}</td>
                          <td className="text-right">{incomeStatement.revenue.total.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-red-700 mb-2">{ar ? 'المصروفات' : 'Expenses'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {incomeStatement.expense.items.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-red-50">
                          <td colSpan={2}>{ar ? 'إجمالي المصروفات' : 'Total Expenses'}</td>
                          <td className="text-right">{incomeStatement.expense.total.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="pt-4 border-t-2 border-gray-200">
                    <p className={`text-xl font-bold ${incomeStatement.netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {ar ? 'صافي الدخل' : 'Net Income'}: {incomeStatement.netIncome.toLocaleString()} ر.ع
                    </p>
                  </div>
                </div>
              )}
              {reportView === 'balance' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h5 className="font-semibold text-blue-700 mb-2">{ar ? 'الأصول' : 'Assets'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.assets.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-blue-50">
                          <td colSpan={2}>{ar ? 'إجمالي الأصول' : 'Total Assets'}</td>
                          <td className="text-right">{balanceSheet.totalAssets.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-amber-700 mb-2">{ar ? 'الالتزامات' : 'Liabilities'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.liabilities.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-amber-50">
                          <td colSpan={2}>{ar ? 'إجمالي الالتزامات' : 'Total Liabilities'}</td>
                          <td className="text-right">{balanceSheet.totalLiabilities.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-violet-700 mb-2">{ar ? 'حقوق الملكية' : 'Equity'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.equity.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                        {Math.abs(balanceSheet.netIncome) > 0.001 && (
                          <tr>
                            <td className="font-mono text-sm">3100</td>
                            <td>{ar ? 'صافي الدخل (أرباح محتجزة)' : 'Net Income (Retained Earnings)'}</td>
                            <td className="text-right font-semibold">{balanceSheet.netIncome.toLocaleString()} ر.ع</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-violet-50">
                          <td colSpan={2}>{ar ? 'إجمالي حقوق الملكية' : 'Total Equity'}</td>
                          <td className="text-right">{(balanceSheet.totalEquity + balanceSheet.netIncome).toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              {reportView === 'cashflow' && (
                <div className="max-w-md space-y-4">
                  <div className="p-4 rounded-xl bg-gray-50 border">
                    <p className="text-sm text-gray-500">{ar ? 'التشغيل (صافي الدخل)' : 'Operating (Net Income)'}</p>
                    <p className="text-xl font-bold">{cashFlow.operating.toLocaleString()} ر.ع</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border">
                    <p className="text-sm text-gray-500">{ar ? 'التدفق الصافي' : 'Net Cash Change'}</p>
                    <p className={`text-xl font-bold ${cashFlow.netChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{cashFlow.netChange.toLocaleString()} ر.ع</p>
                  </div>
                </div>
              )}
              {reportView === 'bankStatement' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="text-sm font-semibold text-gray-700">{ar ? 'الحساب البنكي' : 'Bank Account'}</label>
                    <select
                      value={selectedBankAccountId}
                      onChange={(e) => setSelectedBankAccountId(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium min-w-[220px]"
                    >
                      <option value="">{ar ? '— اختر الحساب —' : '— Select account —'}</option>
                      <option value="CASH">{ar ? 'الصندوق (نقداً)' : 'Cash'}</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{ar ? b.nameAr : (b.nameEn || b.nameAr)} — {b.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                  {selectedBankAccountId && (() => {
                    const ledger = getBankAccountLedger(selectedBankAccountId, reportFrom, reportTo, entriesForReports);
                    const bal = getBankAccountBalance(selectedBankAccountId, reportTo, entriesForReports);
                    const accLabel = selectedBankAccountId === 'CASH' ? (ar ? 'الصندوق' : 'Cash') : (() => { const b = bankAccounts.find((x) => x.id === selectedBankAccountId); return b ? getBankAccountDisplay(b) : ''; })();
                    return (
                      <>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-sm text-emerald-700 font-semibold">{ar ? `رصيد ${accLabel}` : `Balance ${accLabel}`}</p>
                          <p className="text-2xl font-bold text-emerald-800">{bal.balance.toLocaleString()} ر.ع</p>
                          <p className="text-xs text-emerald-600 mt-1">{ar ? `مدين: ${bal.debit.toLocaleString()} • دائن: ${bal.credit.toLocaleString()}` : `Debit: ${bal.debit.toLocaleString()} • Credit: ${bal.credit.toLocaleString()}`}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="admin-table w-full">
                            <thead>
                              <tr>
                                <th>{ar ? 'التاريخ' : 'Date'}</th>
                                <th>{ar ? 'الوصف' : 'Description'}</th>
                                <th>{ar ? 'العميل / العقار' : 'Contact / Property'}</th>
                                <th>{ar ? 'مدين' : 'Debit'}</th>
                                <th>{ar ? 'دائن' : 'Credit'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.map(({ entry, debit, credit }, i) => (
                                <tr key={`${entry.id}-${i}`}>
                                  <td>{new Date(entry.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                                  <td>{ar ? entry.descriptionAr : entry.descriptionEn || entry.descriptionAr}</td>
                                  <td>
                                    {entry.contactId ? getContactDisplayFull(contacts.find((c) => c.id === entry.contactId)!, locale) : '—'}
                                    {entry.propertyId && (() => {
                                      const prop = mergedProperties.find((p: { id?: number }) => p.id === entry.propertyId);
                                      return (
                                        <span className="text-gray-500 text-sm block whitespace-pre-line">
                                          {prop ? getPropertyDisplay(prop) : entry.propertyId}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td>{debit > 0 ? debit.toLocaleString() : '—'}</td>
                                  <td>{credit > 0 ? credit.toLocaleString() : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold bg-gray-50">
                                <td colSpan={3}>{ar ? 'الإجمالي' : 'Total'}</td>
                                <td>{ledger.reduce((s, l) => s + l.debit, 0).toLocaleString()}</td>
                                <td>{ledger.reduce((s, l) => s + l.credit, 0).toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {ledger.length === 0 && (
                          <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد حركات في الفترة المحددة' : 'No transactions in the selected period'}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {reportView === 'propertyLedger' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'العقار' : 'Property'}</label>
                      <select value={reportPropertyId} onChange={(e) => setReportPropertyId(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-w-[200px]">
                        <option value="">{ar ? '— الكل —' : '— All —'}</option>
                        {mergedProperties.map((p) => (
                          <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'العميل / المستأجر' : 'Contact / Tenant'}</label>
                      <select value={reportContactId} onChange={(e) => setReportContactId(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-w-[220px]">
                        <option value="">{ar ? '— الكل —' : '— All —'}</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(reportPropertyId || reportContactId) && (() => {
                    const ledgerEntries = getPropertyOrContactLedger(
                      {
                        propertyId: reportPropertyId ? parseInt(reportPropertyId, 10) : undefined,
                        contactId: reportContactId || undefined,
                      },
                      reportFrom,
                      reportTo,
                      entriesForReports
                    );
                    const totalDebit = ledgerEntries.reduce((s, e) => s + e.totalDebit, 0);
                    const totalCredit = ledgerEntries.reduce((s, e) => s + e.totalCredit, 0);
                    return (
                      <>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                          <p className="text-sm text-amber-800 font-semibold">{ar ? 'إجمالي القيود' : 'Total entries'}</p>
                          <p className="text-xl font-bold text-amber-900">{ledgerEntries.length} {ar ? 'قيد' : 'entries'}</p>
                          <p className="text-xs text-amber-700 mt-1">{ar ? `مدين: ${totalDebit.toLocaleString()} ر.ع • دائن: ${totalCredit.toLocaleString()} ر.ع` : `Debit: ${totalDebit.toLocaleString()} • Credit: ${totalCredit.toLocaleString()}`}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="admin-table w-full">
                            <thead>
                              <tr>
                                <th>{ar ? 'التاريخ' : 'Date'}</th>
                                <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                                <th>{ar ? 'الوصف' : 'Description'}</th>
                                <th>{ar ? 'النوع' : 'Type'}</th>
                                <th>{ar ? 'مدين' : 'Debit'}</th>
                                <th>{ar ? 'دائن' : 'Credit'}</th>
                                <th>{ar ? 'الحساب البنكي' : 'Bank'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledgerEntries.map((e) => (
                                <tr key={e.id}>
                                  <td>{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                                  <td className="font-mono text-sm">{e.serialNumber}</td>
                                  <td>{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr}</td>
                                  <td>{e.documentType ? (ar ? DOC_TYPE_LABELS[e.documentType].ar : DOC_TYPE_LABELS[e.documentType].en) : '—'}</td>
                                  <td>{e.totalDebit > 0 ? e.totalDebit.toLocaleString() : '—'}</td>
                                  <td>{e.totalCredit > 0 ? e.totalCredit.toLocaleString() : '—'}</td>
                                  <td className="text-sm">
                                    {e.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === e.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'بنك' : 'Bank'); })() : (ar ? 'صندوق' : 'Cash')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold bg-gray-50">
                                <td colSpan={4}>{ar ? 'الإجمالي' : 'Total'}</td>
                                <td>{totalDebit.toLocaleString()}</td>
                                <td>{totalCredit.toLocaleString()}</td>
                                <td />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        {ledgerEntries.length === 0 && (
                          <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد قيود للعقار/العميل المحدد في الفترة' : 'No entries for the selected property/contact in the period'}</p>
                        )}
                      </>
                    );
                  })()}
                  {!reportPropertyId && !reportContactId && (
                    <p className="text-gray-500 py-8 text-center">{ar ? 'اختر عقاراً أو عميلاً لعرض القيود المرتبطة به' : 'Select a property or contact to view related entries'}</p>
                  )}
                </div>
              )}
            </div>
            {(() => {
              const company = typeof window !== 'undefined' ? getCompanyData() : null;
              if (!company) return null;
              const details = [company.nameAr && company.nameEn && `${company.nameAr} | ${company.nameEn}`, company.addressAr || company.addressEn, company.phone, company.email, company.crNumber && (ar ? `سجل: ${company.crNumber}` : `CR: ${company.crNumber}`), company.vatNumber && (ar ? `ضريبة: ${company.vatNumber}` : `VAT: ${company.vatNumber}`)].filter(Boolean);
              return (
                <div className="px-6 py-4 mt-6 border-t border-gray-200 text-center text-xs text-gray-600">
                  <p>{details.join(' · ')}</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* المطالبات: ذمم مدينة + شيكات تحت التحصيل */}
      {activeTab === 'claims' && (() => {
        const rawClaims = documents.filter((d) => (d.type === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED') || (d.type === 'RECEIPT' && d.paymentMethod === 'CHEQUE'));
        const getContactName = (d: AccountingDocument) => (d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '');
        const getPropDisplay = (d: AccountingDocument) => { const p = d.propertyId ? getPropertyById(d.propertyId) : null; return p ? getPropertyDisplay(p) : ''; };
        const claimsList = [...rawClaims].sort((a, b) => {
          switch (sortDocuments) {
            case 'dateDesc': return b.date.localeCompare(a.date);
            case 'dateAsc': return a.date.localeCompare(b.date);
            case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
            case 'property': return getPropDisplay(a).localeCompare(getPropDisplay(b));
            case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
            default: return 0;
          }
        });
        const claimsTableData = claimsList.map((d) => ({
          type: d.type === 'RECEIPT' ? (ar ? 'شيك' : 'Cheque') : (ar ? 'فاتورة' : 'Invoice'),
          number: d.serialNumber,
          contact: d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—',
          date: new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
          amount: `${d.totalAmount.toLocaleString()} ر.ع`,
          status: d.type === 'RECEIPT' ? (ar ? 'شيك آجل' : 'Post-dated') : d.status,
        }));
        return (
        <div className={styles.featureSection}>
          <div className={`${styles.featureSectionHeader} flex-wrap`}>
            <div className={styles.featureSectionIcon}><Icon name="inbox" className="h-5 w-5" /></div>
            <h4 className={styles.featureSectionTitle}>{ar ? 'المطالبات (ذمم مدينة + شيكات)' : 'Receivables & Cheques'}</h4>
            <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
            <div className={ar ? 'mr-auto' : 'ml-auto'}>
            <ClaimsPaymentsExportButtons
              tableData={claimsTableData}
              headers={[
                { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
                { key: 'number', labelAr: 'الرقم', labelEn: 'Number' },
                { key: 'contact', labelAr: 'العميل', labelEn: 'Contact' },
                { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
                { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
                { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
              ]}
              printAreaId="claims-export-area"
              filename={ar ? 'المطالبات' : 'Claims'}
              ar={ar}
            />
            </div>
          </div>
          <div className={styles.featureSectionBody}>
            <div className="mb-6 flex flex-wrap gap-6">
              <div>
                <p className={styles.statCardLabel}>{ar ? 'إجمالي المطالبات' : 'Total Claims'}</p>
                <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>{totalClaims.toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{ar ? 'ذمم مدينة (فواتير)' : 'Receivables (invoices)'}</p>
                <p className="font-semibold">{receivables.toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{ar ? 'شيكات تحت التحصيل' : 'Cheques receivable'}</p>
                <p className="font-semibold">{chequesReceivable.toLocaleString()} ر.ع</p>
              </div>
            </div>
            <div id="claims-export-area" className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الرقم' : 'Number'}</th>
                    <th>{ar ? 'العميل' : 'Contact'}</th>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsList.map((d) => (
                    <tr key={d.id}>
                      <td>{d.type === 'RECEIPT' ? (ar ? 'شيك' : 'Cheque') : (ar ? 'فاتورة' : 'Invoice')}</td>
                      <td className="font-mono">{d.serialNumber}</td>
                      <td>{d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}</td>
                      <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                      <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                      <td><span className={styles.badge}>{d.type === 'RECEIPT' ? (ar ? 'شيك آجل' : 'Post-dated') : d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {claimsList.length === 0 && (
              <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد مطالبات أو شيكات' : 'No receivables or cheques'}</p>
            )}
          </div>
        </div>
        );
      })()}

      {/* الشيكات - شيكات تحت التحصيل ومدفوعة مرتبطة بعقار/مشروع */}
      {activeTab === 'cheques' && (() => {
        let chequesList = documents.filter((d) => d.paymentMethod === 'CHEQUE');
        if (filterFromDate) chequesList = chequesList.filter((d) => d.date >= filterFromDate);
        if (filterToDate) chequesList = chequesList.filter((d) => d.date <= filterToDate);
        if (filterContactId) chequesList = chequesList.filter((d) => d.contactId === filterContactId);
        if (filterPropertyId) chequesList = chequesList.filter((d) => d.propertyId === parseInt(filterPropertyId, 10));
        if (filterProjectId) chequesList = chequesList.filter((d) => d.projectId === parseInt(filterProjectId, 10));
        if (searchQuery?.trim()) {
          const q = searchQuery.toLowerCase();
          chequesList = chequesList.filter((d) =>
            (d.serialNumber || '').toLowerCase().includes(q) ||
            (d.chequeNumber || d.paymentReference || '').toLowerCase().includes(q) ||
            (d.descriptionAr || '').toLowerCase().includes(q) ||
            (d.chequeBankName || '').toLowerCase().includes(q)
          );
        }
        const getContactName = (d: AccountingDocument) => (d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '');
        const getPropDisplay = (d: AccountingDocument) => { const p = d.propertyId ? getPropertyById(d.propertyId) : null; return p ? getPropertyDisplay(p) : ''; };
        const getProjDisplay = (d: AccountingDocument) => { const p = d.projectId ? projectsList.find((x) => x.id === d.projectId) : null; return p ? getProjectDisplay(p) : ''; };
        const sortedCheques = [...chequesList].sort((a, b) => {
          switch (sortDocuments) {
            case 'dateDesc': return b.date.localeCompare(a.date);
            case 'dateAsc': return a.date.localeCompare(b.date);
            case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
            case 'property': return getPropDisplay(a).localeCompare(getPropDisplay(b));
            case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
            default: return 0;
          }
        });
        const chequesTableData = sortedCheques.map((d) => ({
          date: new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
          number: d.serialNumber,
          chequeNo: d.chequeNumber || d.paymentReference || '—',
          dueDate: d.chequeDueDate || d.dueDate ? new Date(d.chequeDueDate || d.dueDate!).toLocaleDateString(ar ? 'ar-OM' : 'en-GB') : '—',
          bank: d.chequeBankName || '—',
          contact: d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—',
          property: d.propertyId ? (() => { const p = getPropertyById(d.propertyId!); return p ? getPropertyDisplay(p) : ''; })() : '—',
          project: d.projectId ? (() => { const p = projectsList.find((x) => x.id === d.projectId); return p ? getProjectDisplay(p) : ''; })() : '—',
          type: d.type === 'RECEIPT' ? (ar ? 'تحت التحصيل' : 'Receivable') : (ar ? 'مدفوع' : 'Payable'),
          amount: `${d.totalAmount.toLocaleString()} ر.ع`,
        }));
        return (
        <div className={styles.featureSection}>
          <div className={`${styles.featureSectionHeader} flex-wrap`}>
            <div className={styles.featureSectionIcon}><Icon name="archive" className="h-5 w-5" /></div>
            <h4 className={styles.featureSectionTitle}>{ar ? 'الشيكات' : 'Cheques'}</h4>
            <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
            <div className={ar ? 'mr-auto' : 'ml-auto'}>
              <button
                type="button"
                onClick={() => {
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
                className="admin-btn-primary text-sm"
              >
                {ar ? '➕ إضافة شيك' : '➕ Add Cheque'}
              </button>
            </div>
          </div>
          <div className={styles.featureSectionBody}>
            <div className="mb-6 flex flex-wrap gap-6">
              <div>
                <p className={styles.statCardLabel}>{ar ? 'إجمالي الشيكات' : 'Total Cheques'}</p>
                <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>{chequesList.reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{ar ? 'تحت التحصيل' : 'Receivable'}</p>
                <p className="font-semibold">{chequesList.filter((d) => d.type === 'RECEIPT').reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{ar ? 'مدفوعة' : 'Payable'}</p>
                <p className="font-semibold">{chequesList.filter((d) => d.type === 'PAYMENT').reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'الرقم' : 'Number'}</th>
                    <th>{ar ? 'رقم الشيك' : 'Cheque #'}</th>
                    <th>{ar ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                    <th>{ar ? 'البنك' : 'Bank'}</th>
                    <th>{ar ? 'العميل' : 'Contact'}</th>
                    <th>{ar ? 'العقار' : 'Property'}</th>
                    <th>{ar ? 'المشروع' : 'Project'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCheques.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                      <td className="font-mono">{d.serialNumber}</td>
                      <td>{d.chequeNumber || d.paymentReference || '—'}</td>
                      <td>{(d.chequeDueDate || d.dueDate) ? new Date(d.chequeDueDate || d.dueDate!).toLocaleDateString(ar ? 'ar-OM' : 'en-GB') : '—'}</td>
                      <td>{d.chequeBankName || '—'}</td>
                      <td>{d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}</td>
                      <td className="text-sm align-top">{d.propertyId ? (() => { const p = getPropertyById(d.propertyId!); return p ? <span className="whitespace-pre-line block text-left">{getPropertyDisplay(p)}</span> : d.propertyId; })() : '—'}</td>
                      <td className="text-sm">{d.projectId ? (() => { const p = projectsList.find((x) => x.id === d.projectId); return p ? getProjectDisplay(p) : ''; })() : '—'}</td>
                      <td><span className={styles.badge}>{d.type === 'RECEIPT' ? (ar ? 'تحت التحصيل' : 'Receivable') : (ar ? 'مدفوع' : 'Payable')}</span></td>
                      <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                      <td>
                        <button type="button" onClick={() => setPrintDocument(d)} className="text-sm text-[#8B6F47] hover:underline">
                          📄 {ar ? 'عرض' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {chequesList.length === 0 && (
              <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد شيكات. أضف شيكاً يدوياً أو من صفحة عقار/مشروع.' : 'No cheques. Add one manually or from property/project page.'}</p>
            )}
          </div>
        </div>
        );
      })()}

      {/* Payments - من أي حساب / إلى أي حساب / السبب / العقار */}
      {activeTab === 'payments' && (() => {
        const rawPayments = documents.filter((d) => d.type === 'PAYMENT' || d.type === 'RECEIPT');
        const getContactName = (d: AccountingDocument) => (d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '');
        const getPropDisplay = (d: AccountingDocument) => { const p = d.propertyId ? getPropertyById(d.propertyId) : null; return p ? getPropertyDisplay(p) : ''; };
        const paymentsList = [...rawPayments].sort((a, b) => {
          switch (sortDocuments) {
            case 'dateDesc': return b.date.localeCompare(a.date);
            case 'dateAsc': return a.date.localeCompare(b.date);
            case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
            case 'property': return getPropDisplay(a).localeCompare(getPropDisplay(b));
            case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
            default: return 0;
          }
        });
        const paymentsTableData = paymentsList.map((d) => {
          const method = d.paymentMethod || (d.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
          const fromAcc = d.type === 'RECEIPT'
            ? (method === 'CHEQUE' ? (ar ? 'شيكات تحت التحصيل' : 'Cheques receivable')
              : method === 'BANK_TRANSFER' ? (() => { const b = bankAccounts.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'البنوك' : 'Banks'); })()
              : (ar ? 'الصندوق' : 'Cash'))
            : (ar ? 'مصروفات التشغيل' : 'Operating expenses');
          const toAcc = d.type === 'RECEIPT' ? (ar ? 'إيرادات الإيجار' : 'Rent revenue') : (d.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'البنوك' : 'Banks'); })() : (ar ? 'الصندوق' : 'Cash'));
          const prop = d.propertyId ? getPropertyById(d.propertyId) : null;
          return {
            date: new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
            number: d.serialNumber,
            type: ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en,
            from: fromAcc,
            to: toAcc,
            reason: d.descriptionAr || d.descriptionEn || '—',
            property: prop ? getPropertyDisplay(prop) : '—',
            contact: d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—',
            amount: `${d.totalAmount.toLocaleString()} ر.ع`,
          };
        });
        return (
        <div className={styles.featureSection}>
          <div className={`${styles.featureSectionHeader} flex-wrap`}>
            <div className={styles.featureSectionIcon}><Icon name="archive" className="h-5 w-5" /></div>
            <h4 className={styles.featureSectionTitle}>{ar ? 'المدفوعات' : 'Payments'}</h4>
            <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
            <div className={ar ? 'mr-auto' : 'ml-auto'}>
            <ClaimsPaymentsExportButtons
              tableData={paymentsTableData}
              headers={[
                { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
                { key: 'number', labelAr: 'الرقم', labelEn: 'Number' },
                { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
                { key: 'from', labelAr: 'من حساب', labelEn: 'From account' },
                { key: 'to', labelAr: 'إلى حساب', labelEn: 'To account' },
                { key: 'reason', labelAr: 'السبب / الوصف', labelEn: 'Reason' },
                { key: 'property', labelAr: 'العقار', labelEn: 'Property' },
                { key: 'contact', labelAr: 'العميل', labelEn: 'Contact' },
                { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
              ]}
              printAreaId="payments-export-area"
              filename={ar ? 'المدفوعات' : 'Payments'}
              ar={ar}
            />
            </div>
          </div>
          <div className={styles.featureSectionBody}>
            <div className="mb-6">
              <p className={styles.statCardLabel}>{ar ? 'إجمالي المدفوعات والإيصالات' : 'Total Payments & Receipts'}</p>
              <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>{paymentsTotal.toLocaleString()} ر.ع</p>
            </div>
            <div id="payments-export-area" className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'الرقم' : 'Number'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'من حساب (استلمنا في)' : 'From account'}</th>
                    <th>{ar ? 'إلى حساب' : 'To account'}</th>
                    <th>{ar ? 'السبب / الوصف' : 'Reason'}</th>
                    <th>{ar ? 'العقار' : 'Property'}</th>
                    <th>{ar ? 'العميل' : 'Contact'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map((d) => {
                    const method = d.paymentMethod || (d.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
                    const fromAcc = d.type === 'RECEIPT'
                      ? (method === 'CHEQUE' ? (ar ? 'شيكات تحت التحصيل' : 'Cheques receivable')
                        : method === 'BANK_TRANSFER' ? (() => { const b = bankAccounts.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'البنوك' : 'Banks'); })()
                        : (ar ? 'الصندوق' : 'Cash'))
                      : (ar ? 'مصروفات التشغيل' : 'Operating expenses');
                    const toAcc = d.type === 'RECEIPT' ? (ar ? 'إيرادات الإيجار' : 'Rent revenue') : (d.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'البنوك' : 'Banks'); })() : (ar ? 'الصندوق' : 'Cash'));
                    const prop = d.propertyId ? getPropertyById(d.propertyId) : null;
                    return (
                      <tr key={d.id}>
                        <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                        <td className="font-mono">{d.serialNumber}</td>
                        <td>{ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en}</td>
                        <td className="text-sm">{fromAcc}</td>
                        <td className="text-sm">{toAcc}</td>
                        <td className="text-sm max-w-[200px] truncate" title={ar ? d.descriptionAr : d.descriptionEn}>{d.descriptionAr || d.descriptionEn || '—'}</td>
                        <td className="text-sm align-top">{prop ? <span className="whitespace-pre-line block text-left">{getPropertyDisplay(prop)}</span> : '—'}</td>
                        <td className="text-sm">{d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}</td>
                        <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {paymentsList.length === 0 && (
              <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد مدفوعات' : 'No payments'}</p>
            )}
          </div>
        </div>
        );
      })()}

      {activeTab === 'periods' && (
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="font-bold text-gray-900">{ar ? 'الفترات المالية' : 'Fiscal Periods'}</h4>
            <p className="text-sm text-gray-500 mt-1">{ar ? 'لا ترحيل لفترة مغلقة' : 'No posting to closed period'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{ar ? 'الفترة' : 'Period'}</th>
                  <th>{ar ? 'من' : 'From'}</th>
                  <th>{ar ? 'إلى' : 'To'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono">{p.code}</td>
                    <td>{new Date(p.startDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td>{new Date(p.endDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td>{p.isLocked ? <span className="admin-badge">{ar ? 'مغلق' : 'Locked'}</span> : <span className="admin-badge-success">{ar ? 'مفتوح' : 'Open'}</span>}</td>
                    <td>
                      {!p.isLocked && (
                        <button
                          type="button"
                          onClick={() => { lockPeriod(p.id); loadData(); }}
                          className="text-sm text-amber-600 hover:underline"
                        >
                          {ar ? 'إغلاق الفترة' : 'Lock period'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="font-bold text-gray-900">{ar ? 'سجل التدقيق' : 'Audit Log'}</h4>
            <p className="text-sm text-gray-500 mt-1">{ar ? 'لا تعديل بدون أثر تدقيقي' : 'No modification without audit trail'}</p>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{ar ? 'الوقت' : 'Time'}</th>
                  <th>{ar ? 'الإجراء' : 'Action'}</th>
                  <th>{ar ? 'الكيان' : 'Entity'}</th>
                  <th>{ar ? 'المعرف' : 'ID'}</th>
                  <th>{ar ? 'السبب' : 'Reason'}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs">{new Date(log.timestamp).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td><span className="admin-badge">{log.action}</span></td>
                    <td>{log.entityType}</td>
                    <td className="font-mono text-xs">{log.entityId.slice(0, 12)}...</td>
                    <td className="text-xs">{log.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="admin-card p-6 max-w-xl">
          <h4 className="font-bold text-gray-900 mb-6">{ar ? 'إعدادات المحاسبة' : 'Accounting Settings'}</h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveFiscalSettings(fiscalForm);
              loadData();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العملة' : 'Currency'}</label>
              <select value={fiscalForm.currency} onChange={(e) => setFiscalForm({ ...fiscalForm, currency: e.target.value })} className="admin-select w-full">
                <option value="OMR">ر.ع (OMR)</option>
                <option value="SAR">ر.س (SAR)</option>
                <option value="AED">د.إ (AED)</option>
                <option value="USD">$ (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ضريبة القيمة المضافة (%)' : 'VAT Rate (%)'}</label>
              <select value={fiscalForm.vatRate} onChange={(e) => setFiscalForm({ ...fiscalForm, vatRate: parseInt(e.target.value, 10) })} className="admin-select w-full">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={15}>15%</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">{ar ? 'حفظ الإعدادات' : 'Save Settings'}</button>
          </form>
        </div>
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

      {/* Modal: إضافة حساب */}
      {showAddAccount && (
        <div className={styles.modalOverlay} onClick={() => setShowAddAccount(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{ar ? 'إضافة حساب جديد' : 'Add new account'}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!accountForm.code.trim() || !accountForm.nameAr.trim()) return;
                try {
                  createAccount({
                    code: accountForm.code.trim(),
                    nameAr: accountForm.nameAr.trim(),
                    nameEn: accountForm.nameEn.trim() || undefined,
                    type: accountForm.type,
                    isActive: true,
                    sortOrder: 999,
                  });
                  loadData();
                  setShowAddAccount(false);
                } catch (err) {
                  alert(err instanceof Error ? err.message : ar ? 'خطأ' : 'Error');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رمز الحساب' : 'Account code'}</label>
                <input type="text" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} className="admin-input w-full" placeholder="مثال: 5110" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                <input type="text" value={accountForm.nameAr} onChange={(e) => setAccountForm({ ...accountForm, nameAr: e.target.value })} className="admin-input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                <input type="text" value={accountForm.nameEn} onChange={(e) => setAccountForm({ ...accountForm, nameEn: e.target.value })} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'نوع الحساب' : 'Account type'}</label>
                <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as AccountType })} className="admin-select w-full">
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                    <option key={t} value={t}>{ar ? ACCOUNT_TYPE_LABELS[t].ar : ACCOUNT_TYPE_LABELS[t].en}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddAccount(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">{ar ? 'إضافة' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
