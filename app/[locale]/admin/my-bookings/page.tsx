'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getContactForUser, getContactProfileIssuesForContractApproval, type Contact } from '@/lib/data/addressBook';
import { getContactLinkedBookings } from '@/lib/data/contactLinks';
import { useEffectiveUser } from '@/lib/contexts/ImpersonationContext';
import { getAllBookings, mergeBookingsFromServer, type PropertyBooking } from '@/lib/data/bookings';
import { inferBookingContractStage } from '@/lib/data/bookingContractStage';
import { getContractByBooking, hasContractForUnit } from '@/lib/data/contracts';
import { hasDocumentsNeedingConfirmation, areAllRequiredDocumentsApproved } from '@/lib/data/bookingDocuments';
import { getChecksByBooking, areAllChecksApproved } from '@/lib/data/bookingChecks';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import type { ContactLinkedBooking } from '@/lib/data/contactLinks';
import type { RentalContract } from '@/lib/data/contracts';

/** تسمية مختصرة لحقل ناقص في ملف العميل (للمطالبة بإكمال «حسابي») */
function describeProfileIssues(ar: boolean, issues: string[]): string {
  if (issues.length === 0) return '';
  const map: Record<string, { ar: string; en: string }> = {
    noContactLinked: { ar: 'ربط سجل دفتر العناوين بحسابك', en: 'Link an address-book record to your account' },
    firstName: { ar: 'الاسم الأول', en: 'First name' },
    familyName: { ar: 'اسم العائلة', en: 'Family name' },
    nationality: { ar: 'الجنسية', en: 'Nationality' },
    phone: { ar: 'الهاتف', en: 'Phone' },
    phoneInvalid: { ar: 'هاتف صالح', en: 'Valid phone' },
    email: { ar: 'البريد الإلكتروني', en: 'Email' },
    address: { ar: 'العنوان (عربي أو إنجليزي)', en: 'Address (AR or EN)' },
    civilId: { ar: 'الرقم المدني', en: 'Civil ID' },
    civilIdExpiry: { ar: 'انتهاء الرقم المدني', en: 'Civil ID expiry' },
    civilIdExpiryInvalid: { ar: 'انتهاء الرقم المدني (صالح 30+ يوماً)', en: 'Civil ID expiry (30+ days valid)' },
    passportNumber: { ar: 'رقم الجواز', en: 'Passport number' },
    passportExpiry: { ar: 'انتهاء الجواز', en: 'Passport expiry' },
    passportExpiryInvalid: { ar: 'انتهاء الجواز (صالح 90+ يوماً)', en: 'Passport expiry (90+ days valid)' },
    companyNameAr: { ar: 'اسم الشركة', en: 'Company name' },
    commercialRegistrationNumber: { ar: 'السجل التجاري', en: 'Commercial registration' },
    authorizedRepresentatives: { ar: 'مفوّض بالتوقيع', en: 'Authorized representative' },
  };
  const labels = issues.slice(0, 5).map((k) => {
    if (map[k]) return ar ? map[k].ar : map[k].en;
    if (k.startsWith('rep_')) return ar ? 'بيانات مفوّض' : 'Representative data';
    return k;
  });
  const more = issues.length > 5 ? (ar ? ` +${issues.length - 5}` : ` +${issues.length - 5}`) : '';
  return labels.join(ar ? '، ' : ', ') + more;
}

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
  const paymentOrAccountantConfirmed = !!(fullBooking?.paymentConfirmed || fullBooking?.accountantConfirmedAt);

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
    // تجاوز مشكلة تزامن مستندات localStorage بين الأجهزة:
    // إذا الدفع مؤكد والحجز CONFIRMED ولم نصل لحالة ADMIN_APPROVED/APPROVED على جهاز العميل بعد،
    // نعرض خطوة انتظار توقيع العميل — **بعد** التحقق من توثيق العميل على الخادم (signatureRequests).
    if (c.status === 'DRAFT' && effectiveStatus === 'CONFIRMED' && paymentOrAccountantConfirmed) {
      const inferredBefore = inferBookingContractStage(fullBooking, c.status);
      // إذا اكتمل توثيق المشتري/المستأجر على الخادم، لا نُبقِ «بانتظار المشتري» (يظهر للمالك خطأ)
      if (inferredBefore === 'ADMIN_APPROVED' || inferredBefore === undefined) {
        const actorAr = kind === 'SALE' ? 'المشتري' : kind === 'INVESTMENT' ? 'المستثمر' : 'المستأجر';
        const actorEn = kind === 'SALE' ? 'Buyer' : kind === 'INVESTMENT' ? 'Investor' : 'Tenant';
        return {
          main: ar ? `بانتظار اعتماد ${actorAr}` : `Waiting for ${actorEn} approval`,
          sub: ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed',
        };
      }
    }
    const stage = inferBookingContractStage(fullBooking, c.status);
    if (stage === 'ADMIN_APPROVED' || stage === 'TENANT_APPROVED' || stage === 'LANDLORD_APPROVED') {
      // سيناريو الاعتمادات الموحد: إدارة (مبدئي) → العميل (مستأجر/مشتري/مستثمر) → المالك → إدارة (نهائي)
      const actorAr = kind === 'SALE' ? 'المشتري' : kind === 'INVESTMENT' ? 'المستثمر' : 'المستأجر';
      const actorEn = kind === 'SALE' ? 'Buyer' : kind === 'INVESTMENT' ? 'Investor' : 'Tenant';
      const ownerAr = kind === 'SALE' ? 'المالك (البائع)' : 'المالك';
      const ownerEn = kind === 'SALE' ? 'Seller' : 'Landlord';
      const next =
        stage === 'ADMIN_APPROVED'
          ? ar
            ? `بانتظار اعتماد ${actorAr}`
            : `Waiting for ${actorEn} approval`
          : stage === 'TENANT_APPROVED'
            ? ar
              ? `بانتظار اعتماد ${ownerAr}`
              : `Waiting for ${ownerEn} approval`
            : ar
              ? 'بانتظار الاعتماد النهائي من الإدارة'
              : 'Waiting for final admin approval';
      const subs: string[] = [];
      if (!allDocsAndChecksApproved) {
        subs.push(ar ? 'يرجى إكمال المستندات/الشيكات المطلوبة لاعتمادها' : 'Complete required documents/cheques for approval');
      }
      if (userRole === 'OWNER' && c.status === 'ADMIN_APPROVED') {
        subs.push(ar ? `سيظهر زر اعتماد المالك بعد اعتماد ${actorAr}` : `Owner approval appears after ${actorEn} approval`);
      }
      return { main: next, sub: subs.length > 0 ? subs.join(' · ') : undefined };
    }
    return { main: ar ? 'عقد مسودة — بانتظار رفع المستندات' : 'Draft contract — pending document upload' };
  }

  // لا يوجد عقد في localStorage (العقد قد يكون أنشأه الأدمن على جهاز آخر) — للحجز المؤكد والدفع مؤكد نعرض «عقد مسودة - بانتظار رفع المستندات» وزر إكمال البيانات
  if (!c && (effectiveStatus === 'CONFIRMED' || effectiveStatus === 'PENDING')) {
    const stage = inferBookingContractStage(fullBooking, fullBooking?.contractStage);
    const kindFromBooking = (fullBooking?.contractKind ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
    const paymentOrAccountantConfirmed = !!(fullBooking?.paymentConfirmed || fullBooking?.accountantConfirmedAt);

    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(linked.propertyId, dataOverrides) as { type?: 'RENT' | 'SALE' | 'INVESTMENT' } | null;
    const kindFromProperty = (prop?.type ?? kindFromBooking) as 'RENT' | 'SALE' | 'INVESTMENT';
    const docsApproved = areAllRequiredDocumentsApproved(id) && (getChecksByBooking(id).length === 0 || areAllChecksApproved(id));
    const actorAr = kindFromProperty === 'SALE' ? 'المشتري' : kindFromProperty === 'INVESTMENT' ? 'المستثمر' : 'المستأجر';
    const actorEn = kindFromProperty === 'SALE' ? 'Buyer' : kindFromProperty === 'INVESTMENT' ? 'Investor' : 'Tenant';

    // دفع مؤكد + لا عقد محلي: «بانتظار المشتري» فقط إذا كانت المرحلة على الخادم لا تزال ADMIN_APPROVED أو غير محددة
    // (بعد توثيق المشتري على الخادم stage = TENANT_APPROVED → يُعرض بانتظار المالك للمالك، لا «بانتظار المشتري»).
    if (effectiveStatus === 'CONFIRMED' && paymentOrAccountantConfirmed) {
      if (stage === 'ADMIN_APPROVED' || stage === undefined) {
        const main = ar ? `بانتظار اعتماد ${actorAr}` : `Waiting for ${actorEn} approval`;
        const sub = ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed';
        return { main, sub };
      }
    }

    // إذا كانت مرحلة العقد محفوظة على مستوى الحجز (server/DB) — اعرض السيناريو مباشرة بدون الاعتماد على local contracts أو حالة المستندات المحلية
    if (stage && ['ADMIN_APPROVED', 'TENANT_APPROVED', 'LANDLORD_APPROVED', 'APPROVED'].includes(stage)) {
      const ownerAr = kindFromProperty === 'SALE' ? 'المالك (البائع)' : 'المالك';
      const ownerEn = kindFromProperty === 'SALE' ? 'Seller' : 'Landlord';

      const main =
        stage === 'ADMIN_APPROVED'
          ? ar
            ? `بانتظار اعتماد ${actorAr}`
            : `Waiting for ${actorEn} approval`
          : stage === 'TENANT_APPROVED'
            ? ar
              ? `بانتظار اعتماد ${ownerAr}`
              : `Waiting for ${ownerEn} approval`
            : stage === 'LANDLORD_APPROVED'
              ? ar
                ? 'بانتظار الاعتماد النهائي من الإدارة'
                : 'Waiting for final admin approval'
              : ar
                ? kindFromBooking === 'SALE'
                  ? 'معتمد — عقد بيع نافذ'
                  : kindFromBooking === 'INVESTMENT'
                    ? 'معتمد — عقد استثمار نافذ'
                    : 'مؤجر (عقد نافذ)'
                : kindFromBooking === 'SALE'
                  ? 'Approved — Active sale contract'
                  : kindFromBooking === 'INVESTMENT'
                    ? 'Approved — Active investment contract'
                    : 'Rented (Active contract)';

      const subs: string[] = [];
      if (paymentOrAccountantConfirmed) subs.push(ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed');
      return { main, sub: subs.length ? subs.join(' · ') : undefined };
    }

    const main =
      effectiveStatus === 'CONFIRMED' && paymentOrAccountantConfirmed
        ? docsApproved
          ? ar
            ? `بانتظار اعتماد ${actorAr}`
            : `Waiting for ${actorEn} approval`
          : ar
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
    if (!docsApproved && needsToCompleteContractData(linked, fullBooking)) {
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
  const { data: session, status } = useSession();
  const effectiveUser = useEffectiveUser();
  const t = useTranslations('admin.nav.clientNav');
  const tOwnerNav = useTranslations('admin.nav.ownerNav');

  const user = (effectiveUser
    ? { id: effectiveUser.id, email: effectiveUser.email, phone: effectiveUser.phone }
    : session?.user) as { id?: string; email?: string; phone?: string } | undefined;
  const userRole =
    (effectiveUser as { role?: string } | undefined)?.role ||
    (session?.user as { role?: string } | undefined)?.role;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;
  const contactForProfile =
    contact && typeof contact === 'object' && 'id' in contact && (contact as Contact).id ? (contact as Contact) : null;
  const profileIssues = contactForProfile ? getContactProfileIssuesForContractApproval(contactForProfile) : ['noContactLinked'];
  const profileComplete = profileIssues.length === 0;

  const [dataVersion, setDataVersion] = useState(0);
  const [serverBookings, setServerBookings] = useState<PropertyBooking[]>([]);
  useEffect(() => {
    let alive = true;
    const run = async (attempt: number) => {
      try {
        const r = await fetch('/api/bookings', { cache: 'no-store', credentials: 'include' });
        const data = r.ok ? ((await r.json()) as PropertyBooking[]) : [];
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setServerBookings(data);
          mergeBookingsFromServer(data);
          setDataVersion((v) => v + 1);
          return;
        }
      } catch {
        // ignore
      }
      if (!alive) return;
      if (attempt >= 3) return;
      const delay = attempt === 0 ? 800 : attempt === 1 ? 1800 : 3200;
      window.setTimeout(() => void run(attempt + 1), delay);
    };
    void run(0);
    const iv = window.setInterval(() => {
      void run(0);
    }, 5000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [status]);

  const localBookings = contact && typeof window !== 'undefined' ? getContactLinkedBookings(contact as Parameters<typeof getContactLinkedBookings>[0]) : [];
  const allBookings = typeof window !== 'undefined' ? (serverBookings.length > 0 ? serverBookings : getAllBookings()) : [];

  // ربط serverBookings بالحجوزات المحلية عبر bookingId فقط لتفادي اختلاف البريد/الهاتف بين الأجهزة
  const localBookingIdSet = new Set(localBookings.map((b) => b.id));
  const serverBookingsForContact: ContactLinkedBooking[] =
    serverBookings.length > 0
      ? (() => {
          const fromServer =
            userRole === 'OWNER'
              ? serverBookings
              : contact
                ? serverBookings.filter((b) => localBookingIdSet.has(String(b.id)))
                : [];
          return fromServer.map(
            (b): ContactLinkedBooking => ({
              id: String(b.id),
              bookingId: String(b.id),
              date: String(b.createdAt || ''),
              propertyId: Number(b.propertyId),
              propertyTitleAr: String((b as PropertyBooking).propertyTitleAr || ''),
              propertyTitleEn: String((b as PropertyBooking).propertyTitleEn || ''),
              unitKey: (b as PropertyBooking).unitKey ? String((b as PropertyBooking).unitKey) : undefined,
              unitDisplay: (b as PropertyBooking & { unitDisplay?: string }).unitDisplay
              ? String((b as PropertyBooking & { unitDisplay?: string }).unitDisplay)
              : undefined,
              status: b.status,
              contractId: b.contractId ? String(b.contractId) : undefined,
              hasFinancialClaims: false,
              cardLast4: b.cardLast4,
              cardExpiry: b.cardExpiry,
              cardholderName: b.cardholderName,
            })
          );
        })()
      : [];

  const bookings: ContactLinkedBooking[] = serverBookingsForContact.length > 0 ? serverBookingsForContact : localBookings;

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={userRole === 'OWNER' ? tOwnerNav('myBookings') : t('myBookings')}
        subtitle={
          locale === 'ar'
            ? userRole === 'OWNER'
              ? 'الحجوزات وطلبات توثيق العقود المرتبطة بك كمالك'
              : 'الحجوزات المرتبطة بحسابك'
            : userRole === 'OWNER'
              ? 'Bookings and contract verification linked to you as owner'
              : 'Bookings linked to your account'
        }
      />
      {!profileComplete && (userRole === 'CLIENT' || userRole === 'OWNER') ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <p className="font-semibold m-0 mb-1">
            {locale === 'ar' ? 'اكتمل ملفك في «حسابي» قبل اعتماد أو توقيع العقد' : 'Complete your profile in My Account before approving or signing'}
          </p>
          <p className="m-0 opacity-90 mb-2">
            {locale === 'ar' ? 'ناقص أو يحتاج تحديث:' : 'Missing or needs update:'}{' '}
            {describeProfileIssues(locale === 'ar', profileIssues)}
          </p>
          <Link
            href={`/${locale}/admin/my-account`}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 transition-colors no-underline"
          >
            {locale === 'ar' ? 'الانتقال إلى حسابي' : 'Go to My Account'}
          </Link>
        </div>
      ) : null}
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
                  const bookingStage = full?.contractStage;
                  const isSuccess =
                    effectiveStatus === 'CONFIRMED' || effectiveStatus === 'RENTED' || effectiveStatus === 'SOLD';
                  const isWarning =
                    effectiveStatus === 'CONFIRMED' && !bookingStage && (hasDocumentsNeedingConfirmation(b.id) || !!sub);
                  const hasContractId = !!(full?.contractId || (b as any)?.contractId);
                  const needComplete = bookingStage || hasContractId ? false : needsToCompleteContractData(b, full);
                  const contractTermsUrl = `/${locale}/properties/${b.propertyId}/contract-terms?bookingId=${b.id}${full?.email ? `&email=${encodeURIComponent(full.email)}` : ''}${full?.phone ? `&phone=${encodeURIComponent(full.phone || '')}` : ''}`;
                  const contractReviewUrl = `/${locale}/admin/contract-review?bookingId=${b.id}`;
                  const c = getContractByBooking(b.id) as RentalContract | undefined;
                  const dataOverridesRow = getPropertyDataOverrides();
                  const propRow = getPropertyById(b.propertyId, dataOverridesRow) as { type?: 'RENT' | 'SALE' | 'INVESTMENT' } | null;
                  const kind = (c?.propertyContractKind ??
                    full?.contractKind ??
                    propRow?.type ??
                    'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
                  /** مرحلة العقد على الخادم أولاً؛ إن وُجدت لا نعتمد على حالة المسودة المحلية (قد تكون قديمة). */
                  const stageFromServer = full?.contractStage;
                  const statusFromLocal = c?.status;
                  const sigReqs: any[] = Array.isArray((full as any)?.signatureRequests)
                    ? ((full as any).signatureRequests as any[])
                    : Array.isArray((b as any)?.signatureRequests)
                      ? ((b as any).signatureRequests as any[])
                      : [];
                  const hasPendingOrFailedClientSignature = sigReqs.some(
                    (r) => String(r?.actorRole) === 'CLIENT' && ['PENDING', 'FAILED'].includes(String(r?.status || ''))
                  );
                  const paymentOrAccountantConfirmedRow = !!(
                    full?.paymentConfirmed ||
                    full?.accountantConfirmedAt ||
                    (b as any).paymentConfirmed ||
                    (b as any).accountantConfirmedAt
                  );
                  // زر اعتماد العميل/المشتري:
                  // - الحالة القياسية: ADMIN_APPROVED
                  // - fallback: إذا يوجد contractId والدفع مؤكد لكن contractStage لم يصل بعد من الخادم (تزامن بطيء/كاش)
                  const showClientApprove =
                    userRole !== 'OWNER' &&
                    (stageFromServer != null
                      ? stageFromServer === 'ADMIN_APPROVED' || (stageFromServer === 'TENANT_APPROVED' && hasPendingOrFailedClientSignature)
                      : statusFromLocal === 'ADMIN_APPROVED' ||
                        (!!hasContractId && paymentOrAccountantConfirmedRow && effectiveStatus === 'CONFIRMED'));
                  const bookingForStage = (full ?? (b as unknown as PropertyBooking)) as PropertyBooking | undefined;
                  const effectiveStageForActions = inferBookingContractStage(
                    bookingForStage,
                    bookingForStage?.contractStage || statusFromLocal
                  );
                  const ownerSignaturePending = sigReqs.some((r) =>
                    String(r?.actorRole) === 'OWNER' && ['PENDING', 'FAILED'].includes(String(r?.status || ''))
                  );
                  const showOwnerApprove =
                    userRole === 'OWNER' &&
                    (effectiveStageForActions === 'TENANT_APPROVED' ||
                      ownerSignaturePending ||
                      (stageFromServer == null && statusFromLocal === 'TENANT_APPROVED'));
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
                              href={(() => {
                                return paymentOrAccountantConfirmedRow ? contractReviewUrl : contractTermsUrl;
                              })()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors"
                            >
                              {(() => {
                                const dataOverrides = getPropertyDataOverrides();
                                const prop = getPropertyById(b.propertyId, dataOverrides) as { type?: 'RENT' | 'SALE' | 'INVESTMENT' } | null;
                                const kind = (prop?.type ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
                                const actorAr = kind === 'SALE' ? 'المشتري' : kind === 'INVESTMENT' ? 'المستثمر' : 'المستأجر';
                                const actorEn = kind === 'SALE' ? 'Buyer' : kind === 'INVESTMENT' ? 'Investor' : 'Tenant';
                                const docsApproved =
                                  areAllRequiredDocumentsApproved(b.id) &&
                                  (getChecksByBooking(b.id).length === 0 || areAllChecksApproved(b.id));
                                const hasContractId = !!full?.contractId;
                                if (paymentOrAccountantConfirmedRow) return locale === 'ar' ? `مراجعة واعتماد (${actorAr})` : `Review & approve (${actorEn})`;
                                if (!docsApproved && !hasContractId) return locale === 'ar' ? 'إكمال البيانات' : 'Complete data';
                                return locale === 'ar' ? `مراجعة واعتماد (${actorAr})` : `Review & approve (${actorEn})`;
                              })()}
                            </Link>
                          )}
                          {(showClientApprove || showOwnerApprove) && profileComplete && (
                            <Link
                              href={contractReviewUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              {showClientApprove
                                ? kind === 'SALE'
                                  ? ar
                                    ? 'مراجعة واعتماد (المشتري)'
                                    : 'Review & approve (Buyer)'
                                  : kind === 'INVESTMENT'
                                    ? ar
                                      ? 'مراجعة واعتماد (المستثمر)'
                                      : 'Review & approve (Investor)'
                                    : ar
                                      ? 'مراجعة واعتماد (المستأجر)'
                                      : 'Review & approve (Tenant)'
                                : ownerSignaturePending
                                  ? ar
                                    ? 'توقيع وتوثيق العقد'
                                    : 'Sign & verify contract'
                                  : kind === 'SALE'
                                    ? ar
                                      ? 'اعتماد (المالك/البائع)'
                                      : 'Approve (Seller)'
                                    : ar
                                      ? 'اعتماد (المالك)'
                                      : 'Approve (Landlord)'}
                            </Link>
                          )}
                          {(showClientApprove || showOwnerApprove) && !profileComplete && (
                            <Link
                              href={`/${locale}/admin/my-account`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition-colors"
                            >
                              {ar ? 'أكمل البيانات في حسابي أولاً' : 'Complete profile in My Account first'}
                            </Link>
                          )}
                          {!needComplete && !(showClientApprove || showOwnerApprove) && <span className="text-gray-400 text-sm">—</span>}
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
