import { NextRequest, NextResponse } from 'next/server';
import { getBankLedgerFromDb } from '@/lib/accounting/data/dbService';
import {
  reconcileBankLines,
  parseBankStatementCsv,
  type StatementLine,
} from '@/lib/accounting/reports/bankReconciliation';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';

export async function GET(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') === 'CASH' ? 'CASH' : 'BANK';
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const data = await getBankLedgerFromDb({ mode, fromDate, toDate, bankAccountId });
    return NextResponse.json(data);
  } catch (err) {
    console.error('Bank reconciliation GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load ledger' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const mode = body.mode === 'CASH' ? 'CASH' : 'BANK';
    const fromDate = body.fromDate || undefined;
    const toDate = body.toDate || undefined;
    const statementBalance = body.statementBalance != null ? Number(body.statementBalance) : undefined;
    const bankAccountId = body.bankAccountId ? String(body.bankAccountId) : undefined;

    let statementLines: StatementLine[] = Array.isArray(body.statementLines) ? body.statementLines : [];
    if (body.statementCsv && typeof body.statementCsv === 'string') {
      statementLines = parseBankStatementCsv(body.statementCsv);
    }

    const { lines: bookLines } = await getBankLedgerFromDb({ mode, fromDate, toDate, bankAccountId });
    const result = reconcileBankLines(bookLines, statementLines, statementBalance);
    return NextResponse.json({ ...result, bookLines: bookLines.length, statementLines: statementLines.length });
  } catch (err) {
    console.error('Bank reconciliation POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reconciliation failed' },
      { status: 400 }
    );
  }
}
