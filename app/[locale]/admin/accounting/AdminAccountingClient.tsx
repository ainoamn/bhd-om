'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AccountingSection, { type AccountingInitialData } from '@/components/admin/AccountingSection';
import AccountingHelpGuide from '@/components/admin/AccountingHelpGuide';
import Icon from '@/components/icons/Icon';

export default function AdminAccountingClient(props: { initialData: AccountingInitialData }) {
  const { initialData } = props;
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50/30">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-xl">
        <div className="flex items-center justify-between px-10 py-6 max-w-[1900px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300">
              <Icon name="chartBar" className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {ar ? 'نظام المحاسبة المتطور' : 'Advanced Accounting System'}
              </h1>
              <p className="text-base text-gray-700 mt-2 font-medium">
                {ar ? 'إدارة مالية متكاملة • تقارير احترافية • معايير عالمية' : 'Integrated Financial Management • Professional Reports • Global Standards'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/admin/accounting/journal`}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-bold text-base shadow-xl transform hover:scale-105"
            >
              <Icon name="plus" className="h-6 w-6" />
              {ar ? 'إضافة قيد محاسبي' : 'Add Journal Entry'}
            </Link>
            <Link
              href={`/${locale}/admin/accounting/accounts`}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 transition-all duration-300 font-bold text-base shadow-xl transform hover:scale-105"
            >
              <Icon name="cog" className="h-6 w-6" />
              {ar ? 'إدارة الحسابات' : 'Manage Accounts'}
            </Link>
            <Link
              href={`/${locale}/admin/accounting/reports`}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 transition-all duration-300 font-bold text-base shadow-xl transform hover:scale-105"
            >
              <Icon name="chartBar" className="h-6 w-6" />
              {ar ? 'التقارير المالية' : 'Financial Reports'}
            </Link>
            <Link
              href={`/${locale}/admin/document-templates`}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-bold text-base shadow-xl transform hover:scale-105"
            >
              <Icon name="documentText" className="h-6 w-6" />
              {ar ? 'نماذج الوثائق' : 'Document Templates'}
            </Link>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-700 hover:from-yellow-500/30 hover:to-amber-500/30 transition-all duration-300 font-bold text-base shadow-xl border-2 border-yellow-400/50 transform hover:scale-105"
              aria-label={ar ? 'كيف يعمل النظام' : 'How it works'}
            >
              <Icon name="information" className="h-6 w-6" />
              {ar ? 'دليل الاستخدام' : 'User Guide'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1900px] mx-auto px-8 py-10">
        <AccountingSection initialData={initialData} />
      </main>

      {showHelp && (
        <AccountingHelpGuide locale={locale} onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
