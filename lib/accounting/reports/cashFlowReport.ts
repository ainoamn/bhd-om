/**
 * Cash flow from DB — net change in cash + bank accounts (1000, 1100)
 */

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type CashFlowReport = {
  report: 'cashflow';
  fromDate: string;
  toDate: string;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  cashIn: number;
  cashOut: number;
};

type JournalRow = {
  lines: Array<{ accountId: string; debit: number; credit: number }>;
};

export function buildCashFlowFromJournalLines(
  entries: JournalRow[],
  cashAccountIds: string[],
  fromDate: string,
  toDate: string
): CashFlowReport {
  const ids = new Set(cashAccountIds);
  let cashIn = 0;
  let cashOut = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!ids.has(line.accountId)) continue;
      cashIn += line.debit;
      cashOut += line.credit;
    }
  }
  const operating = round2(cashIn - cashOut);
  return {
    report: 'cashflow',
    fromDate,
    toDate,
    operating,
    investing: 0,
    financing: 0,
    netChange: operating,
    cashIn: round2(cashIn),
    cashOut: round2(cashOut),
  };
}
