/**
 * Bank Reconciliation — match book ledger vs bank statement lines
 */

export type BookLedgerLine = {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference?: string;
  journalSerial?: string;
  matched?: boolean;
};

export type StatementLine = {
  id: string;
  date: string;
  amount: number;
  reference?: string;
  description?: string;
  type: 'debit' | 'credit';
};

export type ReconciliationMatch = {
  bookLineId: string;
  statementLineId: string;
  amount: number;
};

export type ReconciliationResult = {
  bookBalance: number;
  statementBalance: number;
  difference: number;
  matched: ReconciliationMatch[];
  unmatchedBook: BookLedgerLine[];
  unmatchedStatement: StatementLine[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeBookBalance(lines: BookLedgerLine[]): number {
  return round2(lines.reduce((s, l) => s + l.debit - l.credit, 0));
}

export function computeStatementBalance(lines: StatementLine[]): number {
  return round2(lines.reduce((s, l) => s + (l.type === 'debit' ? l.amount : -l.amount), 0));
}

/** Match by exact date + amount (±0.01) */
export function reconcileBankLines(
  bookLines: BookLedgerLine[],
  statementLines: StatementLine[],
  statementBalanceOverride?: number
): ReconciliationResult {
  const unmatchedBook = bookLines.map((l) => ({ ...l, matched: false }));
  const unmatchedStatement = statementLines.map((l) => ({ ...l }));
  const matched: ReconciliationMatch[] = [];

  for (const stmt of unmatchedStatement) {
    const stmtSigned = stmt.type === 'debit' ? stmt.amount : -stmt.amount;
    const idx = unmatchedBook.findIndex((book) => {
      if (book.matched) return false;
      if (book.date !== stmt.date) return false;
      const bookSigned = book.debit - book.credit;
      return Math.abs(bookSigned - stmtSigned) < 0.02;
    });
    if (idx >= 0) {
      unmatchedBook[idx].matched = true;
      matched.push({
        bookLineId: unmatchedBook[idx].id,
        statementLineId: stmt.id,
        amount: Math.abs(stmtSigned),
      });
    }
  }

  const bookBalance = computeBookBalance(bookLines);
  const statementBalance = statementBalanceOverride ?? computeStatementBalance(statementLines);

  return {
    bookBalance,
    statementBalance,
    difference: round2(bookBalance - statementBalance),
    matched,
    unmatchedBook: unmatchedBook.filter((l) => !l.matched),
    unmatchedStatement: unmatchedStatement.filter(
      (s) => !matched.some((m) => m.statementLineId === s.id)
    ),
  };
}

/** Parse simple CSV bank statement: date,amount,reference,description */
export function parseBankStatementCsv(csv: string): StatementLine[] {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const lines: StatementLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;
    const date = cols[0];
    const amountRaw = parseFloat(cols[1]);
    if (!date || !Number.isFinite(amountRaw)) continue;
    const reference = cols[2] || undefined;
    const description = cols[3] || undefined;
    lines.push({
      id: `stmt-${i}`,
      date: date.slice(0, 10),
      amount: Math.abs(amountRaw),
      reference,
      description,
      type: amountRaw >= 0 ? 'debit' : 'credit',
    });
  }
  return lines;
}
