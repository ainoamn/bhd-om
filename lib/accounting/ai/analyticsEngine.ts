/**
 * AI & Analytics Engine
 * Financial Ratios | Aging | Cash Flow Trends | Anomaly Detection | Risk Flags
 * الذكاء الاصطناعي اقتراحي فقط - لا ينفذ قرارات مالية مباشرة
 */

import type { ChartAccount } from '../domain/types';

export interface FinancialRatio {
  name: string;
  nameAr: string;
  value: number;
  formula: string;
  interpretation: string;
}

export interface AgingBucket {
  bucket: string;
  bucketAr: string;
  amount: number;
  count: number;
}

export interface AnomalyAlert {
  id: string;
  type: 'NEGATIVE_BALANCE' | 'DUPLICATE_SUSPECT' | 'DEVIATION' | 'BUDGET_OVER' | 'COLLECTION_DELAY' | 'LIQUIDITY_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  messageAr: string;
  entityId?: string;
  entityType?: string;
  value?: number;
  suggestedAction?: string;
}

export interface RiskFlag {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  balance: number;
  message: string;
}

export function detectAnomalies(
  accounts: ChartAccount[],
  getBalance: (accountId: string) => number
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  for (const acc of accounts) {
    const balance = getBalance(acc.id);
    if (acc.type === 'ASSET' && balance < -0.01) {
      alerts.push({
        id: `ANOM-${acc.id}-${Date.now()}`,
        type: 'NEGATIVE_BALANCE',
        severity: 'HIGH',
        message: `Negative asset balance: ${acc.nameEn || acc.nameAr}`,
        messageAr: `رصيد أصول سالب: ${acc.nameAr}`,
        entityId: acc.id,
        entityType: 'ACCOUNT',
        value: balance,
        suggestedAction: 'Verify entries and consider reversal',
      });
    }
    if (acc.type === 'LIABILITY' && balance < -0.01) {
      alerts.push({
        id: `ANOM-${acc.id}-${Date.now()}`,
        type: 'NEGATIVE_BALANCE',
        severity: 'MEDIUM',
        message: `Negative liability balance: ${acc.nameEn || acc.nameAr}`,
        messageAr: `رصيد التزامات سالب: ${acc.nameAr}`,
        entityId: acc.id,
        entityType: 'ACCOUNT',
        value: balance,
        suggestedAction: 'Review postings',
      });
    }
  }
  return alerts;
}

export function calculateLiquidityRatio(
  currentAssets: number,
  currentLiabilities: number
): FinancialRatio {
  const ratio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  return {
    name: 'Current Ratio',
    nameAr: 'نسبة التداول',
    value: Math.round(ratio * 100) / 100,
    formula: 'Current Assets / Current Liabilities',
    interpretation: ratio >= 1.5 ? 'Strong' : ratio >= 1 ? 'Adequate' : 'Weak',
  };
}

export function calculateAging(
  amounts: Array<{ amount: number; dueDate: string }>,
  asOfDate: string
): AgingBucket[] {
  const asOf = new Date(asOfDate).getTime();
  const buckets = [
    { key: 'current', ar: 'الحالي', maxDays: 0 },
    { key: '1-30', ar: '1-30 يوم', maxDays: 30 },
    { key: '31-60', ar: '31-60 يوم', maxDays: 60 },
    { key: '61-90', ar: '61-90 يوم', maxDays: 90 },
    { key: '90+', ar: 'أكثر من 90 يوم', maxDays: 9999 },
  ];
  const result: AgingBucket[] = buckets.map((b) => ({ bucket: b.key, bucketAr: b.ar, amount: 0, count: 0 }));
  for (const { amount, dueDate } of amounts) {
    const due = new Date(dueDate).getTime();
    const daysOverdue = Math.floor((asOf - due) / (24 * 60 * 60 * 1000));
    let idx = 0;
    if (daysOverdue <= 0) idx = 0;
    else if (daysOverdue <= 30) idx = 1;
    else if (daysOverdue <= 60) idx = 2;
    else if (daysOverdue <= 90) idx = 3;
    else idx = 4;
    result[idx].amount += amount;
    result[idx].count += 1;
  }
  return result;
}

export function suggestAccount(description: string, accounts: ChartAccount[]): ChartAccount | null {
  const text = (description || '').toLowerCase().trim();
  if (!text) return null;
  const patterns: Array<{ regex: RegExp; code: string }> = [
    { regex: /\b(صندوق|نقد|cash|كاش)\b/, code: '1000' },
    { regex: /\b(بنك|bank|تحويل)\b/, code: '1100' },
    { regex: /\b(عميل|عملاء|receivable|مدين)\b/, code: '1200' },
    { regex: /\b(عربون|وديعة|deposit)\b/, code: '1300' },
    { regex: /\b(مورد|موردون|payable|دائن)\b/, code: '2000' },
    { regex: /\b(ضريبة|vat|زكاة|tax)\b/, code: '2200' },
    { regex: /\b(رأس مال|capital)\b/, code: '3000' },
    { regex: /\b(إيجار|rent|إيراد)\b/, code: '4000' },
    { regex: /\b(مبيعات|sales)\b/, code: '4100' },
    { regex: /\b(مصروف|expense|صيانة)\b/, code: '5000' },
  ];
  for (const { regex, code } of patterns) {
    if (regex.test(text)) return accounts.find((a) => a.code === code) || null;
  }
  return null;
}
