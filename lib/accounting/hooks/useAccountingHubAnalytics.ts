'use client';

import { useMemo } from 'react';
import {
  aiDetectAnomalies,
  getBankAccountBalance,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
} from '@/lib/data/accounting';
import type { BankAccount } from '@/lib/data/bankAccounts';
import { computeFinancialKpisFromAccounts } from '@/lib/accounting/dashboard/accountStats';
import { computeMonthlyTrendSeries } from '@/lib/accounting/dashboard/monthlyTrends';
import { useAccountingDbReports } from '@/lib/accounting/hooks/useAccountingDbReports';
import type { ReportViewId } from '@/lib/accounting/ui/reportLabels';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';

export type AccountingHubStats = {
  totalEntries: number;
  totalDocuments: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
};

type AnalyticsOptions = {
  useDb: boolean;
  activeTab: AccountingHubTabId;
  filterFromDate: string;
  filterToDate: string;
  reportView: ReportViewId;
  agingLedger: 'ar' | 'ap';
  journalEntries: JournalEntry[];
  accounts: ChartAccount[];
  documents: AccountingDocument[];
  bankAccounts: BankAccount[];
  dataMeta: { journalTotal?: number; documentsTotal?: number } | null;
  selectedBankAccountId: string;
  reportPropertyId: string;
  reportContactId: string;
};

export function useAccountingHubAnalytics(opts: AnalyticsOptions) {
  const {
    useDb,
    activeTab,
    filterFromDate,
    filterToDate,
    reportView,
    agingLedger,
    journalEntries,
    accounts,
    documents,
    bankAccounts,
    dataMeta,
    selectedBankAccountId,
    reportPropertyId,
    reportContactId,
  } = opts;

  const reportFrom = filterFromDate || `${new Date().getFullYear()}-01-01`;
  const reportTo = filterToDate || new Date().toISOString().slice(0, 10);
  const reportAsOf = filterToDate || new Date().toISOString().slice(0, 10);

  const entriesForReports = journalEntries;
  const accountsForReports = accounts;

  const reports = useAccountingDbReports({
    useDb,
    activeTab,
    reportView,
    reportFrom,
    reportTo,
    reportAsOf,
    agingLedger,
    journalEntries,
    accounts,
    selectedBankAccountId,
    reportPropertyId,
    reportContactId,
  });

  const { trialBalance, incomeStatement, balanceSheet } = reports;

  const dbKpis = useMemo(
    () => (useDb ? computeFinancialKpisFromAccounts(accounts) : null),
    [useDb, accounts]
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayStats = useMemo(() => {
    let received = 0;
    let expenses = 0;
    for (const doc of documents) {
      if (doc.date !== todayIso || doc.status === 'CANCELLED') continue;
      const amt = doc.totalAmount ?? doc.amount ?? 0;
      if (doc.type === 'RECEIPT' || doc.type === 'INVOICE') received += amt;
      if (doc.type === 'PAYMENT' || doc.type === 'PURCHASE_INV') expenses += amt;
    }
    return { received, expenses };
  }, [documents, todayIso]);

  const stats: AccountingHubStats = useDb && dbKpis
    ? {
        totalEntries: dataMeta?.journalTotal ?? journalEntries.length,
        totalDocuments: dataMeta?.documentsTotal ?? documents.length,
        totalAssets: dbKpis.totalAssets,
        totalLiabilities: dbKpis.totalLiabilities,
        totalEquity: dbKpis.totalEquity,
        totalRevenue: dbKpis.totalRevenue,
        totalExpenses: dbKpis.totalExpenses,
        netIncome: dbKpis.netIncome,
      }
    : {
        totalEntries: journalEntries.length,
        totalDocuments: documents.length,
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity + balanceSheet.netIncome,
        totalRevenue: incomeStatement.revenue.total,
        totalExpenses: incomeStatement.expense.total,
        netIncome: incomeStatement.netIncome,
      };

  const anomalies = useMemo(
    () => aiDetectAnomalies(entriesForReports, accountsForReports),
    [entriesForReports, accountsForReports]
  );

  const cashSnapshot = useDb && dbKpis
    ? { balance: dbKpis.cashBalance }
    : getBankAccountBalance('CASH', reportAsOf, entriesForReports);

  const banksTotal = useDb && dbKpis
    ? dbKpis.bankBalance
    : bankAccounts
        .filter((b) => b.isActive)
        .reduce((s, b) => s + getBankAccountBalance(b.id, reportAsOf, entriesForReports).balance, 0);

  const latestEntries = useMemo(
    () => journalEntries.filter((e) => e.documentType !== 'RECEIPT').slice(0, 5),
    [journalEntries]
  );
  const latestDocs = useMemo(() => documents.slice(0, 5), [documents]);

  const { labels: monthlyLabels, revenue: monthlyRevenue, expense: monthlyExpense } = useMemo(
    () => computeMonthlyTrendSeries(entriesForReports, accountsForReports),
    [entriesForReports, accountsForReports]
  );

  const receivables = useMemo(() => {
    if (useDb && dbKpis) return dbKpis.receivables;
    const invs = documents.filter((d) => d.type === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED');
    return invs.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents, useDb, dbKpis]);

  const chequesReceivable = useMemo(() => {
    if (useDb && dbKpis) return dbKpis.chequesReceivable;
    const cheques = documents.filter((d) => d.type === 'RECEIPT' && d.paymentMethod === 'CHEQUE');
    return cheques.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents, useDb, dbKpis]);

  const totalClaims = receivables + chequesReceivable;

  const paymentsTotal = useMemo(() => {
    const pays = documents.filter((d) => d.type === 'PAYMENT' || d.type === 'RECEIPT');
    return pays.reduce((s, d) => s + d.totalAmount, 0);
  }, [documents]);

  return {
    reportFrom,
    reportTo,
    reportAsOf,
    entriesForReports,
    accountsForReports,
    ...reports,
    stats,
    todayStats,
    anomalies,
    cashSnapshot,
    banksTotal,
    latestEntries,
    latestDocs,
    monthlyLabels,
    monthlyRevenue,
    monthlyExpense,
    receivables,
    chequesReceivable,
    totalClaims,
    paymentsTotal,
  };
}
