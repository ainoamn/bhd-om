'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBookingsByProperty, updateBookingStatus, syncPaidBookingsToAccounting, getBookingDisplayName, isCompanyBooking, hasBookingFinancialLinkage, requestBookingCancellation, hasPendingCancellationRequest, type PropertyBooking, type BookingStatus } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getUnitSerialNumber, properties } from '@/lib/data/properties';
import { hasContractForUnit, getContractsByProperty } from '@/lib/data/contracts';
import { areAllRequiredDocumentsApproved, getDocumentsByBooking, hasDocumentsNeedingConfirmation } from '@/lib/data/bookingDocuments';
import { getChecksByBooking, areAllChecksApproved } from '@/lib/data/bookingChecks';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import BookingDocumentsPanel from '@/components/admin/BookingDocumentsPanel';

const STATUS_LABELS: Record<BookingStatus, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  CONFIRMED: { ar: 'قيد انهاء الإجراءات', en: 'Procedures in progress' },
  RENTED: { ar: 'مؤجر', en: 'Rented' },
  SOLD: { ar: 'مباع', en: 'Sold' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  BOOKING: { ar: 'حجز', en: 'Booking' },
  VIEWING: { ar: 'معاينة', en: 'Viewing' },
};

export default function PropertyBookingsPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertySerial, setPropertySerial] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BOOKING' | 'VIEWING'>('ALL');
  const [mounted, setMounted] = useState(false);
  const [documentsPanelBooking, setDocumentsPanelBooking] = useState<PropertyBooking | null>(null);

  useEffect(() => setMounted(true), []);

  const loadData = () => {
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(id, dataOverrides);
    const baseProp = properties.find((p: { id: number }) => p.id === parseInt(id, 10));
    const serial = (prop as { serialNumber?: string })?.serialNumber || (baseProp as { serialNumber?: string })?.serialNumber || '';
    if (prop) {
      setPropertyTitle(ar ? prop.titleAr : prop.titleEn);
    }
    setPropertySerial(serial);
    setBookings(getBookingsByProperty(parseInt(id, 10)));
  };

  useEffect(() => {
    loadData();
    // مزامنة تلقائية: إنشاء إيصالات للحجوزات المدفوعة التي لا تملك إيصالاً في المحاسبة
    syncPaidBookingsToAccounting(parseInt(id, 10));
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_property_bookings' || e.key === 'bhd_rental_contracts' || e.key === 'bhd_booking_documents' || e.key === 'bhd_booking_cancellation_requests') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [id, locale, ar]);

  const getUnitDisplay = (unitKey?: string) => {
    if (!unitKey) return { serial: '', label: '—' };
    const [unitType, idxStr] = unitKey.split('-');
    const idx = parseInt(idxStr, 10);
    const typeMap: Record<string, { ar: string; en: string }> = {
      shop: { ar: 'محل', en: 'Shop' },
      showroom: { ar: 'معرض', en: 'Showroom' },
      apartment: { ar: 'شقة', en: 'Apartment' },
    };
    const typeKey = unitType === 'shop' ? 'shop' : unitType === 'showroom' ? 'showroom' : 'apartment';
    const unitSerial = propertySerial ? getUnitSerialNumber(propertySerial, typeKey, idx) : '';
    const label = ar ? `${typeMap[unitType]?.ar || unitType} ${idx + 1}` : `${typeMap[unitType]?.en || unitType} ${idx + 1}`;
    return { serial: unitSerial, label };
  };

  const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
    updateBookingStatus(bookingId, newStatus);
    setBookings(getBookingsByProperty(parseInt(id, 10)));
  };

  const contracts = getContractsByProperty(parseInt(id, 10));
  const getContractForBooking = (b: PropertyBooking) =>
    contracts.find(
      (c) =>
        c.bookingId === b.id ||
        (b.contractId && c.id === b.contractId) ||
        (c.propertyId === b.propertyId && (c.unitKey || '') === (b.unitKey || ''))
    );
  const getApprovedContractForBooking = (b: PropertyBooking) => {
    const c = getContractForBooking(b);
    return c && c.status === 'APPROVED' ? c : undefined;
  };
  const isStatusLocked = (b: PropertyBooking) => hasContractForUnit(parseInt(id, 10), b.unitKey);

  const terms = getPropertyBookingTerms(id);
  const hasRequiredDocs = (terms.requiredDocTypes || []).some((r) => r.isRequired);
  const canCreateContract = (b: PropertyBooking) => {
    if (!hasRequiredDocs) return true;
    const docs = getDocumentsByBooking(b.id);
    return docs.length > 0 && areAllRequiredDocumentsApproved(b.id);
  };

  const filteredBookings = bookings.filter((b) => filterType === 'ALL' || b.type === filterType);
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
    confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
    withPayment: bookings.filter((b) => b.type === 'BOOKING' && b.paymentConfirmed).length,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <Link
              href={`/${locale}/admin/bookings`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-600 hover:text-gray-900 hover:bg-white/50"
            >
              {ar ? 'إدارة الحجوزات كاملة' : 'All Bookings'}
            </Link>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-gray-900 shadow-sm">
              {ar ? 'إدارة حجز عقار معين' : 'Property Bookings'}
            </span>
          </div>
          <select
            onChange={(e) => {
              const v = e.target.value;
              if (v) window.location.href = `/${locale}/admin/properties/${v}/bookings`;
            }}
            value={id}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:ring-2 focus:ring-[#8B6F47]/20 focus:border-[#8B6F47] outline-none"
          >
            {properties.map((p: { id: number; titleAr?: string; titleEn?: string }) => (
              <option key={p.id} value={p.id}>
                {ar ? p.titleAr : p.titleEn} (#{p.id})
              </option>
            ))}
          </select>
        </div>
        <Link
          href={`/${locale}/admin/properties`}
          className="inline-flex items-center gap-2 text-[#8B6F47] hover:text-[#6B5535] font-semibold mb-4 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center">←</span>
          {ar ? 'العودة للعقارات' : 'Back to Properties'}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {ar ? 'حجوزات العقار' : 'Property Bookings'}
            </h1>
            <p className="text-gray-500 mt-1 font-medium">{propertyTitle}</p>
            <p className="text-sm font-mono text-[#8B6F47] mt-0.5">
              {ar ? 'رقم العقار:' : 'Property:'} {propertySerial || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-all duration-500 delay-75 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{ar ? 'الإجمالي' : 'Total'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">{ar ? 'قيد الانتظار' : 'Pending'}</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{ar ? 'مؤكد' : 'Confirmed'}</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{ar ? 'ملغى' : 'Cancelled'}</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.cancelled}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#8B6F47]/30 p-5 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-[#8B6F47] uppercase tracking-wider">{ar ? 'مدفوع' : 'Paid'}</p>
          <p className="text-2xl font-bold text-[#8B6F47] mt-1">{stats.withPayment}</p>
        </div>
      </div>

      {/* Bookings List */}
      <div
        className={`bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{ar ? 'طلبات الحجز والمعاينة' : 'Booking & Viewing Requests'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ar ? 'قم بتأكيد الحجز أو تغيير الحالة من القائمة أدناه.' : 'Confirm bookings or update status from the list below.'}
            </p>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {(['ALL', 'BOOKING', 'VIEWING'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterType === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f === 'ALL' ? (ar ? 'الكل' : 'All') : ar ? TYPE_LABELS[f]?.ar : TYPE_LABELS[f]?.en}
              </button>
            ))}
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📭</div>
            <p className="text-gray-500 font-medium text-lg">{ar ? 'لا توجد حجوزات أو طلبات معاينة' : 'No bookings or viewing requests'}</p>
            <p className="text-gray-400 text-sm mt-1">{ar ? 'ستظهر الطلبات هنا عند وصولها' : 'Requests will appear here when received'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'العميل' : 'Client'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'النوع' : 'Type'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'الوحدة / الرقم المتسلسل' : 'Unit / Serial'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'الدفع' : 'Payment'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'الحالة' : 'Status'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 font-medium">
                          {new Date(b.createdAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{getBookingDisplayName(b, locale)}</span>
                          {isCompanyBooking(b) && <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{ar ? 'شركة' : 'Company'}</span>}
                        </div>
                          <div className="text-xs text-gray-500">{b.email}</div>
                          <a href={`tel:${b.phone}`} className="text-sm text-[#8B6F47] hover:underline font-medium">{b.phone}</a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${
                            b.type === 'BOOKING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {ar ? TYPE_LABELS[b.type]?.ar : TYPE_LABELS[b.type]?.en}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const { serial, label } = getUnitDisplay(b.unitKey);
                          if (!b.unitKey) {
                            return (
                              <div>
                                <div className="text-gray-500">{ar ? 'عقار كامل' : 'Full property'}</div>
                                {propertySerial && <div className="text-xs font-mono text-[#8B6F47] mt-0.5">{propertySerial}</div>}
                              </div>
                            );
                          }
                          return (
                            <div>
                              <div className="font-medium text-gray-900">{label}</div>
                              <div className="text-xs font-mono text-[#8B6F47] mt-0.5">{serial || b.unitKey}</div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {b.type === 'BOOKING' ? (
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">{ar ? 'المبلغ:' : 'Amount:'}</span>{' '}
                              {b.priceAtBooking != null ? `${b.priceAtBooking.toLocaleString()} ر.ع` : '—'}
                            </div>
                            <div>
                              <span
                                className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${
                                  b.paymentConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {b.paymentConfirmed ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'لم يُدفع' : 'Not paid')}
                              </span>
                            </div>
                            {b.paymentConfirmed && b.paymentMethod && (
                              <div className="text-xs text-gray-600 space-y-0.5">
                                <div>
                                  {b.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : b.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل في حساب البنك' : 'Bank transfer') : (ar ? 'شيك' : 'Cheque')}
                                </div>
                                {b.paymentReferenceNo && (
                                  <div>{ar ? 'رقم الإيصال/الشيك:' : 'Ref:'} {b.paymentReferenceNo}</div>
                                )}
                                {b.paymentDate && (
                                  <div>{ar ? 'التاريخ:' : 'Date:'} {new Date(b.paymentDate + 'T12:00:00').toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isStatusLocked(b) ? (
                          <div className="space-y-1">
                            {(() => {
                              const c = getContractForBooking(b);
                              const approved = getApprovedContractForBooking(b);
                              const isApproved = !!approved;
                              const allDocsAndChecksApproved = areAllRequiredDocumentsApproved(b.id) && (getChecksByBooking(b.id).length === 0 || areAllChecksApproved(b.id));
                              const contractStatusLabel = !c ? (ar ? 'عقد قيد الإعداد' : 'Contract in progress') : c.status === 'APPROVED'
                                ? (ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)')
                                : c.status === 'ADMIN_APPROVED' || c.status === 'TENANT_APPROVED' || c.status === 'LANDLORD_APPROVED'
                                  ? allDocsAndChecksApproved
                                    ? (ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval')
                                    : (ar ? 'تم اعتماده مبدئياً من قبل الإدارة وفي انتظار إكمال البيانات من قبل المستأجر لاعتماد المستندات' : 'Preliminarily approved by admin, awaiting tenant to complete data for document approval')
                                  : (ar ? 'عقد مسودة - بانتظار رفع المستندات' : 'Draft - pending document upload');
                              const propKind = ((getPropertyById(b.propertyId, getPropertyDataOverrides()) as { type?: 'RENT' | 'SALE' | 'INVESTMENT' } | null)?.type ?? 'RENT') as
                                | 'RENT'
                                | 'SALE'
                                | 'INVESTMENT';
                              const contractsHref = c?.id ? `/${locale}/admin/contracts/${c.id}` : `/${locale}/admin/contracts?kind=${propKind}`;
                              return (
                                <>
                                  <span className={`inline-flex px-3 py-1 rounded-xl text-sm font-semibold border ${
                                    isApproved ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {contractStatusLabel}
                                  </span>
                                  {approved && (
                                    <div className="text-xs text-gray-600">
                                      {approved.monthlyRent.toLocaleString()} ر.ع/شهر • {approved.annualRent.toLocaleString()} ر.ع/سنة • {new Date(approved.startDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')} — {new Date(approved.endDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}
                                    </div>
                                  )}
                                  {c && !isApproved && (
                                    <div className="text-xs text-amber-600">
                                      {ar ? 'بانتظار اعتماد العقد' : 'Pending contract approval'}
                                    </div>
                                  )}
                                  <Link href={contractsHref} className="text-xs text-[#8B6F47] hover:underline block">
                                    {ar ? 'تعديل من صفحة العقود' : 'Edit from contracts page'}
                                  </Link>
                                </>
                              );
                            })()}
                          </div>
                        ) : b.type === 'BOOKING' ? (
                          <div className="space-y-1">
                            <div
                              className={`inline-flex px-3 py-2 rounded-xl border text-sm font-semibold ${
                                b.status === 'CONFIRMED'
                                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                                  : b.status === 'RENTED'
                                    ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                                    : b.status === 'SOLD'
                                      ? 'border-green-200 bg-green-50/50 text-green-700'
                                      : b.status === 'CANCELLED'
                                        ? 'border-gray-200 bg-gray-50 text-gray-600'
                                        : 'border-amber-200 bg-amber-50/50 text-amber-700'
                              }`}
                            >
                              {ar ? STATUS_LABELS[b.status].ar : STATUS_LABELS[b.status].en}
                            </div>
                            {b.type === 'BOOKING' && b.paymentConfirmed && !b.accountantConfirmedAt && (
                              <p className="text-xs text-amber-600" title={ar ? 'انتظر تأكيد المحاسب لاستلام المبلغ من لوحة المحاسبة' : 'Wait for accountant to confirm receipt from accounting dashboard'}>
                                {ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant confirmation'}
                              </p>
                            )}
                            {b.status === 'CONFIRMED' && b.accountantConfirmedAt && (
                              <p className="text-xs text-emerald-600 font-medium">
                                {ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed'}
                              </p>
                            )}
                            {b.status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(b.id) && (
                              <p className="text-xs text-amber-600 font-medium" title={ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}>
                                📋 {ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}
                              </p>
                            )}
                            {b.status === 'CANCELLED' && b.cancellationNote && (
                              <p className="text-xs text-gray-600 italic" title={ar ? 'ملاحظة المحاسب' : 'Accountant note'}>{b.cancellationNote}</p>
                            )}
                            {!getContractForBooking(b) && b.status !== 'CANCELLED' && (() => {
                              if (hasBookingFinancialLinkage(b)) {
                                if (hasPendingCancellationRequest(b.id)) {
                                  return <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار المحاسبة (استرداد/خصم)' : '⏳ Pending accounting (refund)'}</p>;
                                }
                                return (
                                  <button type="button" onClick={() => { requestBookingCancellation(b.id); setBookings(getBookingsByProperty(parseInt(id, 10))); }} className="text-xs text-red-600 hover:underline font-medium" title={ar ? 'يرسل الطلب للمحاسبة' : 'Sends to accounting'}>
                                    {ar ? 'إلغاء الحجز' : 'Cancel booking'}
                                  </button>
                                );
                              }
                              return (
                                <button type="button" onClick={() => handleStatusChange(b.id, 'CANCELLED')} className="text-xs text-red-600 hover:underline font-medium">
                                  {ar ? 'إلغاء الحجز' : 'Cancel booking'}
                                </button>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#8B6F47]/20 focus:border-[#8B6F47] outline-none"
                            >
                              <option value="PENDING">{ar ? 'قيد الانتظار' : 'Pending'}</option>
                              <option value="CONFIRMED">{ar ? 'قيد انهاء الإجراءات' : 'Procedures in progress'}</option>
                              <option value="RENTED">{ar ? 'مؤجر' : 'Rented'}</option>
                              <option value="SOLD">{ar ? 'مباع' : 'Sold'}</option>
                              <option value="CANCELLED">{ar ? 'ملغى' : 'Cancelled'}</option>
                            </select>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {b.type === 'BOOKING' && b.status === 'CONFIRMED' && !getContractForBooking(b) && (
                            <>
                              <button
                                type="button"
                                onClick={() => setDocumentsPanelBooking(b)}
                                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-colors"
                              >
                                <span>📄</span>
                                {ar ? 'المستندات' : 'Documents'}
                                {hasDocumentsNeedingConfirmation(b.id) && (
                                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold" title={ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}>!</span>
                                )}
                              </button>
                              {canCreateContract(b) && (
                                <Link
                                  href={`/${locale}/admin/contracts?createFrom=${b.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors"
                                >
                                  <span>📋</span>
                                  {ar ? 'إنشاء عقد' : 'Create Contract'}
                                </Link>
                              )}
                            </>
                          )}
                          <a
                            href={`https://wa.me/9689115341?text=${encodeURIComponent(ar ? `مرحباً، بخصوص طلب ${b.type === 'BOOKING' ? 'الحجز' : 'المعاينة'} من ${getBookingDisplayName(b, locale)}` : `Hi, regarding ${b.type} request from ${getBookingDisplayName(b, locale)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <span>💬</span>
                            واتساب
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredBookings.map((b) => (
                <div key={b.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{getBookingDisplayName(b, locale)}</p>
                      <p className="text-sm text-gray-500">{b.email}</p>
                      <a href={`tel:${b.phone}`} className="text-sm text-[#8B6F47] font-semibold">{b.phone}</a>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        b.type === 'BOOKING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {ar ? TYPE_LABELS[b.type]?.ar : TYPE_LABELS[b.type]?.en}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>{new Date(b.createdAt).toLocaleString(ar ? 'ar-OM' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {b.unitKey ? (() => {
                      const { serial, label } = getUnitDisplay(b.unitKey);
                      return (
                        <span className="font-medium">
                          • {label}
                          <span className="font-mono text-[#8B6F47]"> ({serial || b.unitKey})</span>
                        </span>
                      );
                    })() : (
                      <span className="font-medium">
                        • {ar ? 'عقار كامل' : 'Full property'}
                        {propertySerial && <span className="font-mono text-[#8B6F47]"> ({propertySerial})</span>}
                      </span>
                    )}
                    {b.type === 'BOOKING' && (
                      <>
                        <span className="text-gray-700">
                          • {ar ? 'المبلغ:' : 'Amount:'} {b.priceAtBooking != null ? `${b.priceAtBooking.toLocaleString()} ر.ع` : '—'}
                        </span>
                        <span className={b.paymentConfirmed ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                          • {b.paymentConfirmed ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'لم يُدفع' : 'Not paid')}
                        </span>
                        {b.paymentConfirmed && b.paymentMethod && (
                          <span className="text-gray-600">
                            • {b.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : b.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل في حساب البنك' : 'Bank transfer') : (ar ? 'شيك' : 'Cheque')}
                            {b.paymentReferenceNo && ` (${ar ? 'رقم الإيصال/الشيك:' : 'Ref:'} ${b.paymentReferenceNo})`}
                            {b.paymentDate && ` • ${ar ? 'التاريخ:' : 'Date:'} ${new Date(b.paymentDate + 'T12:00:00').toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}`}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isStatusLocked(b) ? (
                      <div className="flex-1 p-3 rounded-xl bg-blue-50 border border-blue-200">
                        {(() => {
                          const c = getContractForBooking(b);
                          const approved = getApprovedContractForBooking(b);
                          const isApproved = !!approved;
                          const allDocsAndChecksApproved = areAllRequiredDocumentsApproved(b.id) && (getChecksByBooking(b.id).length === 0 || areAllChecksApproved(b.id));
                          const contractStatusLabel = !c ? (ar ? 'عقد قيد الإعداد' : 'Contract in progress') : c.status === 'APPROVED'
                            ? (ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)')
                            : c.status === 'ADMIN_APPROVED' || c.status === 'TENANT_APPROVED' || c.status === 'LANDLORD_APPROVED'
                              ? allDocsAndChecksApproved
                                ? (ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval')
                                : (ar ? 'تم اعتماده مبدئياً من قبل الإدارة وفي انتظار إكمال البيانات من قبل المستأجر لاعتماد المستندات' : 'Preliminarily approved by admin, awaiting tenant to complete data for document approval')
                              : (ar ? 'عقد مسودة - بانتظار رفع المستندات' : 'Draft - pending document upload');
                          return (
                            <>
                              <span className={`text-sm font-semibold ${isApproved ? 'text-blue-700' : 'text-amber-700'}`}>
                                {contractStatusLabel}
                              </span>
                              {approved && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {approved.monthlyRent.toLocaleString()} ر.ع/شهر • {approved.annualRent.toLocaleString()} ر.ع/سنة
                                </div>
                              )}
                              <Link href={`/${locale}/admin/contracts`} className="text-xs text-[#8B6F47] hover:underline block mt-1">
                                {ar ? 'من العقود' : 'From contracts'}
                              </Link>
                            </>
                          );
                        })()}
                      </div>
                    ) : b.type === 'BOOKING' ? (
                      <div className="flex-1 space-y-1">
                        <div
                          className={`inline-flex px-3 py-2 rounded-xl border text-sm font-semibold ${
                            b.status === 'CONFIRMED' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700' : b.status === 'RENTED' ? 'border-blue-200 bg-blue-50/50 text-blue-700' : b.status === 'CANCELLED' ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-amber-200 bg-amber-50/50 text-amber-700'
                          }`}
                        >
                          {ar ? STATUS_LABELS[b.status].ar : STATUS_LABELS[b.status].en}
                        </div>
                        {b.type === 'BOOKING' && b.paymentConfirmed && !b.accountantConfirmedAt && (
                          <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant'}</p>
                        )}
                        {b.status === 'CONFIRMED' && b.accountantConfirmedAt && (
                          <p className="text-xs text-emerald-600 font-medium">{ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed'}</p>
                        )}
                        {b.status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(b.id) && (
                          <p className="text-xs text-amber-600 font-medium">📋 {ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}</p>
                        )}
                        {b.status === 'CANCELLED' && b.cancellationNote && <p className="text-xs text-gray-600 italic">{b.cancellationNote}</p>}
                        {!getContractForBooking(b) && b.status !== 'CANCELLED' && (
                          hasBookingFinancialLinkage(b) ? (
                            hasPendingCancellationRequest(b.id) ? (
                              <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار المحاسبة' : '⏳ Pending accounting'}</p>
                            ) : (
                              <button type="button" onClick={() => { requestBookingCancellation(b.id); setBookings(getBookingsByProperty(parseInt(id, 10))); }} className="text-xs text-red-600 hover:underline font-medium">{ar ? 'إلغاء الحجز' : 'Cancel booking'}</button>
                            )
                          ) : (
                            <button type="button" onClick={() => handleStatusChange(b.id, 'CANCELLED')} className="text-xs text-red-600 hover:underline font-medium">{ar ? 'إلغاء الحجز' : 'Cancel booking'}</button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <select
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#8B6F47]/20"
                        >
                          <option value="PENDING">{ar ? 'قيد الانتظار' : 'Pending'}</option>
                          <option value="CONFIRMED">{ar ? 'قيد انهاء الإجراءات' : 'Procedures in progress'}</option>
                          <option value="RENTED">{ar ? 'مؤجر' : 'Rented'}</option>
                          <option value="SOLD">{ar ? 'مباع' : 'Sold'}</option>
                          <option value="CANCELLED">{ar ? 'ملغى' : 'Cancelled'}</option>
                        </select>
                      </div>
                    )}
                    {b.type === 'BOOKING' && b.status === 'CONFIRMED' && !getContractForBooking(b) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDocumentsPanelBooking(b)}
                          className="relative inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 border border-[#8B6F47]/30"
                        >
                          📄 {ar ? 'المستندات' : 'Documents'}
                          {hasDocumentsNeedingConfirmation(b.id) && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">!</span>
                          )}
                        </button>
                        {canCreateContract(b) && (
                          <Link
                            href={`/${locale}/admin/contracts?createFrom=${b.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47]"
                          >
                            📋 {ar ? 'إنشاء عقد' : 'Create Contract'}
                          </Link>
                        )}
                      </>
                    )}
                    <a
                      href={`https://wa.me/9689115341?text=${encodeURIComponent(ar ? `مرحباً، بخصوص طلب ${b.type === 'BOOKING' ? 'الحجز' : 'المعاينة'} من ${getBookingDisplayName(b, locale)}` : `Hi, regarding ${b.type} request from ${getBookingDisplayName(b, locale)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-emerald-600 bg-emerald-50"
                    >
                      💬 واتساب
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {documentsPanelBooking && (
        <BookingDocumentsPanel
          open={!!documentsPanelBooking}
          onClose={() => setDocumentsPanelBooking(null)}
          booking={documentsPanelBooking}
          propertyId={parseInt(id, 10)}
          locale={locale}
          onCreateContract={() => {
            setDocumentsPanelBooking(null);
            window.location.href = `/${locale}/admin/contracts?createFrom=${documentsPanelBooking.id}`;
          }}
        />
      )}
    </div>
  );
}
