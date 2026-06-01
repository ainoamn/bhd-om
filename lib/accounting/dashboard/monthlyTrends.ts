import type { ChartAccount, JournalEntry } from '@/lib/data/accounting';

export type MonthlyTrendSeries = {
  labels: string[];
  revenue: number[];
  expense: number[];
};

/** Last N calendar months of revenue/expense from journal lines (local path). */
export function computeMonthlyTrendSeries(
  entries: JournalEntry[],
  accounts: ChartAccount[],
  months = 6,
  now = new Date()
): MonthlyTrendSeries {
  const labels: string[] = [];
  const revenue: number[] = [];
  const expense: number[] = [];
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  for (let m = 0; m < months; m++) {
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
    const label = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
    labels.push(label);

    let rev = 0;
    let exp = 0;
    for (const entry of entries) {
      if (entry.status === 'CANCELLED' || entry.replacedBy) continue;
      const d = new Date(entry.date);
      if (d < monthStart || d > monthEnd) continue;
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) continue;
        if (acc.type === 'REVENUE') rev += (line.credit || 0) - (line.debit || 0);
        if (acc.type === 'EXPENSE') exp += (line.debit || 0) - (line.credit || 0);
      }
    }
    revenue.push(rev);
    expense.push(exp);
  }

  return { labels, revenue, expense };
}
