'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedBookings } from '@/lib/data/contactLinks';
import { useEffectiveUser } from '@/lib/contexts/ImpersonationContext';
import { getAllBookings, mergeBookingsFromServer, type PropertyBooking } from '@/lib/data/bookings';
import { getContractByBooking, hasContractForUnit } from '@/lib/data/contracts';
import { hasDocumentsNeedingConfirmation, areAllRequiredDocumentsApproved } from '@/lib/data/bookingDocuments';
import { getChecksByBooking, areAllChecksApproved } from '@/lib/data/bookingChecks';
import type { ContactLinkedBooking } from '@/lib/data/contactLinks';
import type { RentalContract } from '@/lib/data/contracts';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  CONFIRMED: { ar: 'قيد انهاء الإجراءات', en: 'Procedures in progress' },
  RENTED: { ar: 'مؤجر', en: 'Rented' },
  SOLD: { ar: 'مباع', en: 'Sold' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

/** هل الحجز يحتاج من العميل إكمال بيانات العقد والمستندات (كما يظهر في صفحة الحجز للإدارة). يُعتبر الحجز بحاجة لإكمال البيانات عندما: يوجد عقد مسودة، أو الحجز مؤكد والدفع مؤكد (العقد قد يكون من جهة الإدارة ولا يظهر في localStorage للعميل). */
function needsToCompleteContractData(
  linked: ContactLinkedBooking,
  fullBooking: PropertyBooking | undefined
): boolean {
  const id = linked.id;
  const effectiveStatus = fullBooking?.status ?? linked.status;
  if (effectiveStatus === 'CANCELLED' || effectiveStatus === 'RENTED' || effectiveStatus === 'SOLD') return false;
  const hasContract = hasContractForUnit(linked.propertyId, linked.unitKey);
  const c = getContractByBooking(id);
  if (hasContract && c && c.status === 'APPROVED') return false;
  const docsNeedConfirmation = hasDocumentsNeedingConfirmation(id);
  const allDocsApproved = areAllRequiredDocumentsApproved(id);
  const checks = getChecksByBooking(id);
  const allChecksApproved = checks.length === 0 || areAllChecksApproved(id);
  if (effectiveStatus === 'CONFIRMED' && (docsNeedConfirmation || !allDocsApproved || !allChecksApproved)) return true;
  if (hasContract && c && c.status !== 'APPROVED' && (!allDocsApproved || !allChecksApproved)) return true;
  // حجز مؤكد + دفع مؤكد: الإدارة قد أنشأت عقداً مسودة (لا يظهر للعميل في localStorage) — نعرض له زر إكمال البيانات
  if (effectiveStatus === 'CONFIRMED' && (fullBooking?.paymentConfirmed || fullBooking?.accountantConfirmedAt)) return true;
  return false;
}

/** نفس منطق عرض الحالة المستخدم في /admin/bookings ليعرف العميل أين معاملته */
function getBookingStatusDisplay(
  linked: ContactLinkedBooking,
  fullBooking: PropertyBooking | undefined,
  ar: boolean,
  userRole?: string
): { main: string; sub?: string } {
  const id = linked.id;
  // نستخدم حالة الحجز الكاملة من التخزين الموحد إن وُجدت، وإلا من الربط
  const effectiveStatus = fullBooking?.status ?? linked.status;

  if (effectiveStatus === 'CANCELLED') {
    return { main: ar ? STATUS_LABELS.CANCELLED.ar : STATUS_LABELS.CANCELLED.en };
  }
  if (effectiveStatus === 'RENTED') return { main: ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)' };
  if (effectiveStatus === 'SOLD') return { main: ar ? STATUS_LABELS.SOLD.ar : STATUS_LABELS.SOLD.en };

  const hasContract = hasContractForUnit(linked.propertyId, linked.unitKey);
  const c = getContractByBooking(id);

  if (hasContract && c) {
    const kind = (c.propertyContractKind ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
    const allDocsAndChecksApproved =
      areAllRequiredDocumentsApproved(id) && (getChecksByBooking(id).length === 0 || areAllChecksApproved(id));
    if (c.status === 'APPROVED') {
      if (kind === 'SALE') return { main: ar ? 'معتمد — عقد بيع نافذ' : 'Approved — Active sale contract' };
      if (kind === 'INVESTMENT') return { main: ar ? 'معتمد — عقد استثمار نافذ' : 'Approved — Active investment contract' };
      return { main: ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)' };
    }
    if (c.status === 'ADMIN_APPROVED' || c.status === 'TENANT_APPROVED' || c.status === 'LANDLORD_APPROVED') {
      // سيناريو الاعتمادات: إدارة (مبدئي) → مشتري/مستأجر → مالك/بائع → إدارة (نهائي)
      if (kind === 'SALE') {
        const next =
          c.status === 'ADMIN_APPROVED'
            ? ar
              ? 'بانتظار اعتماد المشتري'
              : 'Waiting for buyer approval'
            : c.status === 'TENANT_APPROVED'
              ? ar
                ? 'بانتظار اعتماد المالك (البائع)'
                : 'Waiting for seller approval'
              : ar
                ? 'بانتظار الاعتماد النهائي من الإدارة'
                : 'Waiting for final admin approval';
        const subs: string[] = [];
        if (!allDocsAndChecksApproved) subs.push(ar ? 'يرجى إكمال المستندات/الشيكات المطلوبة لاعتمادها' : 'Complete required documents/cheques for approval');
        if (userRole === 'OWNER' && c.status === 'ADMIN_APPROVED') subs.push(ar ? 'سيظهر زر اعتماد المالك بعد اعتماد المشتري' : 'Seller approval appears after buyer approval');
        return { main: next, sub: subs.length > 0 ? subs.join(' · ') : undefined };
      }
      if (kind === 'INVESTMENT') {
        const next =
          c.status === 'ADMIN_APPROVED'
            ? ar
              ? 'بانتظار اعتماد المستثمر'
              : 'Waiting for investor approval'
            : c.status === 'TENANT_APPROVED'
              ? ar
                ? 'بانتظار اعتماد المالك'
                : 'Waiting for landlord approval'
              : ar
                ? 'بانتظار الاعتماد النهائي من الإدارة'
                : 'Waiting for final admin approval';
        return { main: next };
      }
      // RENT
      return {
        main: allDocsAndChecksApproved
          ? ar
            ? 'في انتظار الاعتماد النهائي للعقد'
            : 'Awaiting final contract approval'
          : ar
            ? 'تم اعتماده مبدئياً — يرجى إكمال البيانات ورفع المستندات لاعتمادها'
            : 'Preliminarily approved — complete data and upload documents for approval',
      };
    }
    return { main: ar ? 'عقد مسودة — بانتظار رفع المستندات' : 'Draft contract — pending document upload' };
  }

  // لا يوجد عقد في localStorage (العقد قد يكون أنشأه الأدمن على جهاز آخر) — للحجز المؤكد والدفع مؤكد نعرض «عقد مسودة - بانتظار رفع المستندات» وزر إكمال البيانات
  if (!c && (effectiveStatus === 'CONFIRMED' || effectiveStatus === 'PENDING')) {
    const paymentOrAccountantConfirmed = !!(fullBooking?.paymentConfirmed || fullBooking?.accountantConfirmedAt);
    const main =
      effectiveStatus === 'CONFIRMED' && paymentOrAccountantConfirmed
        ? ar
          ? 'عقد مسودة — بانتظار رفع المستندات'
          : 'Draft contract — pending document upload'
        : ar
          ? STATUS_LABELS[effectiveStatus]?.ar ?? effectiveStatus
          : STATUS_LABELS[effectiveStatus]?.en ?? effectiveStatus;
    const subs: string[] = [];
    if (fullBooking?.paymentConfirmed && !fullBooking?.accountantConfirmedAt) {
      subs.push(ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant confirmation');
    } else if (paymentOrAccountantConfirmed && effectiveStatus === 'CONFIRMED') {
      subs.push(ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed');
    }
    if (effectiveStatus === 'CONFIRMED' && hasDocumentsNeedingConfirmation(id)) {
      subs.push(ar ? '📋 مطلوب اعتماد المستندات' : '📋 Documents need approval');
    }
    if (needsToCompleteContractData(linked, fullBooking)) {
      subs.push(ar ? 'بحاجة إلى إكمال بيانات العقد والمستندات' : 'Need to complete contract data and documents');
    }
    return { main, sub: subs.length > 0 ? subs.join(' · ') : undefined };
  }

  return {
    main: ar
      ? STATUS_LABELS[effectiveStatus]?.ar ?? effectiveStatus
      : STATUS_LABELS[effectiveStatus]?.en ?? effectiveStatus,
  };
}

export default function MyBookingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const effectiveUser = useEffectiveUser();
  const t = useTranslations('admin.nav.clientNav');

  const user = (effectiveUser
    ? { id: effectiveUser.id, email: effectiveUser.email, phone: effectiveUser.phone }
    : session?.user) as { id?: string; email?: string; phone?: string } | undefined;
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;

  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    fetch('/api/bookings', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PropertyBooking[]) => {
        if (Array.isArray(data) && data.length > 0) {
          mergeBookingsFromServer(data);
          setDataVersion((v) => v + 1);
        }
      })
      .catch(() => {});
  }, []);

  const bookings = contact && typeof window !== 'undefined' ? getContactLinkedBookings(contact as Parameters<typeof getContactLinkedBookings>[0]) : [];
  const allBookings = typeof window !== 'undefined' ? getAllBookings() : [];

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('myBookings')} subtitle={locale === 'ar' ? 'الحجوزات المرتبطة بحسابك' : 'Bookings linked to your account'} />
      <div className="admin-card overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'لا توجد حجوزات' : 'No bookings'}</p>
            <Link href={`/${locale}/properties`} className="inline-block mt-4 text-[#8B6F47] font-medium hover:underline">
              {locale === 'ar' ? 'تصفح العقارات' : 'Browse properties'}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'العقار' : 'Property'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const full = allBookings.find((x) => x.id === b.id);
                  const { main, sub } = getBookingStatusDisplay(b, full, ar, userRole);
                  const effectiveStatus = full?.status ?? b.status;
                  const isSuccess =
                    effectiveStatus === 'CONFIRMED' || effectiveStatus === 'RENTED' || effectiveStatus === 'SOLD';
                  const isWarning =
                    effectiveStatus === 'CONFIRMED' && (hasDocumentsNeedingConfirmation(b.id) || !!sub);
                  const needComplete = needsToCompleteContractData(b, full);
                  const contractTermsUrl = `/${locale}/properties/${b.propertyId}/contract-terms?bookingId=${b.id}${full?.email ? `&email=${encodeURIComponent(full.email)}` : ''}${full?.phone ? `&phone=${encodeURIComponent(full.phone || '')}` : ''}`;
                  const c = getContractByBooking(b.id) as RentalContract | undefined;
                  const kind = (c?.propertyContractKind ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
                  const reviewContractUrl = c?.id ? `/${locale}/admin/contracts/${c.id}` : null;
                  const showBuyerApprove = !!c && kind === 'SALE' && c.status === 'ADMIN_APPROVED' && userRole !== 'OWNER';
                  const showSellerApprove = !!c && kind === 'SALE' && c.status === 'TENANT_APPROVED' && userRole === 'OWNER';
                  return (
                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.unitDisplay || b.propertyTitleAr}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(b.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex w-fit admin-badge ${
                              effectiveStatus === 'CANCELLED'
                                ? 'admin-badge-secondary'
                                : isSuccess
                                  ? 'admin-badge-success'
                                  : isWarning
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'admin-badge-info'
                            }`}
                          >
                            {main}
                          </span>
                          {sub && <span className="text-xs text-amber-700">{sub}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {needComplete && (
                            <Link
                              href={contractTermsUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors"
                            >
                              {locale === 'ar' ? 'إكمال البيانات' : 'Complete data'}
                            </Link>
                          )}
                          {(showBuyerApprove || showSellerApprove) && reviewContractUrl && (
                            <Link
                              href={reviewContractUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              {showBuyerApprove ? (ar ? 'مراجعة واعتماد (المشتري)' : 'Review & approve (Buyer)') : (ar ? 'اعتماد (المالك)' : 'Approve (Seller)')}
                            </Link>
                          )}
                          {!needComplete && !(showBuyerApprove || showSellerApprove) && <span className="text-gray-400 text-sm">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
