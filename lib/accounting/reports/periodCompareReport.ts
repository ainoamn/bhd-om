/**
 * Period comparison — current vs previous period of equal length
 */

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pctChange(current: number, previous: number): number | null {
  if (Math.abs(previous) < 0.001) return current !== 0 ? 100 : null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

export function previousPeriodRange(fromDate: string, toDate: string): { fromDate: string; toDate: string } {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);
  return {
    fromDate: prevFrom.toISOString().slice(0, 10),
    toDate: prevTo.toISOString().slice(0, 10),
  };
}

export type PeriodCompareReport = {
  report: 'compare';
  current: { fromDate: string; toDate: string; revenue: number; expense: number; netIncome: number };
  previous: { fromDate: string; toDate: string; revenue: number; expense: number; netIncome: number };
  delta: {
    revenue: number;
    expense: number;
    netIncome: number;
    revenuePct: number | null;
    expensePct: number | null;
    netIncomePct: number | null;
  };
};

export function buildPeriodCompareReport(
  current: { fromDate: string; toDate: string; revenue: number; expense: number },
  previous: { fromDate: string; toDate: string; revenue: number; expense: number }
): PeriodCompareReport {
  const curNet = round2(current.revenue - current.expense);
  const prevNet = round2(previous.revenue - previous.expense);
  return {
    report: 'compare',
    current: { ...current, netIncome: curNet },
    previous: { ...previous, netIncome: prevNet },
    delta: {
      revenue: round2(current.revenue - previous.revenue),
      expense: round2(current.expense - previous.expense),
      netIncome: round2(curNet - prevNet),
      revenuePct: pctChange(current.revenue, previous.revenue),
      expensePct: pctChange(current.expense, previous.expense),
      netIncomePct: pctChange(curNet, prevNet),
    },
  };
}
