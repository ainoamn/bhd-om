'use client';

import { useState } from 'react';
import Icon from '@/components/icons/Icon';

interface Props {
  locale: string;
  onClose: () => void;
}

const STEPS_AR = [
  {
    title: 'كيف يعمل النظام',
    content: 'نظام المحاسبة يعتمد على القيد المزدوج: كل عملية مالية تُسجّل في جانبين (مدين ودائن) بحيث يتساوى المجموع دائماً. لا عملية بدون قيد، ولا قيد بدون مستند.',
  },
  {
    title: 'البداية السريعة',
    content: '1) أضف حساباتك من دليل الحسابات\n2) سجّل قيد يومية أو أضف فاتورة/إيصال\n3) راجع التقارير (ميزان المراجعة، قائمة الدخل، الميزانية)',
  },
  {
    title: 'دليل الحسابات',
    content: 'شجرة الحسابات تحتوي على: الأصول، الالتزامات، حقوق الملكية، الإيرادات، المصروفات. اختر حساباً لعرض كشف الحساب (الحركات والرصيد).',
  },
  {
    title: 'قيود اليومية',
    content: 'القيد اليدوي: أدخل التاريخ والوصف، ثم أضف بنوداً (حساب، مدين، دائن). المدين = الدائن دائماً. النظام يقترح حسابات ذكية من الوصف.',
  },
  {
    title: 'الفواتير والإيصالات',
    content: 'أضف فاتورة بيع، إيصال استلام، عرض سعر، عربون، أو دفعة. كل مستند معتمد يُرَحّل تلقائياً كقيد في اليومية.',
  },
  {
    title: 'التقارير',
    content: 'ميزان المراجعة: أرصدة كل الحسابات. قائمة الدخل: الإيرادات والمصروفات وصافي الدخل. الميزانية العمومية: الأصول والالتزامات وحقوق الملكية. التدفق النقدي: حركة النقد.',
  },
  {
    title: 'الطباعة والنماذج',
    content: 'المستندات: اضغط «عرض / طباعة / تنزيل» لفتح المستند. اختر ما تريد إظهاره (رأس، تذييل، توقيع) ثم اضغط طباعة أو تنزيل PDF. التقارير: اضغط طباعة أو تنزيل PDF (اختر حفظ كـ PDF في مربع الطباعة). لضبط شكل المستندات: اذهب إلى «نماذج الوثائق» من أعلى الصفحة.',
  },
];

const STEPS_EN = [
  {
    title: 'How the System Works',
    content: 'The accounting system uses double-entry: every financial transaction is recorded in two sides (debit and credit) so the totals always balance. No transaction without an entry, no entry without a document.',
  },
  {
    title: 'Quick Start',
    content: '1) Add your accounts from the Chart of Accounts\n2) Record a journal entry or add an invoice/receipt\n3) Review reports (Trial Balance, Income Statement, Balance Sheet)',
  },
  {
    title: 'Chart of Accounts',
    content: 'The chart contains: Assets, Liabilities, Equity, Revenue, Expenses. Select an account to view its statement (transactions and balance).',
  },
  {
    title: 'Journal Entries',
    content: 'Manual entry: Enter date and description, then add lines (account, debit, credit). Debit must equal Credit. The system suggests accounts from the description.',
  },
  {
    title: 'Invoices & Receipts',
    content: 'Add sales invoice, receipt, quote, deposit, or payment. Each approved document is automatically posted as a journal entry.',
  },
  {
    title: 'Reports',
    content: 'Trial Balance: All account balances. Income Statement: Revenue, expenses, net income. Balance Sheet: Assets, liabilities, equity. Cash Flow: Cash movement.',
  },
  {
    title: 'Printing & Templates',
    content: 'Documents: Click "View / Print / Download" to open the document. Choose what to include (header, footer, signature) then click Print or Download PDF. Reports: Click Print or Download PDF (choose Save as PDF in the print dialog). To customize document appearance: Go to "Document Templates" from the page header.',
  },
];

export default function AccountingHelpGuide({ locale, onClose }: Props) {
  const ar = locale === 'ar';
  const steps = ar ? STEPS_AR : STEPS_EN;
  const [step, setStep] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ar ? 'دليل استخدام نظام المحاسبة' : 'Accounting system guide'}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/10 to-transparent">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="information" className="h-5 w-5 text-[#8B6F47]" />
            {ar ? 'دليل الاستخدام' : 'User Guide'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={ar ? 'إغلاق' : 'Close'}
          >
            <Icon name="x" className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  step === i
                    ? 'border-[#8B6F47] bg-[#8B6F47]/5'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
                onClick={() => setStep(i)}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B6F47] text-white text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                      {s.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  step === i ? 'w-6 bg-[#8B6F47]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`${ar ? 'الخطوة' : 'Step'} ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors"
          >
            {ar ? 'فهمت' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
