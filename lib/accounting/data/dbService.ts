/**
 * Database Service - Prisma-backed accounting storage
 * Server-side only - used by API routes
 */

import { prisma } from '@/lib/prisma';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import type { AccountingAccountType, AccountingDocType, AccountingDocStatus, Prisma } from '@prisma/client';

const DEFAULT_ACCOUNTS: Array<{ code: string; nameAr: string; nameEn: string; type: AccountingAccountType; sortOrder: number }> = [
  { code: '1000', nameAr: 'الصندوق', nameEn: 'Cash', type: 'ASSET', sortOrder: 1 },
  { code: '1100', nameAr: 'البنوك', nameEn: 'Banks', type: 'ASSET', sortOrder: 2 },
  { code: '1150', nameAr: 'شيكات تحت التحصيل', nameEn: 'Cheques Receivable', type: 'ASSET', sortOrder: 3 },
  { code: '1200', nameAr: 'العملاء', nameEn: 'Receivables', type: 'ASSET', sortOrder: 4 },
  { code: '1210', nameAr: 'ذمم مدينة أخرى', nameEn: 'Other Receivables', type: 'ASSET', sortOrder: 5 },
  { code: '1300', nameAr: 'عربونات مقدمة', nameEn: 'Prepaid Deposits', type: 'ASSET', sortOrder: 5 },
  { code: '1400', nameAr: 'مصروفات مقدمة', nameEn: 'Prepaid Expenses', type: 'ASSET', sortOrder: 6 },
  { code: '1500', nameAr: 'أصول أخرى', nameEn: 'Other Assets', type: 'ASSET', sortOrder: 7 },
  { code: '2000', nameAr: 'الموردون', nameEn: 'Payables', type: 'LIABILITY', sortOrder: 8 },
  { code: '2100', nameAr: 'عربونات مستلمة', nameEn: 'Deposits Received', type: 'LIABILITY', sortOrder: 9 },
  { code: '2200', nameAr: 'ضرائب مستحقة', nameEn: 'Tax Payable', type: 'LIABILITY', sortOrder: 10 },
  { code: '2300', nameAr: 'التزامات أخرى', nameEn: 'Other Liabilities', type: 'LIABILITY', sortOrder: 11 },
  { code: '3000', nameAr: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', sortOrder: 12 },
  { code: '3100', nameAr: 'أرباح محتجزة', nameEn: 'Retained Earnings', type: 'EQUITY', sortOrder: 13 },
  { code: '4000', nameAr: 'إيرادات العقارات والإيجار', nameEn: 'Property & Rent Revenue', type: 'REVENUE', sortOrder: 14 },
  { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'REVENUE', sortOrder: 15 },
  { code: '4200', nameAr: 'رسوم إدارية', nameEn: 'Administrative Fees', type: 'REVENUE', sortOrder: 16 },
  { code: '4250', nameAr: 'إيرادات الاشتراكات (الباقات)', nameEn: 'Subscription Revenue', type: 'REVENUE', sortOrder: 17 },
  { code: '4300', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', sortOrder: 18 },
  { code: '5000', nameAr: 'مصروفات التشغيل', nameEn: 'Operating Expenses', type: 'EXPENSE', sortOrder: 19 },
  { code: '5100', nameAr: 'مصروفات الصيانة', nameEn: 'Maintenance Expenses', type: 'EXPENSE', sortOrder: 20 },
  { code: '5200', nameAr: 'مصروفات إدارية', nameEn: 'Administrative Expenses', type: 'EXPENSE', sortOrder: 21 },
  { code: '5300', nameAr: 'إيجارات ومرافق', nameEn: 'Rent & Utilities', type: 'EXPENSE', sortOrder: 22 },
  { code: '5400', nameAr: 'رواتب ومزايا', nameEn: 'Salaries & Benefits', type: 'EXPENSE', sortOrder: 23 },
  { code: '5500', nameAr: 'مصروفات أخرى', nameEn: 'Other Expenses', type: 'EXPENSE', sortOrder: 24 },
];

const DOC_TYPE_MAP: Record<string, AccountingDocType> = {
  INVOICE: 'INVOICE',
  RECEIPT: 'RECEIPT',
  QUOTE: 'QUOTE',
  DEPOSIT: 'DEPOSIT',
  PAYMENT: 'PAYMENT',
  JOURNAL: 'JOURNAL',
  PURCHASE_INV: 'PURCHASE_INV',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  CREDIT_NOTE: 'CREDIT_NOTE',
  DEBIT_NOTE: 'DEBIT_NOTE',
  OTHER: 'OTHER',
};

/** Default page size for accounting lists — scales to 1M+ records */
export const ACCOUNTING_DEFAULT_PAGE_SIZE = 150;
export const ACCOUNTING_MAX_PAGE_SIZE = 500;

const DOC_STATUS_MAP: Record<string, AccountingDocStatus> = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
};

export async function ensureAccountingAccounts() {
  const count = await prisma.accountingAccount.count();
  if (count === 0) {
    for (const a of DEFAULT_ACCOUNTS) {
      const { sortOrder: _so, ...rest } = a;
      await prisma.accountingAccount.create({
        data: { ...rest, parentId: null },
      });
    }
  }
  await ensureSubscriptionRevenueAccount();
  await ensurePropertyRentRevenueAccount();
  await ensureChequeReceivableAccount();
}

/** حساب شيكات تحت التحصيل (1150) */
export async function ensureChequeReceivableAccount() {
  const existing = await prisma.accountingAccount.findUnique({ where: { code: '1150' } });
  if (!existing) {
    await prisma.accountingAccount.create({
      data: {
        code: '1150',
        nameAr: 'شيكات تحت التحصيل',
        nameEn: 'Cheques Receivable',
        type: 'ASSET',
        parentId: null,
      },
    });
  }
}

/** حساب مخصص للاشتراكات: إيرادات الباقات من المستخدمين (4250) — يُستخدم لكل دفعة اشتراك */
export async function ensureSubscriptionRevenueAccount() {
  const existing = await prisma.accountingAccount.findUnique({
    where: { code: '4250' },
  });
  if (!existing) {
    await prisma.accountingAccount.create({
      data: {
        code: '4250',
        nameAr: 'إيرادات الاشتراكات (الباقات)',
        nameEn: 'Subscription Revenue',
        type: 'REVENUE',
        parentId: null,
      },
    });
  }
}

/** حساب مخصص للعقارات: إيرادات حجوزات الوحدات والإيجار (4000) — يُستخدم لكل إيصال حجز عقار */
export async function ensurePropertyRentRevenueAccount() {
  const existing = await prisma.accountingAccount.findUnique({
    where: { code: '4000' },
  });
  if (!existing) {
    await prisma.accountingAccount.create({
      data: {
        code: '4000',
        nameAr: 'إيرادات العقارات والإيجار',
        nameEn: 'Property & Rent Revenue',
        type: 'REVENUE',
        parentId: null,
      },
    });
  }
}

export async function ensureFiscalPeriods() {
  const existing = await prisma.accountingFiscalPeriod.count();
  if (existing > 0) return;
  const year = new Date().getFullYear();
  const periods: Array<{ code: string; startDate: Date; endDate: Date }> = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0);
    const code = `M${String(m + 1).padStart(2, '0')}-${year}`;
    periods.push({ code, startDate: start, endDate: end });
  }
  for (const p of periods) {
    await prisma.accountingFiscalPeriod.create({
      data: { code: p.code, startDate: p.startDate, endDate: p.endDate, isLocked: false },
    });
  }
}

export async function getFiscalPeriodsFromDb() {
  await ensureFiscalPeriods();
  const rows = await prisma.accountingFiscalPeriod.findMany({
    orderBy: { startDate: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    isLocked: r.isLocked,
    closedAt: r.closedAt?.toISOString(),
    closedBy: r.closedBy,
  }));
}

export async function lockPeriodInDb(periodId: string, userId?: string) {
  const period = await prisma.accountingFiscalPeriod.findUnique({ where: { id: periodId } });
  if (!period) return null;
  if (period.isLocked) return { id: period.id, code: period.code, startDate: period.startDate.toISOString().slice(0, 10), endDate: period.endDate.toISOString().slice(0, 10), isLocked: true };
  await prisma.accountingFiscalPeriod.update({
    where: { id: periodId },
    data: { isLocked: true, closedAt: new Date(), closedBy: userId },
  });
  await prisma.accountingAuditLog.create({
    data: { action: 'PERIOD_LOCK', entityType: 'PERIOD', entityId: periodId, userId, reason: 'Period closed for posting' },
  });
  const updated = await prisma.accountingFiscalPeriod.findUnique({ where: { id: periodId } });
  return updated ? { id: updated.id, code: updated.code, startDate: updated.startDate.toISOString().slice(0, 10), endDate: updated.endDate.toISOString().slice(0, 10), isLocked: updated.isLocked } : null;
}

export async function isPeriodLockedForDate(date: string): Promise<boolean> {
  const d = new Date(date).getTime();
  const periods = await prisma.accountingFiscalPeriod.findMany();
  const period = periods.find((p) => {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    return d >= start && d <= end;
  });
  return period?.isLocked ?? false;
}

/** إعادة حساب أرصدة الحسابات من القيود (للمعاملات المسجلة قبل تفعيل تحديث الرصيد التلقائي) */
export async function recomputeAccountBalances(): Promise<void> {
  const entries = await prisma.accountingJournalEntry.findMany({
    where: { status: { in: ['APPROVED', 'POSTED'] } },
    include: { lines: true },
  });
  const balances: Record<string, number> = {};
  for (const entry of entries) {
    for (const line of entry.lines) {
      balances[line.accountId] = (balances[line.accountId] ?? 0) + (line.debit - line.credit);
    }
  }
  const accounts = await prisma.accountingAccount.findMany();
  for (const acc of accounts) {
    const delta = balances[acc.id] ?? 0;
    const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
    const targetBalance = isDebitNormal ? delta : -delta;
    if (Math.abs((acc.balance ?? 0) - targetBalance) > 0.001) {
      await prisma.accountingAccount.update({
        where: { id: acc.id },
        data: { balance: targetBalance },
      });
    }
  }
}

export async function getAccountsFromDb() {
  await ensureAccountingAccounts();
  let rows = await prisma.accountingAccount.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });
  const totalBalance = rows.reduce((s, r) => s + Math.abs(r.balance ?? 0), 0);
  const entryCount = await prisma.accountingJournalEntry.count({ where: { status: { in: ['APPROVED', 'POSTED'] } } });
  if (entryCount > 0 && totalBalance < 0.001) {
    try {
      await recomputeAccountBalances();
      rows = await prisma.accountingAccount.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
    } catch {
      // إبقاء الصفوف الحالية عند فشل إعادة الحساب
    }
  }
  return rows.map((r, i) => ({
    id: r.id,
    code: r.code,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    type: r.type,
    parentId: r.parentId,
    isActive: r.isActive,
    sortOrder: i,
    balance: r.balance ?? 0,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getJournalEntriesFromDb(filters?: { fromDate?: string; toDate?: string; limit?: number; offset?: number }) {
  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  const limit = filters?.limit && filters.limit > 0 ? Math.min(ACCOUNTING_MAX_PAGE_SIZE, filters.limit) : undefined;
  const offset = limit ? Math.max(0, filters?.offset ?? 0) : undefined;
  const rows = await prisma.accountingJournalEntry.findMany({
    where,
    include: { lines: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    ...(limit ? { take: limit, skip: offset } : {}),
  });
  return rows.map((r) => ({
    id: r.id,
    serialNumber: r.serialNumber,
    version: r.version,
    date: r.date.toISOString().slice(0, 10),
    lines: r.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      descriptionAr: l.descriptionAr,
      descriptionEn: l.descriptionEn,
    })),
    totalDebit: r.totalDebit,
    totalCredit: r.totalCredit,
    descriptionAr: r.descriptionAr,
    descriptionEn: r.descriptionEn,
    documentId: r.documentId,
    bankAccountId: r.bankAccountId,
    contactId: r.contactId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function countJournalEntriesFromDb(filters?: { fromDate?: string; toDate?: string }) {
  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  return prisma.accountingJournalEntry.count({ where });
}

export async function getJournalEntriesPageFromDb(filters?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(ACCOUNTING_MAX_PAGE_SIZE, filters?.limit ?? ACCOUNTING_DEFAULT_PAGE_SIZE);
  const offset = Math.max(0, filters?.offset ?? 0);
  const [items, total] = await Promise.all([
    getJournalEntriesFromDb({ ...filters, limit, offset }),
    countJournalEntriesFromDb(filters),
  ]);
  return { items, total, limit, offset };
}

const ENTRY_STATUS_MAP: Record<string, 'DRAFT' | 'PENDING' | 'APPROVED' | 'POSTED' | 'CANCELLED'> = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
};

export async function createJournalEntryInDb(data: {
  date: string;
  lines: Array<{ accountId: string; debit: number; credit: number; descriptionAr?: string; descriptionEn?: string }>;
  descriptionAr?: string;
  descriptionEn?: string;
  documentType?: string;
  documentId?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: string;
  status?: string;
  createdBy?: string;
}) {
  await ensureFiscalPeriods();
  const locked = await isPeriodLockedForDate(data.date);
  if (locked) throw new Error('لا يمكن الترحيل: الفترة المالية مغلقة');
  const serialNumber = await generateBhdSerial('ACC-JRN');
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('قيد غير متوازن: المدين يجب أن يساوي الدائن');
  }
  const entryStatus = (data.status && ENTRY_STATUS_MAP[data.status]) ? ENTRY_STATUS_MAP[data.status] : 'APPROVED';
  const entry = await prisma.accountingJournalEntry.create({
    data: {
      serialNumber,
      date: new Date(data.date),
      totalDebit,
      totalCredit,
      descriptionAr: data.descriptionAr ?? null,
      descriptionEn: data.descriptionEn ?? null,
      reference: data.documentId ? data.documentId : null,
      documentId: data.documentId ?? null,
      bankAccountId: data.bankAccountId ?? null,
      contactId: data.contactId ?? null,
      status: entryStatus,
      createdBy: data.createdBy ?? 'system',
      lines: {
        create: data.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          descriptionAr: l.descriptionAr ?? null,
          descriptionEn: l.descriptionEn ?? null,
        })),
      },
    },
    include: { lines: true },
  });
  for (const line of entry.lines) {
    const acc = await prisma.accountingAccount.findUnique({ where: { id: line.accountId } });
    if (!acc) continue;
    const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
    const delta = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
    await prisma.accountingAccount.update({
      where: { id: acc.id },
      data: { balance: { increment: delta } },
    });
  }
  await prisma.accountingAuditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'JOURNAL_ENTRY',
      entityId: entry.id,
      newState: JSON.stringify({ serialNumber: entry.serialNumber, totalDebit, totalCredit }),
    },
  });
  return {
    id: entry.id,
    serialNumber: entry.serialNumber,
    version: entry.version,
    date: entry.date.toISOString().slice(0, 10),
    lines: entry.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      descriptionAr: l.descriptionAr,
      descriptionEn: l.descriptionEn,
    })),
    totalDebit: entry.totalDebit,
    totalCredit: entry.totalCredit,
    descriptionAr: entry.descriptionAr,
    descriptionEn: entry.descriptionEn,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function getDocumentsFromDb(filters?: {
  fromDate?: string;
  toDate?: string;
  type?: string;
  contactId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: {
    date?: { gte?: Date; lte?: Date };
    type?: AccountingDocType;
    contactId?: string;
  } = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  if (filters?.type) where.type = filters.type as AccountingDocType;
  if (filters?.contactId) where.contactId = filters.contactId;
  const limit = filters?.limit && filters.limit > 0 ? Math.min(ACCOUNTING_MAX_PAGE_SIZE, filters.limit) : undefined;
  const offset = limit ? Math.max(0, filters?.offset ?? 0) : undefined;
  const rows = await prisma.accountingDocument.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    ...(limit ? { take: limit, skip: offset } : {}),
  });
  return rows.map((r) => ({
    id: r.id,
    serialNumber: r.serialNumber,
    type: r.type,
    status: r.status,
    date: r.date.toISOString().slice(0, 10),
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : undefined,
    contactId: r.contactId,
    bankAccountId: r.bankAccountId,
    propertyId: r.propertyId,
    projectId: r.projectId,
    vatRate: r.vatRate,
    vatAmount: r.vatAmount,
    totalAmount: r.totalAmount,
    netAmount: r.netAmount,
    amount: Number(r.totalAmount ?? r.netAmount ?? 0),
    currency: 'OMR',
    descriptionAr: r.descriptionAr,
    descriptionEn: r.descriptionEn,
    attachments: r.attachmentsJson ? JSON.parse(r.attachmentsJson) : undefined,
    purchaseOrder: r.purchaseOrder,
    reference: r.reference,
    branch: r.branch,
    journalEntryId: r.journalEntryId ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function countDocumentsFromDb(filters?: { fromDate?: string; toDate?: string; type?: string; contactId?: string }) {
  const where: {
    date?: { gte?: Date; lte?: Date };
    type?: AccountingDocType;
    contactId?: string;
  } = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  if (filters?.type) where.type = filters.type as AccountingDocType;
  if (filters?.contactId) where.contactId = filters.contactId;
  return prisma.accountingDocument.count({ where });
}

export async function getDocumentsPageFromDb(filters?: {
  fromDate?: string;
  toDate?: string;
  type?: string;
  contactId?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(ACCOUNTING_MAX_PAGE_SIZE, filters?.limit ?? ACCOUNTING_DEFAULT_PAGE_SIZE);
  const offset = Math.max(0, filters?.offset ?? 0);
  const [items, total] = await Promise.all([
    getDocumentsFromDb({ ...filters, limit, offset }),
    countDocumentsFromDb(filters),
  ]);
  return { items, total, limit, offset };
}

/** بادئات الأرقام المتسلسلة حسب نوع المستند - كل نوع له تسلسل مستقل */
const DOC_SERIAL_PREFIX: Record<string, string> = {
  INVOICE: 'INV',           // فاتورة بيع
  PURCHASE_INV: 'PINV',     // فاتورة مشتريات
  RECEIPT: 'RCP',           // إيصال
  QUOTE: 'QOT',            // عرض سعر
  DEPOSIT: 'DEP',          // عربون
  PAYMENT: 'PAY',          // دفعة
  PURCHASE_ORDER: 'PO',    // أمر شراء
  CREDIT_NOTE: 'CN',       // إشعار دائن
  DEBIT_NOTE: 'DN',        // إشعار مدين
  JOURNAL: 'JRN',          // قيد يومية
  OTHER: 'DOC',
};

export async function createDocumentInDb(data: {
  type: string;
  status: string;
  date: string;
  serialNumber?: string;
  dueDate?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: string;
  amount: number;
  currency?: string;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  netAmount?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  items?: any[];
  attachments?: { url: string; name: string }[];
  purchaseOrder?: string;
  reference?: string;
  branch?: string;
}) {
  const type = data.type as keyof typeof DOC_TYPE_MAP;
  const prefix = DOC_SERIAL_PREFIX[type] || 'DOC';
  const serialNumber = data.serialNumber?.trim() || (await generateBhdSerial(`ACC-${prefix}`));
  const doc = await prisma.accountingDocument.create({
    data: {
      serialNumber,
      type: (DOC_TYPE_MAP[data.type] || 'OTHER') as AccountingDocType,
      status: (DOC_STATUS_MAP[data.status] || 'APPROVED') as AccountingDocStatus,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId ?? null,
      bankAccountId: data.bankAccountId ?? null,
      propertyId: data.propertyId ?? null,
      projectId: data.projectId ?? null,
      vatRate: data.vatRate ?? null,
      vatAmount: data.vatAmount ?? null,
      totalAmount: data.totalAmount ?? data.amount,
      netAmount: data.netAmount ?? data.totalAmount ?? data.amount,
      descriptionAr: data.descriptionAr ?? null,
      descriptionEn: data.descriptionEn ?? null,
      attachmentsJson: data.attachments?.length ? JSON.stringify(data.attachments) : null,
      purchaseOrder: data.purchaseOrder?.trim() || null,
      reference: data.reference?.trim() || null,
      branch: data.branch?.trim() || null,
      createdBy: 'system',
    },
  });
  return {
    id: doc.id,
    serialNumber: doc.serialNumber,
    type: doc.type,
    status: doc.status,
    date: doc.date.toISOString().slice(0, 10),
    dueDate: doc.dueDate ? doc.dueDate.toISOString().slice(0, 10) : undefined,
    contactId: doc.contactId,
    bankAccountId: doc.bankAccountId,
    propertyId: doc.propertyId,
    projectId: doc.projectId,
    vatRate: doc.vatRate,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    netAmount: doc.netAmount,
    descriptionAr: doc.descriptionAr,
    descriptionEn: doc.descriptionEn,
    attachments: doc.attachmentsJson ? JSON.parse(doc.attachmentsJson) : undefined,
    purchaseOrder: doc.purchaseOrder,
    reference: doc.reference,
    branch: doc.branch,
    journalEntryId: doc.journalEntryId ?? undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function updateDocumentInDb(id: string, data: { journalEntryId?: string; contactId?: string | null }) {
  const doc = await prisma.accountingDocument.update({
    where: { id },
    data: {
      ...(data.journalEntryId !== undefined ? { journalEntryId: data.journalEntryId } : {}),
      ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
      updatedAt: new Date(),
    },
  });
  return doc;
}

/** ربط مستند محاسبي بجهة اتصال (للبيانات القديمة التي لم تُربط عند الإنشاء) */
export async function updateDocumentContactInDb(documentId: string, contactId: string | null): Promise<boolean> {
  await prisma.accountingDocument.update({
    where: { id: documentId },
    data: { contactId, updatedAt: new Date() },
  });
  return true;
}

export async function updateJournalStatusInDb(id: string, status: 'APPROVED' | 'CANCELLED') {
  const entry = await prisma.accountingJournalEntry.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    include: { lines: true },
  });
  await prisma.accountingAuditLog.create({
    data: {
      action: status === 'APPROVED' ? 'UPDATE' : 'CANCEL',
      entityType: 'JOURNAL_ENTRY',
      entityId: id,
      newState: JSON.stringify({ status }),
    },
  });
  return {
    id: entry.id,
    serialNumber: entry.serialNumber,
    version: entry.version,
    date: entry.date.toISOString().slice(0, 10),
    lines: entry.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      descriptionAr: l.descriptionAr,
      descriptionEn: l.descriptionEn,
    })),
    totalDebit: entry.totalDebit,
    totalCredit: entry.totalCredit,
    descriptionAr: entry.descriptionAr,
    descriptionEn: entry.descriptionEn,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function getDocumentByIdFromDb(id: string) {
  const d = await prisma.accountingDocument.findUnique({ where: { id } });
  if (!d) return null;
  return {
    id: d.id,
    serialNumber: d.serialNumber,
    type: d.type,
    status: d.status,
    date: d.date.toISOString().slice(0, 10),
    contactId: d.contactId,
    bankAccountId: d.bankAccountId,
    propertyId: d.propertyId,
    projectId: d.projectId,
    vatRate: d.vatRate,
    vatAmount: d.vatAmount,
    totalAmount: d.totalAmount,
    netAmount: d.netAmount,
    descriptionAr: d.descriptionAr,
    descriptionEn: d.descriptionEn,
    attachments: d.attachmentsJson ? JSON.parse(d.attachmentsJson) : undefined,
    purchaseOrder: d.purchaseOrder,
    reference: d.reference,
    branch: d.branch,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** إنشاء إيصال حجز عقار في المحاسبة (من واجهة الحجز أو من API الحجوزات) — يمنع التكرار حسب reference */
export async function createBookingReceiptInDb(booking: {
  id: string;
  propertyId: number;
  unitKey?: string;
  propertyTitleAr?: string;
  propertyTitleEn?: string;
  name: string;
  priceAtBooking: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReferenceNo?: string;
  contactId?: string | null;
  bankAccountId?: string | null;
}): Promise<{ docId: string; serialNumber: string } | null> {
  if (!booking.priceAtBooking || booking.priceAtBooking <= 0) return null;
  const ref = `booking:${booking.id}`;
  const existing = await prisma.accountingDocument.findFirst({
    where: { type: 'RECEIPT', reference: ref },
  });
  if (existing) return { docId: existing.id, serialNumber: existing.serialNumber };

  await ensureAccountingAccounts();
  const accounts = await getAccountsFromDb();
  const cashAcc = accounts.find((a: { code: string }) => a.code === '1000');
  const revenueAcc = accounts.find((a: { code: string }) => a.code === '4000');
  if (!cashAcc || !revenueAcc) return null;

  const date = (booking.paymentDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const unitPart = booking.unitKey ? ` - الوحدة: ${booking.unitKey}` : '';
  const descAr = `إيصال حجز - رقم العقار: ${booking.propertyId}${unitPart} - ${booking.name}`;
  const descEn = `Booking receipt - Property: ${booking.propertyId}${unitPart ? ` - Unit: ${booking.unitKey}` : ''} - ${booking.name}`;

  const doc = await createDocumentInDb({
    type: 'RECEIPT',
    status: 'APPROVED',
    date,
    amount: booking.priceAtBooking,
    currency: 'OMR',
    totalAmount: booking.priceAtBooking,
    descriptionAr: descAr,
    descriptionEn: descEn,
    contactId: booking.contactId ?? undefined,
    bankAccountId: booking.bankAccountId ?? undefined,
    propertyId: booking.propertyId,
    reference: ref,
  });

  const lines = [
    { accountId: cashAcc.id, debit: booking.priceAtBooking, credit: 0, descriptionAr: descAr, descriptionEn: descEn },
    { accountId: revenueAcc.id, debit: 0, credit: booking.priceAtBooking, descriptionAr: descAr, descriptionEn: descEn },
  ];
  await createJournalEntryInDb({
    date,
    lines,
    descriptionAr: descAr,
    descriptionEn: descEn,
    documentType: 'RECEIPT',
    documentId: doc.id,
    contactId: booking.contactId ?? undefined,
    propertyId: booking.propertyId,
    status: 'APPROVED',
    createdBy: 'booking-payment',
  });
  return { docId: doc.id, serialNumber: doc.serialNumber };
}

/** مزامنة تلقائية: إنشاء إيصال محاسبة لكل حجز مدفوع في BookingStorage لم يُنشأ له إيصال بعد. تُستدعى من الخادم فقط (بدون زر أو تدخل مستخدم). */
export async function syncPaidBookingsToAccountingDb(): Promise<number> {
  const rows = await prisma.bookingStorage.findMany({ orderBy: { createdAt: 'desc' } });
  let created = 0;
  for (const r of rows) {
    let b: { id?: string; type?: string; paymentConfirmed?: boolean; priceAtBooking?: number; propertyId?: number; unitKey?: string; propertyTitleAr?: string; propertyTitleEn?: string; name?: string; paymentDate?: string; paymentMethod?: string; paymentReferenceNo?: string; contactId?: string; bankAccountId?: string };
    try {
      b = JSON.parse(r.data);
    } catch {
      continue;
    }
    if (b.type !== 'BOOKING' || !b.paymentConfirmed || !b.priceAtBooking || b.priceAtBooking <= 0 || !b.id) continue;
    try {
      const result = await createBookingReceiptInDb({
        id: b.id,
        propertyId: Number(b.propertyId),
        unitKey: b.unitKey,
        propertyTitleAr: b.propertyTitleAr,
        propertyTitleEn: b.propertyTitleEn,
        name: b.name || '',
        priceAtBooking: Number(b.priceAtBooking),
        paymentDate: b.paymentDate,
        paymentMethod: b.paymentMethod,
        paymentReferenceNo: b.paymentReferenceNo,
        contactId: b.contactId,
        bankAccountId: b.bankAccountId,
      });
      if (result) created++;
    } catch {
      // تخطي عند خطأ (مثلاً فترة مغلقة) دون إيقاف المزامنة
    }
  }
  return created;
}

/** مزامنة سجل الاشتراكات: إنشاء إيصال محاسبة لكل SubscriptionHistory فيها amountPaid > 0 وبدون receiptDocumentId. */
export async function syncSubscriptionHistoryToAccountingDb(): Promise<number> {
  let created = 0;
  try {
    const list = await prisma.subscriptionHistory.findMany({
      where: { amountPaid: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });
    await ensureAccountingAccounts();
    const accounts = await getAccountsFromDb();
    const cashAcc = accounts.find((a: { code: string }) => a.code === '1000');
    const revenueAcc = accounts.find((a: { code: string }) => a.code === '4250');
    if (!cashAcc || !revenueAcc) return 0;
    for (const h of list) {
      const amount = Number(h.amountPaid ?? 0);
      if (amount <= 0) continue;
      if (h.receiptDocumentId) {
        const exists = await prisma.accountingDocument.findUnique({ where: { id: h.receiptDocumentId } });
        if (exists) continue;
      }
      const date = h.startAt instanceof Date ? h.startAt.toISOString().slice(0, 10) : new Date(h.startAt).toISOString().slice(0, 10);
      const descAr = `دفع اشتراك - ${h.planNameAr} - فترة: ${date} إلى ${h.endAt instanceof Date ? (h.endAt as Date).toISOString().slice(0, 10) : new Date(h.endAt).toISOString().slice(0, 10)}`;
      const descEn = `Subscription payment - ${h.planNameEn} - Period: ${date} to ${h.endAt instanceof Date ? (h.endAt as Date).toISOString().slice(0, 10) : new Date(h.endAt).toISOString().slice(0, 10)}`;
      try {
        const doc = await createDocumentInDb({
          type: 'RECEIPT',
          status: 'APPROVED',
          date,
          amount,
          currency: 'OMR',
          totalAmount: amount,
          descriptionAr: descAr,
          descriptionEn: descEn,
        });
        const lines = [
          { accountId: cashAcc.id, debit: amount, credit: 0, descriptionAr: descAr, descriptionEn: descEn },
          { accountId: revenueAcc.id, debit: 0, credit: amount, descriptionAr: descAr, descriptionEn: descEn },
        ];
        await createJournalEntryInDb({
          date,
          lines,
          descriptionAr: descAr,
          descriptionEn: descEn,
          documentType: 'RECEIPT',
          documentId: doc.id,
          status: 'APPROVED',
          createdBy: 'subscription-history-sync',
        });
        await prisma.subscriptionHistory.update({
          where: { id: h.id },
          data: { receiptDocumentId: doc.id },
        });
        created++;
      } catch (err) {
        console.error('syncSubscriptionHistoryToAccountingDb item:', h.id, err);
      }
    }
  } catch (err) {
    console.error('syncSubscriptionHistoryToAccountingDb:', err);
  }
  return created;
}

export async function updateDocumentStatusInDb(id: string, status: 'APPROVED' | 'CANCELLED' | 'PAID') {
  const doc = await prisma.accountingDocument.update({
    where: { id },
    data: { status: status as AccountingDocStatus, updatedAt: new Date() },
  });
  await prisma.accountingAuditLog.create({
    data: {
      action: status === 'APPROVED' ? 'UPDATE' : status === 'PAID' ? 'UPDATE' : 'CANCEL',
      entityType: 'DOCUMENT',
      entityId: id,
      newState: JSON.stringify({ status }),
    },
  });
  return {
    id: doc.id,
    serialNumber: doc.serialNumber,
    type: doc.type,
    status: doc.status,
    date: doc.date.toISOString().slice(0, 10),
    contactId: doc.contactId,
    bankAccountId: doc.bankAccountId,
    propertyId: doc.propertyId,
    projectId: doc.projectId,
    vatRate: doc.vatRate,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    netAmount: doc.netAmount,
    descriptionAr: doc.descriptionAr,
    descriptionEn: doc.descriptionEn,
    purchaseOrder: doc.purchaseOrder,
    reference: doc.reference,
    branch: doc.branch,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** VAT return summary for Oman (5% standard) — from documents in date range */
export async function getVatReportFromDb(fromDate: string, toDate: string) {
  const { buildVatReportFromDocuments } = await import('../reports/vatReport');
  const rows = await prisma.accountingDocument.findMany({
    where: {
      date: { gte: new Date(fromDate), lte: new Date(toDate) },
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ date: 'asc' }, { serialNumber: 'asc' }],
  });
  const docs = rows.map((r) => ({
    id: r.id,
    serialNumber: r.serialNumber,
    type: r.type,
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    vatAmount: r.vatAmount,
    totalAmount: r.totalAmount,
    netAmount: r.netAmount,
  }));
  return buildVatReportFromDocuments(docs, fromDate, toDate);
}

/** AR/AP aging — open invoices or purchase invoices */
export async function getAgingReportFromDb(ledger: 'ar' | 'ap', asOfDate: string) {
  const { buildAgingReport } = await import('../reports/agingReport');
  const types: AccountingDocType[] = ledger === 'ar' ? ['INVOICE'] : ['PURCHASE_INV'];
  const rows = await prisma.accountingDocument.findMany({
    where: {
      type: { in: types },
      status: { notIn: ['PAID', 'CANCELLED'] },
      date: { lte: new Date(asOfDate) },
    },
    orderBy: [{ date: 'asc' }, { serialNumber: 'asc' }],
  });
  const docs = rows.map((r) => ({
    id: r.id,
    serialNumber: r.serialNumber,
    type: r.type,
    status: r.status,
    date: r.date.toISOString().slice(0, 10),
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : r.date.toISOString().slice(0, 10),
    contactId: r.contactId,
    totalAmount: r.totalAmount,
    netAmount: r.netAmount,
  }));
  return buildAgingReport(docs, ledger, asOfDate);
}

/** Bank/cash ledger lines from journal for reconciliation */
export async function getBankLedgerFromDb(params: {
  mode: 'CASH' | 'BANK';
  fromDate?: string;
  toDate?: string;
  /** Filter to movements linked to documents on this bank account (serial in journal description) */
  bankAccountId?: string;
}) {
  const { computeBookBalance } = await import('../reports/bankReconciliation');
  await ensureAccountingAccounts();
  const code = params.mode === 'CASH' ? '1000' : '1100';
  const acc = await prisma.accountingAccount.findUnique({ where: { code } });
  if (!acc) return { lines: [], bookBalance: 0, accountCode: code };

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.fromDate) dateFilter.gte = new Date(params.fromDate);
  if (params.toDate) dateFilter.lte = new Date(params.toDate);

  let serialFilter: Set<string> | null = null;
  if (params.bankAccountId && params.bankAccountId !== 'CASH') {
    const linkedDocs = await prisma.accountingDocument.findMany({
      where: { bankAccountId: params.bankAccountId },
      select: { serialNumber: true },
    });
    serialFilter = new Set(linkedDocs.map((d) => d.serialNumber));
  }

  const entries = await prisma.accountingJournalEntry.findMany({
    where: {
      status: { in: ['APPROVED', 'POSTED'] },
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      lines: { some: { accountId: acc.id } },
    },
    include: { lines: true },
    orderBy: [{ date: 'asc' }, { serialNumber: 'asc' }],
  });

  const lines: Array<{
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    reference?: string;
    journalSerial?: string;
  }> = [];

  for (const entry of entries) {
    if (params.bankAccountId && params.bankAccountId !== 'CASH') {
      const directMatch = entry.bankAccountId === params.bankAccountId;
      let legacyMatch = false;
      if (!directMatch && serialFilter) {
        const hay = `${entry.descriptionAr || ''} ${entry.descriptionEn || ''} ${entry.reference || ''} ${entry.serialNumber}`;
        legacyMatch = [...serialFilter].some((sn) => hay.includes(sn));
      }
      if (!directMatch && !legacyMatch) continue;
    }
    for (const line of entry.lines) {
      if (line.accountId !== acc.id) continue;
      if (line.debit < 0.001 && line.credit < 0.001) continue;
      lines.push({
        id: `${entry.id}-${line.id}`,
        date: entry.date.toISOString().slice(0, 10),
        description: line.descriptionAr || entry.descriptionAr || entry.serialNumber,
        debit: line.debit,
        credit: line.credit,
        reference: entry.reference ?? undefined,
        journalSerial: entry.serialNumber,
      });
    }
  }

  return {
    lines,
    bookBalance: computeBookBalance(lines),
    accountCode: code,
  };
}

async function computeIncomeTotalsFromDb(fromDate: string, toDate: string) {
  const [entries, accounts] = await Promise.all([
    getJournalEntriesFromDb({ fromDate, toDate }),
    getAccountsFromDb(),
  ]);
  const active = entries.filter((e) => e.status !== 'CANCELLED');
  let revenue = 0;
  let expense = 0;
  const revIds = new Set(accounts.filter((a) => a.type === 'REVENUE').map((a) => a.id));
  const expIds = new Set(accounts.filter((a) => a.type === 'EXPENSE').map((a) => a.id));
  for (const entry of active) {
    for (const line of entry.lines) {
      if (revIds.has(line.accountId)) revenue += (line.credit || 0) - (line.debit || 0);
      if (expIds.has(line.accountId)) expense += (line.debit || 0) - (line.credit || 0);
    }
  }
  return {
    revenue: Math.round(revenue * 100) / 100,
    expense: Math.round(expense * 100) / 100,
  };
}

export async function getCashFlowFromDb(fromDate: string, toDate: string) {
  const { buildCashFlowFromJournalLines } = await import('../reports/cashFlowReport');
  await ensureAccountingAccounts();
  const cashAccounts = await prisma.accountingAccount.findMany({
    where: { code: { in: ['1000', '1100'] } },
    select: { id: true },
  });
  const entries = await prisma.accountingJournalEntry.findMany({
    where: {
      status: { in: ['APPROVED', 'POSTED'] },
      date: { gte: new Date(fromDate), lte: new Date(toDate) },
      lines: { some: { accountId: { in: cashAccounts.map((a) => a.id) } } },
    },
    include: { lines: true },
  });
  return buildCashFlowFromJournalLines(entries, cashAccounts.map((a) => a.id), fromDate, toDate);
}

export async function getPeriodCompareFromDb(fromDate: string, toDate: string) {
  const { buildPeriodCompareReport, previousPeriodRange } = await import('../reports/periodCompareReport');
  const prev = previousPeriodRange(fromDate, toDate);
  const [current, previous] = await Promise.all([
    computeIncomeTotalsFromDb(fromDate, toDate),
    computeIncomeTotalsFromDb(prev.fromDate, prev.toDate),
  ]);
  return buildPeriodCompareReport(
    { fromDate, toDate, ...current },
    { fromDate: prev.fromDate, toDate: prev.toDate, ...previous }
  );
}

/** Bank/cash statement with entry metadata for reports UI */
export async function getBankStatementFromDb(params: {
  bankAccountId: string;
  fromDate?: string;
  toDate?: string;
}) {
  await ensureAccountingAccounts();
  const isCash = params.bankAccountId === 'CASH';
  const code = isCash ? '1000' : '1100';
  const acc = await prisma.accountingAccount.findUnique({ where: { code } });
  if (!acc) {
    return {
      report: 'bankStatement' as const,
      bankAccountId: params.bankAccountId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      lines: [],
      balance: { debit: 0, credit: 0, balance: 0 },
    };
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.fromDate) dateFilter.gte = new Date(params.fromDate);
  if (params.toDate) dateFilter.lte = new Date(params.toDate);

  let serialFilter: Set<string> | null = null;
  if (!isCash) {
    const linkedDocs = await prisma.accountingDocument.findMany({
      where: { bankAccountId: params.bankAccountId },
      select: { serialNumber: true },
    });
    serialFilter = new Set(linkedDocs.map((d) => d.serialNumber));
  }

  const entries = await prisma.accountingJournalEntry.findMany({
    where: {
      status: { in: ['APPROVED', 'POSTED'] },
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      lines: { some: { accountId: acc.id } },
    },
    include: { lines: true },
    orderBy: [{ date: 'asc' }, { serialNumber: 'asc' }],
  });

  const docIds = [...new Set(entries.map((e) => e.documentId).filter(Boolean))] as string[];
  const docs =
    docIds.length > 0
      ? await prisma.accountingDocument.findMany({
          where: { id: { in: docIds } },
          select: { id: true, propertyId: true },
        })
      : [];
  const docMap = new Map(docs.map((d) => [d.id, d]));

  const lines: Array<{
    entryId: string;
    date: string;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
    contactId?: string | null;
    propertyId?: number | null;
    debit: number;
    credit: number;
  }> = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (isCash) {
      if (entry.bankAccountId) continue;
    } else {
      const directMatch = entry.bankAccountId === params.bankAccountId;
      let legacyMatch = false;
      if (!directMatch && serialFilter) {
        const hay = `${entry.descriptionAr || ''} ${entry.descriptionEn || ''} ${entry.reference || ''} ${entry.serialNumber}`;
        legacyMatch = [...serialFilter].some((sn) => hay.includes(sn));
      }
      if (!directMatch && !legacyMatch) continue;
    }

    for (const line of entry.lines) {
      if (line.accountId !== acc.id) continue;
      if (line.debit < 0.001 && line.credit < 0.001) continue;
      const doc = entry.documentId ? docMap.get(entry.documentId) : undefined;
      lines.push({
        entryId: entry.id,
        date: entry.date.toISOString().slice(0, 10),
        descriptionAr: entry.descriptionAr,
        descriptionEn: entry.descriptionEn,
        contactId: entry.contactId,
        propertyId: doc?.propertyId ?? null,
        debit: line.debit,
        credit: line.credit,
      });
      totalDebit += line.debit;
      totalCredit += line.credit;
    }
  }

  return {
    report: 'bankStatement' as const,
    bankAccountId: params.bankAccountId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    lines,
    balance: {
      debit: Math.round(totalDebit * 100) / 100,
      credit: Math.round(totalCredit * 100) / 100,
      balance: Math.round((totalDebit - totalCredit) * 100) / 100,
    },
  };
}

/** Property/tenant ledger from journal entries linked by contact or document.propertyId */
export async function getPropertyLedgerFromDb(params: {
  propertyId?: number;
  contactId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  await ensureAccountingAccounts();

  if (!params.propertyId && !params.contactId) {
    return {
      report: 'propertyLedger' as const,
      fromDate: params.fromDate,
      toDate: params.toDate,
      entries: [],
      totals: { debit: 0, credit: 0, count: 0 },
    };
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.fromDate) dateFilter.gte = new Date(params.fromDate);
  if (params.toDate) dateFilter.lte = new Date(params.toDate);

  let propertyDocIds: string[] = [];
  if (params.propertyId) {
    const docs = await prisma.accountingDocument.findMany({
      where: { propertyId: params.propertyId },
      select: { id: true },
    });
    propertyDocIds = docs.map((d) => d.id);
    if (propertyDocIds.length === 0 && !params.contactId) {
      return {
        report: 'propertyLedger' as const,
        fromDate: params.fromDate,
        toDate: params.toDate,
        entries: [],
        totals: { debit: 0, credit: 0, count: 0 },
      };
    }
  }

  const where: Prisma.AccountingJournalEntryWhereInput = {
    status: { in: ['APPROVED', 'POSTED'] },
    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
  };

  if (params.propertyId && params.contactId) {
    const or: Prisma.AccountingJournalEntryWhereInput[] = [{ contactId: params.contactId }];
    if (propertyDocIds.length) or.push({ documentId: { in: propertyDocIds } });
    where.OR = or;
  } else if (params.contactId) {
    where.contactId = params.contactId;
  } else if (params.propertyId && propertyDocIds.length) {
    where.documentId = { in: propertyDocIds };
  }

  const rows = await prisma.accountingJournalEntry.findMany({
    where,
    orderBy: [{ date: 'asc' }, { serialNumber: 'asc' }],
  });

  const docIds = [...new Set(rows.map((e) => e.documentId).filter(Boolean))] as string[];
  const docs =
    docIds.length > 0
      ? await prisma.accountingDocument.findMany({
          where: { id: { in: docIds } },
          select: { id: true, type: true, propertyId: true },
        })
      : [];
  const docMap = new Map(docs.map((d) => [d.id, d]));

  const entries = rows.map((e) => ({
    id: e.id,
    serialNumber: e.serialNumber,
    date: e.date.toISOString().slice(0, 10),
    descriptionAr: e.descriptionAr,
    descriptionEn: e.descriptionEn,
    documentType: e.documentId ? docMap.get(e.documentId)?.type : undefined,
    totalDebit: e.totalDebit,
    totalCredit: e.totalCredit,
    bankAccountId: e.bankAccountId,
    contactId: e.contactId,
    propertyId: e.documentId ? docMap.get(e.documentId)?.propertyId ?? null : null,
  }));

  const totals = {
    debit: Math.round(entries.reduce((s, e) => s + e.totalDebit, 0) * 100) / 100,
    credit: Math.round(entries.reduce((s, e) => s + e.totalCredit, 0) * 100) / 100,
    count: entries.length,
  };

  return {
    report: 'propertyLedger' as const,
    fromDate: params.fromDate,
    toDate: params.toDate,
    propertyId: params.propertyId,
    contactId: params.contactId,
    entries,
    totals,
  };
}

/** جلب بيانات المحاسبة للصفحة — paginated bootstrap for scale */
export async function getAccountingDataForPage(filters?: {
  fromDate?: string;
  toDate?: string;
  documentsLimit?: number;
  journalLimit?: number;
}) {
  try {
    const { after } = await import('next/server');
    after(async () => {
      try {
        await syncPaidBookingsToAccountingDb();
      } catch {
        /* مزامنة خلفية — لا نعطل الصفحة */
      }
      try {
        await syncSubscriptionHistoryToAccountingDb();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* outside request scope — skip background sync */
  }
  const docLimit = filters?.documentsLimit ?? ACCOUNTING_DEFAULT_PAGE_SIZE;
  const jrnLimit = filters?.journalLimit ?? ACCOUNTING_DEFAULT_PAGE_SIZE;
  const [accounts, docPage, jrnPage, periods] = await Promise.all([
    getAccountsFromDb(),
    getDocumentsPageFromDb({ fromDate: filters?.fromDate, toDate: filters?.toDate, limit: docLimit, offset: 0 }),
    getJournalEntriesPageFromDb({ fromDate: filters?.fromDate, toDate: filters?.toDate, limit: jrnLimit, offset: 0 }),
    getFiscalPeriodsFromDb(),
  ]);
  return {
    accounts,
    documents: docPage.items,
    journalEntries: jrnPage.items,
    periods,
    meta: {
      documentsTotal: docPage.total,
      journalTotal: jrnPage.total,
      documentsTruncated: docPage.total > docPage.items.length,
      journalTruncated: jrnPage.total > jrnPage.items.length,
    },
  };
}
