'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { resetAllOperationalData } from '@/lib/data/backup';

export default function AdminDataPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const userRole = (session?.user as { role?: string })?.role;
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState<number | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleReset = () => {
    if (!resetConfirm) return;
    setResetError(null);
    try {
      if (typeof window === 'undefined') {
        setResetError(ar ? 'التصفير متاح فقط في المتصفح' : 'Reset is only available in the browser');
        return;
      }
      const removed = resetAllOperationalData();
      setResetDone(removed);
      setResetConfirm(false);
      // إعادة تحميل الصفحة بعد ثانيتين لعرض البيانات المُصفّرة في كل الواجهة
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'خطأ');
    }
  };

  const showAccessDenied = status === 'unauthenticated' || (status === 'authenticated' && userRole !== 'ADMIN');

  if (showAccessDenied) {
    return (
      <div className="admin-page-content p-6">
        <div className="admin-card p-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{ar ? 'غير مصرح بالوصول' : 'Access denied'}</h2>
          <p className="text-gray-600">{ar ? 'هذه الصفحة متاحة فقط للمسؤولين' : 'This page is for administrators only.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <div className="space-y-8 p-6">
      <AdminPageHeader
        title={ar ? 'إدارة البيانات وتصفير التشغيلية' : 'Data Management & Reset'}
        subtitle={ar ? 'إدارة البيانات وتصفير الحجوزات والمدفوعات والقيود عند الحاجة' : 'Manage data and reset bookings, payments and journal when needed'}
      />

      {/* تصفير البيانات التشغيلية */}
      <div className="admin-card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⚠️</span>
          {ar ? 'تصفير البيانات التشغيلية' : 'Reset operational data'}
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          {ar
            ? 'سيتم حذف: الحجوزات، العقود، القيود المحاسبية، الفواتير، المدفوعات، الشيكات، ومسودات الحجز. تُعاد حالة العقار إلى «متاح». لا يُمس: دفتر العناوين، بيانات الشركة، الحسابات البنكية، قوالب الوثائق.'
            : 'This will remove: bookings, contracts, journal entries, documents, payments, cheques, and booking drafts. Property status resets to available. Address book, company data, bank accounts and document templates are kept.'}
        </p>
        {resetDone !== null && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {ar ? `تم تصفير ${resetDone} مفتاح/مفاتيح. سيتم إعادة تحميل الصفحة تلقائياً...` : `Reset ${resetDone} key(s). Page will reload automatically...`}
          </div>
        )}
        {resetError && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{resetError}</div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!resetConfirm ? (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="px-5 py-2.5 rounded-xl font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              {ar ? 'تصفير البيانات التشغيلية' : 'Reset operational data'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {ar ? 'تأكيد التصفير' : 'Confirm reset'}
              </button>
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
