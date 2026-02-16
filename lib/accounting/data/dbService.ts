/**
 * Database Service - Prisma-backed accounting storage
 * Server-side only - used by API routes
 */

import { prisma } from '@/lib/prisma';
import type { AccountingAccountType, AccountingDocType, AccountingDocStatus } from '@prisma/client';

const DEFAULT_ACCOUNTS: Array<{ code: string; nameAr: string; nameEn: string; type: AccountingAccountType; sortOrder: number }> = [
  { code: '1000', nameAr: 'الصندوق', nameEn: 'Cash', type: 'ASSET', sortOrder: 1 },
  { code: '1100', nameAr: 'البنوك', nameEn: 'Banks', type: 'ASSET', sortOrder: 2 },
  { code: '1200', nameAr: 'العملاء', nameEn: 'Receivables', type: 'ASSET', sortOrder: 3 },
  { code: '1210', nameAr: 'ذمم مدينة أخرى', nameEn: 'Other Receivables', type: 'ASSET', sortOrder: 4 },
  { code: '1300', nameAr: 'عربونات مقدمة', nameEn: 'Prepaid Deposits', type: 'ASSET', sortOrder: 5 },
  { code: '1400', nameAr: 'مصروفات مقدمة', nameEn: 'Prepaid Expenses', type: 'ASSET', sortOrder: 6 },
  { code: '1500', nameAr: 'أصول أخرى', nameEn: 'Other Assets', type: 'ASSET', sortOrder: 7 },
  { code: '2000', nameAr: 'الموردون', nameEn: 'Payables', type: 'LIABILITY', sortOrder: 8 },
  { code: '2100', nameAr: 'عربونات مستلمة', nameEn: 'Deposits Received', type: 'LIABILITY', sortOrder: 9 },
  { code: '2200', nameAr: 'ضرائب مستحقة', nameEn: 'Tax Payable', type: 'LIABILITY', sortOrder: 10 },
  { code: '2300', nameAr: 'التزامات أخرى', nameEn: 'Other Liabilities', type: 'LIABILITY', sortOrder: 11 },
  { code: '3000', nameAr: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', sortOrder: 12 },
  { code: '3100', nameAr: 'أرباح محتجزة', nameEn: 'Retained Earnings', type: 'EQUITY', sortOrder: 13 },
  { code: '4000', nameAr: 'إيرادات الإيجار', nameEn: 'Rent Revenue', type: 'REVENUE', sortOrder: 14 },
  { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'REVENUE', sortOrder: 15 },
  { code: '4200', nameAr: 'رسوم إدارية', nameEn: 'Administrative Fees', type: 'REVENUE', sortOrder: 16 },
  { code: '4300', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', sortOrder: 17 },
  { code: '5000', nameAr: 'مصروفات التشغيل', nameEn: 'Operating Expenses', type: 'EXPENSE', sortOrder: 18 },
  { code: '5100', nameAr: 'مصروفات الصيانة', nameEn: 'Maintenance Expenses', type: 'EXPENSE', sortOrder: 19 },
  { code: '5200', nameAr: 'مصروفات إدارية', nameEn: 'Administrative Expenses', type: 'EXPENSE', sortOrder: 20 },
  { code: '5300', nameAr: 'إيجارات ومرافق', nameEn: 'Rent & Utilities', type: 'EXPENSE', sortOrder: 21 },
  { code: '5400', nameAr: 'رواتب ومزايا', nameEn: 'Salaries & Benefits', type: 'EXPENSE', sortOrder: 22 },
  { code: '5500', nameAr: 'مصروفات أخرى', nameEn: 'Other Expenses', type: 'EXPENSE', sortOrder: 23 },
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
  OTHER: 'OTHER',
};

const DOC_STATUS_MAP: Record<string, AccountingDocStatus> = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
};

export async function ensureAccountingAccounts() {
  const count = await prisma.accountingAccount.count();
  if (count > 0) return;
  for (const a of DEFAULT_ACCOUNTS) {
    await prisma.accountingAccount.create({
      data: { ...a, parentId: null },
    });
  }
}

export async function ensureFiscalPeriods() {
  const count = await prisma.accountingFiscalPeriod.count();
  if (count > 0) return;
  const year = new Date().getFullYear();
  await prisma.accountingFiscalPeriod.create({
    data: {
      code: `FY-${year}`,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      isLocked: false,
    },
  });
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

export async function getAccountsFromDb() {
  await ensureAccountingAccounts();
  const rows = await prisma.accountingAccount.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    type: r.type,
    parentId: r.parentId,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getJournalEntriesFromDb(filters?: { fromDate?: string; toDate?: string }) {
  const where: any = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  const rows = await prisma.accountingJournalEntry.findMany({
    where,
    include: { lines: true },
    orderBy: { date: 'desc' },
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
    documentType: r.documentType,
    documentId: r.documentId,
    contactId: r.contactId,
    bankAccountId: r.bankAccountId,
    propertyId: r.propertyId,
    projectId: r.projectId,
    status: r.status,
    replacedBy: r.replacedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

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
}) {
  await ensureFiscalPeriods();
  const locked = await isPeriodLockedForDate(data.date);
  if (locked) throw new Error('لا يمكن الترحيل: الفترة المالية مغلقة');
  const year = new Date().getFullYear();
  const count = await prisma.accountingJournalEntry.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const serialNumber = `JRN-${year}-${String(count + 1).padStart(4, '0')}`;
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('قيد غير متوازن: المدين يجب أن يساوي الدائن');
  }
  const entry = await prisma.accountingJournalEntry.create({
    data: {
      serialNumber,
      date: new Date(data.date),
      totalDebit,
      totalCredit,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      documentType: data.documentType ? DOC_TYPE_MAP[data.documentType] : null,
      documentId: data.documentId,
      contactId: data.contactId,
      bankAccountId: data.bankAccountId,
      propertyId: data.propertyId,
      projectId: data.projectId,
      status: (data.status ? DOC_STATUS_MAP[data.status] : 'APPROVED') as AccountingDocStatus,
      lines: {
        create: data.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          descriptionAr: l.descriptionAr,
          descriptionEn: l.descriptionEn,
        })),
      },
    },
    include: { lines: true },
  });
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
    documentType: entry.documentType,
    documentId: entry.documentId,
    contactId: entry.contactId,
    bankAccountId: entry.bankAccountId,
    propertyId: entry.propertyId,
    projectId: entry.projectId,
    status: entry.status,
    replacedBy: entry.replacedBy,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function getDocumentsFromDb(filters?: { fromDate?: string; toDate?: string; type?: string }) {
  const where: any = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  if (filters?.type) where.type = filters.type;
  const rows = await prisma.accountingDocument.findMany({
    where,
    orderBy: { date: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    serialNumber: r.serialNumber,
    type: r.type,
    status: r.status,
    date: r.date.toISOString().slice(0, 10),
    dueDate: r.dueDate?.toISOString().slice(0, 10),
    contactId: r.contactId,
    bankAccountId: r.bankAccountId,
    propertyId: r.propertyId,
    projectId: r.projectId,
    amount: r.amount,
    currency: r.currency,
    vatRate: r.vatRate,
    vatAmount: r.vatAmount,
    totalAmount: r.totalAmount,
    descriptionAr: r.descriptionAr,
    descriptionEn: r.descriptionEn,
    items: r.itemsJson ? JSON.parse(r.itemsJson) : undefined,
    journalEntryId: r.journalEntryId,
    attachments: r.attachmentsJson ? JSON.parse(r.attachmentsJson) : undefined,
    purchaseOrder: r.purchaseOrder,
    reference: r.reference,
    branch: r.branch,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
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
  currency: string;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  descriptionAr?: string;
  descriptionEn?: string;
  items?: any[];
  attachments?: { url: string; name: string }[];
  purchaseOrder?: string;
  reference?: string;
  branch?: string;
}) {
  const year = new Date().getFullYear();
  const type = data.type as keyof typeof DOC_TYPE_MAP;
  const prefix = DOC_SERIAL_PREFIX[type] || 'DOC';
  const count = await prisma.accountingDocument.count({
    where: { type: DOC_TYPE_MAP[type] || 'OTHER', createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const serialNumber = data.serialNumber?.trim() || `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  const doc = await prisma.accountingDocument.create({
    data: {
      serialNumber,
      type: (DOC_TYPE_MAP[data.type] || 'OTHER') as AccountingDocType,
      status: (DOC_STATUS_MAP[data.status] || 'APPROVED') as AccountingDocStatus,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId,
      bankAccountId: data.bankAccountId,
      propertyId: data.propertyId,
      projectId: data.projectId,
      amount: data.amount,
      currency: data.currency || 'OMR',
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      itemsJson: data.items ? JSON.stringify(data.items) : null,
      attachmentsJson: data.attachments?.length ? JSON.stringify(data.attachments) : null,
      purchaseOrder: data.purchaseOrder?.trim() || null,
      reference: data.reference?.trim() || null,
      branch: data.branch?.trim() || null,
    },
  });
  return {
    id: doc.id,
    serialNumber: doc.serialNumber,
    type: doc.type,
    status: doc.status,
    date: doc.date.toISOString().slice(0, 10),
    dueDate: doc.dueDate?.toISOString().slice(0, 10),
    contactId: doc.contactId,
    bankAccountId: doc.bankAccountId,
    propertyId: doc.propertyId,
    projectId: doc.projectId,
    amount: doc.amount,
    currency: doc.currency,
    vatRate: doc.vatRate,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    descriptionAr: doc.descriptionAr,
    descriptionEn: doc.descriptionEn,
    items: doc.itemsJson ? JSON.parse(doc.itemsJson) : undefined,
    journalEntryId: doc.journalEntryId,
    attachments: doc.attachmentsJson ? JSON.parse(doc.attachmentsJson) : undefined,
    purchaseOrder: doc.purchaseOrder,
    reference: doc.reference,
    branch: doc.branch,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function updateDocumentInDb(id: string, data: { journalEntryId?: string }) {
  const doc = await prisma.accountingDocument.update({
    where: { id },
    data: { journalEntryId: data.journalEntryId, updatedAt: new Date() },
  });
  return doc;
}
