'use client';

import { useState, useRef } from 'react';
import { downloadCsv } from '@/lib/utils/csvExport';

type ReportView = 'trial' | 'income' | 'balance' | 'cashflow' | 'bankStatement' | 'propertyLedger';

interface ReportExportButtonsProps {
  reportView: ReportView;
  reportFrom: string;
  reportTo: string;
  trialBalance?: Array<{ accountCode: string; accountNameAr: string; accountNameEn: string; debit: number; credit: number }>;
  incomeStatement?: { revenue: { items: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; total: number }; expense: { items: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; total: number }; netIncome: number };
  balanceSheet?: { assets: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; liabilities: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; equity: Array<{ code: string; nameAr: string; nameEn: string; amount: number }>; totalAssets: number; totalLiabilities: number };
  cashFlow?: { operating: number; investing: number; financing: number; netChange: number };
  ar: boolean;
}

export default function ReportExportButtons({
  reportView,
  reportFrom,
  reportTo,
  trialBalance = [],
  incomeStatement,
  balanceSheet,
  cashFlow,
  ar,
}: ReportExportButtonsProps) {
  const [open, setOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportLabel = {
    trial: ar ? 'ميزان المراجعة' : 'Trial Balance',
    income: ar ? 'قائمة الدخل' : 'Income Statement',
    balance: ar ? 'الميزانية العمومية' : 'Balance Sheet',
    cashflow: ar ? 'التدفق النقدي' : 'Cash Flow',
    bankStatement: ar ? 'كشف الحساب البنكي' : 'Bank Statement',
    propertyLedger: ar ? 'كشف العقار' : 'Property Ledger',
  }[reportView];

  const filename = `${reportLabel}_${reportFrom}_${reportTo}`.replace(/\s+/g, '_');

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = () => {
    window.print();
  };

  const handleExcel = () => {
    if (reportView === 'trial' && trialBalance.length > 0) {
      const data = [
        [ar ? 'الرمز' : 'Code', ar ? 'الاسم' : 'Account', ar ? 'مدين' : 'Debit', ar ? 'دائن' : 'Credit'],
        ...trialBalance.map((r) => [
          r.accountCode,
          ar ? r.accountNameAr : r.accountNameEn,
          r.debit > 0 ? r.debit : '',
          r.credit > 0 ? r.credit : '',
        ]),
        ['', ar ? 'الإجمالي' : 'Total', trialBalance.reduce((s, r) => s + r.debit, 0), trialBalance.reduce((s, r) => s + r.credit, 0)],
      ];
      downloadCsv(filename, data);
    } else if (reportView === 'income' && incomeStatement) {
      const rows: (string | number)[][] = [[ar ? 'الإيرادات' : 'Revenue'], [ar ? 'الرمز' : 'Code', ar ? 'الاسم' : 'Name', ar ? 'المبلغ' : 'Amount']];
      incomeStatement.revenue.items.forEach((i) => rows.push([i.code, ar ? i.nameAr : i.nameEn, i.amount]));
      rows.push([ar ? 'إجمالي الإيرادات' : 'Total Revenue', '', incomeStatement.revenue.total]);
      rows.push([]);
      rows.push([ar ? 'المصروفات' : 'Expenses']);
      rows.push([ar ? 'الرمز' : 'Code', ar ? 'الاسم' : 'Name', ar ? 'المبلغ' : 'Amount']);
      incomeStatement.expense.items.forEach((i) => rows.push([i.code, ar ? i.nameAr : i.nameEn, i.amount]));
      rows.push([ar ? 'إجمالي المصروفات' : 'Total Expenses', '', incomeStatement.expense.total]);
      rows.push([]);
      rows.push([ar ? 'صافي الدخل' : 'Net Income', '', incomeStatement.netIncome]);
      downloadCsv(filename, rows);
    } else if (reportView === 'balance' && balanceSheet) {
      const rows: (string | number)[][] = [
        [ar ? 'الأصول' : 'Assets'],
        [ar ? 'الرمز' : 'Code', ar ? 'الاسم' : 'Name', ar ? 'المبلغ' : 'Amount'],
        ...balanceSheet.assets.map((i) => [i.code, ar ? i.nameAr : i.nameEn, i.amount]),
        [ar ? 'إجمالي الأصول' : 'Total Assets', '', balanceSheet.totalAssets],
        [],
        [ar ? 'الالتزامات' : 'Liabilities'],
        ...balanceSheet.liabilities.map((i) => [i.code, ar ? i.nameAr : i.nameEn, i.amount]),
        [ar ? 'إجمالي الالتزامات' : 'Total Liabilities', '', balanceSheet.totalLiabilities],
        [],
        [ar ? 'حقوق الملكية' : 'Equity'],
        ...balanceSheet.equity.map((i) => [i.code, ar ? i.nameAr : i.nameEn, i.amount]),
      ];
      downloadCsv(filename, rows);
    } else if (reportView === 'cashflow' && cashFlow) {
      const rows = [
        [ar ? 'التشغيل' : 'Operating', cashFlow.operating],
        [ar ? 'الاستثمار' : 'Investing', cashFlow.investing],
        [ar ? 'التمويل' : 'Financing', cashFlow.financing],
        [ar ? 'التدفق الصافي' : 'Net Change', cashFlow.netChange],
      ];
      downloadCsv(filename, rows);
    } else {
      downloadCsv(filename, [[reportLabel, reportFrom, reportTo]]);
    }
  };

  const handleWord = () => {
    const el = document.getElementById('accounting-report-print');
    if (!el) return;
    const html = `<!DOCTYPE html><html dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><title>${reportLabel}</title></head><body>${el.outerHTML}</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold admin-accent-text hover:underline flex items-center gap-1 px-3 py-1.5 rounded-lg border admin-accent-border/30 bg-white hover:bg-amber-50"
      >
        📥 {ar ? 'تصدير' : 'Export'} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white rounded-xl shadow-lg border border-gray-200 py-1">
            <button type="button" onClick={() => { handlePrint(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              🖨️ {ar ? 'طباعة' : 'Print'}
            </button>
            <button type="button" onClick={() => { handlePdf(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📄 PDF
            </button>
            <button type="button" onClick={() => { handleExcel(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📊 Excel
            </button>
            <button type="button" onClick={() => { handleWord(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📝 Word
            </button>
          </div>
        </>
      )}
    </div>
  );
}
