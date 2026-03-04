/**
 * Financial Reports Page
 * صفحة التقارير المالية - واجهة احترافية
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
import type { JournalEntry } from '@/lib/accounting/domain/types';
import { getStored } from '@/lib/accounting/data/storage';
import { KEYS } from '@/lib/accounting/data/storage';

export default function FinancialReportsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const t = useTranslations('accounting');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('2025');
  const [selectedReport, setSelectedReport] = useState<'balance-sheet' | 'income-statement' | 'trial-balance' | 'compliance'>('balance-sheet');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedReport]);

  const loadData = () => {
    try {
      const allEntries = getStored<JournalEntry[]>(KEYS.JOURNAL);
      const periodEntries = allEntries.filter(entry => entry.date.startsWith(selectedPeriod));
      
      setEntries(periodEntries);
      generateReport(selectedReport, periodEntries);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = (reportType: string, periodEntries: JournalEntry[]) => {
    switch (reportType) {
      case 'balance-sheet':
        const balanceSheet = generateBalanceSheet(selectedPeriod, `${selectedPeriod}-12-31`, periodEntries);
        const analysis = analyzeBalanceSheet(balanceSheet);
        setReportData({ balanceSheet, analysis });
        break;
        
      case 'income-statement':
        const incomeStatement = generateIncomeStatement(selectedPeriod, `${selectedPeriod}-01-01`, `${selectedPeriod}-12-31`, periodEntries);
        const incomeAnalysis = analyzeIncomeStatement(incomeStatement);
        setReportData({ incomeStatement, analysis: incomeAnalysis });
        break;
        
      case 'trial-balance':
        // Need accounts for trial balance
        const accounts = getStored<any[]>(KEYS.ACCOUNTS);
        const trialBalance = generateTrialBalance(selectedPeriod, periodEntries, accounts);
        setReportData({ trialBalance });
        break;
        
      case 'compliance':
        const compliance = checkIFRSCompliance(periodEntries, selectedPeriod);
        setReportData({ compliance });
        break;
    }
  };

  const exportReport = () => {
    // Export functionality
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport}-${selectedPeriod}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B6F47] mx-auto"></div>
          <p className="text-gray-500 mt-4">{ar ? 'جاري تحميل التقارير...' : 'Loading reports...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200/60 shadow-lg">
        <div className="flex items-center justify-between px-8 py-5 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#8B6F47] to-[#A68B5B] rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="chartBar" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] bg-clip-text text-transparent">
                {ar ? 'التقارير المالية' : 'Financial Reports'}
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {ar ? 'قوائم مالية وتحليلات' : 'Financial statements & analysis'}
              </p>
            </div>
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
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Icon name="download" className="h-5 w-5" />
              {ar ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Icon name="printer" className="h-5 w-5" />
              {ar ? 'طباعة' : 'Print'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Report Type Selector */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {ar ? 'اختر التقرير' : 'Select Report Type'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { id: 'balance-sheet', label: ar ? 'الميزانية العمومية' : 'Balance Sheet', icon: 'scale' },
              { id: 'income-statement', label: ar ? 'قائمة الدخل' : 'Income Statement', icon: 'trendingUp' },
              { id: 'trial-balance', label: ar ? 'ميزان المراجعة' : 'Trial Balance', icon: 'check' },
              { id: 'compliance', label: ar ? 'فحص التوافق' : 'Compliance Check', icon: 'check' }
            ].map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id as any)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedReport === report.id
                    ? 'border-[#8B6F47] bg-[#8B6F47]/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Icon name={report.icon as any} className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <div className="text-sm font-medium text-gray-900">{report.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedReport === 'balance-sheet' && (ar ? 'الميزانية العمومية' : 'Balance Sheet')}
                  {selectedReport === 'income-statement' && (ar ? 'قائمة الدخل' : 'Income Statement')}
                  {selectedReport === 'trial-balance' && (ar ? 'ميزان المراجعة' : 'Trial Balance')}
                  {selectedReport === 'compliance' && (ar ? 'فحص التوافق مع IFRS' : 'IFRS Compliance Check')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {ar ? `الفترة: ${selectedPeriod}` : `Period: ${selectedPeriod}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {ar ? 'محدث' : 'Updated'}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {ar ? 'دقيق' : 'Accurate'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            {selectedReport === 'balance-sheet' && reportData?.balanceSheet && (
              <div className="space-y-8">
                {/* Assets Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                    {ar ? 'الأصول' : 'Assets'}
                  </h4>
                  <div className="space-y-2">
                    {reportData.balanceSheet.assets.accounts.map((account: any) => (
                      <div key={account.accountId} className="flex justify-between py-2 px-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-900">{account.accountNameAr}</span>
                        <span className="font-semibold text-gray-900">
                          {account.balance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-t-2 border-blue-200">
                      <span className="font-bold text-blue-900">{ar ? 'إجمالي الأصول' : 'Total Assets'}</span>
                      <span className="font-bold text-blue-900 text-lg">
                        {reportData.balanceSheet.totalAssets.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                    {ar ? 'الالتزامات' : 'Liabilities'}
                  </h4>
                  <div className="space-y-2">
                    {reportData.balanceSheet.liabilities.accounts.map((account: any) => (
                      <div key={account.accountId} className="flex justify-between py-2 px-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-900">{account.accountNameAr}</span>
                        <span className="font-semibold text-gray-900">
                          {account.balance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 px-4 bg-red-50 rounded-lg border-t-2 border-red-200">
                      <span className="font-bold text-red-900">{ar ? 'إجمالي الالتزامات' : 'Total Liabilities'}</span>
                      <span className="font-bold text-red-900 text-lg">
                        {reportData.balanceSheet.liabilities.total.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equity Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                    {ar ? 'حقوق الملكية' : 'Equity'}
                  </h4>
                  <div className="space-y-2">
                    {reportData.balanceSheet.equity.accounts.map((account: any) => (
                      <div key={account.accountId} className="flex justify-between py-2 px-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-900">{account.accountNameAr}</span>
                        <span className="font-semibold text-gray-900">
                          {account.balance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 px-4 bg-green-50 rounded-lg border-t-2 border-green-200">
                      <span className="font-bold text-green-900">{ar ? 'إجمالي حقوق الملكية' : 'Total Equity'}</span>
                      <span className="font-bold text-green-900 text-lg">
                        {reportData.balanceSheet.equity.total.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Icon name="check" className="h-8 w-8 text-green-600" />
                      <div>
                        <h5 className="font-bold text-gray-900">
                          {reportData.balanceSheet.isBalanced 
                            ? (ar ? 'الميزانية متوازنة' : 'Balance Sheet is Balanced')
                            : (ar ? 'الميزانية غير متوازنة' : 'Balance Sheet is Not Balanced')
                          }
                        </h5>
                        <p className="text-sm text-gray-600">
                          {ar ? 'الأصول = الالتزامات + حقوق الملكية' : 'Assets = Liabilities + Equity'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {reportData.balanceSheet.totalAssets.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ar ? 'القيمة الإجمالية' : 'Total Value'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'income-statement' && reportData?.incomeStatement && (
              <div className="space-y-8">
                {/* Revenue Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                    {ar ? 'الإيرادات' : 'Revenue'}
                  </h4>
                  <div className="space-y-2">
                    {reportData.incomeStatement.revenue.accounts.map((account: any) => (
                      <div key={account.accountId} className="flex justify-between py-2 px-4 bg-green-50 rounded-lg">
                        <span className="text-gray-900">{account.accountNameAr}</span>
                        <span className="font-semibold text-green-700">
                          {account.balance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 px-4 bg-green-100 rounded-lg border-t-2 border-green-300">
                      <span className="font-bold text-green-900">{ar ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                      <span className="font-bold text-green-900 text-lg">
                        {reportData.incomeStatement.revenue.total.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                    {ar ? 'المصروفات' : 'Expenses'}
                  </h4>
                  <div className="space-y-2">
                    {reportData.incomeStatement.expenses.accounts.map((account: any) => (
                      <div key={account.accountId} className="flex justify-between py-2 px-4 bg-red-50 rounded-lg">
                        <span className="text-gray-900">{account.accountNameAr}</span>
                        <span className="font-semibold text-red-700">
                          {account.balance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 px-4 bg-red-100 rounded-lg border-t-2 border-red-300">
                      <span className="font-bold text-red-900">{ar ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                      <span className="font-bold text-red-900 text-lg">
                        {reportData.incomeStatement.expenses.total.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Icon name="trendingUp" className="h-8 w-8 text-blue-600" />
                      <div>
                        <h5 className="font-bold text-gray-900">{ar ? 'صافي الدخل' : 'Net Income'}</h5>
                        <p className="text-sm text-gray-600">
                          {ar ? 'الإيرادات - المصروفات' : 'Revenue - Expenses'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${reportData.incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.incomeStatement.netIncome.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ar ? 'الصافي' : 'Net'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'trial-balance' && reportData?.trialBalance && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {ar ? 'ميزان المراجعة' : 'Trial Balance'}
                  </h4>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      reportData.trialBalance.isBalanced 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {reportData.trialBalance.isBalanced 
                        ? (ar ? 'متوازن' : 'Balanced') 
                        : (ar ? 'غير متوازن' : 'Not Balanced')
                      }
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{ar ? 'الحساب' : 'Account'}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{ar ? 'الرمز' : 'Code'}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{ar ? 'المدين' : 'Debit'}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{ar ? 'الدائن' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.trialBalance.accounts.map((account: any) => (
                        <tr key={account.accountId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{account.accountNameAr}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{account.accountCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {account.debitBalance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {account.creditBalance.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-bold text-gray-900">
                          {ar ? 'الإجمالي' : 'Total'}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 text-right">
                          {reportData.trialBalance.totalDebits.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 text-right">
                          {reportData.trialBalance.totalCredits.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {selectedReport === 'compliance' && reportData?.compliance && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                    reportData.compliance.overallStatus === 'COMPLIANT' 
                      ? 'bg-green-100 text-green-700' 
                      : reportData.compliance.overallStatus === 'PARTIAL' 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <Icon name="check" className="h-6 w-6" />
                    <span className="font-bold">
                      {reportData.compliance.overallStatus === 'COMPLIANT' && (ar ? 'متوافق بالكامل' : 'Fully Compliant')}
                      {reportData.compliance.overallStatus === 'PARTIAL' && (ar ? 'متوافق جزئياً' : 'Partially Compliant')}
                      {reportData.compliance.overallStatus === 'NON_COMPLIANT' && (ar ? 'غير متوافق' : 'Non-Compliant')}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">{reportData.compliance.summary}</p>
                </div>

                {reportData.compliance.actionItems && reportData.compliance.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      {ar ? 'التوصيات والإجراءات المطلوبة' : 'Recommendations & Required Actions'}
                    </h4>
                    <div className="space-y-3">
                      {reportData.compliance.actionItems.map((item: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Icon name="information" className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <span className="text-gray-900">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
