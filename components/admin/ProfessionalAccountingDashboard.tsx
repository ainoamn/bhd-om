/**
 * Professional Accounting Dashboard
 * لوحة تحكم محاسبية احترافية - IFRS Compliant
 * متوافقة مع المعايير العالمية
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { generateBalanceSheet, analyzeBalanceSheet } from '@/lib/accounting/financialStatements/balanceSheet';
import { generateIncomeStatement, analyzeIncomeStatement } from '@/lib/accounting/financialStatements/incomeStatement';
import { generateTrialBalance } from '@/lib/accounting/ledger/generalLedger';
import { checkIFRSCompliance } from '@/lib/accounting/standards/ifrsCompliance';
import { closePeriod, validatePeriodClosing } from '@/lib/accounting/period/periodClosing';
import type { JournalEntry } from '@/lib/accounting/domain/types';
import { getStored } from '@/lib/accounting/data/storage';
import { KEYS } from '@/lib/accounting/data/storage';

interface DashboardMetrics {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  currentRatio: number;
  debtToEquityRatio: number;
  grossProfitMargin: number;
  netProfitMargin: number;
}

export default function ProfessionalAccountingDashboard() {
  const params = useParams();
  const { data: session } = useSession();
  const t = useTranslations('accounting');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('2025');
  const [showCompliance, setShowCompliance] = useState(false);
  const [showPeriodClosing, setShowPeriodClosing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const entries = getStored<JournalEntry[]>(KEYS.JOURNAL);
      const periodEntries = entries.filter(entry => entry.date.startsWith(selectedPeriod));
      
      if (periodEntries.length === 0) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      // إنشاء القوائم المالية
      const balanceSheet = generateBalanceSheet(selectedPeriod, `${selectedPeriod}-12-31`, periodEntries);
      const incomeStatement = generateIncomeStatement(selectedPeriod, `${selectedPeriod}-01-01`, `${selectedPeriod}-12-31`, periodEntries);
      
      // تحليل القوائم المالية
      const balanceSheetAnalysis = analyzeBalanceSheet(balanceSheet);
      
      // حساب المقاييس
      const dashboardMetrics: DashboardMetrics = {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.liabilities.total,
        totalEquity: balanceSheet.equity.total,
        totalRevenue: incomeStatement.revenue.total,
        totalExpenses: incomeStatement.expenses.total,
        netIncome: incomeStatement.netIncome,
        currentRatio: balanceSheetAnalysis.currentRatio,
        debtToEquityRatio: balanceSheetAnalysis.debtToEquityRatio,
        grossProfitMargin: incomeStatement.grossProfitMargin,
        netProfitMargin: incomeStatement.netProfitMargin
      };

      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClosing = async () => {
    if (!session?.user?.id) return;
    
    const validation = validatePeriodClosing(selectedPeriod);
    if (!validation.isReady) {
      alert(ar ? 'الفترة غير جاهزة للإغلاق:\n' + validation.issues.join('\n') : 'Period not ready for closing:\n' + validation.issues.join('\n'));
      return;
    }

    const result = closePeriod(selectedPeriod, session.user.id);
    if (result.success) {
      alert(ar ? 'تم إغلاق الفترة بنجاح' : 'Period closed successfully');
      loadDashboardData();
    } else {
      alert(ar ? 'خطأ في إغلاق الفترة:\n' + result.errors.join('\n') : 'Error closing period:\n' + result.errors.join('\n'));
    }
  };

  const handleComplianceCheck = () => {
    const entries = getStored<JournalEntry[]>(KEYS.JOURNAL);
    const periodEntries = entries.filter(entry => entry.date.startsWith(selectedPeriod));
    const compliance = checkIFRSCompliance(periodEntries, selectedPeriod);
    
    const report = ar 
      ? `تقرير التوافق مع IFRS:\n\nالحالة: ${compliance.overallStatus}\nالملخص: ${compliance.summary}\n\nالتوصيات:\n${compliance.actionItems.join('\n')}`
      : `IFRS Compliance Report:\n\nStatus: ${compliance.overallStatus}\nSummary: ${compliance.summary}\n\nAction Items:\n${compliance.actionItems.join('\n')}`;
    
    alert(report);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B6F47] mx-auto"></div>
          <p className="text-gray-500 mt-4">{ar ? 'جاري تحميل البيانات المحاسبية...' : 'Loading accounting data...'}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Icon name="documentText" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {ar ? 'لا توجد بيانات محاسبية' : 'No Accounting Data'}
        </h3>
        <p className="text-gray-500 mb-6">
          {ar ? 'لم يتم العثور على بيانات للفترة المحددة' : 'No data found for the selected period'}
        </p>
        <button
          onClick={() => window.location.href = `/${locale}/admin/accounting/journal`}
          className="px-6 py-3 bg-[#8B6F47] text-white rounded-xl hover:bg-[#8B6F47]/90 transition-colors font-semibold"
        >
          {ar ? 'إضافة قيود محاسبية' : 'Add Journal Entries'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {ar ? 'لوحة التحكم المحاسبية' : 'Accounting Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1">
            {ar ? 'نظام محاسبة احترافي متوافق مع المعايير العالمية' : 'Professional accounting system compliant with international standards'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
          <button
            onClick={handleComplianceCheck}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Icon name="checkCircle" className="h-5 w-5" />
            {ar ? 'فحص التوافق' : 'Compliance Check'}
          </button>
          <button
            onClick={handlePeriodClosing}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Icon name="lock" className="h-5 w-5" />
            {ar ? 'إغلاق الفترة' : 'Close Period'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Icon name="building" className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">{ar ? 'الأصول' : 'Assets'}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalAssets.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <Icon name="creditCard" className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">{ar ? 'الالتزامات' : 'Liabilities'}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalLiabilities.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Icon name="trendingUp" className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">{ar ? 'صافي الدخل' : 'Net Income'}</span>
          </div>
          <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.netIncome.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Icon name="pieChart" className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">{ar ? 'هامش الربح' : 'Profit Margin'}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.netProfitMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {ar ? 'النسب المالية' : 'Financial Ratios'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{ar ? 'نسبة السيولة' : 'Current Ratio'}</span>
              <span className={`text-sm font-medium ${metrics.currentRatio >= 1.5 ? 'text-green-600' : metrics.currentRatio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metrics.currentRatio.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${metrics.currentRatio >= 1.5 ? 'bg-green-500' : metrics.currentRatio >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(metrics.currentRatio * 33.33, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{ar ? 'ديون إلى حقوق ملكية' : 'Debt to Equity'}</span>
              <span className={`text-sm font-medium ${metrics.debtToEquityRatio <= 0.5 ? 'text-green-600' : metrics.debtToEquityRatio <= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metrics.debtToEquityRatio.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${metrics.debtToEquityRatio <= 0.5 ? 'bg-green-500' : metrics.debtToEquityRatio <= 1 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(metrics.debtToEquityRatio * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{ar ? 'هامش الربح الصافي' : 'Net Profit Margin'}</span>
              <span className={`text-sm font-medium ${metrics.netProfitMargin >= 15 ? 'text-green-600' : metrics.netProfitMargin >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metrics.netProfitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${metrics.netProfitMargin >= 15 ? 'bg-green-500' : metrics.netProfitMargin >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(metrics.netProfitMargin * 6.67, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href={`/${locale}/admin/accounting/journal`}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#8B6F47]/10 rounded-lg flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
            <Icon name="documentText" className="h-6 w-6 text-[#8B6F47]" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{ar ? 'قيود اليومية' : 'Journal Entries'}</div>
            <div className="text-sm text-gray-500">{ar ? 'إدارة القيود المحاسبية' : 'Manage journal entries'}</div>
          </div>
        </a>

        <a
          href={`/${locale}/admin/accounting/reports`}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#8B6F47]/10 rounded-lg flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
            <Icon name="chartBar" className="h-6 w-6 text-[#8B6F47]" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{ar ? 'التقارير المالية' : 'Financial Reports'}</div>
            <div className="text-sm text-gray-500">{ar ? 'الميزانية وقائمة الدخل' : 'Balance sheet & P&L'}</div>
          </div>
        </a>

        <a
          href={`/${locale}/admin/accounting/accounts`}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#8B6F47]/10 rounded-lg flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
            <Icon name="folder" className="h-6 w-6 text-[#8B6F47]" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{ar ? 'دليل الحسابات' : 'Chart of Accounts'}</div>
            <div className="text-sm text-gray-500">{ar ? 'إدارة الحسابات' : 'Manage accounts'}</div>
          </div>
        </a>

        <a
          href={`/${locale}/admin/accounting/trial-balance`}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#8B6F47]/10 rounded-lg flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
            <Icon name="scale" className="h-6 w-6 text-[#8B6F47]" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{ar ? 'ميزان المراجعة' : 'Trial Balance'}</div>
            <div className="text-sm text-gray-500">{ar ? 'التحقق من التوازن' : 'Verify balances'}</div>
          </div>
        </a>
      </div>

      {/* IFRS Compliance Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="checkCircle" className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{ar ? 'متوافق مع IFRS' : 'IFRS Compliant'}</h3>
              <p className="text-sm text-gray-600">
                {ar ? 'النظام متوافق مع المعايير الدولية لإعداد التقارير المالية' : 'System compliant with International Financial Reporting Standards'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {ar ? 'نشط' : 'Active'}
            </span>
            <button
              onClick={handleComplianceCheck}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {ar ? 'فحص التوافق' : 'Check Compliance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
