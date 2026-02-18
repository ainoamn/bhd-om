'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AccountingSection from '@/components/admin/AccountingSection';
import AccountingHelpGuide from '@/components/admin/AccountingHelpGuide';
import Icon from '@/components/icons/Icon';

export default function AdminAccountingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header - بسيط وواضح */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {ar ? 'المحاسبة' : 'Accounting'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {ar ? 'قيود • حسابات • تقارير' : 'Entries • Accounts • Reports'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/admin/document-templates`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-semibold text-sm"
            >
              <Icon name="documentText" className="h-5 w-5" />
              {ar ? 'نماذج الوثائق' : 'Document Templates'}
            </Link>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B6F47]/10 text-[#8B6F47] hover:bg-[#8B6F47]/20 transition-colors font-semibold text-sm"
              aria-label={ar ? 'كيف يعمل النظام' : 'How it works'}
            >
              <Icon name="information" className="h-5 w-5" />
              {ar ? 'كيف يعمل النظام؟' : 'How it works?'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <AccountingSection />
      </main>

      {showHelp && (
        <AccountingHelpGuide locale={locale} onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
