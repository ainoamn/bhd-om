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

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  CONFIRMED: { ar: 'قيد انهاء الإجراءات', en: 'Procedures in progress' },
  RENTED: { ar: 'مؤجر', en: 'Rented' },
  SOLD: { ar: 'مباع', en: 'Sold' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

/** نفس منطق عرض الحالة المستخدم في /admin/bookings ليعرف العميل أين معاملته */
function getBookingStatusDisplay(
  linked: ContactLinkedBooking,
  fullBooking: PropertyBooking | undefined,
  ar: boolean
): { main: string; sub?: string } {
  const id = linked.id;
  const status = linked.status;
  if (status === 'CANCELLED') {
    return { main: ar ? STATUS_LABELS.CANCELLED.ar : STATUS_LABELS.CANCELLED.en };
  }
  if (status === 'RENTED') return { main: ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)' };
  if (status === 'SOLD') return { main: ar ? STATUS_LABELS.SOLD.ar : STATUS_LABELS.SOLD.en };

  const hasContract = hasContractForUnit(linked.propertyId, linked.unitKey);
  const c = getContractByBooking(id);

  if (hasContract && c) {
    const allDocsAndChecksApproved =
      areAllRequiredDocumentsApproved(id) && (getChecksByBooking(id).length === 0 || areAllChecksApproved(id));
    if (c.status === 'APPROVED') {
      return { main: ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)' };
    }
    if (c.status === 'ADMIN_APPROVED' || c.status === 'TENANT_APPROVED' || c.status === 'LANDLORD_APPROVED') {
      return {
        main: allDocsAndChecksApproved
          ? ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval'
          : ar ? 'تم اعتماده مبدئياً — يرجى إكمال البيانات ورفع المستندات لاعتمادها' : 'Preliminarily approved — complete data and upload documents for approval',
      };
    }
    return { main: ar ? 'عقد مسودة — بانتظار رفع المستندات' : 'Draft contract — pending document upload' };
  }

  if (!c && (status === 'CONFIRMED' || status === 'PENDING')) {
    const main = ar ? STATUS_LABELS[status]?.ar ?? status : STATUS_LABELS[status]?.en ?? status;
    const subs: string[] = [];
    if (fullBooking?.paymentConfirmed && !fullBooking?.accountantConfirmedAt) {
      subs.push(ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant confirmation');
    } else if (fullBooking?.accountantConfirmedAt && status === 'CONFIRMED') {
      subs.push(ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed');
    }
    if (status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(id)) {
      subs.push(ar ? '📋 مطلوب اعتماد المستندات' : '📋 Documents need approval');
    }
    return { main, sub: subs.length > 0 ? subs.join(' · ') : undefined };
  }

  return { main: ar ? STATUS_LABELS[status]?.ar ?? status : STATUS_LABELS[status]?.en ?? status };
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
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const full = allBookings.find((x) => x.id === b.id);
                  const { main, sub } = getBookingStatusDisplay(b, full, ar);
                  const isSuccess = b.status === 'CONFIRMED' || b.status === 'RENTED' || b.status === 'SOLD';
                  const isWarning = b.status === 'CONFIRMED' && (hasDocumentsNeedingConfirmation(b.id) || !!sub);
                  return (
                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.unitDisplay || b.propertyTitleAr}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(b.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex w-fit admin-badge ${b.status === 'CANCELLED' ? 'admin-badge-secondary' : isSuccess ? 'admin-badge-success' : isWarning ? 'bg-amber-50 text-amber-800 border-amber-200' : 'admin-badge-info'}`}
                          >
                            {main}
                          </span>
                          {sub && <span className="text-xs text-amber-700">{sub}</span>}
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
