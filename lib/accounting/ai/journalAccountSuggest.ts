import type { ChartAccount } from '@/lib/data/accounting';

/** Keyword-based account suggestion from journal description (local, no API). */
export function resolveJournalAccountSuggestion(
  descriptionAr: string,
  descriptionEn: string,
  accounts: ChartAccount[]
): ChartAccount | null {
  const text = (descriptionAr + ' ' + (descriptionEn || '')).toLowerCase();
  if (!text.trim()) return null;
  if (/نقد|صندوق|\bcash\b/i.test(text)) return accounts.find((a) => a.code === '1000') ?? null;
  if (/بنك|\bbank\b/i.test(text)) return accounts.find((a) => a.code === '1100') ?? null;
  if (/إيجار|إيراد|\brent\b/i.test(text)) return accounts.find((a) => a.code === '4000') ?? null;
  if (/عميل|عملاء|receivable/i.test(text)) return accounts.find((a) => a.code === '1200') ?? null;
  if (/مورد|payable/i.test(text)) return accounts.find((a) => a.code === '2000') ?? null;
  if (/مصروف|صيانة|\bexpense\b/i.test(text)) return accounts.find((a) => a.code === '5000') ?? null;
  return null;
}
