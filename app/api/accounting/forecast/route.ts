import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntriesFromDb, getAccountsFromDb } from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

/**
 * التنبؤ بالتدفق النقدي والإيرادات
 * Cash Flow & Revenue Forecasting - Linear regression / Moving average
 */

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function movingAverage(arr: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(arr.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
    } else {
      result.push(arr.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window);
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const perm = requirePermission(request, 'REPORT_VIEW');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);
    const forecastMonths = parseInt(searchParams.get('forecastMonths') || '3', 10);

    const entries = await getJournalEntriesFromDb();
    const accounts = await getAccountsFromDb();

    const cashAccountIds = accounts.filter((a: any) => a.code === '1000' || a.code === '1100').map((a: any) => a.id);
    const revenueAccountIds = accounts.filter((a: any) => a.type === 'REVENUE').map((a: any) => a.id);
    const expenseAccountIds = accounts.filter((a: any) => a.type === 'EXPENSE').map((a: any) => a.id);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const monthlyRevenue: number[] = [];
    const monthlyExpense: number[] = [];
    const monthlyCashFlow: number[] = [];
    const labels: string[] = [];

    for (let m = 0; m < months; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
      labels.push(`${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`);

      let rev = 0, exp = 0, cashIn = 0, cashOut = 0;
      for (const entry of entries) {
        if (entry.status === 'CANCELLED' || entry.replacedBy) continue;
        const d = new Date(entry.date);
        if (d < monthStart || d > monthEnd) continue;
        for (const line of entry.lines) {
          if (revenueAccountIds.includes(line.accountId)) {
            rev += (line.credit || 0) - (line.debit || 0);
          }
          if (expenseAccountIds.includes(line.accountId)) {
            exp += (line.debit || 0) - (line.credit || 0);
          }
          if (cashAccountIds.includes(line.accountId)) {
            cashIn += line.debit || 0;
            cashOut += line.credit || 0;
          }
        }
      }
      monthlyRevenue.push(rev);
      monthlyExpense.push(exp);
      monthlyCashFlow.push(cashIn - cashOut);
    }

    const x = Array.from({ length: months }, (_, i) => i);
    const revReg = linearRegression(x, monthlyRevenue);
    const expReg = linearRegression(x, monthlyExpense);
    const cashReg = linearRegression(x, monthlyCashFlow);

    const revenueForecast = Array.from({ length: forecastMonths }, (_, i) =>
      Math.max(0, revReg.slope * (months + i) + revReg.intercept)
    );
    const expenseForecast = Array.from({ length: forecastMonths }, (_, i) =>
      Math.max(0, expReg.slope * (months + i) + expReg.intercept)
    );
    const cashFlowForecast = Array.from({ length: forecastMonths }, (_, i) =>
      cashReg.slope * (months + i) + cashReg.intercept
    );

    const forecastLabels = Array.from({ length: forecastMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    return NextResponse.json({
      historical: {
        labels,
        revenue: monthlyRevenue,
        expense: monthlyExpense,
        cashFlow: monthlyCashFlow,
      },
      forecast: {
        labels: forecastLabels,
        revenue: revenueForecast,
        expense: expenseForecast,
        cashFlow: cashFlowForecast,
      },
      summary: {
        avgRevenue: monthlyRevenue.reduce((a, b) => a + b, 0) / months,
        avgExpense: monthlyExpense.reduce((a, b) => a + b, 0) / months,
        avgCashFlow: monthlyCashFlow.reduce((a, b) => a + b, 0) / months,
        trendRevenue: revReg.slope,
        trendExpense: expReg.slope,
      },
    });
  } catch (err) {
    console.error('Accounting forecast GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Forecast failed' },
      { status: 500 }
    );
  }
}
