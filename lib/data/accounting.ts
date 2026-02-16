/**
 * Global Intelligent Accounting & ERP Platform
 * نظام المحاسبة - IFRS | Accrual | Double Entry | Period Lock | Audit Trail
 * لا عملية بدون قيد | لا قيد بدون مستند | لا تعديل بدون أثر تدقيقي
 */

import {
  createJournalEntry as engineCreateJournal,
  updateJournalEntry as engineUpdateJournal,
  cancelJournalEntry as engineCancelJournal,
} from '@/lib/accounting/engine/journalEngine';
import { ensureDefaultPeriods, isPeriodLocked } from '@/lib/accounting/compliance/periodEngine';
import { appendAuditLog } from '@/lib/accounting/audit/auditEngine';
import { generatePostingLines } from '@/lib/accounting/rules/postingRulesEngine';
import { getStored, saveStored } from '@/lib/accounting/data/storage';
import { STORAGE_KEYS } from '@/lib/accounting/data/storage';

/** نوع الحساب - Chart of Accounts */
export type AccountType =
  | 'ASSET'      // أصول
  | 'LIABILITY'  // التزامات
  | 'EQUITY'     // حقوق الملكية
  | 'REVENUE'    // إيرادات
  | 'EXPENSE';   // مصروفات

/** نوع المستند - متوافق مع domain/types */
export type DocumentType =
  | 'INVOICE'       // فاتورة
  | 'RECEIPT'       // إيصال
  | 'QUOTE'         // عرض سعر
  | 'DEPOSIT'       // عربون/وديعة
  | 'PAYMENT'       // دفعة
  | 'JOURNAL'       // قيد يومية
  | 'CREDIT_NOTE'   // إشعار دائن
  | 'DEBIT_NOTE'    // إشعار مدين
  | 'PURCHASE_INV'  // فاتورة مشتريات
  | 'PURCHASE_ORDER'// أمر شراء
  | 'OTHER';        // أخرى

/** حالة المستند */
export type DocumentStatus =
  | 'DRAFT'      // مسودة
  | 'PENDING'    // قيد الانتظار
  | 'APPROVED'   // معتمد
  | 'PAID'       // مدفوع
  | 'CANCELLED'; // ملغى

export interface ChartAccount {
  id: string;
  code: string;           // رمز الحساب
  nameAr: string;
  nameEn?: string;
  type: AccountType;
  parentId?: string;     // للحسابات الفرعية
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;   // مدين
  credit: number;  // دائن
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface JournalEntry {
  id: string;
  version?: number;
  serialNumber: string;
  date: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  descriptionAr?: string;
  descriptionEn?: string;
  documentType?: DocumentType;
  documentId?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  bookingId?: string;
  contractId?: string;
  status: DocumentStatus;
  replacedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingDocument {
  id: string;
  serialNumber: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  dueDate?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  bookingId?: string;
  contractId?: string;
  amount: number;
  currency: string;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  descriptionAr?: string;
  descriptionEn?: string;
  items?: DocumentItem[];
  journalEntryId?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentReference?: string;
  notes?: string;
  /** مرفقات - روابط الملفات المرفقة */
  attachments?: { url: string; name: string }[];
  /** أمر شراء - للفواتير */
  purchaseOrder?: string;
  /** المرجع */
  reference?: string;
  /** الفرع */
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  descriptionAr: string;
  descriptionEn?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  /** حساب المحاسبة للبند */
  accountId?: string;
}

const ACCOUNTS_KEY = STORAGE_KEYS.ACCOUNTS;
const JOURNAL_KEY = STORAGE_KEYS.JOURNAL;
const DOCUMENTS_KEY = STORAGE_KEYS.DOCUMENTS;
const FISCAL_KEY = STORAGE_KEYS.FISCAL;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** الحسابات الافتراضية - دليل الحسابات (معايير محاسبية عالمية - Wafeq/Daftra/Qoyod) */
const DEFAULT_ACCOUNTS: Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // 1xxx أصول متداولة
  { code: '1000', nameAr: 'الصندوق', nameEn: 'Cash', type: 'ASSET', isActive: true, sortOrder: 1 },
  { code: '1100', nameAr: 'البنوك', nameEn: 'Banks', type: 'ASSET', isActive: true, sortOrder: 2 },
  { code: '1150', nameAr: 'شيكات تحت التحصيل', nameEn: 'Cheques Receivable', type: 'ASSET', isActive: true, sortOrder: 3 },
  { code: '1200', nameAr: 'العملاء', nameEn: 'Receivables', type: 'ASSET', isActive: true, sortOrder: 4 },
  { code: '1210', nameAr: 'ذمم مدينة أخرى', nameEn: 'Other Receivables', type: 'ASSET', isActive: true, sortOrder: 5 },
  { code: '1300', nameAr: 'عربونات مقدمة', nameEn: 'Prepaid Deposits', type: 'ASSET', isActive: true, sortOrder: 6 },
  { code: '1400', nameAr: 'مصروفات مقدمة', nameEn: 'Prepaid Expenses', type: 'ASSET', isActive: true, sortOrder: 7 },
  { code: '1500', nameAr: 'أصول أخرى', nameEn: 'Other Assets', type: 'ASSET', isActive: true, sortOrder: 8 },
  // 2xxx التزامات
  { code: '2000', nameAr: 'الموردون', nameEn: 'Payables', type: 'LIABILITY', isActive: true, sortOrder: 9 },
  { code: '2100', nameAr: 'عربونات مستلمة', nameEn: 'Deposits Received', type: 'LIABILITY', isActive: true, sortOrder: 10 },
  { code: '2200', nameAr: 'ضرائب مستحقة', nameEn: 'Tax Payable', type: 'LIABILITY', isActive: true, sortOrder: 11 },
  { code: '2300', nameAr: 'التزامات أخرى', nameEn: 'Other Liabilities', type: 'LIABILITY', isActive: true, sortOrder: 12 },
  // 3xxx حقوق الملكية
  { code: '3000', nameAr: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', isActive: true, sortOrder: 13 },
  { code: '3100', nameAr: 'أرباح محتجزة', nameEn: 'Retained Earnings', type: 'EQUITY', isActive: true, sortOrder: 14 },
  // 4xxx إيرادات
  { code: '4000', nameAr: 'إيرادات الإيجار', nameEn: 'Rent Revenue', type: 'REVENUE', isActive: true, sortOrder: 15 },
  { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'REVENUE', isActive: true, sortOrder: 16 },
  { code: '4200', nameAr: 'رسوم إدارية', nameEn: 'Administrative Fees', type: 'REVENUE', isActive: true, sortOrder: 17 },
  { code: '4300', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', isActive: true, sortOrder: 18 },
  // 5xxx مصروفات
  { code: '5000', nameAr: 'مصروفات التشغيل', nameEn: 'Operating Expenses', type: 'EXPENSE', isActive: true, sortOrder: 19 },
  { code: '5100', nameAr: 'مصروفات الصيانة', nameEn: 'Maintenance Expenses', type: 'EXPENSE', isActive: true, sortOrder: 20 },
  { code: '5200', nameAr: 'مصروفات إدارية', nameEn: 'Administrative Expenses', type: 'EXPENSE', isActive: true, sortOrder: 21 },
  { code: '5300', nameAr: 'إيجارات ومرافق', nameEn: 'Rent & Utilities', type: 'EXPENSE', isActive: true, sortOrder: 22 },
  { code: '5400', nameAr: 'رواتب ومزايا', nameEn: 'Salaries & Benefits', type: 'EXPENSE', isActive: true, sortOrder: 23 },
  { code: '5500', nameAr: 'مصروفات أخرى', nameEn: 'Other Expenses', type: 'EXPENSE', isActive: true, sortOrder: 24 },
];

/** تهيئة دليل الحسابات إذا كان فارغاً + إضافة حساب 1150 للمستخدمين القدامى */
function ensureChartOfAccounts(): ChartAccount[] {
  let accounts = getStored<ChartAccount>(ACCOUNTS_KEY);
  if (accounts.length === 0) {
    const now = new Date().toISOString();
    accounts = DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      id: generateId('ACC'),
      createdAt: now,
      updatedAt: now,
    }));
    saveStored(ACCOUNTS_KEY, accounts);
  } else {
    // ترحيل: إضافة حساب شيكات تحت التحصيل (1150) إن لم يكن موجوداً
    const has1150 = accounts.some((a) => a.code === '1150');
    if (!has1150) {
      const now = new Date().toISOString();
      const chequeAcc: ChartAccount = {
        code: '1150',
        nameAr: 'شيكات تحت التحصيل',
        nameEn: 'Cheques Receivable',
        type: 'ASSET',
        isActive: true,
        sortOrder: 3,
        id: generateId('ACC'),
        createdAt: now,
        updatedAt: now,
      };
      accounts.push(chequeAcc);
      saveStored(ACCOUNTS_KEY, accounts);
    }
  }
  return accounts.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** الحصول على دليل الحسابات */
export function getChartOfAccounts(): ChartAccount[] {
  return ensureChartOfAccounts();
}

/** الحصول على حساب بالمعرف */
export function getAccountById(id: string): ChartAccount | null {
  return getChartOfAccounts().find((a) => a.id === id) || null;
}

/** إعدادات السنة المالية */
export interface FiscalSettings {
  startMonth: number;   // 1-12
  startDay: number;    // 1-31
  currency: string;
  vatRate: number;
}

export function getFiscalSettings(): FiscalSettings {
  if (typeof window === 'undefined') return { startMonth: 1, startDay: 1, currency: 'OMR', vatRate: 0 };
  try {
    const raw = localStorage.getItem(FISCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { startMonth: 1, startDay: 1, currency: 'OMR', vatRate: 0 };
}

export function saveFiscalSettings(settings: Partial<FiscalSettings>): FiscalSettings {
  const current = getFiscalSettings();
  const next = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    localStorage.setItem(FISCAL_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage', { key: FISCAL_KEY }));
  }
  return next;
}

/** إنشاء حساب جديد */
export function createAccount(data: Omit<ChartAccount, 'id' | 'createdAt' | 'updatedAt'>): ChartAccount {
  const accounts = getChartOfAccounts();
  const maxOrder = accounts.length > 0 ? Math.max(...accounts.map((a) => a.sortOrder)) : 0;
  const now = new Date().toISOString();
  const account: ChartAccount = {
    ...data,
    id: generateId('ACC'),
    sortOrder: data.sortOrder ?? maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(account);
  saveStored(ACCOUNTS_KEY, accounts);
  return account;
}

/** تحديث حساب */
export function updateAccount(id: string, updates: Partial<ChartAccount>): ChartAccount | null {
  const accounts = getChartOfAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  accounts[idx] = { ...accounts[idx], ...updates, updatedAt: new Date().toISOString() };
  saveStored(ACCOUNTS_KEY, accounts);
  return accounts[idx];
}

/** توليد رقم متسلسل للقيد */
function generateJournalSerial(): string {
  const year = new Date().getFullYear();
  const entries = getStored<JournalEntry>(JOURNAL_KEY);
  const count = entries.filter((e) => e.createdAt.startsWith(String(year))).length + 1;
  return `JRN-${year}-${String(count).padStart(4, '0')}`;
}

/** إنشاء قيد يومية - عبر المحرك (Period Lock + Audit) */
export function createJournalEntry(data: Omit<JournalEntry, 'id' | 'serialNumber' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'>): JournalEntry {
  ensureDefaultPeriods();
  const result = engineCreateJournal(data as Parameters<typeof engineCreateJournal>[0]);
  return result as JournalEntry;
}

/** تحديث قيد يومية - عبر المحرك */
export function updateJournalEntry(id: string, data: Partial<Omit<JournalEntry, 'id' | 'serialNumber' | 'createdAt'>>): JournalEntry | null {
  const result = engineUpdateJournal(id, data as Parameters<typeof engineUpdateJournal>[1]);
  return result;
}

/** إلغاء قيد (soft delete) - لا حذف نهائي */
export function cancelJournalEntry(id: string): JournalEntry | null {
  return engineCancelJournal(id);
}

/** الحصول على جميع القيود - قراءة مباشرة من نفس التخزين لضمان الاتساق */
export function getAllJournalEntries(): JournalEntry[] {
  const raw = getStored<JournalEntry>(JOURNAL_KEY);
  return raw
    .map((e) => ({ ...e, version: e.version ?? 1 }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function isEntryActive(entry: JournalEntry): boolean {
  return entry.status !== 'CANCELLED' && !entry.replacedBy;
}

/** البحث عن القيود */
export function searchJournalEntries(filters: {
  fromDate?: string;
  toDate?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  documentType?: DocumentType;
  documentId?: string;
  query?: string;
}): JournalEntry[] {
  let entries = getAllJournalEntries();
  if (filters.fromDate) entries = entries.filter((e) => e.date >= filters.fromDate!);
  if (filters.toDate) entries = entries.filter((e) => e.date <= filters.toDate!);
  if (filters.contactId) entries = entries.filter((e) => e.contactId === filters.contactId);
  if (filters.bankAccountId) entries = entries.filter((e) => e.bankAccountId === filters.bankAccountId);
  if (filters.propertyId) entries = entries.filter((e) => e.propertyId === filters.propertyId);
  if (filters.projectId) entries = entries.filter((e) => e.projectId === filters.projectId);
  if (filters.documentType) entries = entries.filter((e) => e.documentType === filters.documentType);
  if (filters.documentId) entries = entries.filter((e) => e.documentId === filters.documentId);
  if (filters.query?.trim()) {
    const q = filters.query.toLowerCase().trim();
    entries = entries.filter(
      (e) =>
        e.serialNumber.toLowerCase().includes(q) ||
        (e.descriptionAr || '').toLowerCase().includes(q) ||
        (e.descriptionEn || '').toLowerCase().includes(q)
    );
  }
  return entries;
}

/** توليد رقم متسلسل للمستند - كل نوع له تسلسل مستقل حسب النوع والسنة */
function generateDocumentSerial(type: DocumentType): string {
  const year = new Date().getFullYear();
  const prefixMap: Record<string, string> = {
    INVOICE: 'INV',           // فاتورة بيع
    PURCHASE_INV: 'PINV',     // فاتورة مشتريات
    RECEIPT: 'RCP',           // إيصال
    QUOTE: 'QOT',             // عرض سعر
    DEPOSIT: 'DEP',           // عربون
    PAYMENT: 'PAY',           // دفعة
    PURCHASE_ORDER: 'PO',     // أمر شراء
    CREDIT_NOTE: 'CN',        // إشعار دائن
    DEBIT_NOTE: 'DN',         // إشعار مدين
    JOURNAL: 'JRN',           // قيد يومية
    OTHER: 'DOC',
  };
  const prefix = prefixMap[type] || 'DOC';
  const docs = getStored<AccountingDocument>(DOCUMENTS_KEY);
  const count = docs.filter((d) => d.type === type && d.createdAt.startsWith(String(year))).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
}

/** الحصول على الرقم المتسلسل التالي للمستند (للعرض المسبق) */
export function getNextDocumentSerial(type: DocumentType): string {
  return generateDocumentSerial(type);
}

/** إنشاء مستند محاسبي - لا عملية بدون قيد (ترحيل تلقائي عبر Posting Rules) */
export function createDocument(data: Omit<AccountingDocument, 'id' | 'serialNumber' | 'createdAt' | 'updatedAt' | 'journalEntryId'> & { serialNumber?: string }): AccountingDocument {
  ensureDefaultPeriods();
  getChartOfAccounts(); // تهيئة دليل الحسابات إن لم يكن موجوداً (مطلوب للترحيل)
  const now = new Date().toISOString();
  const doc: AccountingDocument = {
    ...data,
    id: generateId('DOC'),
    serialNumber: data.serialNumber?.trim() || generateDocumentSerial(data.type),
    createdAt: now,
    updatedAt: now,
  };
  const docs = getStored<AccountingDocument>(DOCUMENTS_KEY);
  docs.unshift(doc);
  saveStored(DOCUMENTS_KEY, docs);

  // ترحيل تلقائي: إنشاء قيد محلي (نفس التخزين للقراءة والكتابة)
  if ((doc.status === 'APPROVED' || doc.status === 'PAID') && typeof window !== 'undefined') {
    try {
      const entry = createJournalEntryLocal(doc);
      if (entry) {
        doc.journalEntryId = entry.id;
        const idx = docs.findIndex((d) => d.id === doc.id);
        if (idx >= 0) {
          docs[idx] = { ...doc, journalEntryId: entry.id, updatedAt: now };
          saveStored(DOCUMENTS_KEY, docs);
        }
      }
    } catch (err) {
      appendAuditLog({
        action: 'CREATE',
        entityType: 'DOCUMENT',
        entityId: doc.id,
        reason: `Posting failed: ${err instanceof Error ? err.message : 'Unknown'}`,
        newState: JSON.stringify({ serialNumber: doc.serialNumber, error: String(err) }),
      });
      throw err;
    }
  }

  return doc;
}

/** نتيجة ترحيل المستندات */
export interface PostUnpostedResult {
  posted: number;
  failed: number;
  errors: string[];
}

/** إنشاء قيد محلي - الكتابة مباشرة لنفس التخزين الذي نقرأ منه (ضمان الاتساق) */
function createJournalEntryLocal(doc: AccountingDocument): JournalEntry | null {
  if (isPeriodLocked(doc.date)) return null;
  const lines = generatePostingLines(doc);
  if (lines.length === 0) return null;
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) return null;
  const year = new Date().getFullYear();
  const entries = getStored<JournalEntry>(JOURNAL_KEY);
  const count = entries.filter((e) => e.createdAt?.startsWith(String(year)) && !e.replacedBy).length + 1;
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    id: `JRN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    version: 1,
    serialNumber: `JRN-${year}-${String(count).padStart(4, '0')}`,
    date: doc.date,
    lines,
    totalDebit,
    totalCredit,
    descriptionAr: doc.descriptionAr || `${doc.type} ${doc.serialNumber}`,
    descriptionEn: doc.descriptionEn || `${doc.type} ${doc.serialNumber}`,
    documentType: doc.type,
    documentId: doc.id,
    contactId: doc.contactId,
    bankAccountId: doc.bankAccountId,
    propertyId: doc.propertyId,
    projectId: doc.projectId,
    bookingId: doc.bookingId,
    contractId: doc.contractId,
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(entry);
  saveStored(JOURNAL_KEY, entries);
  appendAuditLog({ action: 'CREATE', entityType: 'JOURNAL_ENTRY', entityId: entry.id, newState: JSON.stringify({ serialNumber: entry.serialNumber, totalDebit, totalCredit }) });
  return entry;
}

/** إصلاح القيود المعطلة: إزالة القيود ذات الحسابات غير المطابقة وإعادة الترحيل */
function repairBrokenPostings(): number {
  const accounts = getChartOfAccounts();
  const accountIds = new Set(accounts.map((a) => a.id));
  const entries = getStored<JournalEntry>(JOURNAL_KEY);
  const docs = getStored<AccountingDocument>(DOCUMENTS_KEY);
  const toRemove = new Set<string>();
  const docsToClear: string[] = [];

  for (const doc of docs) {
    if ((doc.status !== 'APPROVED' && doc.status !== 'PAID') || !doc.journalEntryId) continue;
    const entry = entries.find((e) => e.id === doc.journalEntryId);
    if (!entry) {
      docsToClear.push(doc.id);
      continue;
    }
    const hasInvalidLine = entry.lines?.some((l) => l.accountId && !accountIds.has(l.accountId));
    if (hasInvalidLine) {
      toRemove.add(entry.id);
      docsToClear.push(doc.id);
    }
  }

  if (toRemove.size === 0 && docsToClear.length === 0) return 0;

  const newEntries = entries.filter((e) => !toRemove.has(e.id));
  saveStored(JOURNAL_KEY, newEntries);

  for (let i = 0; i < docs.length; i++) {
    if (docsToClear.includes(docs[i].id)) {
      docs[i] = { ...docs[i], journalEntryId: undefined, updatedAt: new Date().toISOString() };
    }
  }
  saveStored(DOCUMENTS_KEY, docs);
  return docsToClear.length;
}

/** ترحيل المستندات المعتمدة التي لم تُرحّل بعد - استخدام التخزين المحلي الموحد */
export function postUnpostedDocuments(): PostUnpostedResult {
  if (typeof window === 'undefined') return { posted: 0, failed: 0, errors: [] };
  getChartOfAccounts();
  ensureDefaultPeriods();
  repairBrokenPostings();
  const docs = getStored<AccountingDocument>(DOCUMENTS_KEY);
  let posted = 0;
  const errors: string[] = [];
  for (const doc of docs) {
    if ((doc.status === 'APPROVED' || doc.status === 'PAID') && !doc.journalEntryId) {
      try {
        const entry = createJournalEntryLocal(doc);
        if (entry) {
          const idx = docs.findIndex((d) => d.id === doc.id);
          if (idx >= 0) {
            docs[idx] = { ...docs[idx], journalEntryId: entry.id, updatedAt: new Date().toISOString() };
            saveStored(DOCUMENTS_KEY, docs);
            posted++;
          }
        }
      } catch (err) {
        errors.push(`${doc.serialNumber}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return { posted, failed: errors.length, errors };
}

/** الحصول على جميع المستندات */
export function getAllDocuments(): AccountingDocument[] {
  return getStored<AccountingDocument>(DOCUMENTS_KEY).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** البحث في المستندات */
export function searchDocuments(filters: {
  fromDate?: string;
  toDate?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  bookingId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  query?: string;
}): AccountingDocument[] {
  let docs = getAllDocuments();
  if (filters.fromDate) docs = docs.filter((d) => d.date >= filters.fromDate!);
  if (filters.toDate) docs = docs.filter((d) => d.date <= filters.toDate!);
  if (filters.contactId) docs = docs.filter((d) => d.contactId === filters.contactId);
  if (filters.bankAccountId) docs = docs.filter((d) => d.bankAccountId === filters.bankAccountId);
  if (filters.propertyId) docs = docs.filter((d) => d.propertyId === filters.propertyId);
  if (filters.projectId) docs = docs.filter((d) => d.projectId === filters.projectId);
  if (filters.bookingId) docs = docs.filter((d) => d.bookingId === filters.bookingId);
  if (filters.type) docs = docs.filter((d) => d.type === filters.type);
  if (filters.status) docs = docs.filter((d) => d.status === filters.status);
  if (filters.query?.trim()) {
    const q = filters.query.toLowerCase().trim();
    docs = docs.filter(
      (d) =>
        d.serialNumber.toLowerCase().includes(q) ||
        (d.descriptionAr || '').toLowerCase().includes(q) ||
        (d.descriptionEn || '').toLowerCase().includes(q)
    );
  }
  return docs;
}

/** الحصول على مستند بالمعرف */
export function getDocumentById(id: string): AccountingDocument | null {
  return getAllDocuments().find((d) => d.id === id) || null;
}

/** تحديث مستند - مع أثر تدقيقي */
export function updateDocument(id: string, data: Partial<Omit<AccountingDocument, 'id' | 'serialNumber' | 'createdAt'>>): AccountingDocument | null {
  const docs = getStored<AccountingDocument>(DOCUMENTS_KEY);
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const previous = docs[idx];
  docs[idx] = { ...previous, ...data, updatedAt: new Date().toISOString() };
  saveStored(DOCUMENTS_KEY, docs);
  if (typeof window !== 'undefined') {
    appendAuditLog({ action: 'UPDATE', entityType: 'DOCUMENT', entityId: id, previousState: JSON.stringify(previous.status), newState: JSON.stringify(docs[idx].status) });
  }
  return docs[idx];
}

/** إلغاء مستند */
/** إلغاء مستند - لا حذف نهائي */
export function cancelDocument(id: string): AccountingDocument | null {
  return updateDocument(id, { status: 'CANCELLED' });
}

export { getAuditLog, getEntityAuditChain } from '@/lib/accounting/audit/auditEngine';
export { getFiscalPeriods, lockPeriod, isPeriodLocked, createFiscalPeriod } from '@/lib/accounting/compliance/periodEngine';

/** حساب رصيد حساب من القيود */
export function getAccountBalance(accountId: string, asOfDate?: string, entriesOverride?: JournalEntry[], accountsOverride?: ChartAccount[]): { debit: number; credit: number; balance: number } {
  const entries = entriesOverride ?? getAllJournalEntries();
  let debit = 0;
  let credit = 0;
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    if (asOfDate && entry.date > asOfDate) continue;
    for (const line of entry.lines) {
      if (line.accountId === accountId) {
        debit += line.debit || 0;
        credit += line.credit || 0;
      }
    }
  }
  const account = accountsOverride?.find((a) => a.id === accountId) ?? getAccountById(accountId);
  const isDebitNormal = account?.type === 'ASSET' || account?.type === 'EXPENSE';
  const balance = isDebitNormal ? debit - credit : credit - debit;
  return { debit, credit, balance };
}

/** كشف الحساب البنكي أو الصندوق - bankAccountId من التفاصيل البنكية، أو 'CASH' للصندوق */
export function getBankAccountLedger(
  bankAccountId: string,
  fromDate?: string,
  toDate?: string,
  entriesOverride?: JournalEntry[]
): Array<{ entry: JournalEntry; line: JournalLine; debit: number; credit: number }> {
  const entries = entriesOverride ?? getAllJournalEntries();
  const bankChartAcc = getChartOfAccounts().find((a) => a.code === '1100');
  const cashChartAcc = getChartOfAccounts().find((a) => a.code === '1000');
  const isCash = bankAccountId === 'CASH';
  const chartAcc = isCash ? cashChartAcc : bankChartAcc;
  if (!chartAcc) return [];
  const result: Array<{ entry: JournalEntry; line: JournalLine; debit: number; credit: number }> = [];
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    const matches = isCash ? !entry.bankAccountId : entry.bankAccountId === bankAccountId;
    if (!matches) continue;
    if (fromDate && entry.date < fromDate) continue;
    if (toDate && entry.date > toDate) continue;
    for (const line of entry.lines) {
      const isRelevantLine = line.accountId === chartAcc.id;
      if (isRelevantLine && (line.debit > 0 || line.credit > 0)) {
        result.push({ entry, line, debit: line.debit || 0, credit: line.credit || 0 });
      }
    }
  }
  return result.sort((a, b) => new Date(a.entry.date).getTime() - new Date(b.entry.date).getTime());
}

/** كشف العقار / المستأجر - قيود مرتبطة بعقار أو عميل (لرصد المبالغ المستلمة من عقار/مستأجر) */
export function getPropertyOrContactLedger(
  filters: { propertyId?: number; contactId?: string },
  fromDate?: string,
  toDate?: string,
  entriesOverride?: JournalEntry[]
): JournalEntry[] {
  const entries = entriesOverride ?? getAllJournalEntries();
  return entries
    .filter((e) => isEntryActive(e))
    .filter((e) => {
      const matchProperty = !filters.propertyId || e.propertyId === filters.propertyId;
      const matchContact = !filters.contactId || e.contactId === filters.contactId;
      if (filters.propertyId && filters.contactId) return matchProperty || matchContact;
      return matchProperty && matchContact;
    })
    .filter((e) => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** رصيد الحساب البنكي - إجمالي المدين والدائن والرصيد */
export function getBankAccountBalance(
  bankAccountId: string,
  asOfDate?: string,
  entriesOverride?: JournalEntry[]
): { debit: number; credit: number; balance: number } {
  const ledger = getBankAccountLedger(bankAccountId, undefined, asOfDate, entriesOverride);
  let debit = 0;
  let credit = 0;
  for (const { debit: d, credit: c } of ledger) {
    debit += d;
    credit += c;
  }
  return { debit, credit, balance: debit - credit };
}

/** كشف حساب (Ledger) */
export function getAccountLedger(accountId: string, fromDate?: string, toDate?: string, entriesOverride?: JournalEntry[]): Array<{ entry: JournalEntry; line: JournalLine; debit: number; credit: number }> {
  const entries = entriesOverride ?? getAllJournalEntries();
  const result: Array<{ entry: JournalEntry; line: JournalLine; debit: number; credit: number }> = [];
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    if (fromDate && entry.date < fromDate) continue;
    if (toDate && entry.date > toDate) continue;
    for (const line of entry.lines) {
      if (line.accountId === accountId && (line.debit > 0 || line.credit > 0)) {
        result.push({ entry, line, debit: line.debit || 0, credit: line.credit || 0 });
      }
    }
  }
  return result;
}

/** ميزان المراجعة - Trial Balance */
export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  balance: number; // مدين موجب، دائن سالب للحسابات المدينة العادية
}

export function getTrialBalance(
  fromDate?: string,
  toDate?: string,
  entriesOverride?: JournalEntry[],
  accountsOverride?: ChartAccount[]
): TrialBalanceLine[] {
  const accounts = accountsOverride ?? getChartOfAccounts().filter((a) => a.isActive);
  const entries = entriesOverride ?? getAllJournalEntries();
  const result: TrialBalanceLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const acc of accounts) {
    let debit = 0;
    let credit = 0;
    for (const entry of entries) {
      if (!isEntryActive(entry)) continue;
      if (fromDate && entry.date < fromDate) continue;
      if (toDate && entry.date > toDate) continue;
      for (const line of entry.lines) {
        if (line.accountId === acc.id) {
          debit += line.debit || 0;
          credit += line.credit || 0;
        }
      }
    }
    const isDebitNormal = (acc as ChartAccount).type === 'ASSET' || (acc as ChartAccount).type === 'EXPENSE';
    const balance = isDebitNormal ? debit - credit : credit - debit;
    if (Math.abs(debit) > 0.001 || Math.abs(credit) > 0.001) {
      result.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        accountNameEn: acc.nameEn || acc.nameAr,
        accountType: acc.type,
        debit,
        credit,
        balance,
      });
      totalDebit += debit;
      totalCredit += credit;
    }
  }
  return result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/** قائمة الدخل - Income Statement (P&L) */
export interface IncomeStatementSection {
  type: 'REVENUE' | 'EXPENSE';
  items: { code: string; nameAr: string; nameEn: string; amount: number }[];
  total: number;
}

export function getIncomeStatement(
  fromDate: string,
  toDate: string,
  entriesOverride?: JournalEntry[],
  accountsOverride?: ChartAccount[]
): { revenue: IncomeStatementSection; expense: IncomeStatementSection; netIncome: number } {
  const accounts = accountsOverride ?? getChartOfAccounts().filter((a) => a.isActive);
  const entries = entriesOverride ?? getAllJournalEntries();
  const revenueItems: { code: string; nameAr: string; nameEn: string; amount: number }[] = [];
  const expenseItems: { code: string; nameAr: string; nameEn: string; amount: number }[] = [];
  for (const acc of accounts) {
    if (acc.type !== 'REVENUE' && acc.type !== 'EXPENSE') continue;
    let debit = 0;
    let credit = 0;
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    if (entry.date < fromDate || entry.date > toDate) continue;
      for (const line of entry.lines) {
        if (line.accountId === acc.id) {
          debit += line.debit || 0;
          credit += line.credit || 0;
        }
      }
    }
    const amount = acc.type === 'REVENUE' ? credit - debit : debit - credit;
    if (Math.abs(amount) > 0.001) {
      const item = { code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn || acc.nameAr, amount };
      if (acc.type === 'REVENUE') revenueItems.push(item);
      else expenseItems.push(item);
    }
  }
  const revenueTotal = revenueItems.reduce((s, i) => s + i.amount, 0);
  const expenseTotal = expenseItems.reduce((s, i) => s + i.amount, 0);
  return {
    revenue: { type: 'REVENUE', items: revenueItems, total: revenueTotal },
    expense: { type: 'EXPENSE', items: expenseItems, total: expenseTotal },
    netIncome: revenueTotal - expenseTotal,
  };
}

/** الميزانية العمومية - Balance Sheet */
export function getBalanceSheet(
  asOfDate: string,
  entriesOverride?: JournalEntry[],
  accountsOverride?: ChartAccount[]
): {
  assets: { code: string; nameAr: string; nameEn: string; amount: number }[];
  liabilities: { code: string; nameAr: string; nameEn: string; amount: number }[];
  equity: { code: string; nameAr: string; nameEn: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number; // للأرباح المحتجزة
} {
  const accounts = accountsOverride ?? getChartOfAccounts().filter((a) => a.isActive);
  const assets: { code: string; nameAr: string; nameEn: string; amount: number }[] = [];
  const liabilities: { code: string; nameAr: string; nameEn: string; amount: number }[] = [];
  const equity: { code: string; nameAr: string; nameEn: string; amount: number }[] = [];
  const entries = entriesOverride ?? getAllJournalEntries();
  const yearStart = asOfDate.slice(0, 4) + '-01-01';
  for (const acc of accounts) {
    if (acc.type === 'REVENUE' || acc.type === 'EXPENSE') continue;
    let debit = 0;
    let credit = 0;
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    if (entry.date > asOfDate) continue;
      for (const line of entry.lines) {
        if (line.accountId === acc.id) {
          debit += line.debit || 0;
          credit += line.credit || 0;
        }
      }
    }
    // في الميزانية العمومية: الأصول مدينة عادية، الالتزامات وحقوق الملكية دائنة عادية
    const isDebitNormal = acc.type === 'ASSET';
    const amount = isDebitNormal ? debit - credit : credit - debit;
    if (Math.abs(amount) > 0.001) {
      const item = { code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn || acc.nameAr, amount };
      if (acc.type === 'ASSET') assets.push(item);
      else if (acc.type === 'LIABILITY') liabilities.push(item);
      else equity.push(item);
    }
  }
  const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  const totalEquity = equity.reduce((s, i) => s + i.amount, 0);
  const pl = getIncomeStatement(yearStart, asOfDate, entries, accounts);
  const netIncome = pl.netIncome;
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
  };
}

/** التدفق النقدي - Cash Flow (مبسط) */
export function getCashFlowStatement(fromDate: string, toDate: string, entriesOverride?: JournalEntry[], accountsOverride?: ChartAccount[]): {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
} {
  const accounts = accountsOverride ?? getChartOfAccounts();
  const cashAccounts = accounts.filter((a) => (a.code === '1000' || a.code === '1100') && a.isActive);
  let opening = 0;
  let closing = 0;
  const entries = entriesOverride ?? getAllJournalEntries();
  const yearStart = fromDate.slice(0, 4) + '-01-01';
  for (const acc of cashAccounts) {
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    for (const line of entry.lines) {
      if (line.accountId === acc.id) {
        if (entry.date < fromDate) opening += (line.debit || 0) - (line.credit || 0);
          if (entry.date <= toDate) closing += (line.debit || 0) - (line.credit || 0);
        }
      }
    }
  }
  const pl = getIncomeStatement(fromDate, toDate, entries, accounts);
  return {
    operating: pl.netIncome,
    investing: 0,
    financing: 0,
    netChange: closing - opening,
  };
}

/** كشف حساب مع الرصيد الجاري */
export function getAccountLedgerWithBalance(
  accountId: string,
  fromDate?: string,
  toDate?: string,
  entriesOverride?: JournalEntry[],
  accountsOverride?: ChartAccount[]
): Array<{ entry: JournalEntry; line: JournalLine; debit: number; credit: number; runningBalance: number }> {
  const lines = getAccountLedger(accountId, fromDate, toDate, entriesOverride);
  const acc = accountsOverride?.find((a) => a.id === accountId) ?? getAccountById(accountId);
  const isDebitNormal = acc?.type === 'ASSET' || acc?.type === 'EXPENSE';
  let running = 0;
  return lines.map(({ entry, line, debit, credit }) => {
    running += isDebitNormal ? debit - credit : credit - debit;
    return { entry, line, debit, credit, runningBalance: running };
  });
}

/** الذكاء الاصطناعي: اقتراح حساب من النص */
export function aiSuggestAccount(description: string, accounts: ChartAccount[]): ChartAccount | null {
  const text = (description || '').toLowerCase().trim();
  if (!text) return null;
  const patterns: Array<{ regex: RegExp; code: string }> = [
    { regex: /\b(صندوق|نقد|cash|كاش|نقدي)\b/, code: '1000' },
    { regex: /\b(بنك|bank|تحويل|transfer|تحويل بنكي)\b/, code: '1100' },
    { regex: /\b(عميل|عملاء|receivable|مدين|ذمم مدينة)\b/, code: '1200' },
    { regex: /\b(عربون|وديعة|deposit|عربون مقدمة)\b/, code: '1300' },
    { regex: /\b(مورد|موردون|payable|دائن|ذمم دائنة)\b/, code: '2000' },
    { regex: /\b(ضريبة|vat|زكاة|tax|قيمة مضافة)\b/, code: '2200' },
    { regex: /\b(رأس مال|capital|استثمار)\b/, code: '3000' },
    { regex: /\b(إيجار|rent|إيراد إيجار)\b/, code: '4000' },
    { regex: /\b(مبيعات|sales|بيع)\b/, code: '4100' },
    { regex: /\b(رسوم|fees|إدارية)\b/, code: '4200' },
    { regex: /\b(مصروف|expense|صيانة|maintenance)\b/, code: '5000' },
    { regex: /\b(إداري|administrative)\b/, code: '5200' },
    { regex: /\b(رواتب|salaries|مرتبات)\b/, code: '5400' },
  ];
  for (const { regex, code } of patterns) {
    if (regex.test(text)) return accounts.find((a) => a.code === code) || null;
  }
  return null;
}

/** الذكاء الاصطناعي: اقتراح قيد من النص (للاستخدام المستقبلي) */
export function aiSuggestJournalLines(
  description: string,
  amount: number,
  accounts: ChartAccount[]
): Array<{ accountId: string; debit: number; credit: number }> | null {
  const suggested = aiSuggestAccount(description, accounts);
  if (!suggested || amount <= 0) return null;
  const cashAcc = accounts.find((a) => a.code === '1000');
  const bankAcc = accounts.find((a) => a.code === '1100');
  const revenueAcc = accounts.find((a) => a.code === '4000' || a.code === '4100');
  const expenseAcc = accounts.find((a) => a.code === '5000');
  if (suggested.type === 'REVENUE' && (cashAcc || bankAcc)) {
    return [
      { accountId: (bankAcc || cashAcc)!.id, debit: amount, credit: 0 },
      { accountId: suggested.id, debit: 0, credit: amount },
    ];
  }
  if (suggested.type === 'EXPENSE' && (cashAcc || bankAcc)) {
    return [
      { accountId: suggested.id, debit: amount, credit: 0 },
      { accountId: (bankAcc || cashAcc)!.id, debit: 0, credit: amount },
    ];
  }
  return null;
}

/** الذكاء الاصطناعي: كشف شذوذ (رصيد سالب غير متوقع) */
export function aiDetectAnomalies(): Array<{ accountId: string; accountCode: string; accountNameAr: string; balance: number; message: string }> {
  const accounts = getChartOfAccounts().filter((a) => a.isActive);
  const anomalies: Array<{ accountId: string; accountCode: string; accountNameAr: string; balance: number; message: string }> = [];
  for (const acc of accounts) {
    const { balance } = getAccountBalance(acc.id);
    if (acc.type === 'ASSET' && balance < -0.01) {
      anomalies.push({ accountId: acc.id, accountCode: acc.code, accountNameAr: acc.nameAr, balance, message: 'رصيد أصول سالب - تحقق من القيود' });
    }
    if (acc.type === 'LIABILITY' && balance < -0.01) {
      anomalies.push({ accountId: acc.id, accountCode: acc.code, accountNameAr: acc.nameAr, balance, message: 'رصيد التزامات سالب - تحقق من القيود' });
    }
  }
  return anomalies;
}

/** إنشاء قيد رصيد افتتاحي */
export function createOpeningBalanceEntry(
  accountId: string,
  amount: number,
  date: string,
  isDebit: boolean
): JournalEntry {
  const equityAcc = getChartOfAccounts().find((a) => a.code === '3000' || a.code === '3100');
  if (!equityAcc) throw new Error('حساب حقوق الملكية غير موجود');
  const lines: JournalLine[] = isDebit
    ? [
        { accountId, debit: amount, credit: 0, descriptionAr: 'رصيد افتتاحي', descriptionEn: 'Opening balance' },
        { accountId: equityAcc.id, debit: 0, credit: amount, descriptionAr: 'رصيد افتتاحي', descriptionEn: 'Opening balance' },
      ]
    : [
        { accountId: equityAcc.id, debit: amount, credit: 0, descriptionAr: 'رصيد افتتاحي', descriptionEn: 'Opening balance' },
        { accountId, debit: 0, credit: amount, descriptionAr: 'رصيد افتتاحي', descriptionEn: 'Opening balance' },
      ];
  return createJournalEntry({
    date,
    lines,
    descriptionAr: 'قيد رصيد افتتاحي',
    descriptionEn: 'Opening balance entry',
    documentType: 'JOURNAL',
    status: 'APPROVED',
  });
}
