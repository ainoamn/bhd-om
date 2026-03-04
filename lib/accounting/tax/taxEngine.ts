/**
 * Tax Engine - نظام الضرائب المحوسبة
 * متوافق مع أنظمة الضرائب العمانية
 * ضريبة القيمة المضافة - ضريبة الدخل - الزكاة
 */

import type { JournalEntry, ChartAccount } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { KEYS } from '../data/storage';
import { roundAmount } from '../ledger/generalLedger';

export interface TaxRate {
  id: string;
  nameAr: string;
  nameEn: string;
  rate: number; // نسبة الضريبة (مثال: 5% = 0.05)
  type: 'VAT' | 'INCOME_TAX' | 'OTHER';
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface TaxTransaction {
  id: string;
  date: string;
  type: 'VAT_OUTPUT' | 'VAT_INPUT' | 'WITHHOLDING_TAX' | 'INCOME_TAX';
  baseAmount: number; // المبلغ الأساسي قبل الضريبة
  taxAmount: number; // مبلغ الضريبة
  totalAmount: number; // المبلغ الإجمالي شامل الضريبة
  accountId: string;
  relatedJournalId?: string;
  descriptionAr: string;
  descriptionEn: string;
  isRecoverable: boolean; // قابل للاسترداد
  paidAt?: string;
}

export interface TaxPeriod {
  id: string;
  startDate: string;
  endDate: string;
  type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  status: 'OPEN' | 'CLOSED' | 'SUBMITTED';
  dueDate: string;
  submittedAt?: string;
  totalVatOutput: number;
  totalVatInput: number;
  netVatPayable: number;
  totalIncomeTax: number;
  totalWithholdingTax: number;
  totalTaxPayable: number;
}

export interface TaxReport {
  period: TaxPeriod;
  vatTransactions: TaxTransaction[];
  incomeTaxCalculations: IncomeTaxCalculation[];
  withholdingTransactions: TaxTransaction[];
  summary: TaxSummary;
}

export interface IncomeTaxCalculation {
  year: string;
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  allowances: number;
  deductions: number;
  netTaxPayable: number;
}

export interface TaxSummary {
  totalVatOutput: number;
  totalVatInput: number;
  netVatPayable: number;
  totalIncomeTax: number;
  totalWithholdingTax: number;
  totalTaxPayable: number;
  vatRecoverable: number;
  vatNonRecoverable: number;
}

/**
 * حساب ضريبة القيمة المضافة
 */
export function calculateVAT(
  amount: number,
  vatRate: number,
  isOutputVAT: boolean = true
): { baseAmount: number; taxAmount: number; totalAmount: number } {
  const baseAmount = roundAmount(amount / (1 + vatRate));
  const taxAmount = roundAmount(baseAmount * vatRate);
  const totalAmount = roundAmount(baseAmount + taxAmount);
  
  return {
    baseAmount,
    taxAmount,
    totalAmount
  };
}

/**
 * إنشاء معاملة ضريبية
 */
export function createTaxTransaction(
  data: Omit<TaxTransaction, 'id' | 'totalAmount'>,
  userId?: string
): TaxTransaction {
  const vatCalc = calculateVAT(data.baseAmount, 0.05, data.type === 'VAT_OUTPUT');
  
  const transaction: TaxTransaction = {
    id: `TAX-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...data,
    totalAmount: vatCalc.totalAmount
  };
  
  // حفظ المعاملة
  const transactions = getStored<TaxTransaction[]>(KEYS.JOURNAL); // استخدام نفس التخزين مؤقتاً
  transactions.push(transaction as any);
  saveStored(KEYS.JOURNAL, transactions);
  
  return transaction;
}

/**
 * حساب ضريبة الدخل السنوية
 */
export function calculateIncomeTax(
  year: string,
  entries: JournalEntry[]
): IncomeTaxCalculation {
  // الحصول على حسابات الإيرادات والمصروفات
  const accounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
  const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
  const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');
  
  // فلترة قيود السنة
  const yearEntries = entries.filter(entry => entry.date.startsWith(year));
  
  // حساب الدخل الخاضع للضريبة
  let taxableIncome = 0;
  
  revenueAccounts.forEach(account => {
    yearEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === account.id) {
          taxableIncome += line.credit || 0;
        }
      });
    });
  });
  
  expenseAccounts.forEach(account => {
    yearEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === account.id) {
          taxableIncome -= line.debit || 0;
        }
      });
    });
  });
  
  // حساب الإعفاءات والخصومات (مثال للنظام العماني)
  const allowances = calculateTaxAllowances(taxableIncome);
  const deductions = calculateTaxDeductions(taxableIncome);
  
  const netTaxableIncome = Math.max(0, taxableIncome - allowances - deductions);
  
  // حساب معدل الضريبة (شريحة ضريبية)
  const taxRate = getIncomeTaxRate(netTaxableIncome);
  const taxAmount = roundAmount(netTaxableIncome * taxRate);
  
  return {
    year,
    taxableIncome: roundAmount(taxableIncome),
    taxRate,
    taxAmount,
    allowances,
    deductions,
    netTaxPayable: taxAmount
  };
}

/**
 * حساب الإعفاءات الضريبية
 */
function calculateTaxAllowances(income: number): number {
  // الإعفاء الشخصي الأساسي (مثال: 3,000 ريال عماني سنوياً)
  const personalAllowance = 3000;
  
  // إعفاءات إضافية حسب الدخل
  let additionalAllowances = 0;
  if (income > 30000) additionalAllowances += 1000;
  if (income > 60000) additionalAllowances += 2000;
  
  return personalAllowance + additionalAllowances;
}

/**
 * حساب الخصومات الضريبية
 */
function calculateTaxDeductions(income: number): number {
  // خصومات التأمينات الاجتماعية (مثال: 7% من الدخل بحد أقصى 3,600)
  const socialInsurance = Math.min(income * 0.07, 3600);
  
  // خصومات أخرى (أقساط التأمين الصحي، إلخ)
  const otherDeductions = 0; // يمكن إضافتها لاحقاً
  
  return socialInsurance + otherDeductions;
}

/**
 * الحصول على معدل ضريبة الدخل حسب الشريحة
 */
function getIncomeTaxRate(taxableIncome: number): number {
  // شرائح ضريبة الدخل العمانية (مثال)
  if (taxableIncome <= 5000) return 0;      // 0% لأول 5,000
  if (taxableIncome <= 20000) return 0.05;  // 5% من 5,001 إلى 20,000
  if (taxableIncome <= 40000) return 0.10;  // 10% من 20,001 إلى 40,000
  if (taxableIncome <= 60000) return 0.15;  // 15% من 40,001 إلى 60,000
  if (taxableIncome <= 100000) return 0.20; // 20% من 60,001 إلى 100,000
  return 0.25;                             // 25% فوق 100,000
}

/**
 * حساب ضريبة الخصم عند المنبع
 */
export function calculateWithholdingTax(
  amount: number,
  serviceType: 'PROFESSIONAL' | 'ROYALTY' | 'INTEREST' | 'RENTAL' | 'OTHER'
): number {
  const rates = {
    PROFESSIONAL: 0.10,  // 10% للخدمات المهنية
    ROYALTY: 0.10,       // 10% للإتاوات
    INTEREST: 0.10,      // 10% للفوائد
    RENTAL: 0.10,        // 10% للإيجارات
    OTHER: 0.05          // 5% للخدمات الأخرى
  };
  
  return roundAmount(amount * rates[serviceType]);
}

/**
 * إنشاء تقرير ضريبي للفترة
 */
export function generateTaxReport(
  period: string,
  entries: JournalEntry[]
): TaxReport {
  // فلترة معاملات الفترة
  const periodEntries = entries.filter(entry => entry.date.startsWith(period));
  
  // حساب معاملات ضريبة القيمة المضافة
  const vatTransactions = calculateVATTransactions(periodEntries);
  
  // حساب ضريبة الدخل
  const incomeTaxCalculations = [calculateIncomeTax(period, periodEntries)];
  
  // حساب ضريبة الخصم عند المنبع
  const withholdingTransactions = calculateWithholdingTransactions(periodEntries);
  
  // حساب الملخص الضريبي
  const summary = calculateTaxSummary(vatTransactions, incomeTaxCalculations, withholdingTransactions);
  
  // إنشاء فترة ضريبية
  const taxPeriod: TaxPeriod = {
    id: period,
    startDate: `${period}-01-01`,
    endDate: `${period}-12-31`,
    type: 'ANNUAL',
    status: 'OPEN',
    dueDate: `${period}-04-30`, // 30 أبريل للسنة السابقة
    totalVatOutput: summary.totalVatOutput,
    totalVatInput: summary.totalVatInput,
    netVatPayable: summary.netVatPayable,
    totalIncomeTax: summary.totalIncomeTax,
    totalWithholdingTax: summary.totalWithholdingTax,
    totalTaxPayable: summary.totalTaxPayable
  };
  
  return {
    period: taxPeriod,
    vatTransactions,
    incomeTaxCalculations,
    withholdingTransactions,
    summary
  };
}

/**
 * حساب معاملات ضريبة القيمة المضافة
 */
function calculateVATTransactions(entries: JournalEntry[]): TaxTransaction[] {
  const transactions: TaxTransaction[] = [];
  
  entries.forEach(entry => {
    entry.lines.forEach(line => {
      // تحديد المعاملات الخاضعة لضريبة القيمة المضافة
      if (line.descriptionAr?.includes('ضريبة') || line.descriptionEn?.includes('VAT')) {
        const isOutputVAT = line.debit > 0; // ضريبة المخرجات عندما تكون مدينة
        
        transactions.push({
          id: `VAT-${entry.id}-${line.accountId}`,
          date: entry.date,
          type: isOutputVAT ? 'VAT_OUTPUT' : 'VAT_INPUT',
          baseAmount: Math.abs(line.debit || line.credit) / 1.05, // تقدير
          taxAmount: Math.abs(line.debit || line.credit) * 0.05 / 1.05, // تقدير
          totalAmount: Math.abs(line.debit || line.credit),
          accountId: line.accountId,
          relatedJournalId: entry.id,
          descriptionAr: line.descriptionAr || '',
          descriptionEn: line.descriptionEn || '',
          isRecoverable: !isOutputVAT // ضريبة المدخلات قابلة للاسترداد
        });
      }
    });
  });
  
  return transactions;
}

/**
 * حساب معاملات ضريبة الخصم عند المنبع
 */
function calculateWithholdingTransactions(entries: JournalEntry[]): TaxTransaction[] {
  const transactions: TaxTransaction[] = [];
  
  entries.forEach(entry => {
    entry.lines.forEach(line => {
      // تحديد معاملات الخصم عند المنبع
      if (line.descriptionAr?.includes('خصم') || line.descriptionEn?.includes('withholding')) {
        transactions.push({
          id: `WHT-${entry.id}-${line.accountId}`,
          date: entry.date,
          type: 'WITHHOLDING_TAX',
          baseAmount: Math.abs(line.debit || line.credit) / 0.9, // تقدير
          taxAmount: Math.abs(line.debit || line.credit) * 0.1 / 0.9, // تقدير
          totalAmount: Math.abs(line.debit || line.credit),
          accountId: line.accountId,
          relatedJournalId: entry.id,
          descriptionAr: line.descriptionAr || '',
          descriptionEn: line.descriptionEn || '',
          isRecoverable: false // ضريبة الخصم عند المنبع غير قابلة للاسترداد
        });
      }
    });
  });
  
  return transactions;
}

/**
 * حساب الملخص الضريبي
 */
function calculateTaxSummary(
  vatTransactions: TaxTransaction[],
  incomeTaxCalculations: IncomeTaxCalculation[],
  withholdingTransactions: TaxTransaction[]
): TaxSummary {
  const totalVatOutput = vatTransactions
    .filter(t => t.type === 'VAT_OUTPUT')
    .reduce((sum, t) => sum + t.taxAmount, 0);
  
  const totalVatInput = vatTransactions
    .filter(t => t.type === 'VAT_INPUT')
    .reduce((sum, t) => sum + t.taxAmount, 0);
  
  const vatRecoverable = vatTransactions
    .filter(t => t.type === 'VAT_INPUT' && t.isRecoverable)
    .reduce((sum, t) => sum + t.taxAmount, 0);
  
  const vatNonRecoverable = vatTransactions
    .filter(t => t.type === 'VAT_INPUT' && !t.isRecoverable)
    .reduce((sum, t) => sum + t.taxAmount, 0);
  
  const totalIncomeTax = incomeTaxCalculations
    .reduce((sum, calc) => sum + calc.netTaxPayable, 0);
  
  const totalWithholdingTax = withholdingTransactions
    .reduce((sum, t) => sum + t.taxAmount, 0);
  
  const netVatPayable = totalVatOutput - vatRecoverable;
  const totalTaxPayable = netVatPayable + totalIncomeTax - totalWithholdingTax;
  
  return {
    totalVatOutput: roundAmount(totalVatOutput),
    totalVatInput: roundAmount(totalVatInput),
    netVatPayable: roundAmount(netVatPayable),
    totalIncomeTax: roundAmount(totalIncomeTax),
    totalWithholdingTax: roundAmount(totalWithholdingTax),
    totalTaxPayable: roundAmount(totalTaxPayable),
    vatRecoverable: roundAmount(vatRecoverable),
    vatNonRecoverable: roundAmount(vatNonRecoverable)
  };
}

/**
 * التحقق من الامتثال الضريبي
 */
export function validateTaxCompliance(
  taxReport: TaxReport
): {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // التحقق من تسجيل معاملات ضريبة القيمة المضافة
  if (taxReport.vatTransactions.length === 0) {
    issues.push('لم يتم تسجيل أي معاملات ضريبة القيمة المضافة');
    recommendations.push('راجع جميع الفواتير وقم بتسجيل ضريبة القيمة المضافة');
  }
  
  // التحقق من توازن ضريبة القيمة المضافة
  const vatBalance = taxReport.summary.totalVatOutput - taxReport.summary.vatRecoverable;
  if (Math.abs(vatBalance - taxReport.summary.netVatPayable) > 0.01) {
    issues.push('عدم توازن في حسابات ضريبة القيمة المضافة');
    recommendations.push('راجع حسابات ضريبة القيمة المضافة وتأكد من صحتها');
  }
  
  // التحقق من تقديم الإقرارات الضريبية في الوقت المحدد
  const today = new Date();
  const dueDate = new Date(taxReport.period.dueDate);
  if (today > dueDate && taxReport.period.status !== 'SUBMITTED') {
    issues.push('تجاوز موعد تقديم الإقرار الضريبي');
    recommendations.push('قدم الإقرار الضريبي فوراً لتجنب الغرامات');
  }
  
  // التحقق من دقة حساب ضريبة الدخل
  const incomeTax = taxReport.incomeTaxCalculations[0];
  if (incomeTax && incomeTax.taxableIncome < 0) {
    issues.push('الدخل الخاضع للضريبة سالب');
    recommendations.push('راجع حسابات الإيرادات والمصروفات');
  }
  
  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  };
}
