import { NextRequest, NextResponse } from 'next/server';
import {
  getJournalEntriesFromDb,
  getAccountsFromDb,
} from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

/**
 * التقارير المالية - Trial Balance, P&L, Balance Sheet
 */

export async function GET(request: NextRequest) {
  const perm = requirePermission(request, 'REPORT_VIEW');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || new Date().getFullYear() + '-01-01';
    const toDate = searchParams.get('toDate') || new Date().toISOString().slice(0, 10);
    const asOfDate = searchParams.get('asOfDate') || toDate;
    const report = searchParams.get('report') || 'trial'; // trial | income | balance

    const entries = await getJournalEntriesFromDb({ fromDate, toDate: asOfDate });
    const accounts = await getAccountsFromDb();

    const activeEntries = entries.filter((e: any) => e.status !== 'CANCELLED' && !e.replacedBy);

    const accountBalances: Record<string, { debit: number; credit: number }> = {};
    for (const acc of accounts) {
      accountBalances[acc.id] = { debit: 0, credit: 0 };
    }
    for (const entry of activeEntries) {
      const entryDate = entry.date;
      if (report === 'income' && (entryDate < fromDate || entryDate > toDate)) continue;
      if (report === 'balance' && entryDate > asOfDate) continue;
      for (const line of entry.lines) {
        if (accountBalances[line.accountId]) {
          accountBalances[line.accountId].debit += line.debit || 0;
          accountBalances[line.accountId].credit += line.credit || 0;
        }
      }
    }

    if (report === 'trial') {
      const trial = accounts
        .filter((a: any) => {
          const b = accountBalances[a.id];
          return b && (Math.abs(b.debit) > 0.001 || Math.abs(b.credit) > 0.001);
        })
        .map((a: any) => {
          const b = accountBalances[a.id];
          const isDebitNormal = a.type === 'ASSET' || a.type === 'EXPENSE';
          const balance = isDebitNormal ? b.debit - b.credit : b.credit - b.debit;
          return {
            accountId: a.id,
            accountCode: a.code,
            accountNameAr: a.nameAr,
            accountNameEn: a.nameEn,
            accountType: a.type,
            debit: b.debit,
            credit: b.credit,
            balance,
          };
        })
        .sort((a: any, b: any) => a.accountCode.localeCompare(b.accountCode));

      return NextResponse.json({
        report: 'trial',
        fromDate,
        toDate,
        data: trial,
        totalDebit: trial.reduce((s: number, r: any) => s + r.debit, 0),
        totalCredit: trial.reduce((s: number, r: any) => s + r.credit, 0),
      });
    }

    if (report === 'income') {
      const revenueAccounts = accounts.filter((a: any) => a.type === 'REVENUE');
      const expenseAccounts = accounts.filter((a: any) => a.type === 'EXPENSE');
      const revenueItems = revenueAccounts
        .map((a: any) => {
          const b = accountBalances[a.id];
          if (!b) return null;
          const amount = b.credit - b.debit;
          if (Math.abs(amount) < 0.001) return null;
          return { code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, amount };
        })
        .filter(Boolean);
      const expenseItems = expenseAccounts
        .map((a: any) => {
          const b = accountBalances[a.id];
          if (!b) return null;
          const amount = b.debit - b.credit;
          if (Math.abs(amount) < 0.001) return null;
          return { code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, amount };
        })
        .filter(Boolean);
      const revenueTotal = revenueItems.reduce((s: number, r: any) => s + r.amount, 0);
      const expenseTotal = expenseItems.reduce((s: number, r: any) => s + r.amount, 0);

      return NextResponse.json({
        report: 'income',
        fromDate,
        toDate,
        revenue: { items: revenueItems, total: revenueTotal },
        expense: { items: expenseItems, total: expenseTotal },
        netIncome: revenueTotal - expenseTotal,
      });
    }

    if (report === 'balance') {
      const yearStart = asOfDate.slice(0, 4) + '-01-01';
      const plEntries = entries.filter((e: any) => e.date >= yearStart && e.date <= asOfDate && e.status !== 'CANCELLED' && !e.replacedBy);
      const assetAccounts = accounts.filter((a: any) => a.type === 'ASSET');
      const liabilityAccounts = accounts.filter((a: any) => a.type === 'LIABILITY');
      const equityAccounts = accounts.filter((a: any) => a.type === 'EQUITY');

      const assetBalances: Record<string, number> = {};
      const liabilityBalances: Record<string, number> = {};
      const equityBalances: Record<string, number> = {};
      for (const entry of entries.filter((e: any) => e.date <= asOfDate && e.status !== 'CANCELLED' && !e.replacedBy)) {
        for (const line of entry.lines) {
          const acc = accounts.find((a: any) => a.id === line.accountId);
          if (!acc) continue;
          const delta = (line.debit || 0) - (line.credit || 0);
          if (acc.type === 'ASSET') assetBalances[acc.id] = (assetBalances[acc.id] || 0) + delta;
          else if (acc.type === 'LIABILITY') liabilityBalances[acc.id] = (liabilityBalances[acc.id] || 0) - delta;
          else if (acc.type === 'EQUITY') equityBalances[acc.id] = (equityBalances[acc.id] || 0) - delta;
        }
      }

      let netIncome = 0;
      for (const acc of accounts) {
        if (acc.type === 'REVENUE' || acc.type === 'EXPENSE') {
          const b = accountBalances[acc.id];
          if (b) netIncome += acc.type === 'REVENUE' ? (b.credit - b.debit) : (b.debit - b.credit);
        }
      }

      const assets = assetAccounts
        .map((a: any) => ({ code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, amount: assetBalances[a.id] || 0 }))
        .filter((r: any) => Math.abs(r.amount) > 0.001);
      const liabilities = liabilityAccounts
        .map((a: any) => ({ code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, amount: liabilityBalances[a.id] || 0 }))
        .filter((r: any) => Math.abs(r.amount) > 0.001);
      const equity = equityAccounts
        .map((a: any) => ({ code: a.code, nameAr: a.nameAr, nameEn: a.nameEn, amount: equityBalances[a.id] || 0 }))
        .filter((r: any) => Math.abs(r.amount) > 0.001);

      return NextResponse.json({
        report: 'balance',
        asOfDate,
        assets,
        liabilities,
        equity,
        netIncome,
        totalAssets: assets.reduce((s: number, r: any) => s + r.amount, 0),
        totalLiabilities: liabilities.reduce((s: number, r: any) => s + r.amount, 0),
        totalEquity: equity.reduce((s: number, r: any) => s + r.amount, 0) + netIncome,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (err) {
    console.error('Accounting reports GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report failed' },
      { status: 500 }
    );
  }
}
