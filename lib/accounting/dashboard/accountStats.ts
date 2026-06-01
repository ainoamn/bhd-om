/**
 * Fast dashboard stats from persisted account balances (DB path)
 * Avoids loading all journal entries for KPI cards at scale
 */

import type { ChartAccount } from '../domain/types';

export type FinancialKpis = {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  chequesReceivable: number;
};

function signedBalance(acc: ChartAccount & { balance?: number }): number {
  const raw = acc.balance ?? 0;
  const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
  return isDebitNormal ? raw : -raw;
}

export function computeFinancialKpisFromAccounts(accounts: ChartAccount[]): FinancialKpis {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;
  let cashBalance = 0;
  let bankBalance = 0;
  let receivables = 0;
  let chequesReceivable = 0;

  for (const acc of accounts) {
    const bal = signedBalance(acc as ChartAccount & { balance?: number });
    switch (acc.type) {
      case 'ASSET':
        totalAssets += bal;
        if (acc.code === '1000') cashBalance = bal;
        else if (acc.code === '1100') bankBalance = bal;
        else if (acc.code === '1150') chequesReceivable = bal;
        else if (acc.code === '1200' || acc.code === '1210') receivables += bal;
        break;
      case 'LIABILITY':
        totalLiabilities += bal;
        break;
      case 'EQUITY':
        totalEquity += bal;
        break;
      case 'REVENUE':
        totalRevenue += bal;
        break;
      case 'EXPENSE':
        totalExpenses += bal;
        break;
      default:
        break;
    }
  }

  const netIncome = totalRevenue - totalExpenses;

  return {
    totalAssets,
    totalLiabilities,
    totalEquity: totalEquity + netIncome,
    totalRevenue,
    totalExpenses,
    netIncome,
    cashBalance,
    bankBalance,
    receivables,
    chequesReceivable,
  };
}
