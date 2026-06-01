/**
 * DB Posting Rules — single source of truth for document → journal conversion
 * Used by API routes (documents POST, approve, sync)
 */

import {
  createJournalEntryInDb,
  getAccountsFromDb,
} from '@/lib/accounting/data/dbService';

export type DbPostingDoc = {
  id: string;
  serialNumber: string;
  type: string;
  status?: string;
  date: string;
  totalAmount?: number;
  netAmount?: number;
  amount?: number;
  vatAmount?: number | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  contactId?: string | null;
  bankAccountId?: string | null;
  propertyId?: number | null;
  projectId?: string | null;
  paymentMethod?: string | null;
  items?: Array<{
    accountId?: string;
    amount?: number;
    descriptionAr?: string;
    descriptionEn?: string;
  }>;
};

type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
  descriptionAr?: string;
  descriptionEn?: string;
};

type AccountRow = Awaited<ReturnType<typeof getAccountsFromDb>>[number];

function findByCode(accounts: AccountRow[], code: string) {
  return accounts.find((a) => a.code === code) ?? null;
}

function resolveDebitAccount(doc: DbPostingDoc, accounts: AccountRow[]) {
  const cashAcc = findByCode(accounts, '1000');
  const bankAcc = findByCode(accounts, '1100');
  const chequeAcc = findByCode(accounts, '1150');
  const method = doc.paymentMethod || (doc.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
  if (method === 'CHEQUE' && chequeAcc) return chequeAcc;
  if (method === 'BANK_TRANSFER' && bankAcc) return bankAcc;
  return cashAcc;
}

function resolveCreditAccount(doc: DbPostingDoc, accounts: AccountRow[]) {
  const cashAcc = findByCode(accounts, '1000');
  const bankAcc = findByCode(accounts, '1100');
  const chequeAcc = findByCode(accounts, '1150');
  const method = doc.paymentMethod || (doc.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
  if (method === 'CHEQUE' && chequeAcc) return chequeAcc;
  if (method === 'BANK_TRANSFER' && bankAcc) return bankAcc;
  return cashAcc;
}

export function buildJournalLinesForDocument(doc: DbPostingDoc, accounts: AccountRow[]): JournalLineInput[] {
  const cashAcc = findByCode(accounts, '1000');
  const bankAcc = findByCode(accounts, '1100');
  const revenueAcc = findByCode(accounts, '4000') ?? findByCode(accounts, '4100');
  const receivableAcc = findByCode(accounts, '1200');
  const vatAcc = findByCode(accounts, '2200');
  const expenseAcc = findByCode(accounts, '5000');
  const depositAcc = findByCode(accounts, '2100');
  const payableAcc = findByCode(accounts, '2000');

  const debitAcc = doc.bankAccountId ? bankAcc : cashAcc;
  const totalAmount = doc.totalAmount ?? doc.netAmount ?? doc.amount ?? 0;
  const amount = doc.netAmount ?? doc.amount ?? totalAmount;
  const vatAmount = doc.vatAmount ?? 0;
  const descAr = doc.descriptionAr ?? undefined;
  const descEn = doc.descriptionEn ?? undefined;

  if (doc.type === 'RECEIPT' || doc.type === 'INVOICE') {
    if (!debitAcc || !revenueAcc) throw new Error('دليل الحسابات غير مكتمل');
    const lines: JournalLineInput[] = [
      {
        accountId: debitAcc.id,
        debit: totalAmount,
        credit: 0,
        descriptionAr: descAr || `إيصال ${doc.serialNumber}`,
        descriptionEn: descEn || `Receipt ${doc.serialNumber}`,
      },
      {
        accountId: revenueAcc.id,
        debit: 0,
        credit: amount,
        descriptionAr: descAr,
        descriptionEn: descEn,
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
    return lines;
  }

  if (doc.type === 'CREDIT_NOTE') {
    if (!revenueAcc) throw new Error('دليل الحسابات غير مكتمل — حساب الإيرادات');
    const contraAcc = receivableAcc ?? debitAcc;
    if (!contraAcc) throw new Error('دليل الحسابات غير مكتمل — حساب العملاء أو الصندوق');
    const lines: JournalLineInput[] = [
      {
        accountId: revenueAcc.id,
        debit: amount,
        credit: 0,
        descriptionAr: descAr || `إشعار دائن ${doc.serialNumber}`,
        descriptionEn: descEn || `Credit note ${doc.serialNumber}`,
      },
      {
        accountId: contraAcc.id,
        debit: 0,
        credit: totalAmount,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
    ];
    if (vatAmount > 0 && vatAcc) {
      lines.unshift({
        accountId: vatAcc.id,
        debit: vatAmount,
        credit: 0,
        descriptionAr: `عكس ضريبة ${doc.serialNumber}`,
        descriptionEn: `VAT reversal ${doc.serialNumber}`,
      });
    }
    return lines;
  }

  if (doc.type === 'DEBIT_NOTE') {
    if (!payableAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
    const lines: JournalLineInput[] = [
      {
        accountId: expenseAcc.id,
        debit: 0,
        credit: amount,
        descriptionAr: descAr || `إشعار مدين ${doc.serialNumber}`,
        descriptionEn: descEn || `Debit note ${doc.serialNumber}`,
      },
      {
        accountId: payableAcc.id,
        debit: totalAmount,
        credit: 0,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
    ];
    if (vatAmount > 0 && vatAcc) {
      lines.push({
        accountId: vatAcc.id,
        debit: 0,
        credit: vatAmount,
        descriptionAr: `عكس ضريبة ${doc.serialNumber}`,
        descriptionEn: `VAT reversal ${doc.serialNumber}`,
      });
    }
    return lines;
  }

  if (doc.type === 'PURCHASE_INV') {
    if (!payableAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
    const purchaseLines: JournalLineInput[] = [];
    if (doc.items?.length && doc.items.some((i) => i.accountId)) {
      let allocated = 0;
      for (const item of doc.items) {
        if (item.accountId && (item.amount ?? 0) > 0) {
          purchaseLines.push({
            accountId: item.accountId,
            debit: item.amount ?? 0,
            credit: 0,
            descriptionAr: item.descriptionAr ?? descAr,
            descriptionEn: item.descriptionEn ?? descEn,
          });
          allocated += item.amount ?? 0;
        }
      }
      if (allocated < amount) {
        purchaseLines.push({
          accountId: expenseAcc.id,
          debit: amount - allocated,
          credit: 0,
          descriptionAr: descAr || `فاتورة مشتريات ${doc.serialNumber}`,
          descriptionEn: descEn || `Purchase invoice ${doc.serialNumber}`,
        });
      }
    } else {
      purchaseLines.push({
        accountId: expenseAcc.id,
        debit: amount,
        credit: 0,
        descriptionAr: descAr || `فاتورة مشتريات ${doc.serialNumber}`,
        descriptionEn: descEn || `Purchase invoice ${doc.serialNumber}`,
      });
    }
    if (vatAmount > 0 && vatAcc) {
      purchaseLines.push({
        accountId: vatAcc.id,
        debit: vatAmount,
        credit: 0,
        descriptionAr: `ضريبة ${doc.serialNumber}`,
        descriptionEn: `VAT ${doc.serialNumber}`,
      });
    }
    purchaseLines.push({
      accountId: payableAcc.id,
      debit: 0,
      credit: totalAmount,
      descriptionAr: descAr || `فاتورة مشتريات ${doc.serialNumber}`,
      descriptionEn: descEn || `Purchase invoice ${doc.serialNumber}`,
    });
    return purchaseLines;
  }

  if (doc.type === 'PAYMENT') {
    const payFrom = resolveCreditAccount(doc, accounts) ?? debitAcc;
    if (!payFrom || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
    return [
      {
        accountId: expenseAcc.id,
        debit: totalAmount,
        credit: 0,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
      {
        accountId: payFrom.id,
        debit: 0,
        credit: totalAmount,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
    ];
  }

  if (doc.type === 'DEPOSIT') {
    const depDebit = resolveDebitAccount(doc, accounts);
    if (!depDebit || !depositAcc) throw new Error('دليل الحسابات غير مكتمل');
    return [
      {
        accountId: depDebit.id,
        debit: totalAmount,
        credit: 0,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
      {
        accountId: depositAcc.id,
        debit: 0,
        credit: totalAmount,
        descriptionAr: descAr,
        descriptionEn: descEn,
      },
    ];
  }

  return [];
}

export async function postDocumentToDb(doc: DbPostingDoc) {
  const accounts = await getAccountsFromDb();
  const lines = buildJournalLinesForDocument(doc, accounts);
  if (lines.length === 0) return null;

  return createJournalEntryInDb({
    date: doc.date,
    lines,
    descriptionAr: doc.descriptionAr || `${doc.type} ${doc.serialNumber}`,
    descriptionEn: doc.descriptionEn ?? undefined,
    documentType: doc.type,
    documentId: doc.id,
    contactId: doc.contactId ?? undefined,
    bankAccountId: doc.bankAccountId ?? undefined,
    propertyId: doc.propertyId ?? undefined,
    projectId: doc.projectId ?? undefined,
    status: 'APPROVED',
  });
}
