'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms, savePropertyBookingTerms, type PropertyBookingTerms } from '@/lib/data/bookingTerms';

export default function BookingTermsPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [propertyTitle, setPropertyTitle] = useState('');
  const [terms, setTerms] = useState<PropertyBookingTerms>({ bookingTermsAr: '', bookingTermsEn: '', bookingDepositNoteAr: '', bookingDepositNoteEn: '', bookingDepositAmount: undefined });
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsSaved, setTermsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(id, dataOverrides);
    if (prop) setPropertyTitle(ar ? prop.titleAr : prop.titleEn);
    setTerms(getPropertyBookingTerms(id));
  }, [id, locale, ar]);

  const handleSaveTerms = () => {
    setTermsSaving(true);
    savePropertyBookingTerms(id, terms);
    setTermsSaving(false);
    setTermsSaved(true);
    setTimeout(() => setTermsSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <Link
          href={`/${locale}/admin/properties/${id}/bookings`}
          className="inline-flex items-center gap-2 text-[#8B6F47] hover:text-[#6B5535] font-semibold mb-4 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center">←</span>
          {ar ? 'العودة للحجوزات' : 'Back to Bookings'}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {ar ? 'شروط الحجز' : 'Booking Terms'}
            </h1>
            <p className="text-gray-500 mt-1 font-medium">{propertyTitle}</p>
          </div>
          <Link
            href={`/${locale}/properties/${id}/book`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
          >
            <span>🔗</span>
            {ar ? 'عرض صفحة الحجز' : 'View Booking Page'}
          </Link>
        </div>
      </div>

      {/* Terms Editor */}
      <div
        className={`bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/5 via-amber-50/50 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8B6F47]/10 flex items-center justify-center text-2xl flex-shrink-0">
              📋
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{ar ? 'تعديل شروط الحجز' : 'Edit Booking Terms'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {ar ? 'ستظهر هذه الشروط للمستأجر في صفحة الحجز.' : 'These terms will be shown to the tenant on the booking page.'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'شروط الحجز (عربي)' : 'Booking Terms (Arabic)'}</label>
              <textarea
                value={terms.bookingTermsAr}
                onChange={(e) => setTerms({ ...terms, bookingTermsAr: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none"
                placeholder={ar ? 'مثال: مبلغ الحجز لا يقل عن إيجار شهر واحد...' : 'e.g. Booking deposit is at least one month\'s rent...'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'شروط الحجز (إنجليزي)' : 'Booking Terms (English)'}</label>
              <textarea
                value={terms.bookingTermsEn}
                onChange={(e) => setTerms({ ...terms, bookingTermsEn: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none"
                placeholder="e.g. Booking deposit is at least one month's rent..."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (عربي)' : 'Deposit Note (Arabic)'}</label>
              <input
                type="text"
                value={terms.bookingDepositNoteAr}
                onChange={(e) => setTerms({ ...terms, bookingDepositNoteAr: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900"
                placeholder={ar ? 'مثال: مبلغ لا يقل عن إيجار شهر واحد' : 'e.g. At least one month\'s rent'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (إنجليزي)' : 'Deposit Note (English)'}</label>
              <input
                type="text"
                value={terms.bookingDepositNoteEn}
                onChange={(e) => setTerms({ ...terms, bookingDepositNoteEn: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900"
                placeholder="e.g. At least one month's rent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#8B6F47]/5 to-amber-50/30 border border-[#8B6F47]/20">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'قيمة الحجز (ر.ع)' : 'Booking Deposit Amount (OMR)'}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={terms.bookingDepositAmount ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setTerms({ ...terms, bookingDepositAmount: v === '' ? undefined : parseFloat(v) || 0 });
                }}
                className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900"
                placeholder={ar ? 'مثال: 150' : 'e.g. 150'}
              />
              <p className="text-sm text-gray-500 mt-1.5">
                {ar ? 'عند استيفاء هذا المبلغ من العميل، يتم حجز المبلغ تلقائياً.' : 'When the client pays this amount, the deposit is automatically reserved.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSaveTerms}
                disabled={termsSaving}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-[#8B6F47] hover:bg-[#6B5535] disabled:opacity-70 transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
              >
                {termsSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {ar ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    {ar ? 'حفظ الشروط' : 'Save Terms'}
                  </>
                )}
              </button>
              {termsSaved && (
                <span className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>
                  {ar ? 'تم الحفظ' : 'Saved'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
