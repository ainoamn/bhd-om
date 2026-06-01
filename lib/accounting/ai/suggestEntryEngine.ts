/**
 * AI Suggest Entry — rule-based journal line suggestions (human approval required)
 */

import type { ChartAccount } from '../domain/types';
import { suggestAccount } from './analyticsEngine';

export type SuggestedJournalLine = {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  descriptionAr?: string;
  descriptionEn?: string;
};

export type SuggestEntryResult = {
  lines: SuggestedJournalLine[];
  explanationAr: string;
  explanationEn: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  parsedAmount: number;
};

function findAccount(accounts: ChartAccount[], code: string) {
  return accounts.find((a) => a.code === code && a.isActive !== false) ?? null;
}

function parseAmount(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ر\.?\s*ع|OMR|rial|ريال)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isReceipt(text: string) {
  return /\b(استلام|تحصيل|إيصال|received|receipt|collection|دفع\s+عميل)\b/i.test(text);
}

function isExpense(text: string) {
  return /\b(مصروف|صرف|دفع|expense|payment|purchase|مشتريات|صيانة|maintenance|إيجار|rent)\b/i.test(text);
}

function isRevenue(text: string) {
  return /\b(إيراد|بيع|فاتورة|invoice|sales|revenue|إيجار\s+مستلم)\b/i.test(text);
}

export function suggestJournalEntryFromText(
  description: string,
  accounts: ChartAccount[],
  amountOverride?: number
): SuggestEntryResult | null {
  const text = description.trim();
  if (!text) return null;

  const amount = amountOverride ?? parseAmount(text);
  if (!amount || amount <= 0) return null;

  const primary = suggestAccount(text, accounts);
  const cash = findAccount(accounts, '1000');
  const bank = findAccount(accounts, '1100');
  const revenue = findAccount(accounts, '4000') ?? findAccount(accounts, '4100');
  const expense = findAccount(accounts, '5000') ?? primary;
  const contra = /\b(بنك|bank|تحويل)\b/i.test(text) ? bank : cash;

  if (!contra) return null;

  const descAr = text.slice(0, 120);
  const descEn = text.slice(0, 120);

  if (isReceipt(text) || isRevenue(text)) {
    const rev = primary?.type === 'REVENUE' ? primary : revenue;
    if (!rev) return null;
    return {
      parsedAmount: amount,
      confidence: 'HIGH',
      explanationAr: `اقتراح: استلام ${amount} ر.ع — مدين ${contra.nameAr}، دائن ${rev.nameAr}`,
      explanationEn: `Suggested: receipt ${amount} OMR — debit ${contra.nameEn}, credit ${rev.nameEn}`,
      lines: [
        line(contra, amount, 0, descAr, descEn),
        line(rev, 0, amount, descAr, descEn),
      ],
    };
  }

  if (isExpense(text)) {
    const exp = primary?.type === 'EXPENSE' ? primary : expense;
    if (!exp) return null;
    return {
      parsedAmount: amount,
      confidence: primary?.type === 'EXPENSE' ? 'HIGH' : 'MEDIUM',
      explanationAr: `اقتراح: مصروف ${amount} ر.ع — مدين ${exp.nameAr}، دائن ${contra.nameAr}`,
      explanationEn: `Suggested: expense ${amount} OMR — debit ${exp.nameEn}, credit ${contra.nameEn}`,
      lines: [
        line(exp, amount, 0, descAr, descEn),
        line(contra, 0, amount, descAr, descEn),
      ],
    };
  }

  if (primary) {
    const isDebitNormal = primary.type === 'ASSET' || primary.type === 'EXPENSE';
    return {
      parsedAmount: amount,
      confidence: 'LOW',
      explanationAr: `اقتراح أولي — راجع القيد قبل الحفظ`,
      explanationEn: `Initial suggestion — review before posting`,
      lines: isDebitNormal
        ? [line(primary, amount, 0, descAr, descEn), line(contra, 0, amount, descAr, descEn)]
        : [line(contra, amount, 0, descAr, descEn), line(primary, 0, amount, descAr, descEn)],
    };
  }

  return null;
}

function line(
  acc: ChartAccount,
  debit: number,
  credit: number,
  descriptionAr: string,
  descriptionEn: string
): SuggestedJournalLine {
  return {
    accountId: acc.id,
    accountCode: acc.code,
    accountNameAr: acc.nameAr,
    debit: round2(debit),
    credit: round2(credit),
    descriptionAr,
    descriptionEn,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
