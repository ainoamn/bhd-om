/**
 * General Ledger System
 * دفتر الأستاذ العام - قيد مزدوج - توازن - دقة
 * متوافق مع IFRS/GAAP
 */

import type { JournalEntry, JournalLine, ChartAccount } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { KEYS as STORAGE_KEYS } from '../data/storage';

// Utility function for rounding amounts
export function roundAmount(n: number): number {
  return Math.round(n * Math.pow(10, 2)) / Math.pow(10, 2);
}

export interface LedgerAccount {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  openingBalance: number;
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  lastUpdated: string;
}

export interface LedgerTransaction {
  id: string;
  journalId: string;
  date: string;
  accountId: string;
  debit: number;
  credit: number;
  balance: number;
  descriptionAr?: string;
  descriptionEn?: string;
  documentType?: string;
  documentId?: string;
}

export interface TrialBalance {
  period: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  generatedAt: string;
}

export interface TrialBalanceAccount {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

/**
 * حساب رصيد الحساب من جميع القيود
 */
export function calculateAccountBalance(
  accountId: string,
  entries: JournalEntry[],
  openingBalance: number = 0
): LedgerAccount {
  const accounts = getStored<ChartAccount[]>(STORAGE_KEYS.ACCOUNTS);
  const account = accounts.find(acc => acc.id === accountId);
  
  if (!account) {
    throw new Error(`الحساب ${accountId} غير موجود`);
  }

  let debitTotal = 0;
  let creditTotal = 0;
  const transactions: LedgerTransaction[] = [];

  // معالجة جميع القيود للحساب
  entries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountId === accountId) {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        
        debitTotal += debit;
        creditTotal += credit;

        // حساب الرصيد التراكمي
        const runningBalance = calculateRunningBalance(
          account.type,
          openingBalance,
          debitTotal,
          creditTotal
        );

        transactions.push({
          id: `${entry.id}-${accountId}`,
          journalId: entry.id,
          date: entry.date,
          accountId,
          debit,
          credit,
          balance: runningBalance,
          descriptionAr: line.descriptionAr,
          descriptionEn: line.descriptionEn,
          documentType: entry.documentType,
          documentId: entry.documentId
        });
      }
    });
  });

  const currentBalance = calculateRunningBalance(
    account.type,
    openingBalance,
    debitTotal,
    creditTotal
  );

  return {
    accountId,
    accountCode: account.code,
    accountNameAr: account.nameAr,
    accountNameEn: account.nameEn || '',
    accountType: account.type,
    openingBalance: roundAmount(openingBalance),
    currentBalance: roundAmount(currentBalance),
    debitTotal: roundAmount(debitTotal),
    creditTotal: roundAmount(creditTotal),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * حساب الرصيد الجاري حسب نوع الحساب
 */
function calculateRunningBalance(
  accountType: string,
  openingBalance: number,
  debitTotal: number,
  creditTotal: number
): number {
  switch (accountType) {
    case 'ASSET':
    case 'EXPENSE':
      return openingBalance + debitTotal - creditTotal;
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
      return openingBalance - debitTotal + creditTotal;
    default:
      return openingBalance + debitTotal - creditTotal;
  }
}

/**
 * إنشاء ميزان المراجعة
 */
export function generateTrialBalance(
  period: string,
  entries: JournalEntry[],
  accounts: ChartAccount[]
): TrialBalance {
  const trialAccounts: TrialBalanceAccount[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  accounts.forEach(account => {
    const ledgerAccount = calculateAccountBalance(account.id, entries);
    
    let debitBalance = 0;
    let creditBalance = 0;

    // تحديد الرصيد المدين أو الدائن
    if (ledgerAccount.currentBalance > 0) {
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        debitBalance = Math.abs(ledgerAccount.currentBalance);
      } else {
        creditBalance = Math.abs(ledgerAccount.currentBalance);
      }
    } else if (ledgerAccount.currentBalance < 0) {
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        creditBalance = Math.abs(ledgerAccount.currentBalance);
      } else {
        debitBalance = Math.abs(ledgerAccount.currentBalance);
      }
    }

    if (debitBalance > 0 || creditBalance > 0) {
      trialAccounts.push({
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.nameAr,
        accountNameEn: account.nameEn || '',
        accountType: account.type,
        debitBalance: roundAmount(debitBalance),
        creditBalance: roundAmount(creditBalance)
      });

      totalDebits += debitBalance;
      totalCredits += creditBalance;
    }
  });

  // ترتيب الحسابات حسب الرمز
  trialAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return {
    period,
    accounts: trialAccounts,
    totalDebits: roundAmount(totalDebits),
    totalCredits: roundAmount(totalCredits),
    isBalanced,
    generatedAt: new Date().toISOString()
  };
}

/**
 * الحصول على كشف الحساب
 */
export function getAccountStatement(
  accountId: string,
  entries: JournalEntry[],
  startDate?: string,
  endDate?: string
): LedgerTransaction[] {
  const accounts = getStored<ChartAccount[]>(STORAGE_KEYS.ACCOUNTS);
  const account = accounts.find(acc => acc.id === accountId);
  
  if (!account) {
    throw new Error(`الحساب ${accountId} غير موجود`);
  }

  const transactions: LedgerTransaction[] = [];
  let runningBalance = 0;

  // فلترة القيود حسب التاريخ
  const filteredEntries = entries.filter(entry => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  // حساب الرصيد الافتتاحي
  const openingEntries = entries.filter(entry => startDate && entry.date < startDate);
  const openingLedger = calculateAccountBalance(accountId, openingEntries);
  runningBalance = openingLedger.currentBalance;

  filteredEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountId === accountId) {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        
        runningBalance = calculateRunningBalance(
          account.type,
          runningBalance,
          debit,
          credit
        );

        transactions.push({
          id: `${entry.id}-${accountId}`,
          journalId: entry.id,
          date: entry.date,
          accountId,
          debit,
          credit,
          balance: roundAmount(runningBalance),
          descriptionAr: line.descriptionAr,
          descriptionEn: line.descriptionEn,
          documentType: entry.documentType,
          documentId: entry.documentId
        });
      }
    });
  });

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * التحقق من توازن دفتر الأستاذ
 */
export function validateLedgerBalance(trialBalance: TrialBalance): {
  isValid: boolean;
  difference: number;
  errors: string[];
} {
  const errors: string[] = [];
  const difference = trialBalance.totalDebits - trialBalance.totalCredits;

  if (Math.abs(difference) > 0.01) {
    errors.push(`عدم توازن: الفرق ${difference.toFixed(2)}`);
  }

  // التحقق من الحسابات ذات الأرصدة غير الطبيعية
  trialBalance.accounts.forEach(account => {
    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      if (account.creditBalance > 0 && account.debitBalance === 0) {
        errors.push(`حساب أصل/مصروف برصيد دائن فقط: ${account.accountNameAr}`);
      }
    } else {
      if (account.debitBalance > 0 && account.creditBalance === 0) {
        errors.push(`حساب التزام/حقوق/إيراد برصيد مدين فقط: ${account.accountNameAr}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    difference: roundAmount(difference),
    errors
  };
}
