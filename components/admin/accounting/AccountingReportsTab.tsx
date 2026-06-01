'use client';

import ReportExportButtons from '@/components/admin/ReportExportButtons';
import AccountingAgingPanel from '@/components/admin/accounting/AccountingAgingPanel';
import AccountingReconciliationPanel from '@/components/admin/accounting/AccountingReconciliationPanel';
import {
  getBankAccountLedger,
  getBankAccountBalance,
  getPropertyOrContactLedger,
  type JournalEntry,
  type DocumentType,
} from '@/lib/data/accounting';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getBankAccountDisplay, type BankAccount } from '@/lib/data/bankAccounts';
import { getPropertyDisplayText, type Property } from '@/lib/data/properties';
import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { LOGO_SIZE_DEFAULT } from '@/lib/data/documentTemplateConstants';
import {
  fetchBankStatementReport,
  fetchPropertyLedgerReport,
  fetchVatReport,
  fetchAgingReport,
  fetchCashFlowReport,
  fetchPeriodCompareReport,
} from '@/lib/accounting/api/client';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import { REPORT_LABELS, REPORT_TAB_ORDER, type ReportViewId } from '@/lib/accounting/ui/reportLabels';

type TrialRow = {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
};

type IncomeStatement = {
  revenue: { items: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; total: number };
  expense: { items: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; total: number };
  netIncome: number;
};

type BalanceSheet = {
  assets: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>;
  liabilities: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>;
  equity: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
};

type CashFlowLocal = {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
};

export interface AccountingReportsTabProps {
  ar: boolean;
  locale: string;
  reportView: ReportViewId;
  setReportView: (view: ReportViewId) => void;
  reportFrom: string;
  reportTo: string;
  useDb: boolean;
  loadingCore: boolean;
  loadingVat: boolean;
  loadingAging: boolean;
  loadingCashFlow: boolean;
  loadingCompare: boolean;
  loadingBankStatement: boolean;
  loadingPropertyLedger: boolean;
  trialBalance: TrialRow[];
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlowLocal;
  vatReportData: Awaited<ReturnType<typeof fetchVatReport>> | null;
  agingLedger: 'ar' | 'ap';
  setAgingLedger: (ledger: 'ar' | 'ap') => void;
  agingReportData: Awaited<ReturnType<typeof fetchAgingReport>> | null;
  cashFlowDb: Awaited<ReturnType<typeof fetchCashFlowReport>> | null;
  compareReportData: Awaited<ReturnType<typeof fetchPeriodCompareReport>> | null;
  bankStatementDb: Awaited<ReturnType<typeof fetchBankStatementReport>> | null;
  propertyLedgerDb: Awaited<ReturnType<typeof fetchPropertyLedgerReport>> | null;
  bankAccounts: BankAccount[];
  selectedBankAccountId: string;
  setSelectedBankAccountId: (id: string) => void;
  reportPropertyId: string;
  setReportPropertyId: (id: string) => void;
  reportContactId: string;
  setReportContactId: (id: string) => void;
  entriesForReports: JournalEntry[];
  contacts: Contact[];
  mergedProperties: Property[];
}

export default function AccountingReportsTab(props: AccountingReportsTabProps) {
  const {
    ar,
    locale,
    reportView,
    setReportView,
    reportFrom,
    reportTo,
    useDb,
    loadingCore,
    loadingVat,
    loadingAging,
    loadingCashFlow,
    loadingCompare,
    loadingBankStatement,
    loadingPropertyLedger,
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow,
    vatReportData,
    agingLedger,
    setAgingLedger,
    agingReportData,
    cashFlowDb,
    compareReportData,
    bankStatementDb,
    propertyLedgerDb,
    bankAccounts,
    selectedBankAccountId,
    setSelectedBankAccountId,
    reportPropertyId,
    setReportPropertyId,
    reportContactId,
    setReportContactId,
    entriesForReports,
    contacts,
    mergedProperties,
  } = props;

  const getPropertyDisplay = (p: Parameters<typeof getPropertyDisplayText>[0]) => getPropertyDisplayText(p);

  const docTypeLabel = (documentType: string | undefined) => {
    if (!documentType) return '—';
    const labels = DOC_TYPE_LABELS[documentType as DocumentType];
    return labels ? (ar ? labels.ar : labels.en) : documentType;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {REPORT_TAB_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReportView(r)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportView === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {ar ? REPORT_LABELS[r].ar : REPORT_LABELS[r].en}
          </button>
        ))}
      </div>
      <div className="admin-card overflow-hidden print:shadow-none" id="accounting-report-print">
        {(() => {
          const company = typeof window !== 'undefined' ? getCompanyData() : null;
          const reportTpl = typeof window !== 'undefined' ? getDefaultTemplate('report') : getDefaultTemplate('invoice');
          const tpl = reportTpl || (typeof window !== 'undefined' ? getDefaultTemplate('invoice') : null);
          const logoSize = tpl?.logoSize ?? LOGO_SIZE_DEFAULT;
          const titleColor = tpl?.titleColor ?? '#354058';
          const bilingual = !!tpl?.bilingual;
          const headerCentered = (tpl?.headerLayout || 'left') === 'centered';
          return company ? (
            <div className="px-6 pt-6 pb-2 border-b-2 print:block" style={{ borderColor: titleColor }}>
              {headerCentered && bilingual ? (
                <div className="flex justify-between items-start gap-4">
                  {ar ? (
                    <>
                      <div className="flex-1 text-right min-w-0" dir="rtl">
                        <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameAr}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
                      </div>
                      {company.logoUrl && (
                        <div className="shrink-0 overflow-hidden mx-2" style={{ width: logoSize, height: logoSize }}>
                          <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameEn}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameEn}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
                      </div>
                      {company.logoUrl && (
                        <div className="shrink-0 overflow-hidden mx-2" style={{ width: logoSize, height: logoSize }}>
                          <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 text-right min-w-0" dir="rtl">
                        <h2 className="font-bold text-lg" style={{ color: titleColor }}>{company.nameAr}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {company.logoUrl && (
                    <div className="shrink-0 overflow-hidden" style={{ width: logoSize, height: logoSize }}>
                      <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-lg" style={{ color: titleColor }}>{ar ? company.nameAr : company.nameEn}</h2>
                    <p className="text-xs text-gray-600 mt-0.5">{ar ? company.addressAr : company.addressEn}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null;
        })()}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 print:block">
          <h4 className="font-bold text-gray-900">
            {ar ? REPORT_LABELS[reportView].ar : REPORT_LABELS[reportView].en}
            <span className="text-sm font-normal text-gray-500 mr-2">
              ({reportFrom} {ar ? 'إلى' : 'to'} {reportTo})
            </span>
          </h4>
          <div className="print:hidden">
            <ReportExportButtons
              reportView={reportView}
              reportFrom={reportFrom}
              reportTo={reportTo}
              trialBalance={trialBalance}
              incomeStatement={incomeStatement}
              balanceSheet={balanceSheet}
              cashFlow={cashFlow}
              vatReportData={vatReportData}
              compareReportData={compareReportData}
              ar={ar}
            />
          </div>
        </div>
        <div className="p-6">
          {reportView === 'trial' && (
            <div className="overflow-x-auto">
              {useDb && loadingCore ? (
                <p className="text-gray-500 py-8 text-center">{ar ? 'جاري تحميل ميزان المراجعة...' : 'Loading trial balance...'}</p>
              ) : (
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>{ar ? 'الرمز' : 'Code'}</th>
                      <th>{ar ? 'الاسم' : 'Account'}</th>
                      <th>{ar ? 'مدين' : 'Debit'}</th>
                      <th>{ar ? 'دائن' : 'Credit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map((row) => (
                      <tr key={row.accountId}>
                        <td className="font-mono">{row.accountCode}</td>
                        <td>{ar ? row.accountNameAr : row.accountNameEn}</td>
                        <td>{row.debit > 0 ? row.debit.toLocaleString() : '—'}</td>
                        <td>{row.credit > 0 ? row.credit.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td colSpan={2}>{ar ? 'الإجمالي' : 'Total'}</td>
                      <td>{trialBalance.reduce((s, r) => s + r.debit, 0).toLocaleString()}</td>
                      <td>{trialBalance.reduce((s, r) => s + r.credit, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
          {reportView === 'income' && (
            <div className="space-y-6 max-w-2xl">
              {useDb && loadingCore ? (
                <p className="text-gray-500 py-8">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : (
                <>
                  <div>
                    <h5 className="font-semibold text-emerald-700 mb-2">{ar ? 'الإيرادات' : 'Revenue'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {incomeStatement.revenue.items.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-emerald-50">
                          <td colSpan={2}>{ar ? 'إجمالي الإيرادات' : 'Total Revenue'}</td>
                          <td className="text-right">{incomeStatement.revenue.total.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-red-700 mb-2">{ar ? 'المصروفات' : 'Expenses'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {incomeStatement.expense.items.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-red-50">
                          <td colSpan={2}>{ar ? 'إجمالي المصروفات' : 'Total Expenses'}</td>
                          <td className="text-right">{incomeStatement.expense.total.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="pt-4 border-t-2 border-gray-200">
                    <p className={`text-xl font-bold ${incomeStatement.netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {ar ? 'صافي الدخل' : 'Net Income'}: {incomeStatement.netIncome.toLocaleString()} ر.ع
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          {reportView === 'balance' && (
            <div className="space-y-6 max-w-2xl">
              {useDb && loadingCore ? (
                <p className="text-gray-500 py-8">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : (
                <>
                  <div>
                    <h5 className="font-semibold text-blue-700 mb-2">{ar ? 'الأصول' : 'Assets'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.assets.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-blue-50">
                          <td colSpan={2}>{ar ? 'إجمالي الأصول' : 'Total Assets'}</td>
                          <td className="text-right">{balanceSheet.totalAssets.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-amber-700 mb-2">{ar ? 'الالتزامات' : 'Liabilities'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.liabilities.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-amber-50">
                          <td colSpan={2}>{ar ? 'إجمالي الالتزامات' : 'Total Liabilities'}</td>
                          <td className="text-right">{balanceSheet.totalLiabilities.toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div>
                    <h5 className="font-semibold text-violet-700 mb-2">{ar ? 'حقوق الملكية' : 'Equity'}</h5>
                    <table className="admin-table w-full">
                      <tbody>
                        {balanceSheet.equity.map((item) => (
                          <tr key={item.code}>
                            <td className="font-mono text-sm">{item.code}</td>
                            <td>{ar ? item.nameAr : item.nameEn}</td>
                            <td className="text-right font-semibold">{item.amount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                        {Math.abs(balanceSheet.netIncome) > 0.001 && (
                          <tr>
                            <td className="font-mono text-sm">3100</td>
                            <td>{ar ? 'صافي الدخل (أرباح محتجزة)' : 'Net Income (Retained Earnings)'}</td>
                            <td className="text-right font-semibold">{balanceSheet.netIncome.toLocaleString()} ر.ع</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-violet-50">
                          <td colSpan={2}>{ar ? 'إجمالي حقوق الملكية' : 'Total Equity'}</td>
                          <td className="text-right">{(balanceSheet.totalEquity + balanceSheet.netIncome).toLocaleString()} ر.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          {reportView === 'vat' && (
            <div className="space-y-6">
              {!useDb ? (
                <p className="text-amber-700 text-sm">{ar ? 'تقرير VAT متاح مع قاعدة البيانات فقط' : 'VAT report requires database mode'}</p>
              ) : loadingVat ? (
                <p className="text-gray-500">{ar ? 'جاري تحميل تقرير الضريبة...' : 'Loading VAT report...'}</p>
              ) : vatReportData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border p-4 bg-emerald-50/50">
                      <p className="text-xs text-gray-600">{ar ? 'ضريبة المخرجات (مبيعات)' : 'Output VAT (sales)'}</p>
                      <p className="text-xl font-bold text-emerald-800">{vatReportData.summary.vatOutput.toLocaleString()} ر.ع</p>
                    </div>
                    <div className="rounded-xl border p-4 bg-blue-50/50">
                      <p className="text-xs text-gray-600">{ar ? 'ضريبة المدخلات (مشتريات)' : 'Input VAT (purchases)'}</p>
                      <p className="text-xl font-bold text-blue-800">{vatReportData.summary.vatInput.toLocaleString()} ر.ع</p>
                    </div>
                    <div className="rounded-xl border p-4 bg-amber-50/50">
                      <p className="text-xs text-gray-600">{ar ? 'صافي VAT مستحق' : 'Net VAT payable'}</p>
                      <p className="text-xl font-bold text-amber-900">{vatReportData.summary.netVatPayable.toLocaleString()} ر.ع</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ar
                      ? `الفترة ${vatReportData.fromDate} — ${vatReportData.toDate} · نسبة قياسية ${(vatReportData.summary.standardRate * 100).toFixed(0)}%`
                      : `Period ${vatReportData.fromDate} — ${vatReportData.toDate} · standard rate ${(vatReportData.summary.standardRate * 100).toFixed(0)}%`}
                  </p>
                  {vatReportData.lines.length > 0 ? (
                    <table className="admin-table w-full">
                      <thead>
                        <tr>
                          <th>{ar ? 'التاريخ' : 'Date'}</th>
                          <th>{ar ? 'الرقم' : 'No.'}</th>
                          <th>{ar ? 'النوع' : 'Type'}</th>
                          <th>{ar ? 'الاتجاه' : 'Direction'}</th>
                          <th className="text-right">{ar ? 'VAT' : 'VAT'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vatReportData.lines.map((row) => (
                          <tr key={`${row.serialNumber}-${row.date}`}>
                            <td>{row.date}</td>
                            <td className="font-mono text-sm">{row.serialNumber}</td>
                            <td>{row.type}</td>
                            <td>{row.direction === 'OUTPUT' ? (ar ? 'مخرجات' : 'Output') : (ar ? 'مدخلات' : 'Input')}</td>
                            <td className="text-right font-semibold">{row.vatAmount.toLocaleString()} ر.ع</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-8">{ar ? 'لا توجد حركات VAT في هذه الفترة' : 'No VAT transactions in this period'}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500">{ar ? 'تعذّر تحميل التقرير' : 'Failed to load report'}</p>
              )}
            </div>
          )}
          {reportView === 'aging' && (
            <div className="space-y-6">
              {!useDb ? (
                <p className="text-amber-700 text-sm">{ar ? 'تقرير أعمار الذمم متاح مع قاعدة البيانات فقط' : 'Aging report requires database mode'}</p>
              ) : (
                <AccountingAgingPanel
                  ar={ar}
                  ledger={agingLedger}
                  onLedgerChange={setAgingLedger}
                  loading={loadingAging}
                  data={agingReportData}
                />
              )}
            </div>
          )}
          {reportView === 'reconciliation' && (
            <div className="space-y-6">
              {!useDb ? (
                <p className="text-amber-700 text-sm">{ar ? 'مطابقة البنك متاحة مع قاعدة البيانات فقط' : 'Bank reconciliation requires database mode'}</p>
              ) : (
                <AccountingReconciliationPanel ar={ar} bankAccounts={bankAccounts} />
              )}
            </div>
          )}
          {reportView === 'cashflow' && (
            <div className="max-w-md space-y-4">
              {!useDb ? (
                <>
                  <div className="p-4 rounded-xl bg-gray-50 border">
                    <p className="text-sm text-gray-500">{ar ? 'التشغيل (صافي الدخل)' : 'Operating (Net Income)'}</p>
                    <p className="text-xl font-bold">{cashFlow.operating.toLocaleString()} ر.ع</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border">
                    <p className="text-sm text-gray-500">{ar ? 'التدفق الصافي' : 'Net Cash Change'}</p>
                    <p className={`text-xl font-bold ${cashFlow.netChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{cashFlow.netChange.toLocaleString()} ر.ع</p>
                  </div>
                </>
              ) : loadingCashFlow ? (
                <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : cashFlowDb ? (
                <>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-emerald-700">{ar ? 'تدفقات نقدية (صندوق + بنوك)' : 'Cash flows (cash + banks)'}</p>
                    <p className="text-xs text-emerald-600 mt-1">{cashFlowDb.fromDate} — {cashFlowDb.toDate}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gray-50 border">
                      <p className="text-sm text-gray-500">{ar ? 'مقبوضات' : 'Cash in'}</p>
                      <p className="text-xl font-bold text-emerald-700">{cashFlowDb.cashIn.toLocaleString()} ر.ع</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border">
                      <p className="text-sm text-gray-500">{ar ? 'مدفوعات' : 'Cash out'}</p>
                      <p className="text-xl font-bold text-red-600">{cashFlowDb.cashOut.toLocaleString()} ر.ع</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border">
                    <p className="text-sm text-gray-500">{ar ? 'التدفق الصافي' : 'Net change'}</p>
                    <p className={`text-xl font-bold ${cashFlowDb.netChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{cashFlowDb.netChange.toLocaleString()} ر.ع</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">{ar ? 'تعذّر تحميل التقرير' : 'Failed to load report'}</p>
              )}
            </div>
          )}
          {reportView === 'compare' && (
            <div className="space-y-6">
              {!useDb ? (
                <p className="text-amber-700 text-sm">{ar ? 'مقارنة الفترات متاحة مع قاعدة البيانات فقط' : 'Period comparison requires database mode'}</p>
              ) : loadingCompare ? (
                <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : compareReportData ? (
                <>
                  <table className="admin-table w-full max-w-2xl">
                    <thead>
                      <tr>
                        <th>{ar ? 'البند' : 'Item'}</th>
                        <th>{ar ? 'الفترة الحالية' : 'Current'}</th>
                        <th>{ar ? 'الفترة السابقة' : 'Previous'}</th>
                        <th>{ar ? 'الفرق' : 'Delta'}</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { key: 'revenue' as const, labelAr: 'الإيرادات', labelEn: 'Revenue', pct: compareReportData.delta.revenuePct },
                        { key: 'expense' as const, labelAr: 'المصروفات', labelEn: 'Expenses', pct: compareReportData.delta.expensePct },
                        { key: 'netIncome' as const, labelAr: 'صافي الدخل', labelEn: 'Net income', pct: compareReportData.delta.netIncomePct },
                      ]).map((row) => (
                        <tr key={row.key}>
                          <td>{ar ? row.labelAr : row.labelEn}</td>
                          <td>{compareReportData.current[row.key].toLocaleString()} ر.ع</td>
                          <td>{compareReportData.previous[row.key].toLocaleString()} ر.ع</td>
                          <td className={compareReportData.delta[row.key] >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {compareReportData.delta[row.key].toLocaleString()} ر.ع
                          </td>
                          <td>{row.pct != null ? `${row.pct > 0 ? '+' : ''}${row.pct}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500">
                    {ar
                      ? `الحالية: ${compareReportData.current.fromDate} — ${compareReportData.current.toDate} · السابقة: ${compareReportData.previous.fromDate} — ${compareReportData.previous.toDate}`
                      : `Current: ${compareReportData.current.fromDate} — ${compareReportData.current.toDate} · Previous: ${compareReportData.previous.fromDate} — ${compareReportData.previous.toDate}`}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">{ar ? 'تعذّر تحميل التقرير' : 'Failed to load report'}</p>
              )}
            </div>
          )}
          {reportView === 'bankStatement' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-sm font-semibold text-gray-700">{ar ? 'الحساب البنكي' : 'Bank Account'}</label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium min-w-[220px]"
                >
                  <option value="">{ar ? '— اختر الحساب —' : '— Select account —'}</option>
                  <option value="CASH">{ar ? 'الصندوق (نقداً)' : 'Cash'}</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{ar ? b.nameAr : (b.nameEn || b.nameAr)} — {b.accountNumber}</option>
                  ))}
                </select>
              </div>
              {selectedBankAccountId && (() => {
                const accLabel = selectedBankAccountId === 'CASH'
                  ? (ar ? 'الصندوق' : 'Cash')
                  : (() => {
                      const b = bankAccounts.find((x) => x.id === selectedBankAccountId);
                      return b ? getBankAccountDisplay(b) : '';
                    })();

                if (useDb && loadingBankStatement) {
                  return <p className="text-gray-500 py-8 text-center">{ar ? 'جاري تحميل كشف الحساب...' : 'Loading bank statement...'}</p>;
                }

                if (useDb && bankStatementDb) {
                  const bal = bankStatementDb.balance;
                  const lines = bankStatementDb.lines;
                  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
                  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
                  return (
                    <>
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-sm text-emerald-700 font-semibold">{ar ? `رصيد ${accLabel}` : `Balance ${accLabel}`}</p>
                        <p className="text-2xl font-bold text-emerald-800">{bal.balance.toLocaleString()} ر.ع</p>
                        <p className="text-xs text-emerald-600 mt-1">{ar ? `مدين: ${bal.debit.toLocaleString()} • دائن: ${bal.credit.toLocaleString()}` : `Debit: ${bal.debit.toLocaleString()} • Credit: ${bal.credit.toLocaleString()}`}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="admin-table w-full">
                          <thead>
                            <tr>
                              <th>{ar ? 'التاريخ' : 'Date'}</th>
                              <th>{ar ? 'الوصف' : 'Description'}</th>
                              <th>{ar ? 'العميل / العقار' : 'Contact / Property'}</th>
                              <th>{ar ? 'مدين' : 'Debit'}</th>
                              <th>{ar ? 'دائن' : 'Credit'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((line, i) => (
                              <tr key={`${line.entryId}-${i}`}>
                                <td>{new Date(line.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                                <td>{ar ? line.descriptionAr : line.descriptionEn || line.descriptionAr}</td>
                                <td>
                                  {line.contactId ? getContactDisplayFull(contacts.find((c) => c.id === line.contactId)!, locale) : '—'}
                                  {line.propertyId != null && (() => {
                                    const prop = mergedProperties.find((p) => p.id === line.propertyId);
                                    return (
                                      <span className="text-gray-500 text-sm block whitespace-pre-line">
                                        {prop ? getPropertyDisplay(prop) : line.propertyId}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td>{line.debit > 0 ? line.debit.toLocaleString() : '—'}</td>
                                <td>{line.credit > 0 ? line.credit.toLocaleString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold bg-gray-50">
                              <td colSpan={3}>{ar ? 'الإجمالي' : 'Total'}</td>
                              <td>{totalDebit.toLocaleString()}</td>
                              <td>{totalCredit.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {lines.length === 0 && (
                        <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد حركات في الفترة المحددة' : 'No transactions in the selected period'}</p>
                      )}
                    </>
                  );
                }

                const ledger = getBankAccountLedger(selectedBankAccountId, reportFrom, reportTo, entriesForReports);
                const bal = getBankAccountBalance(selectedBankAccountId, reportTo, entriesForReports);
                return (
                  <>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-sm text-emerald-700 font-semibold">{ar ? `رصيد ${accLabel}` : `Balance ${accLabel}`}</p>
                      <p className="text-2xl font-bold text-emerald-800">{bal.balance.toLocaleString()} ر.ع</p>
                      <p className="text-xs text-emerald-600 mt-1">{ar ? `مدين: ${bal.debit.toLocaleString()} • دائن: ${bal.credit.toLocaleString()}` : `Debit: ${bal.debit.toLocaleString()} • Credit: ${bal.credit.toLocaleString()}`}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="admin-table w-full">
                        <thead>
                          <tr>
                            <th>{ar ? 'التاريخ' : 'Date'}</th>
                            <th>{ar ? 'الوصف' : 'Description'}</th>
                            <th>{ar ? 'العميل / العقار' : 'Contact / Property'}</th>
                            <th>{ar ? 'مدين' : 'Debit'}</th>
                            <th>{ar ? 'دائن' : 'Credit'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.map(({ entry, debit, credit }, i) => (
                            <tr key={`${entry.id}-${i}`}>
                              <td>{new Date(entry.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                              <td>{ar ? entry.descriptionAr : entry.descriptionEn || entry.descriptionAr}</td>
                              <td>
                                {entry.contactId ? getContactDisplayFull(contacts.find((c) => c.id === entry.contactId)!, locale) : '—'}
                                {entry.propertyId && (() => {
                                  const prop = mergedProperties.find((p) => p.id === entry.propertyId);
                                  return (
                                    <span className="text-gray-500 text-sm block whitespace-pre-line">
                                      {prop ? getPropertyDisplay(prop) : entry.propertyId}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td>{debit > 0 ? debit.toLocaleString() : '—'}</td>
                              <td>{credit > 0 ? credit.toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold bg-gray-50">
                            <td colSpan={3}>{ar ? 'الإجمالي' : 'Total'}</td>
                            <td>{ledger.reduce((s, l) => s + l.debit, 0).toLocaleString()}</td>
                            <td>{ledger.reduce((s, l) => s + l.credit, 0).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {ledger.length === 0 && (
                      <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد حركات في الفترة المحددة' : 'No transactions in the selected period'}</p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {reportView === 'propertyLedger' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'العقار' : 'Property'}</label>
                  <select value={reportPropertyId} onChange={(e) => setReportPropertyId(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-w-[200px]">
                    <option value="">{ar ? '— الكل —' : '— All —'}</option>
                    {mergedProperties.map((p) => (
                      <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{ar ? 'العميل / المستأجر' : 'Contact / Tenant'}</label>
                  <select value={reportContactId} onChange={(e) => setReportContactId(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm min-w-[220px]">
                    <option value="">{ar ? '— الكل —' : '— All —'}</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(reportPropertyId || reportContactId) && (() => {
                if (useDb && loadingPropertyLedger) {
                  return <p className="text-gray-500 py-8 text-center">{ar ? 'جاري تحميل كشف العقار...' : 'Loading property ledger...'}</p>;
                }

                if (useDb && propertyLedgerDb) {
                  const ledgerEntries = propertyLedgerDb.entries;
                  const totalDebit = propertyLedgerDb.totals.debit;
                  const totalCredit = propertyLedgerDb.totals.credit;
                  return (
                    <>
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-800 font-semibold">{ar ? 'إجمالي القيود' : 'Total entries'}</p>
                        <p className="text-xl font-bold text-amber-900">{propertyLedgerDb.totals.count} {ar ? 'قيد' : 'entries'}</p>
                        <p className="text-xs text-amber-700 mt-1">{ar ? `مدين: ${totalDebit.toLocaleString()} ر.ع • دائن: ${totalCredit.toLocaleString()} ر.ع` : `Debit: ${totalDebit.toLocaleString()} • Credit: ${totalCredit.toLocaleString()}`}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="admin-table w-full">
                          <thead>
                            <tr>
                              <th>{ar ? 'التاريخ' : 'Date'}</th>
                              <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                              <th>{ar ? 'الوصف' : 'Description'}</th>
                              <th>{ar ? 'النوع' : 'Type'}</th>
                              <th>{ar ? 'مدين' : 'Debit'}</th>
                              <th>{ar ? 'دائن' : 'Credit'}</th>
                              <th>{ar ? 'الحساب البنكي' : 'Bank'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerEntries.map((e) => (
                              <tr key={e.id}>
                                <td>{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                                <td className="font-mono text-sm">{e.serialNumber}</td>
                                <td>{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr}</td>
                                <td>{docTypeLabel(e.documentType)}</td>
                                <td>{e.totalDebit > 0 ? e.totalDebit.toLocaleString() : '—'}</td>
                                <td>{e.totalCredit > 0 ? e.totalCredit.toLocaleString() : '—'}</td>
                                <td className="text-sm">
                                  {e.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === e.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'بنك' : 'Bank'); })() : (ar ? 'صندوق' : 'Cash')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold bg-gray-50">
                              <td colSpan={4}>{ar ? 'الإجمالي' : 'Total'}</td>
                              <td>{totalDebit.toLocaleString()}</td>
                              <td>{totalCredit.toLocaleString()}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {ledgerEntries.length === 0 && (
                        <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد قيود للعقار/العميل المحدد في الفترة' : 'No entries for the selected property/contact in the period'}</p>
                      )}
                    </>
                  );
                }

                const ledgerEntries = getPropertyOrContactLedger(
                  {
                    propertyId: reportPropertyId ? parseInt(reportPropertyId, 10) : undefined,
                    contactId: reportContactId || undefined,
                  },
                  reportFrom,
                  reportTo,
                  entriesForReports
                );
                const totalDebit = ledgerEntries.reduce((s, e) => s + e.totalDebit, 0);
                const totalCredit = ledgerEntries.reduce((s, e) => s + e.totalCredit, 0);
                return (
                  <>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-800 font-semibold">{ar ? 'إجمالي القيود' : 'Total entries'}</p>
                      <p className="text-xl font-bold text-amber-900">{ledgerEntries.length} {ar ? 'قيد' : 'entries'}</p>
                      <p className="text-xs text-amber-700 mt-1">{ar ? `مدين: ${totalDebit.toLocaleString()} ر.ع • دائن: ${totalCredit.toLocaleString()} ر.ع` : `Debit: ${totalDebit.toLocaleString()} • Credit: ${totalCredit.toLocaleString()}`}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="admin-table w-full">
                        <thead>
                          <tr>
                            <th>{ar ? 'التاريخ' : 'Date'}</th>
                            <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                            <th>{ar ? 'الوصف' : 'Description'}</th>
                            <th>{ar ? 'النوع' : 'Type'}</th>
                            <th>{ar ? 'مدين' : 'Debit'}</th>
                            <th>{ar ? 'دائن' : 'Credit'}</th>
                            <th>{ar ? 'الحساب البنكي' : 'Bank'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerEntries.map((e) => (
                            <tr key={e.id}>
                              <td>{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                              <td className="font-mono text-sm">{e.serialNumber}</td>
                              <td>{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr}</td>
                              <td>{e.documentType ? docTypeLabel(e.documentType) : '—'}</td>
                              <td>{e.totalDebit > 0 ? e.totalDebit.toLocaleString() : '—'}</td>
                              <td>{e.totalCredit > 0 ? e.totalCredit.toLocaleString() : '—'}</td>
                              <td className="text-sm">
                                {e.bankAccountId ? (() => { const b = bankAccounts.find((x) => x.id === e.bankAccountId); return b ? getBankAccountDisplay(b) : (ar ? 'بنك' : 'Bank'); })() : (ar ? 'صندوق' : 'Cash')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold bg-gray-50">
                            <td colSpan={4}>{ar ? 'الإجمالي' : 'Total'}</td>
                            <td>{totalDebit.toLocaleString()}</td>
                            <td>{totalCredit.toLocaleString()}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {ledgerEntries.length === 0 && (
                      <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد قيود للعقار/العميل المحدد في الفترة' : 'No entries for the selected property/contact in the period'}</p>
                    )}
                  </>
                );
              })()}
              {!reportPropertyId && !reportContactId && (
                <p className="text-gray-500 py-8 text-center">{ar ? 'اختر عقاراً أو عميلاً لعرض القيود المرتبطة به' : 'Select a property or contact to view related entries'}</p>
              )}
            </div>
          )}
        </div>
        {(() => {
          const company = typeof window !== 'undefined' ? getCompanyData() : null;
          if (!company) return null;
          const details = [company.nameAr && company.nameEn && `${company.nameAr} | ${company.nameEn}`, company.addressAr || company.addressEn, company.phone, company.email, company.crNumber && (ar ? `سجل: ${company.crNumber}` : `CR: ${company.crNumber}`), company.vatNumber && (ar ? `ضريبة: ${company.vatNumber}` : `VAT: ${company.vatNumber}`)].filter(Boolean);
          return (
            <div className="px-6 py-4 mt-6 border-t border-gray-200 text-center text-xs text-gray-600">
              <p>{details.join(' · ')}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
