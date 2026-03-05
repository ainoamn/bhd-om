/**
 * Period Closing System
 * نظام إغلاق الفترات المالية - IFRS Compliant
 * إغلاق الحسابات المؤقتة وتوزيع الأرباح
 */

import type { JournalEntry, ChartAccount } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { KEYS } from '../data/storage';
import { createJournalEntry } from '../engine/journalEngine';
import { appendAuditLog } from '../audit/auditEngine';
import { isPeriodLocked, lockPeriod, unlockPeriod } from '../compliance/periodEngine';
import { generateTrialBalance } from '../ledger/generalLedger';
import { roundAmount } from '../ledger/generalLedger';

export interface ClosingEntry {
  id: string;
  descriptionAr: string;
  descriptionEn: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  reason: string;
}

export interface PeriodClosingResult {
  period: string;
  closingEntries: ClosingEntry[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  retainedEarningsBefore: number;
  retainedEarningsAfter: number;
  closedAt: string;
  closedBy: string;
  success: boolean;
  errors: string[];
}

/**
 * إغلاق الفترة المالية
 */
export function closePeriod(
  period: string,
  userId: string,
  reason: string = 'إغلاق الفترة المالية العادي'
): PeriodClosingResult {
  const errors: string[] = [];
  const closingEntries: ClosingEntry[] = [];
  
  // التحقق من أن الفترة غير مقفولة
  if (isPeriodLocked(period)) {
    errors.push('الفترة مغلقة بالفعل');
    return {
      period,
      closingEntries: [],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      retainedEarningsBefore: 0,
      retainedEarningsAfter: 0,
      closedAt: new Date().toISOString(),
      closedBy: userId,
      success: false,
      errors
    };
  }
  
  try {
    // الحصول على الحسابات والقيود
    const accounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
    const entries = getStored<JournalEntry[]>(KEYS.JOURNAL);
    
    // فلترة قيود الفترة
    const periodEntries = entries.filter(entry => entry.date.startsWith(period));
    
    // إنشاء ميزان المراجعة
    const trialBalance = generateTrialBalance(period, periodEntries, accounts);
    
    // حساب إجمالي الإيرادات والمصروفات
    const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
    const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    // حساب إجمالي الإيرادات
    revenueAccounts.forEach(account => {
      const balance = trialBalance.accounts.find(tb => tb.accountId === account.id);
      if (balance && balance.creditBalance > 0) {
        totalRevenue += balance.creditBalance;
      }
    });
    
    // حساب إجمالي المصروفات
    expenseAccounts.forEach(account => {
      const balance = trialBalance.accounts.find(tb => tb.accountId === account.id);
      if (balance && balance.debitBalance > 0) {
        totalExpenses += balance.debitBalance;
      }
    });
    
    const netIncome = totalRevenue - totalExpenses;
    
    // الحصول على حساب الأرباح المحتجزة
    const retainedEarningsAccount = accounts.find(acc => 
      acc.code === '31' || acc.nameAr.includes('الأرباح المحتجزة')
    );
    
    if (!retainedEarningsAccount) {
      errors.push('حساب الأرباح المحتجزة غير موجود');
      return {
        period,
        closingEntries: [],
        totalRevenue,
        totalExpenses,
        netIncome,
        retainedEarningsBefore: 0,
        retainedEarningsAfter: 0,
        closedAt: new Date().toISOString(),
        closedBy: userId,
        success: false,
        errors
      };
    }
    
    // حساب رصيد الأرباح المحتجزة قبل الإغلاق
    const retainedEarningsBefore = calculateAccountBalance(
      retainedEarningsAccount.id, 
      periodEntries
    ).currentBalance;
    
    // إنشاء قيود الإغلاق
    
    // 1. إغلاق حسابات الإيرادات
    revenueAccounts.forEach(account => {
      const balance = trialBalance.accounts.find(tb => tb.accountId === account.id);
      if (balance && balance.creditBalance > 0) {
        closingEntries.push({
          id: `close-rev-${account.id}`,
          descriptionAr: `إغلاق حساب الإيرادات: ${account.nameAr}`,
          descriptionEn: `Close revenue account: ${account.nameEn || account.nameAr}`,
          debitAccountId: account.id,
          creditAccountId: retainedEarningsAccount.id,
          amount: balance.creditBalance,
          reason: 'إغلاق الإيرادات في نهاية الفترة'
        });
      }
    });
    
    // 2. إغلاق حسابات المصروفات
    expenseAccounts.forEach(account => {
      const balance = trialBalance.accounts.find(tb => tb.accountId === account.id);
      if (balance && balance.debitBalance > 0) {
        closingEntries.push({
          id: `close-exp-${account.id}`,
          descriptionAr: `إغلاق حساب المصروفات: ${account.nameAr}`,
          descriptionEn: `Close expense account: ${account.nameEn || account.nameAr}`,
          debitAccountId: retainedEarningsAccount.id,
          creditAccountId: account.id,
          amount: balance.debitBalance,
          reason: 'إغلاق المصروفات في نهاية الفترة'
        });
      }
    });
    
    // تنفيذ قيود الإغلاق
    const journalLines = closingEntries.map(entry => ({
      accountId: entry.debitAccountId,
      debit: entry.amount,
      credit: 0,
      descriptionAr: entry.descriptionAr,
      descriptionEn: entry.descriptionEn
    }));
    
    closingEntries.forEach(entry => {
      journalLines.push({
        accountId: entry.creditAccountId,
        debit: 0,
        credit: entry.amount,
        descriptionAr: entry.descriptionAr,
        descriptionEn: entry.descriptionEn
      });
    });
    
    // إنشاء قيد الإغلاق
    const closingJournal = createJournalEntry({
      date: `${period}-12-31`, // آخر يوم في الفترة
      lines: journalLines,
      descriptionAr: `إغلاق الفترة المالية ${period}`,
      descriptionEn: `Period closing ${period}`,
      documentType: 'JOURNAL',
      status: 'APPROVED'
    }, userId);
    
    // حفظ القيد
    const allEntries = getStored<JournalEntry[]>(KEYS.JOURNAL);
    allEntries.push(closingJournal);
    saveStored(KEYS.JOURNAL, allEntries);
    
    // حساب رصيد الأرباح المحتجزة بعد الإغلاق
    const retainedEarningsAfter = retainedEarningsBefore + netIncome;
    
    // قفل الفترة
    lockPeriod(period, userId);
    
    // تسجيل التدقيق
    appendAuditLog({
      action: 'PERIOD_CLOSE',
      entityType: 'PERIOD',
      entityId: period,
      userId,
      reason,
      previousState: JSON.stringify({ locked: false }),
      newState: JSON.stringify({ locked: true, netIncome, closedAt: new Date().toISOString() }),
    });
    
    return {
      period,
      closingEntries,
      totalRevenue: roundAmount(totalRevenue),
      totalExpenses: roundAmount(totalExpenses),
      netIncome: roundAmount(netIncome),
      retainedEarningsBefore: roundAmount(retainedEarningsBefore),
      retainedEarningsAfter: roundAmount(retainedEarningsAfter),
      closedAt: new Date().toISOString(),
      closedBy: userId,
      success: true,
      errors
    };
    
  } catch (error) {
    errors.push(`خطأ أثناء إغلاق الفترة: ${error}`);
    return {
      period,
      closingEntries,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      retainedEarningsBefore: 0,
      retainedEarningsAfter: 0,
      closedAt: new Date().toISOString(),
      closedBy: userId,
      success: false,
      errors
    };
  }
}

/**
 * فتح فترة مالية (للتصحيحات)
 */
export function openPeriod(
  period: string,
  userId: string,
  reason: string = 'فتح الفترة لتصحيحات'
): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // التحقق من أن الفترة مقفولة
    if (!isPeriodLocked(period)) {
      errors.push('الفترة غير مقفولة');
      return { success: false, errors };
    }
    
    // فتح الفترة
    unlockPeriod(period, userId);
    
    // تسجيل التدقيق
    appendAuditLog({
      action: 'PERIOD_UNLOCK',
      entityType: 'PERIOD',
      entityId: period,
      userId,
      reason,
      previousState: JSON.stringify({ locked: true }),
      newState: JSON.stringify({ locked: false, openedAt: new Date().toISOString() }),
    });
    
    return { success: true, errors };
    
  } catch (error) {
    errors.push(`خطأ أثناء فتح الفترة: ${error}`);
    return { success: false, errors };
  }
}

/**
 * التحقق من استعداد الفترة للإغلاق
 */
export function validatePeriodClosing(period: string): {
  isReady: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // الحصول على البيانات
  const accounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
  const entries = getStored<JournalEntry[]>(KEYS.JOURNAL);
  
  // فلترة قيود الفترة
  const periodEntries = entries.filter(entry => entry.date.startsWith(period));
  
  // التحقق من وجود قيود في الفترة
  if (periodEntries.length === 0) {
    issues.push('لا توجد قيود في هذه الفترة');
    recommendations.push('تأكد من إدخال جميع المعاملات المالية');
  }
  
  // إنشاء ميزان المراجعة
  const trialBalance = generateTrialBalance(period, periodEntries, accounts);
  
  // التحقق من توازن ميزان المراجعة
  if (!trialBalance.isBalanced) {
    issues.push('ميزان المراجعة غير متوازن');
    recommendations.push('راجع جميع القيود وتأكد من توازنها');
  }
  
  // التحقق من الحسابات غير الصفرية
  const nonZeroAccounts = trialBalance.accounts.filter(acc => 
    acc.debitBalance > 0 || acc.creditBalance > 0
  );
  
  if (nonZeroAccounts.length === 0) {
    issues.push('لا توجد حسابات ذات أرصدة');
    recommendations.push('تأكد من إدخال المعاملات المالية');
  }
  
  // التحقق من وجود حسابات الإيرادات والمصروفات
  const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
  const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');
  
  if (revenueAccounts.length === 0) {
    issues.push('لا توجد حسابات إيرادات');
    recommendations.push('أنشئ حسابات الإيرادات اللازمة');
  }
  
  if (expenseAccounts.length === 0) {
    issues.push('لا توجد حسابات مصروفات');
    recommendations.push('أنشئ حسابات المصروفات اللازمة');
  }
  
  // التحقق من وجود حساب الأرباح المحتجزة
  const retainedEarningsAccount = accounts.find(acc => 
    acc.code === '31' || acc.nameAr.includes('الأرباح المحتجزة')
  );
  
  if (!retainedEarningsAccount) {
    issues.push('حساب الأرباح المحتجزة غير موجود');
    recommendations.push('أنشئ حساب الأرباح المحتجزة (رمز: 31)');
  }
  
  return {
    isReady: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * حساب رصيد الحساب (دالة مساعدة)
 */
function calculateAccountBalance(accountId: string, entries: JournalEntry[]): {
  currentBalance: number;
} {
  let debitTotal = 0;
  let creditTotal = 0;
  
  entries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountId === accountId) {
        debitTotal += line.debit || 0;
        creditTotal += line.credit || 0;
      }
    });
  });
  
  return {
    currentBalance: roundAmount(debitTotal - creditTotal)
  };
}

/**
 * الحصول على تقرير إغلاق الفترة
 */
export function getPeriodClosingReport(period: string): {
  period: string;
  isClosed: boolean;
  closingDate?: string;
  closedBy?: string;
  netIncome?: number;
  totalRevenue?: number;
  totalExpenses?: number;
} | null {
  const auditLog = getStored<any[]>(KEYS.AUDIT);
  
  const closingEntry = auditLog.find(entry => 
    entry.action === 'PERIOD_CLOSE' && 
    entry.entityId === period
  );
  
  if (!closingEntry) {
    return null;
  }
  
  return {
    period,
    isClosed: true,
    closingDate: closingEntry.timestamp,
    closedBy: closingEntry.userId,
    netIncome: closingEntry.newState?.netIncome,
    totalRevenue: closingEntry.newState?.totalRevenue,
    totalExpenses: closingEntry.newState?.totalExpenses
  };
}
