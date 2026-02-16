/**
 * Posting Rules Engine - Policy-Based
 * لا عملية بدون قيد | تحويل المستندات إلى قيود تلقائياً
 * الترحيل المحاسبي | الضرائب | التحصيل
 */

import type { AccountingDocument, DocumentType, JournalLine } from '../domain/types';
import { createJournalEntry } from '../engine/journalEngine';
import { getStored } from '../data/storage';
import { STORAGE_KEYS } from '../data/storage';
import type { ChartAccount } from '../domain/types';

function getAccounts(): ChartAccount[] {
  return getStored<ChartAccount>(STORAGE_KEYS.ACCOUNTS).sort((a, b) => a.sortOrder - b.sortOrder);
}

function findAccountByCode(code: string): ChartAccount | null {
  return getAccounts().find((a) => a.code === code) || null;
}

/**
 * تحديد حساب المدين حسب طريقة الدفع:
 * - نقداً (CASH): الصندوق 1000
 * - تحويل بنكي (BANK_TRANSFER): البنوك 1100
 * - شيك (CHEQUE): شيكات تحت التحصيل 1150 (شيك آجل لم يُستلم بعد)
 */
function resolveDebitAccountForReceipt(doc: AccountingDocument): ChartAccount | null {
  const cashAcc = findAccountByCode('1000');
  const bankAcc = findAccountByCode('1100');
  const chequeAcc = findAccountByCode('1150');
  const method = doc.paymentMethod || (doc.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
  if (method === 'CHEQUE' && chequeAcc) return chequeAcc;
  if (method === 'BANK_TRANSFER' && bankAcc) return bankAcc;
  return cashAcc;
}

/**
 * توليد قيود من مستند إيصال/فاتورة (إيراد)
 * من مدين: الصندوق/البنك/شيكات تحت التحصيل حسب طريقة الدفع | إلى دائن: الإيرادات | ضريبة إن وجدت
 */
function postReceiptOrInvoice(doc: AccountingDocument, userId?: string): { lines: JournalLine[] } {
  const revenueAcc = findAccountByCode('4000') || findAccountByCode('4100');
  const vatAcc = findAccountByCode('2200');

  const debitAcc = resolveDebitAccountForReceipt(doc);
  if (!debitAcc || !revenueAcc) {
    throw new Error('دليل الحسابات غير مكتمل - تحقق من حسابات الصندوق/البنوك/شيكات تحت التحصيل والإيرادات');
  }

  const amount = doc.amount || 0;
  const vatAmount = doc.vatAmount || 0;
  const totalAmount = doc.totalAmount || amount + vatAmount;

  const lines: JournalLine[] = [
    {
      accountId: debitAcc.id,
      debit: totalAmount,
      credit: 0,
      descriptionAr: doc.descriptionAr || `إيصال ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Receipt ${doc.serialNumber}`,
    },
    {
      accountId: revenueAcc.id,
      debit: 0,
      credit: amount,
      descriptionAr: doc.descriptionAr || `إيصال ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Receipt ${doc.serialNumber}`,
    },
  ];

  if (vatAmount > 0 && vatAcc) {
    lines.push({
      accountId: vatAcc.id,
      debit: 0,
      credit: vatAmount,
      descriptionAr: `ضريبة ${doc.serialNumber}`,
      descriptionEn: `VAT ${doc.serialNumber}`,
    });
  }

  return { lines };
}

/**
 * توليد قيود من مستند دفعة/مصروف
 * من مدين: المصروفات | إلى دائن: الصندوق/البنك
 */
function postPayment(doc: AccountingDocument, userId?: string): { lines: JournalLine[] } {
  const expenseAcc = findAccountByCode('5000');
  const cashAcc = findAccountByCode('1000');
  const bankAcc = findAccountByCode('1100');
  const debitAcc = doc.bankAccountId ? bankAcc : cashAcc;

  if (!debitAcc || !expenseAcc) {
    throw new Error('دليل الحسابات غير مكتمل - تحقق من حسابات الصندوق والمصروفات');
  }

  const totalAmount = doc.totalAmount || doc.amount || 0;

  const lines: JournalLine[] = [
    {
      accountId: expenseAcc.id,
      debit: totalAmount,
      credit: 0,
      descriptionAr: doc.descriptionAr || `دفعة ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Payment ${doc.serialNumber}`,
    },
    {
      accountId: debitAcc.id,
      debit: 0,
      credit: totalAmount,
      descriptionAr: doc.descriptionAr || `دفعة ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Payment ${doc.serialNumber}`,
    },
  ];

  return { lines };
}

/**
 * توليد قيود من مستند عربون (وديعة مستلمة)
 * من مدين: الصندوق/البنك/شيكات تحت التحصيل حسب طريقة الدفع | إلى دائن: عربونات مستلمة (التزام)
 */
function postDeposit(doc: AccountingDocument, userId?: string): { lines: JournalLine[] } {
  const depositAcc = findAccountByCode('2100'); // عربونات مستلمة

  const debitAcc = resolveDebitAccountForReceipt(doc);
  if (!debitAcc || !depositAcc) {
    throw new Error('دليل الحسابات غير مكتمل - تحقق من حسابات الصندوق/البنوك/شيكات تحت التحصيل وعربونات مستلمة');
  }

  const totalAmount = doc.totalAmount || doc.amount || 0;

  const lines: JournalLine[] = [
    {
      accountId: debitAcc.id,
      debit: totalAmount,
      credit: 0,
      descriptionAr: doc.descriptionAr || `عربون ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Deposit ${doc.serialNumber}`,
    },
    {
      accountId: depositAcc.id,
      debit: 0,
      credit: totalAmount,
      descriptionAr: doc.descriptionAr || `عربون ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Deposit ${doc.serialNumber}`,
    },
  ];

  return { lines };
}

/**
 * ترحيل فاتورة مشتريات: مدين مصروفات/أصول | دائن الموردون
 */
function postPurchaseInvoice(doc: AccountingDocument, userId?: string): { lines: JournalLine[] } {
  const payableAcc = findAccountByCode('2000'); // الموردون
  const expenseAcc = findAccountByCode('5000');
  const vatAcc = findAccountByCode('2200');

  if (!payableAcc || !expenseAcc) {
    throw new Error('دليل الحسابات غير مكتمل - تحقق من حسابات الموردين والمصروفات');
  }

  const amount = doc.amount || 0;
  const vatAmount = doc.vatAmount || 0;
  const totalAmount = doc.totalAmount || amount + vatAmount;

  // إذا كانت هناك بنود مع حسابات محددة، نستخدمها؛ وإلا نستخدم المصروفات
  const lines: JournalLine[] = [];
  if (doc.items?.length && doc.items.some((i) => i.accountId)) {
    let allocated = 0;
    for (const item of doc.items) {
      if (item.accountId && item.amount > 0) {
        lines.push({
          accountId: item.accountId,
          debit: item.amount,
          credit: 0,
          descriptionAr: item.descriptionAr || doc.descriptionAr,
          descriptionEn: item.descriptionEn || doc.descriptionEn,
        });
        allocated += item.amount;
      }
    }
    if (allocated < amount && expenseAcc) {
      lines.push({
        accountId: expenseAcc.id,
        debit: amount - allocated,
        credit: 0,
        descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`,
        descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}`,
      });
    }
  } else {
    lines.push({
      accountId: expenseAcc.id,
      debit: amount,
      credit: 0,
      descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`,
      descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}`,
    });
  }
  if (vatAmount > 0 && vatAcc) {
    lines.push({
      accountId: vatAcc.id,
      debit: vatAmount,
      credit: 0,
      descriptionAr: `ضريبة ${doc.serialNumber}`,
      descriptionEn: `VAT ${doc.serialNumber}`,
    });
  }
  lines.push({
    accountId: payableAcc.id,
    debit: 0,
    credit: totalAmount,
    descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`,
    descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}`,
  });
  return { lines };
}

/**
 * محرك قواعد الترحيل - يحدد القيود المناسبة لنوع المستند
 */
export function generatePostingLines(doc: AccountingDocument, userId?: string): JournalLine[] {
  const type = doc.type;
  const status = doc.status;

  // لا ترحيل للمسودات أو الملغاة
  if (status === 'DRAFT' || status === 'CANCELLED') {
    return [];
  }

  switch (type) {
    case 'RECEIPT':
    case 'INVOICE':
      return postReceiptOrInvoice(doc, userId).lines;
    case 'PAYMENT':
      return postPayment(doc, userId).lines;
    case 'DEPOSIT':
      return postDeposit(doc, userId).lines;
    case 'PURCHASE_INV':
      return postPurchaseInvoice(doc, userId).lines;
    case 'QUOTE':
    case 'PURCHASE_ORDER':
      // عرض السعر وأمر الشراء لا يُرحّل حتى يصبح فاتورة
      return [];
    case 'JOURNAL':
    case 'OTHER':
    default:
      return [];
  }
}

/**
 * ترحيل مستند - إنشاء قيد مرتبط بالمستند
 * لا عملية بدون قيد (للمستندات المالية)
 */
export function postDocument(doc: AccountingDocument, userId?: string): ReturnType<typeof createJournalEntry> | null {
  const lines = generatePostingLines(doc, userId);
  if (lines.length === 0) return null;

  const entry = createJournalEntry(
    {
      date: doc.date,
      lines,
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
    },
    userId
  );

  return entry;
}
