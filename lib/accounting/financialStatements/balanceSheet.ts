/**
 * Balance Sheet Generator
 * الميزانية العمومية - IFRS Compliant
 * Assets = Liabilities + Equity
 */

import type { ChartAccount } from '../domain/types';
import { getStored } from '../data/storage';
import { KEYS } from '../data/storage';
import { generateTrialBalance, calculateAccountBalance } from '../ledger/generalLedger';
import type { JournalEntry } from '../domain/types';
import { roundAmount } from '../ledger/generalLedger';

export interface BalanceSheetAccount {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  balance: number;
  isSubAccount: boolean;
  parentAccount?: string;
}

export interface BalanceSheetSection {
  titleAr: string;
  titleEn: string;
  total: number;
  accounts: BalanceSheetAccount[];
  subSections?: BalanceSheetSection[];
}

export interface BalanceSheet {
  period: string;
  date: string;
  currency: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  generatedAt: string;
}

/**
 * إنشاء الميزانية العمومية
 */
export function generateBalanceSheet(
  period: string,
  date: string,
  entries: JournalEntry[],
  currency: string = 'ر.ع'
): BalanceSheet {
  const accounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
  
  // إنشاء ميزان المراجعة
  const trialBalance = generateTrialBalance(period, entries, accounts);
  
  // تقسيم الحسابات حسب النوع
  const assetAccounts = accounts.filter(acc => acc.type === 'ASSET');
  const liabilityAccounts = accounts.filter(acc => acc.type === 'LIABILITY');
  const equityAccounts = accounts.filter(acc => acc.type === 'EQUITY');
  
  // حساب الأرصدة
  const assets = buildBalanceSheetSection('ASSETS', assetAccounts, entries, 'الأصول', 'Assets');
  const liabilities = buildBalanceSheetSection('LIABILITIES', liabilityAccounts, entries, 'الالتزامات', 'Liabilities');
  const equity = buildBalanceSheetSection('EQUITY', equityAccounts, entries, 'حقوق الملكية', 'Equity');
  
  const totalAssets = assets.total;
  const totalLiabilitiesAndEquity = liabilities.total + equity.total;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
  
  return {
    period,
    date,
    currency,
    assets,
    liabilities,
    equity,
    totalAssets: roundAmount(totalAssets),
    totalLiabilitiesAndEquity: roundAmount(totalLiabilitiesAndEquity),
    isBalanced,
    generatedAt: new Date().toISOString()
  };
}

/**
 * بناء قسم من الميزانية العمومية
 */
function buildBalanceSheetSection(
  accountType: string,
  accounts: ChartAccount[],
  entries: JournalEntry[],
  titleAr: string,
  titleEn: string
): BalanceSheetSection {
  const sectionAccounts: BalanceSheetAccount[] = [];
  let total = 0;
  
  // ترتيب الحسابات حسب التسلسل الهرمي
  const sortedAccounts = accounts.sort((a, b) => a.sortOrder - b.sortOrder);
  
  sortedAccounts.forEach(account => {
    const ledgerAccount = calculateAccountBalance(account.id, entries);
    
    // فقط الحسابات ذات الرصيد
    if (ledgerAccount.currentBalance !== 0) {
      sectionAccounts.push({
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.nameAr,
        accountNameEn: account.nameEn || '',
        balance: Math.abs(ledgerAccount.currentBalance),
        isSubAccount: !!account.parentId,
        parentAccount: account.parentId
      });
      
      total += Math.abs(ledgerAccount.currentBalance);
    }
  });
  
  return {
    titleAr,
    titleEn,
    total: roundAmount(total),
    accounts: sectionAccounts
  };
}

/**
 * تحليل الميزانية العمومية
 */
export interface BalanceSheetAnalysis {
  currentRatio: number;           // نسبة السيولة (الأصول المتداولة/الالتزامات المتداولة)
  quickRatio: number;            // نسبة السيولة السريعة
  debtToEquityRatio: number;     // نسبة الديون إلى حقوق الملكية
  workingCapital: number;        // رأس المال العامل
  totalAssetTurnover: number;     // دوران الأصول الإجمالي
  recommendations: string[];
}

export function analyzeBalanceSheet(balanceSheet: BalanceSheet): BalanceSheetAnalysis {
  const { assets, liabilities, equity } = balanceSheet;
  
  // تقسيم الأصول والالتزامات إلى متداولة وغير متداولة
  const currentAssets = getCurrentAssets(assets);
  const nonCurrentAssets = getNonCurrentAssets(assets);
  const currentLiabilities = getCurrentLiabilities(liabilities);
  const nonCurrentLiabilities = getNonCurrentLiabilities(liabilities);
  
  // حساب النسب المالية
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? getQuickAssets(assets) / currentLiabilities : 0;
  const debtToEquityRatio = equity.total > 0 ? (currentLiabilities + nonCurrentLiabilities) / equity.total : 0;
  const workingCapital = currentAssets - currentLiabilities;
  const totalAssetTurnover = assets.total > 0 ? (assets.total - workingCapital) / assets.total : 0;
  
  // التوصيات
  const recommendations: string[] = [];
  
  if (currentRatio < 1) {
    recommendations.push('نسبة السيولة منخفضة - يزيد مخاطر السيولة');
  } else if (currentRatio > 2) {
    recommendations.push('نسبة السيولة مرتفعة - قد يكون هناك استثمار زائد في الأصول المتداولة');
  }
  
  if (quickRatio < 0.5) {
    recommendations.push('نسبة السيولة السريعة منخفضة - يعتمد بشكل كبير على المخزون');
  }
  
  if (debtToEquityRatio > 1) {
    recommendations.push('نسبة الديون إلى حقوق الملكية مرتفعة - يزيد المخاطر المالية');
  }
  
  if (workingCapital < 0) {
    recommendations.push('رأس المال العامل سالب - مؤشر على صعوبات مالية');
  }
  
  return {
    currentRatio: roundAmount(currentRatio),
    quickRatio: roundAmount(quickRatio),
    debtToEquityRatio: roundAmount(debtToEquityRatio),
    workingCapital: roundAmount(workingCapital),
    totalAssetTurnover: roundAmount(totalAssetTurnover),
    recommendations
  };
}

/**
 * حساب الأصول المتداولة
 */
function getCurrentAssets(assets: BalanceSheetSection): number {
  // الحسابات التي تبدأ بـ 1xx (أصول متداولة)
  return assets.accounts
    .filter(acc => acc.accountCode.startsWith('1') && !acc.accountCode.startsWith('15'))
    .reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * حساب الأصول غير المتداولة
 */
function getNonCurrentAssets(assets: BalanceSheetSection): number {
  // الحسابات التي تبدأ بـ 15x (أصول غير متداولة)
  return assets.accounts
    .filter(acc => acc.accountCode.startsWith('15'))
    .reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * حساب الالتزامات المتداولة
 */
function getCurrentLiabilities(liabilities: BalanceSheetSection): number {
  // الحسابات التي تبدأ بـ 2xx (التزامات متداولة)
  return liabilities.accounts
    .filter(acc => acc.accountCode.startsWith('2') && !acc.accountCode.startsWith('25'))
    .reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * حساب الالتزامات غير المتداولة
 */
function getNonCurrentLiabilities(liabilities: BalanceSheetSection): number {
  // الحسابات التي تبدأ بـ 25x (التزامات غير متداولة)
  return liabilities.accounts
    .filter(acc => acc.accountCode.startsWith('25'))
    .reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * حساب الأصول السريعة (بدون المخزون)
 */
function getQuickAssets(assets: BalanceSheetSection): number {
  // الأصول السريعة = الأصول المتداولة - المخزون
  const currentAssets = getCurrentAssets(assets);
  const inventory = assets.accounts
    .filter(acc => acc.accountCode.startsWith('13')) // حسابات المخزون
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  return currentAssets - inventory;
}

/**
 * التحقق من صحة الميزانية العمومية
 */
export function validateBalanceSheet(balanceSheet: BalanceSheet): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // التحقق من التوازن الأساسي
  if (!balanceSheet.isBalanced) {
    const difference = balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity;
    errors.push(`الميزانية غير متوازنة: الفرق ${difference.toFixed(2)} ${balanceSheet.currency}`);
  }
  
  // التحقق من الحسابات ذات الأرصدة السالبة غير المتوقعة
  balanceSheet.assets.accounts.forEach(account => {
    if (account.balance < 0) {
      warnings.push(`حساب أصل برصيد سالب: ${account.accountNameAr}`);
    }
  });
  
  balanceSheet.liabilities.accounts.forEach(account => {
    if (account.balance < 0) {
      warnings.push(`حساب التزام برصيد سالب: ${account.accountNameAr}`);
    }
  });
  
  balanceSheet.equity.accounts.forEach(account => {
    if (account.balance < 0) {
      warnings.push(`حساب حقوق ملكية برصيد سالب: ${account.accountNameAr}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
