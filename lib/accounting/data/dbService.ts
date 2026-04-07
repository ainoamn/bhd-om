/**
 * Database Service - Prisma-backed accounting storage
 * Server-side only - used by API routes
 */

import { prisma } from '@/lib/prisma';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
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
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
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

export async function getDocumentsFromDb(filters?: { fromDate?: string; toDate?: string; type?: string; contactId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- مركّب تاريخ + نوع + جهة اتصال لـ Prisma where
  const where: any = {};
  if (filters?.fromDate) where.date = { ...where.date, gte: new Date(filters.fromDate) };
  if (filters?.toDate) where.date = { ...where.date, lte: new Date(filters.toDate) };
  if (filters?.type) where.type = filters.type;
  if (filters?.contactId) where.contactId = filters.contactId;
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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function updateDocumentInDb(id: string, _data: { journalEntryId?: string }) {
  const doc = await prisma.accountingDocument.update({
    where: { id },
    data: { updatedAt: new Date() },
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

/** جلب كل بيانات المحاسبة من الخادم (مزامنة + قراءة) — للعرض المباشر من الصفحة دون الاعتماد على طلب API من المتصفح */
export async function getAccountingDataForPage(filters?: { fromDate?: string; toDate?: string }) {
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
  const [accounts, documents, journalEntries, periods] = await Promise.all([
    getAccountsFromDb(),
    getDocumentsFromDb({ fromDate: filters?.fromDate, toDate: filters?.toDate }),
    getJournalEntriesFromDb({ fromDate: filters?.fromDate, toDate: filters?.toDate }),
    getFiscalPeriodsFromDb(),
  ]);
  return { accounts, documents, journalEntries, periods };
}
