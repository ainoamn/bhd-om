'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  type ChartAccount,
  type JournalEntry,
} from '@/lib/data/accounting';
import {
  fetchReports,
  fetchVatReport,
  fetchAgingReport,
  fetchCashFlowReport,
  fetchPeriodCompareReport,
  fetchBankStatementReport,
  fetchPropertyLedgerReport,
} from '@/lib/accounting/api/client';
import type { ReportViewId } from '@/lib/accounting/ui/reportLabels';

type TrialRow = ReturnType<typeof getTrialBalance>[number];
type IncomeData = ReturnType<typeof getIncomeStatement>;
type BalanceData = ReturnType<typeof getBalanceSheet>;

export function useAccountingDbReports(opts: {
  useDb: boolean;
  activeTab: string;
  reportView: ReportViewId;
  reportFrom: string;
  reportTo: string;
  reportAsOf: string;
  agingLedger: 'ar' | 'ap';
  journalEntries: JournalEntry[];
  accounts: ChartAccount[];
  selectedBankAccountId?: string;
  reportPropertyId?: string;
  reportContactId?: string;
}) {
  const {
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
  } = opts;

  const localTrial = useMemo(
    () => getTrialBalance(reportFrom, reportTo, journalEntries, accounts),
    [reportFrom, reportTo, journalEntries, accounts]
  );
  const localIncome = useMemo(
    () => getIncomeStatement(reportFrom, reportTo, journalEntries, accounts),
    [reportFrom, reportTo, journalEntries, accounts]
  );
  const localBalance = useMemo(
    () => getBalanceSheet(reportAsOf, journalEntries, accounts),
    [reportAsOf, journalEntries, accounts]
  );
  const localCashFlow = useMemo(
    () => getCashFlowStatement(reportFrom, reportTo, journalEntries, accounts),
    [reportFrom, reportTo, journalEntries, accounts]
  );

  const [dbTrial, setDbTrial] = useState<TrialRow[] | null>(null);
  const [dbIncome, setDbIncome] = useState<IncomeData | null>(null);
  const [dbBalance, setDbBalance] = useState<BalanceData | null>(null);
  const [loadingCore, setLoadingCore] = useState(false);

  const [vatReportData, setVatReportData] = useState<Awaited<ReturnType<typeof fetchVatReport>> | null>(null);
  const [loadingVat, setLoadingVat] = useState(false);
  const [agingReportData, setAgingReportData] = useState<Awaited<ReturnType<typeof fetchAgingReport>> | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);
  const [cashFlowDb, setCashFlowDb] = useState<Awaited<ReturnType<typeof fetchCashFlowReport>> | null>(null);
  const [loadingCashFlow, setLoadingCashFlow] = useState(false);
  const [compareReportData, setCompareReportData] = useState<Awaited<ReturnType<typeof fetchPeriodCompareReport>> | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [bankStatementDb, setBankStatementDb] = useState<Awaited<ReturnType<typeof fetchBankStatementReport>> | null>(null);
  const [loadingBankStatement, setLoadingBankStatement] = useState(false);
  const [propertyLedgerDb, setPropertyLedgerDb] = useState<Awaited<ReturnType<typeof fetchPropertyLedgerReport>> | null>(null);
  const [loadingPropertyLedger, setLoadingPropertyLedger] = useState(false);

  useEffect(() => {
    if (!useDb || activeTab !== 'reports') return;
    if (!['trial', 'income', 'balance'].includes(reportView)) return;
    let cancelled = false;
    setLoadingCore(true);
    const asOf = reportView === 'balance' ? reportAsOf : reportTo;
    fetchReports({
      report: reportView,
      fromDate: reportFrom,
      toDate: reportTo,
      asOfDate: asOf,
    })
      .then((data) => {
        if (cancelled) return;
        if (reportView === 'trial' && data.data) {
          setDbTrial(
            (data.data as Array<{
              accountId: string;
              accountCode: string;
              accountNameAr: string;
              accountNameEn: string;
              accountType: string;
              debit: number;
              credit: number;
              balance: number;
            }>).map((r) => ({
              accountId: r.accountId,
              accountCode: r.accountCode,
              accountNameAr: r.accountNameAr,
              accountNameEn: r.accountNameEn || r.accountNameAr,
              accountType: r.accountType as ChartAccount['type'],
              debit: r.debit,
              credit: r.credit,
              balance: r.balance,
            }))
          );
        } else if (reportView === 'income') {
          setDbIncome({
            revenue: { type: 'REVENUE', items: data.revenue.items, total: data.revenue.total },
            expense: { type: 'EXPENSE', items: data.expense.items, total: data.expense.total },
            netIncome: data.netIncome,
          });
        } else if (reportView === 'balance') {
          setDbBalance({
            assets: data.assets,
            liabilities: data.liabilities,
            equity: data.equity,
            totalAssets: data.totalAssets,
            totalLiabilities: data.totalLiabilities,
            totalEquity: data.totalEquity - (data.netIncome || 0),
            netIncome: data.netIncome,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbTrial(null);
          setDbIncome(null);
          setDbBalance(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useDb, activeTab, reportView, reportFrom, reportTo, reportAsOf]);

  useEffect(() => {
    if (!useDb || reportView !== 'vat' || activeTab !== 'reports') return;
    let cancelled = false;
    setLoadingVat(true);
    fetchVatReport({ fromDate: reportFrom, toDate: reportTo })
      .then((data) => { if (!cancelled) setVatReportData(data); })
      .catch(() => { if (!cancelled) setVatReportData(null); })
      .finally(() => { if (!cancelled) setLoadingVat(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, reportFrom, reportTo]);

  useEffect(() => {
    if (!useDb || reportView !== 'aging' || activeTab !== 'reports') return;
    let cancelled = false;
    setLoadingAging(true);
    fetchAgingReport({ ledger: agingLedger, asOfDate: reportTo })
      .then((data) => { if (!cancelled) setAgingReportData(data); })
      .catch(() => { if (!cancelled) setAgingReportData(null); })
      .finally(() => { if (!cancelled) setLoadingAging(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, agingLedger, reportTo]);

  useEffect(() => {
    if (!useDb || reportView !== 'cashflow' || activeTab !== 'reports') return;
    let cancelled = false;
    setLoadingCashFlow(true);
    fetchCashFlowReport({ fromDate: reportFrom, toDate: reportTo })
      .then((data) => { if (!cancelled) setCashFlowDb(data); })
      .catch(() => { if (!cancelled) setCashFlowDb(null); })
      .finally(() => { if (!cancelled) setLoadingCashFlow(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, reportFrom, reportTo]);

  useEffect(() => {
    if (!useDb || reportView !== 'compare' || activeTab !== 'reports') return;
    let cancelled = false;
    setLoadingCompare(true);
    fetchPeriodCompareReport({ fromDate: reportFrom, toDate: reportTo })
      .then((data) => { if (!cancelled) setCompareReportData(data); })
      .catch(() => { if (!cancelled) setCompareReportData(null); })
      .finally(() => { if (!cancelled) setLoadingCompare(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, reportFrom, reportTo]);

  useEffect(() => {
    if (!useDb || reportView !== 'bankStatement' || activeTab !== 'reports' || !selectedBankAccountId) return;
    let cancelled = false;
    setLoadingBankStatement(true);
    fetchBankStatementReport({
      bankAccountId: selectedBankAccountId,
      fromDate: reportFrom,
      toDate: reportTo,
    })
      .then((data) => { if (!cancelled) setBankStatementDb(data); })
      .catch(() => { if (!cancelled) setBankStatementDb(null); })
      .finally(() => { if (!cancelled) setLoadingBankStatement(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, selectedBankAccountId, reportFrom, reportTo]);

  useEffect(() => {
    if (!useDb || reportView !== 'propertyLedger' || activeTab !== 'reports') return;
    if (!reportPropertyId && !reportContactId) {
      setPropertyLedgerDb(null);
      return;
    }
    let cancelled = false;
    setLoadingPropertyLedger(true);
    fetchPropertyLedgerReport({
      propertyId: reportPropertyId ? parseInt(reportPropertyId, 10) : undefined,
      contactId: reportContactId || undefined,
      fromDate: reportFrom,
      toDate: reportTo,
    })
      .then((data) => { if (!cancelled) setPropertyLedgerDb(data); })
      .catch(() => { if (!cancelled) setPropertyLedgerDb(null); })
      .finally(() => { if (!cancelled) setLoadingPropertyLedger(false); });
    return () => { cancelled = true; };
  }, [useDb, reportView, activeTab, reportPropertyId, reportContactId, reportFrom, reportTo]);

  const trialBalance = useDb && dbTrial ? dbTrial : localTrial;
  const incomeStatement = useDb && dbIncome ? dbIncome : localIncome;
  const balanceSheet = useDb && dbBalance ? dbBalance : localBalance;

  return {
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow: localCashFlow,
    loadingCore,
    vatReportData,
    loadingVat,
    agingReportData,
    loadingAging,
    cashFlowDb,
    loadingCashFlow,
    compareReportData,
    loadingCompare,
    bankStatementDb,
    loadingBankStatement,
    propertyLedgerDb,
    loadingPropertyLedger,
  };
}
