/**
 * Income Statement Generator
 * قائمة الدخل - IFRS Compliant
 * Revenue - Expenses = Net Income
 */

import type { ChartAccount } from '../domain/types';
import { getStored } from '../data/storage';
import { KEYS } from '../data/storage';
import { calculateAccountBalance } from '../ledger/generalLedger';
import type { JournalEntry } from '../domain/types';
import { roundAmount } from '../ledger/generalLedger';

export interface IncomeStatementAccount {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  balance: number;
  percentageOfRevenue?: number;
}

export interface IncomeStatementSection {
  titleAr: string;
  titleEn: string;
  total: number;
  accounts: IncomeStatementAccount[];
  subSections?: IncomeStatementSection[];
}

export interface IncomeStatement {
  period: string;
  startDate: string;
  endDate: string;
  currency: string;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  grossProfitMargin: number;
  netProfitMargin: number;
  generatedAt: string;
}

/**
 * إنشاء قائمة الدخل
 */
export function generateIncomeStatement(
  period: string,
  startDate: string,
  endDate: string,
  entries: JournalEntry[],
  currency: string = 'ر.ع'
): IncomeStatement {
  const accounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
  
  // فلترة القيود حسب الفترة
  const periodEntries = entries.filter(entry => 
    entry.date >= startDate && entry.date <= endDate
  );
  
  // تقسيم الحسابات حسب النوع
  const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
  const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');
  
  // حساب الأرصدة
  const revenue = buildIncomeStatementSection('REVENUE', revenueAccounts, periodEntries, 'الإيرادات', 'Revenue');
  const expenses = buildIncomeStatementSection('EXPENSE', expenseAccounts, periodEntries, 'المصروفات', 'Expenses');
  
  // حساب النتائج
  const grossProfit = calculateGrossProfit(revenue, expenses);
  const operatingIncome = calculateOperatingIncome(revenue, expenses);
  const netIncome = revenue.total - expenses.total;
  
  const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
  const netProfitMargin = revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0;
  
  return {
    period,
    startDate,
    endDate,
    currency,
    revenue,
    expenses,
    grossProfit: roundAmount(grossProfit),
    operatingIncome: roundAmount(operatingIncome),
    netIncome: roundAmount(netIncome),
    grossProfitMargin: roundAmount(grossProfitMargin),
    netProfitMargin: roundAmount(netProfitMargin),
    generatedAt: new Date().toISOString()
  };
}

/**
 * بناء قسم من قائمة الدخل
 */
function buildIncomeStatementSection(
  accountType: string,
  accounts: ChartAccount[],
  entries: JournalEntry[],
  titleAr: string,
  titleEn: string
): IncomeStatementSection {
  const sectionAccounts: IncomeStatementAccount[] = [];
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
        balance: Math.abs(ledgerAccount.currentBalance)
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
 * حساب إجمالي الربح
 */
function calculateGrossProfit(revenue: IncomeStatementSection, expenses: IncomeStatementSection): number {
  // إجمالي الإيرادات - تكلفة المبيعات
  const totalRevenue = revenue.total;
  const costOfGoodsSold = expenses.accounts
    .filter(acc => acc.accountCode.startsWith('51')) // تكلفة المبيعات
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  return totalRevenue - costOfGoodsSold;
}

/**
 * حساب الربح التشغيلي
 */
function calculateOperatingIncome(revenue: IncomeStatementSection, expenses: IncomeStatementSection): number {
  // إجمالي الربح - المصروفات التشغيلية
  const grossProfit = calculateGrossProfit(revenue, expenses);
  const operatingExpenses = expenses.accounts
    .filter(acc => 
      acc.accountCode.startsWith('52') || // مصروفات البيع والتسويق
      acc.accountCode.startsWith('53') || // مصروفات إدارية
      acc.accountCode.startsWith('54')    // مصروفات تشغيلية أخرى
    )
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  return grossProfit - operatingExpenses;
}

/**
 * تحليل قائمة الدخل
 */
export interface IncomeStatementAnalysis {
  revenueGrowth: number;           // نمو الإيرادات
  expenseGrowth: number;           // نمو المصروفات
  profitMarginTrend: number;       // اتجاه هامش الربح
  operatingEfficiency: number;      // كفاءة التشغيل
  breakEvenPoint: number;          // نقطة التعادل
  recommendations: string[];
}

export function analyzeIncomeStatement(
  currentPeriod: IncomeStatement,
  previousPeriod?: IncomeStatement
): IncomeStatementAnalysis {
  const recommendations: string[] = [];
  
  // حساب النمو إذا كانت الفترة السابقة متوفرة
  let revenueGrowth = 0;
  let expenseGrowth = 0;
  let profitMarginTrend = 0;
  
  if (previousPeriod) {
    revenueGrowth = previousPeriod.revenue.total > 0 
      ? ((currentPeriod.revenue.total - previousPeriod.revenue.total) / previousPeriod.revenue.total) * 100 
      : 0;
    
    expenseGrowth = previousPeriod.expenses.total > 0 
      ? ((currentPeriod.expenses.total - previousPeriod.expenses.total) / previousPeriod.expenses.total) * 100 
      : 0;
    
    profitMarginTrend = currentPeriod.netProfitMargin - previousPeriod.netProfitMargin;
  }
  
  // حساب كفاءة التشغيل
  const operatingEfficiency = currentPeriod.revenue.total > 0 
    ? (currentPeriod.operatingIncome / currentPeriod.revenue.total) * 100 
    : 0;
  
  // حساب نقطة التعادل (تقريبي)
  const fixedCosts = currentPeriod.expenses.accounts
    .filter(acc => acc.accountCode.startsWith('53')) // المصروفات الإدارية الثابتة
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  const variableCostRatio = currentPeriod.revenue.total > 0 
    ? (currentPeriod.expenses.total - fixedCosts) / currentPeriod.revenue.total 
    : 0;
  
  const contributionMargin = 1 - variableCostRatio;
  const breakEvenPoint = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
  
  // التوصيات
  if (currentPeriod.netIncome < 0) {
    recommendations.push('خسارة صافية - يجب مراجعة التكاليف وزيادة الإيرادات');
  }
  
  if (currentPeriod.grossProfitMargin < 30) {
    recommendations.push('هامش الربح الإجمالي منخفض - يجب مراجعة تسعير المنتجات أو تكلفة المبيعات');
  }
  
  if (operatingEfficiency < 10) {
    recommendations.push('كفاءة التشغيل منخفضة - يجب تحسين إدارة المصروفات التشغيلية');
  }
  
  if (previousPeriod && revenueGrowth < 0) {
    recommendations.push('انخفاض في الإيرادات - يجب تطوير استراتيجيات التسويق والمبيعات');
  }
  
  if (previousPeriod && expenseGrowth > revenueGrowth) {
    recommendations.push('نمو المصروفات أسرع من الإيرادات - يجب التحكم في التكاليف');
  }
  
  return {
    revenueGrowth: roundAmount(revenueGrowth),
    expenseGrowth: roundAmount(expenseGrowth),
    profitMarginTrend: roundAmount(profitMarginTrend),
    operatingEfficiency: roundAmount(operatingEfficiency),
    breakEvenPoint: roundAmount(breakEvenPoint),
    recommendations
  };
}

/**
 * التحقق من صحة قائمة الدخل
 */
export function validateIncomeStatement(incomeStatement: IncomeStatement): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // التحقق من الحسابات ذات الأرصدة السالبة غير المتوقعة
  incomeStatement.revenue.accounts.forEach(account => {
    if (account.balance < 0) {
      errors.push(`حساب إيراد برصيد سالب: ${account.accountNameAr}`);
    }
  });
  
  incomeStatement.expenses.accounts.forEach(account => {
    if (account.balance < 0) {
      errors.push(`حساب مصروف برصيد سالب: ${account.accountNameAr}`);
    }
  });
  
  // التحقق من اتساق الحسابات
  const calculatedNetIncome = incomeStatement.revenue.total - incomeStatement.expenses.total;
  if (Math.abs(calculatedNetIncome - incomeStatement.netIncome) > 0.01) {
    errors.push('عدم اتساق في حساب صافي الدخل');
  }
  
  // تحذيرات
  if (incomeStatement.netIncome < 0) {
    warnings.push('خسارة صافية في هذه الفترة');
  }
  
  if (incomeStatement.grossProfitMargin < 20) {
    warnings.push('هامش الربح الإجمالي منخفض');
  }
  
  if (incomeStatement.revenue.total === 0) {
    warnings.push('لا توجد إيرادات في هذه الفترة');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
