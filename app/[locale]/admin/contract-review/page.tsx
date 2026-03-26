'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getPropertyById, getPropertyDataOverrides, type Property } from '@/lib/data/properties';
import type { PropertyBooking } from '@/lib/data/bookings';
import type { CheckInfo, ContractApprovalActor, RentalContract } from '@/lib/data/contracts';
import { getContractByBooking, getContractById } from '@/lib/data/contracts';

type ContractKind = 'RENT' | 'SALE' | 'INVESTMENT';
type ContractStage = NonNullable<PropertyBooking['contractStage']>;

function stageLabel(ar: boolean, stage?: ContractStage, kind: ContractKind = 'RENT') {
  if (!stage) return ar ? 'غير محدد' : 'Unknown';
  if (stage === 'DRAFT') return ar ? 'مسودة' : 'Draft';
  if (stage === 'ADMIN_APPROVED') return ar ? 'معتمد مبدئياً من الإدارة' : 'Admin prelim approved';
  if (stage === 'TENANT_APPROVED') {
    if (kind === 'SALE') return ar ? 'معتمد من المشتري' : 'Buyer approved';
    if (kind === 'INVESTMENT') return ar ? 'معتمد من المستثمر' : 'Investor approved';
    return ar ? 'معتمد من المستأجر' : 'Tenant approved';
  }
  if (stage === 'LANDLORD_APPROVED') {
    if (kind === 'SALE') return ar ? 'معتمد من البائع (المالك)' : 'Seller (owner) approved';
    return ar ? 'معتمد من المالك' : 'Owner approved';
  }
  if (stage === 'APPROVED') return ar ? 'معتمد نهائياً' : 'Final approved';
  if (stage === 'CANCELLED') return ar ? 'ملغي' : 'Cancelled';
  return stage;
}

function actorLabel(ar: boolean, kind: ContractKind) {
  if (kind === 'SALE') return ar ? 'المشتري' : 'Buyer';
  if (kind === 'INVESTMENT') return ar ? 'المستثمر' : 'Investor';
  return ar ? 'المستأجر' : 'Tenant';
}

function ownerLabel(ar: boolean, kind: ContractKind) {
  if (kind === 'SALE') return ar ? 'المالك (البائع)' : 'Seller';
  return ar ? 'المالك' : 'Landlord';
}

function payerLabel(ar: boolean, p?: string) {
  if (p === 'seller') return ar ? 'البائع' : 'Seller';
  if (p === 'buyer') return ar ? 'المشتري' : 'Buyer';
  return p || '—';
}

function omr(ar: boolean, n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${ar ? 'ر.ع' : 'OMR'}`;
}

function str(v?: string | number | null) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  return s;
}

function formatIsoLocal(iso: string, ar: boolean) {
  try {
    return new Date(iso).toLocaleString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function sessionToContractActor(session: {
  user?: { name?: string | null; serialNumber?: string | null };
} | null | undefined): ContractApprovalActor | undefined {
  const u = session?.user;
  if (!u) return undefined;
  const name = (u.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || '';
  const serial = (u.serialNumber || '').trim() || undefined;
  if (!firstName && !lastName && !serial) return undefined;
  return { firstName, lastName, serial };
}

function actorDisplayLine(ar: boolean, first?: string, last?: string, serial?: string): string | null {
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  if (!fullName && !serial) return null;
  const bits: string[] = [];
  if (fullName) bits.push(ar ? `${fullName}` : fullName);
  if (serial) bits.push(ar ? `رقم النظام: ${serial}` : `Serial: ${serial}`);
  return bits.join(ar ? ' — ' : ' — ');
}

function salePercentAmount(base: number, pct: number | null | undefined): number | null {
  if (pct == null || Number.isNaN(Number(pct))) return null;
  return Math.round(base * (Number(pct) / 100) * 1000) / 1000;
}

function hasRentAccountFields(c: Partial<RentalContract> | null | undefined): boolean {
  if (!c) return false;
  return [
    c.rentChecksOwnerType,
    c.rentChecksOwnerName,
    c.rentChecksOwnerCivilId,
    c.rentChecksOwnerPhone,
    c.rentChecksCompanyName,
    c.rentChecksCompanyRegNumber,
    c.rentChecksAuthorizedRep,
    c.rentChecksBankName,
    c.rentChecksBankBranch,
    c.rentChecksBankAccountId,
  ].some((x) => str(x));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 border-b border-stone-100/90 px-3 py-2.5 last:border-b-0 transition-colors hover:bg-white/90 sm:grid-cols-[minmax(9rem,13rem)_1fr] sm:gap-4 sm:px-4 sm:py-3 md:grid-cols-[minmax(10rem,14rem)_1fr]">
      <span className="min-w-0 text-sm font-medium leading-snug text-stone-500">{label}</span>
      <div className="min-w-0 break-words text-base font-semibold leading-relaxed text-stone-900">{value}</div>
    </div>
  );
}

/** حقول العقار من بيانات الموقع (العنوان، المكان، القطعة، …) */
function PropertyDetailFields({ property, ar }: { property: Property; ar: boolean }) {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (labelAr: string, labelEn: string, val: unknown) => {
    if (val === undefined || val === null || val === '') return;
    if (typeof val === 'object') return;
    const s = String(val).trim();
    if (!s) return;
    rows.push({ label: ar ? labelAr : labelEn, value: s });
  };
  push('الرقم المتسلسل للعقار', 'Property serial', property.serialNumber);
  push('العنوان (عربي)', 'Title (AR)', property.titleAr);
  push('العنوان (إنجليزي)', 'Title (EN)', property.titleEn);
  push('الموقع (عربي)', 'Location (AR)', property.locationAr);
  push('الموقع (إنجليزي)', 'Location (EN)', property.locationEn);
  push('المحافظة', 'Governorate', ar ? property.governorateAr : property.governorateEn);
  push('الولاية / المنطقة', 'State / area', ar ? property.stateAr : property.stateEn);
  push('القرية / المكان', 'Village', ar ? property.villageAr : property.villageEn);
  push('المنطقة التفصيلية', 'Detailed area', ar ? property.areaAr : property.areaEn);
  push('نوع العقار', 'Property type', ar ? property.propertyTypeAr : property.propertyTypeEn);
  push('النوع الفرعي', 'Sub-type', ar ? property.propertySubTypeAr : property.propertySubTypeEn);
  push('رقم القطعة', 'Land parcel no.', property.landParcelNumber);
  push('رقم العقار', 'Property no.', property.propertyNumber);
  push('الرسم المساحي (الكروركي)', 'Survey map no.', property.surveyMapNumber);
  push('رقم المجمع', 'Complex no.', property.complexNumber);
  push('السكة / الزقاق', 'Street / alley', property.streetAlleyNumber);
  push('نوع استعمال الأرض', 'Land use', property.landUseType);
  push('المساحة (م²)', 'Area (m²)', property.area != null ? String(property.area) : '');
  push('السعر المعروض', 'Listed price', property.price != null ? String(property.price) : '');
  push('غرف النوم', 'Bedrooms', property.bedrooms != null ? String(property.bedrooms) : '');
  push('دورات المياه', 'Bathrooms', property.bathrooms != null ? String(property.bathrooms) : '');
  push('المجالس', 'Majlis', property.majlis != null ? String(property.majlis) : '');
  push('غرف المعيشة', 'Living rooms', property.livingRooms != null ? String(property.livingRooms) : '');
  push('مواقف السيارات', 'Parking', property.parkingSpaces != null ? String(property.parkingSpaces) : '');
  push('رقم عداد الكهرباء', 'Electricity meter', property.electricityMeterNumber);
  push('رقم عداد الماء', 'Water meter', property.waterMeterNumber);
  push('هاتف المبنى', 'Building phone', property.buildingPhoneNumber);
  push('رقم إدارة المبنى', 'Building management no.', property.buildingManagementNumber);
  push('اسم المسؤول (إدارة المبنى)', 'Building manager', property.responsiblePersonName);
  push('رقم الصيانة', 'Maintenance no.', property.maintenanceNumber);
  push('المسؤول عن الصيانة', 'Maintenance contact', property.maintenanceResponsibleName);
  const desc = (ar ? property.descriptionAr : property.descriptionEn) || '';
  if (rows.length === 0 && !String(desc).trim()) return null;
  return (
    <>
      {rows.map((row, i) => (
        <Field key={`${row.label}-${i}`} label={row.label} value={row.value} />
      ))}
      {String(desc).trim() ? (
        <Field
          label={ar ? 'الوصف' : 'Description'}
          value={<span className="whitespace-pre-wrap font-normal">{String(desc).trim()}</span>}
        />
      ) : null}
    </>
  );
}

function Section({ title, children, step }: { title: string; children: React.ReactNode; step?: number }) {
  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_4px_28px_-14px_rgba(107,85,53,0.22)] overflow-hidden ring-1 ring-stone-900/[0.03]">
      <header className="flex items-center gap-3 px-5 py-4 bg-gradient-to-l from-[#8B6F47]/[0.09] via-[#C9A961]/[0.04] to-transparent border-b border-stone-100">
        {step != null ? (
          <span className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl bg-gradient-to-br from-[#8B6F47] to-[#6B5535] px-2 text-sm font-bold text-white shadow-md">
            {step}
          </span>
        ) : (
          <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#8B6F47]" aria-hidden />
        )}
        <h2 className="text-base font-bold leading-snug tracking-tight text-stone-800 sm:text-lg">{title}</h2>
      </header>
      <div className="min-w-0 p-3 sm:p-4">
        <div className="overflow-hidden rounded-xl border border-stone-100 bg-stone-50/60">{children}</div>
      </div>
    </section>
  );
}

function KindBadge({ kind, ar }: { kind: ContractKind; ar: boolean }) {
  const map: Record<ContractKind, { ar: string; en: string }> = {
    SALE: { ar: 'عقد بيع', en: 'Sale' },
    INVESTMENT: { ar: 'عقد استثمار', en: 'Investment' },
    RENT: { ar: 'عقد إيجار', en: 'Rental' },
  };
  return (
    <span className="inline-flex items-center rounded-full border border-[#8B6F47]/30 bg-[#8B6F47]/10 px-3 py-1 text-xs font-bold text-[#5c4a32]">
      {ar ? map[kind].ar : map[kind].en}
    </span>
  );
}

function StageBadge({ stage, ar, kind }: { stage?: ContractStage; ar: boolean; kind: ContractKind }) {
  const label = stageLabel(ar, stage, kind);
  const tone =
    stage === 'APPROVED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : stage === 'CANCELLED'
        ? 'border-red-200 bg-red-50 text-red-900'
        : stage === 'ADMIN_APPROVED' || stage === 'TENANT_APPROVED' || stage === 'LANDLORD_APPROVED'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-stone-200 bg-stone-100 text-stone-800';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

export default function ContractReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const bookingId = searchParams?.get('bookingId') || '';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<PropertyBooking | null>(null);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [localSnapshot, setLocalSnapshot] = useState<Partial<RentalContract> | null>(null);
  const [readConfirmed, setReadConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!bookingId) {
        setError(ar ? 'رابط غير صالح' : 'Invalid link');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/bookings', { cache: 'no-store', credentials: 'include' });
        const list = res.ok ? await res.json() : [];
        const found = Array.isArray(list)
          ? (list.find((b: { id?: string }) => String(b?.id) === String(bookingId)) as PropertyBooking | undefined)
          : undefined;
        if (!active) return;
        if (!found) {
          setError(ar ? 'لم يتم العثور على الحجز' : 'Booking not found');
          setBooking(null);
        } else {
          setBooking(found);
        }
      } catch {
        if (!active) return;
        setError(ar ? 'تعذر تحميل بيانات العقد' : 'Failed to load contract');
        setBooking(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookingId, ar]);

  useEffect(() => {
    if (!booking || typeof window === 'undefined') {
      setLocalSnapshot(null);
      return;
    }
    const byId = booking.contractId ? getContractById(booking.contractId) : undefined;
    const byBooking = getContractByBooking(booking.id);
    setLocalSnapshot((byId || byBooking) ?? null);
  }, [booking?.id, booking?.contractId]);

  useEffect(() => {
    setReadConfirmed(false);
  }, [bookingId]);

  const effectiveContract = useMemo<Partial<RentalContract> | null>(() => {
    if (!booking) return null;
    const server = (booking.contractData || {}) as Partial<RentalContract>;
    const local = (localSnapshot || {}) as Partial<RentalContract>;
    return { ...local, ...server };
  }, [booking, localSnapshot]);

  const dataOverrides = getPropertyDataOverrides();
  const property = booking ? getPropertyById(String(booking.propertyId), dataOverrides) : null;

  const kind = useMemo<ContractKind>(() => {
    const fromContract = effectiveContract?.propertyContractKind;
    if (fromContract === 'SALE' || fromContract === 'RENT' || fromContract === 'INVESTMENT') return fromContract;
    const fromBooking = booking?.contractKind as ContractKind | undefined;
    if (fromBooking === 'SALE' || fromBooking === 'RENT' || fromBooking === 'INVESTMENT') return fromBooking;
    const pt = property?.type;
    if (pt === 'SALE' || pt === 'RENT' || pt === 'INVESTMENT') return pt;
    return 'RENT';
  }, [effectiveContract?.propertyContractKind, booking?.contractKind, property?.type]);

  const pageTitle = useMemo(() => {
    if (kind === 'SALE') return ar ? 'مراجعة عقد البيع واعتماده' : 'Review & approve sale contract';
    if (kind === 'INVESTMENT') return ar ? 'مراجعة عقد الاستثمار واعتماده' : 'Review & approve investment contract';
    return ar ? 'مراجعة عقد الإيجار واعتماده' : 'Review & approve rental contract';
  }, [ar, kind]);

  const financeLabels = useMemo(() => {
    const inv = kind === 'INVESTMENT';
    if (ar) {
      return {
        section: inv ? 'المالية والاستثمار' : 'المالية والإيجار',
        monthly: inv ? 'المبلغ الشهري (الاستثمار)' : 'الإيجار الشهري',
        annual: inv ? 'المبلغ السنوي' : 'الإيجار السنوي',
        rentDueDay: inv ? 'يوم الاستحقاق' : 'يوم استحقاق الإيجار',
        rentPayMethod: inv ? 'طريقة الدفع' : 'طريقة دفع الإيجار',
        customMonthly: inv ? 'مبالغ شهرية مخصصة' : 'إيجارات شهرية مخصصة',
        checksSection: inv ? 'شيكات الاستثمار وبيانات الحساب والمالك' : 'شيكات الإيجار وبيانات الحساب والمالك',
      };
    }
    return {
      section: inv ? 'Investment & finances' : 'Rent & finances',
      monthly: inv ? 'Monthly investment amount' : 'Monthly rent',
      annual: inv ? 'Annual amount' : 'Annual rent',
      rentDueDay: inv ? 'Due day' : 'Rent due day',
      rentPayMethod: inv ? 'Payment method' : 'Rent payment method',
      customMonthly: inv ? 'Custom monthly amounts' : 'Custom monthly rents',
      checksSection: inv ? 'Investment cheques — account & owner' : 'Rent cheques — account & owner',
    };
  }, [ar, kind]);

  const canClientApprove = useMemo(() => {
    if (!booking?.contractStage) return false;
    if (booking.contractStage !== 'ADMIN_APPROVED') return false;
    return userRole !== 'OWNER';
  }, [booking?.contractStage, userRole]);

  const canOwnerApprove = useMemo(() => {
    if (!booking?.contractStage) return false;
    if (booking.contractStage !== 'TENANT_APPROVED') return false;
    return userRole === 'OWNER';
  }, [booking?.contractStage, userRole]);

  const approve = async () => {
    if (!booking) return;
    if (!booking.contractStage) return;
    if (!canClientApprove && !canOwnerApprove) return;
    if (!readConfirmed) return;
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const nextStage: ContractStage = canClientApprove ? 'TENANT_APPROVED' : 'LANDLORD_APPROVED';
      const base = effectiveContract || {};
      const actor = sessionToContractActor(session);
      const nextContractData: Partial<RentalContract> = {
        ...base,
        status: nextStage as RentalContract['status'],
        tenantApprovedAt: canClientApprove ? now : base.tenantApprovedAt,
        landlordApprovedAt: canOwnerApprove ? now : base.landlordApprovedAt,
        updatedAt: now,
      };
      if (actor) {
        if (canClientApprove) {
          nextContractData.tenantApprovedByFirstName = actor.firstName;
          nextContractData.tenantApprovedByLastName = actor.lastName;
          nextContractData.tenantApprovedBySerial = actor.serial;
        }
        if (canOwnerApprove) {
          nextContractData.landlordApprovedByFirstName = actor.firstName;
          nextContractData.landlordApprovedByLastName = actor.lastName;
          nextContractData.landlordApprovedBySerial = actor.serial;
        }
        nextContractData.contractUpdatedByFirstName = actor.firstName;
        nextContractData.contractUpdatedByLastName = actor.lastName;
        nextContractData.contractUpdatedBySerial = actor.serial;
      }

      const payload: PropertyBooking = {
        ...booking,
        contractStage: nextStage,
        contractKind: kind,
        contractData: nextContractData,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = ar ? 'فشل اعتماد العقد' : 'Failed to approve contract';
        try {
          const data = await res.json();
          if (data?.error) msg = String(data.error);
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      setBooking(payload);
      router.push(`/${locale}/admin/my-bookings`);
    } catch (e) {
      setError(e instanceof Error ? e.message : ar ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const c = effectiveContract;
  const hasAnyContractPayload = !!(c && Object.keys(c).length > 0);

  const salePriceBase = useMemo(() => {
    const n = Number((c?.totalSaleAmount ?? booking?.priceAtBooking) ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [c?.totalSaleAmount, booking?.priceAtBooking]);

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-stone-50 via-white to-stone-50/90 pb-10">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 [&_.admin-page-subtitle]:mt-2 [&_.admin-page-subtitle]:text-base [&_.admin-page-subtitle]:sm:text-lg [&_.admin-page-title]:text-xl [&_.admin-page-title]:sm:text-2xl [&_.admin-page-title]:lg:text-[1.5rem]">
        <AdminPageHeader title={pageTitle} subtitle={ar ? 'اقرأ تفاصيل العقد ثم قم بالاعتماد' : 'Read contract details then approve'} />
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
        {!bookingId ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600 shadow-sm">{ar ? 'رابط غير صالح' : 'Invalid link'}</p>
        ) : loading ? (
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-stone-200" />
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-stone-200" />
            <div className="space-y-3 pt-4">
              <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
              <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
              <div className="h-32 animate-pulse rounded-xl bg-stone-100" />
            </div>
            <p className="text-center text-sm text-stone-500">{ar ? 'جاري تحميل تفاصيل العقد...' : 'Loading contract details...'}</p>
          </div>
        ) : error && !booking ? (
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white p-6 text-amber-950 shadow-md">
            <p className="text-lg font-bold">{ar ? 'تنبيه' : 'Notice'}</p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">{error}</p>
            <Link
              href={`/${locale}/admin/my-bookings`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#8B6F47] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#6B5535]"
            >
              {ar ? 'العودة لحجوزاتي' : 'Back to my bookings'}
            </Link>
          </div>
        ) : !booking ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600 shadow-sm">{ar ? 'لا توجد بيانات' : 'No data'}</p>
        ) : (
          <>
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-sm">{error}</div>
            ) : null}

            <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] ring-1 ring-stone-900/[0.04]">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={kind} ar={ar} />
                  <StageBadge stage={booking.contractStage} ar={ar} kind={kind} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-100 bg-stone-50/80 px-4 py-3 shadow-inner">
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{ar ? 'رقم الحجز' : 'Booking ID'}</div>
                  <div className="mt-1 font-mono text-sm font-bold text-stone-900 break-all">{booking.id}</div>
                </div>
                {c?.id ? (
                  <div className="rounded-xl border border-stone-100 bg-stone-50/80 px-4 py-3 shadow-inner">
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{ar ? 'رقم العقد' : 'Contract ID'}</div>
                    <div className="mt-1 font-mono text-sm font-bold text-stone-900 break-all">{c.id}</div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-inner">
                    {ar ? 'رقم العقد غير مُسجّل بعد' : 'Contract ID not set'}
                  </div>
                )}
              </div>
            </div>

            {property && (
              <section className="rounded-2xl border border-[#8B6F47]/20 bg-gradient-to-br from-[#8B6F47]/[0.06] via-white to-[#C9A961]/[0.05] p-5 shadow-md ring-1 ring-[#8B6F47]/10">
                <div className="mb-4 flex items-center gap-2 border-b border-[#8B6F47]/15 pb-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B6F47]/15 text-[#6B5535] ring-1 ring-[#8B6F47]/20" aria-hidden>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <h2 className="text-base font-bold text-stone-900 sm:text-lg">{ar ? 'العقار' : 'Property'}</h2>
                </div>
                <div className="mt-4 rounded-xl border border-white/80 bg-white/70 shadow-inner">
                  <PropertyDetailFields property={property} ar={ar} />
                  <Field label={ar ? 'عنوان العقد (عربي)' : 'Contract title (AR)'} value={str(c?.propertyTitleAr)} />
                  <Field label={ar ? 'عنوان العقد (إنجليزي)' : 'Contract title (EN)'} value={str(c?.propertyTitleEn)} />
                  <Field label={ar ? 'مفتاح الوحدة' : 'Unit key'} value={str(c?.unitKey)} />
                </div>
              </section>
            )}

            <Section step={1} title={ar ? `بيانات ${actorLabel(ar, kind)}` : `${actorLabel(ar, kind)} details`}>
              <Field label={ar ? 'الاسم' : 'Name'} value={str(c?.tenantName) || booking.name} />
              <Field label={ar ? 'البريد' : 'Email'} value={str(c?.tenantEmail) || booking.email} />
              <Field label={ar ? 'الهاتف' : 'Phone'} value={str(c?.tenantPhone) || booking.phone} />
              <Field label={ar ? 'الجنسية' : 'Nationality'} value={str(c?.tenantNationality)} />
              <Field label={ar ? 'الجنس' : 'Gender'} value={str(c?.tenantGender)} />
              <Field label={ar ? 'الرقم المدني' : 'Civil ID'} value={str(c?.tenantCivilId)} />
              <Field label={ar ? 'انتهاء الرقم المدني' : 'Civil ID expiry'} value={str(c?.tenantCivilIdExpiry)} />
              <Field label={ar ? 'رقم الجواز' : 'Passport'} value={str(c?.tenantPassportNumber)} />
              <Field label={ar ? 'انتهاء الجواز' : 'Passport expiry'} value={str(c?.tenantPassportExpiry)} />
              <Field label={ar ? 'جهة العمل' : 'Workplace'} value={str(c?.tenantWorkplace)} />
              <Field label={ar ? 'جهة العمل (EN)' : 'Workplace (EN)'} value={str(c?.tenantWorkplaceEn)} />
              <Field label={ar ? 'المنصب' : 'Position'} value={str(c?.tenantPosition)} />
            </Section>

            <Section step={2} title={ar ? `بيانات ${ownerLabel(ar, kind)}` : `${ownerLabel(ar, kind)} details`}>
              <Field label={ar ? 'الاسم' : 'Name'} value={str(c?.landlordName)} />
              <Field label={ar ? 'البريد' : 'Email'} value={str(c?.landlordEmail)} />
              <Field label={ar ? 'الهاتف' : 'Phone'} value={str(c?.landlordPhone)} />
              <Field label={ar ? 'الجنسية' : 'Nationality'} value={str(c?.landlordNationality)} />
              <Field label={ar ? 'الجنس' : 'Gender'} value={str(c?.landlordGender)} />
              <Field label={ar ? 'الرقم المدني' : 'Civil ID'} value={str(c?.landlordCivilId)} />
              <Field label={ar ? 'انتهاء الرقم المدني' : 'Civil ID expiry'} value={str(c?.landlordCivilIdExpiry)} />
              <Field label={ar ? 'رقم الجواز' : 'Passport'} value={str(c?.landlordPassportNumber)} />
              <Field label={ar ? 'انتهاء الجواز' : 'Passport expiry'} value={str(c?.landlordPassportExpiry)} />
              <Field label={ar ? 'جهة العمل' : 'Workplace'} value={str(c?.landlordWorkplace)} />
              <Field label={ar ? 'جهة العمل (EN)' : 'Workplace (EN)'} value={str(c?.landlordWorkplaceEn)} />
            </Section>

            {kind === 'SALE' && c?.saleViaBroker ? (
              <Section step={3} title={ar ? 'بيانات الوسيط (السمسار)' : 'Broker details'}>
                <Field label={ar ? 'الاسم' : 'Name'} value={str(c.brokerName)} />
                <Field label={ar ? 'الهاتف' : 'Phone'} value={str(c.brokerPhone)} />
                <Field label={ar ? 'البريد' : 'Email'} value={str(c.brokerEmail)} />
                <Field label={ar ? 'الرقم المدني' : 'Civil ID'} value={str(c.brokerCivilId)} />
                <Field label={ar ? 'معرف جهة الاتصال' : 'Contact ID'} value={str(c.brokerContactId)} />
              </Section>
            ) : null}

            {kind === 'SALE' ? (
              <Section step={c?.saleViaBroker ? 4 : 3} title={ar ? 'تاريخ البيع ونقل الملكية' : 'Sale & transfer dates'}>
                <Field label={ar ? 'تاريخ البيع' : 'Sale date'} value={str(c?.saleDate)} />
                <Field label={ar ? 'تاريخ نقل الملكية' : 'Transfer date'} value={str(c?.transferOfOwnershipDate)} />
                <Field label={ar ? 'ملاحظة' : 'Note'} value={str(c?.saleDatesNote)} />
                <Field label={ar ? 'طريقة الدفع (ملخص)' : 'Payment method'} value={str(c?.salePaymentMethod)} />
              </Section>
            ) : (
              <Section step={3} title={ar ? 'مدة العقد والتواريخ' : 'Duration & dates'}>
                <Field label={ar ? 'مدة العقد (شهر)' : 'Duration (months)'} value={c?.durationMonths != null ? String(c.durationMonths) : ''} />
                <Field label={ar ? 'تاريخ البداية' : 'Start date'} value={str(c?.startDate)} />
                <Field label={ar ? 'تاريخ النهاية' : 'End date'} value={str(c?.endDate)} />
                <Field
                  label={
                    ar
                      ? kind === 'INVESTMENT'
                        ? 'تاريخ بداية الاستثمار الفعلي'
                        : 'تاريخ الاستئجار الفعلي'
                      : kind === 'INVESTMENT'
                        ? 'Actual investment start'
                        : 'Actual rental date'
                  }
                  value={str(c?.actualRentalDate)}
                />
                <Field label={ar ? 'تاريخ استلام الوحدة' : 'Handover date'} value={str(c?.unitHandoverDate)} />
              </Section>
            )}

            {kind === 'SALE' ? (
              <Section step={c?.saleViaBroker ? 5 : 4} title={ar ? 'بيانات البيع والمالية' : 'Sale & finances'}>
                <Field
                  label={ar ? 'ثمن البيع' : 'Sale price'}
                  value={omr(ar, c?.totalSaleAmount ?? booking.priceAtBooking ?? undefined)}
                />
                {c?.salePayments && c.salePayments.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="bg-gradient-to-l from-[#8B6F47]/12 to-stone-50/90">
                          <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'الدفعة' : '#'}</th>
                          <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'المبلغ' : 'Amount'}</th>
                          <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'ملاحظة' : 'Note'}</th>
                          <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'مستند' : 'Doc'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {c.salePayments.map((p, i) => (
                          <tr key={i} className="transition-colors hover:bg-[#8B6F47]/[0.04]">
                            <td className="px-4 py-3 font-mono font-semibold text-stone-800">{p.installmentNumber}</td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-stone-900">{omr(ar, p.amount)}</td>
                            <td className="px-4 py-3 text-stone-700">{str(p.note) || '—'}</td>
                            <td className="px-4 py-3">
                              {p.documentUrl ? (
                                <a
                                  href={p.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[#8B6F47] underline decoration-[#8B6F47]/40 underline-offset-2 hover:text-[#6B5535]"
                                >
                                  {ar ? 'فتح المستند' : 'Open'}
                                </a>
                              ) : p.documentFile?.name ? (
                                <span className="text-stone-700">{p.documentFile.name}</span>
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div className="mt-3 space-y-1 text-sm">
                  <Field
                    label={ar ? 'السمسرة (%)' : 'Brokerage %'}
                    value={
                      c?.saleBrokerageFeePercent != null
                        ? (() => {
                            const amt = salePercentAmount(salePriceBase, c.saleBrokerageFeePercent);
                            const pct = `${c.saleBrokerageFeePercent}% (${payerLabel(ar, c.saleBrokerageFeePayer)})`;
                            return amt != null ? `${pct} — ${omr(ar, amt)}` : pct;
                          })()
                        : ''
                    }
                  />
                  <Field
                    label={ar ? 'رسوم الإسكان (%)' : 'Housing %'}
                    value={
                      c?.saleHousingFeePercent != null
                        ? (() => {
                            const amt = salePercentAmount(salePriceBase, c.saleHousingFeePercent);
                            const pct = `${c.saleHousingFeePercent}% (${payerLabel(ar, c.saleHousingFeePayer)})`;
                            return amt != null ? `${pct} — ${omr(ar, amt)}` : pct;
                          })()
                        : ''
                    }
                  />
                  <Field
                    label={ar ? 'رسوم بلدية' : 'Municipality fees'}
                    value={
                      c?.saleMunicipalityFees != null
                        ? `${omr(ar, c.saleMunicipalityFees)} (${payerLabel(ar, c.saleMunicipalityFeesPayer)})`
                        : ''
                    }
                  />
                  <Field
                    label={ar ? 'رسوم إدارية' : 'Admin fees'}
                    value={
                      c?.saleAdminFees != null ? `${omr(ar, c.saleAdminFees)} (${payerLabel(ar, c.saleAdminFeesPayer)})` : ''
                    }
                  />
                  <Field
                    label={ar ? 'رسوم نقل الملكية' : 'Transfer fees'}
                    value={
                      c?.saleTransferFees != null
                        ? `${omr(ar, c.saleTransferFees)} (${payerLabel(ar, c.saleTransferFeesPayer)})`
                        : ''
                    }
                  />
                </div>
                {c?.saleOtherFeesList && c.saleOtherFeesList.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-inner">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">{ar ? 'رسوم أخرى' : 'Other fees'}</div>
                    <ul className="space-y-2 text-sm">
                      {c.saleOtherFeesList.map((f, i) => (
                        <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-stone-50/90 px-3 py-2 border border-stone-100">
                          <span className="font-medium text-stone-800">{str(f.description)}</span>
                          <span className="tabular-nums font-semibold text-stone-900">
                            {omr(ar, f.amount)} <span className="text-stone-500 font-normal">({payerLabel(ar, f.payer)})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            ) : (
              <Section step={4} title={financeLabels.section}>
                <Field label={financeLabels.monthly} value={omr(ar, c?.monthlyRent ?? booking.priceAtBooking)} />
                <Field label={financeLabels.annual} value={omr(ar, c?.annualRent)} />
                <Field label={ar ? 'الضمان' : 'Deposit'} value={omr(ar, c?.depositAmount)} />
                <Field label={ar ? 'رسوم البلدية' : 'Municipality fees'} value={omr(ar, c?.municipalityFees)} />
                <Field label={ar ? 'تخفيض' : 'Discount'} value={omr(ar, c?.discountAmount)} />
                <Field label={ar ? 'ضريبة مضافة' : 'VAT'} value={c?.includesVAT ? (ar ? 'نعم' : 'Yes') : ''} />
                <Field label={ar ? 'نسبة الضريبة' : 'VAT rate'} value={c?.vatRate != null ? String(c.vatRate) : ''} />
                <Field label={ar ? 'ضريبة شهرية' : 'Monthly VAT'} value={omr(ar, c?.monthlyVATAmount)} />
                <Field label={ar ? 'إجمالي الضريبة' : 'Total VAT'} value={omr(ar, c?.totalVATAmount)} />
                <Field label={ar ? 'رسوم إنترنت' : 'Internet fees'} value={omr(ar, c?.internetFees)} />
                <Field label={ar ? 'فاتورة كهرباء' : 'Electricity bill'} value={omr(ar, c?.electricityBillAmount)} />
                <Field label={ar ? 'فاتورة ماء' : 'Water bill'} value={omr(ar, c?.waterBillAmount)} />
                <Field label={financeLabels.rentDueDay} value={c?.rentDueDay != null ? String(c.rentDueDay) : ''} />
                <Field label={ar ? 'تكرار الدفع' : 'Payment frequency'} value={str(c?.rentPaymentFrequency)} />
                <Field label={financeLabels.rentPayMethod} value={str(c?.rentPaymentMethod)} />
                <Field label={ar ? 'طريقة دفع الضمان' : 'Deposit payment method'} value={str(c?.depositPaymentMethod)} />
                <Field label={ar ? 'رقم استمارة البلدية' : 'Municipality form #'} value={str(c?.municipalityFormNumber)} />
                <Field label={ar ? 'رقم عقد البلدية' : 'Municipality contract #'} value={str(c?.municipalityContractNumber)} />
                <Field label={ar ? 'رسوم تسجيل البلدية' : 'Municipality registration fee'} value={omr(ar, c?.municipalityRegistrationFee)} />
                <Field label={ar ? 'قراءة عداد الكهرباء' : 'Electricity meter'} value={str(c?.electricityMeterReading)} />
                <Field label={ar ? 'قراءة عداد الماء' : 'Water meter'} value={str(c?.waterMeterReading)} />
                <Field label={ar ? 'حسب المساحة' : 'By area'} value={c?.calculateByArea ? (ar ? 'نعم' : 'Yes') : ''} />
                <Field label={ar ? 'المساحة (م²)' : 'Area m²'} value={c?.rentArea != null ? String(c.rentArea) : ''} />
                <Field label={ar ? 'السعر للمتر' : 'Price/m²'} value={omr(ar, c?.pricePerMeter)} />
                {c?.customMonthlyRents && c.customMonthlyRents.length > 0 ? (
                  <Field label={financeLabels.customMonthly} value={c.customMonthlyRents.map((x) => omr(ar, x)).join(' · ')} />
                ) : null}
                <Field label={ar ? 'ضمان نقدي' : 'Deposit cash'} value={omr(ar, c?.depositCashAmount)} />
                <Field label={ar ? 'تاريخ الضمان النقدي' : 'Deposit cash date'} value={str(c?.depositCashDate)} />
                <Field label={ar ? 'إيصال الضمان النقدي' : 'Deposit cash receipt'} value={str(c?.depositCashReceiptNumber)} />
                <Field label={ar ? 'شيك ضمان — مبلغ' : 'Deposit cheque amount'} value={omr(ar, c?.depositChequeAmount)} />
                <Field label={ar ? 'شيك ضمان — رقم' : 'Deposit cheque #'} value={str(c?.depositChequeNumber)} />
                <Field label={ar ? 'شيك ضمان مطلوب' : 'Deposit cheque required'} value={c?.depositChequeRequired ? (ar ? 'نعم' : 'Yes') : ''} />
                <Field
                  label={ar ? 'مدة شيك الضمان (أشهر)' : 'Deposit cheque months'}
                  value={c?.depositChequeDurationMonths != null ? String(c.depositChequeDurationMonths) : ''}
                />
              </Section>
            )}

            {kind !== 'SALE' && c?.checks && c.checks.length > 0 ? (
              <Section step={5} title={ar ? (kind === 'INVESTMENT' ? 'الشيكات (ملخص الاستثمار)' : 'الشيكات (ملخص العقد)') : kind === 'INVESTMENT' ? 'Contract cheques (investment)' : 'Contract cheques'}>
                <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                  <table className="w-full min-w-[24rem] text-sm">
                    <thead>
                      <tr className="bg-gradient-to-l from-[#8B6F47]/12 to-stone-50/90">
                        <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'النوع' : 'Type'}</th>
                        <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'رقم الشيك' : 'Number'}</th>
                        <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'المبلغ' : 'Amount'}</th>
                        <th className="px-4 py-3 text-start font-bold text-stone-800 border-b border-stone-200">{ar ? 'الاستحقاق' : 'Due'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(c.checks as CheckInfo[]).map((ch, i) => (
                        <tr key={i} className="hover:bg-[#8B6F47]/[0.04]">
                          <td className="px-4 py-3 text-stone-800">{str(ch.type)}</td>
                          <td className="px-4 py-3 font-mono text-stone-900">{str(ch.checkNumber)}</td>
                          <td className="px-4 py-3 tabular-nums font-semibold">{omr(ar, ch.amount)}</td>
                          <td className="px-4 py-3 text-stone-700">{str(ch.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}

            {kind !== 'SALE' && hasRentAccountFields(c) ? (
            <Section title={financeLabels.checksSection}>
              <Field label={ar ? 'نوع مالك الشيكات' : 'Cheque owner type'} value={str(c?.rentChecksOwnerType)} />
              <Field label={ar ? 'اسم مالك الشيكات' : 'Cheque owner name'} value={str(c?.rentChecksOwnerName)} />
              <Field label={ar ? 'رقم مدني مالك الشيكات' : 'Owner civil ID'} value={str(c?.rentChecksOwnerCivilId)} />
              <Field label={ar ? 'هاتف مالك الشيكات' : 'Owner phone'} value={str(c?.rentChecksOwnerPhone)} />
              <Field label={ar ? 'الشركة' : 'Company'} value={str(c?.rentChecksCompanyName)} />
              <Field label={ar ? 'رقم السجل' : 'CR'} value={str(c?.rentChecksCompanyRegNumber)} />
              <Field label={ar ? 'المفوض' : 'Authorized rep'} value={str(c?.rentChecksAuthorizedRep)} />
              <Field label={ar ? 'البنك' : 'Bank'} value={str(c?.rentChecksBankName)} />
              <Field label={ar ? 'الفرع' : 'Branch'} value={str(c?.rentChecksBankBranch)} />
              <Field label={ar ? 'معرف الحساب البنكي' : 'Bank account ID'} value={str(c?.rentChecksBankAccountId)} />
            </Section>
            ) : null}

            <Section title={ar ? 'ضمانات وشروط إضافية' : 'Guarantees & notes'}>
              <Field label={ar ? 'الضمانات' : 'Guarantees'} value={c?.guarantees ? <span className="whitespace-pre-wrap">{c.guarantees}</span> : ''} />
              <Field label={ar ? 'نوع العقد (سكني/تجاري)' : 'Contract type'} value={str(c?.contractType)} />
              <Field label={ar ? 'إنترنت مشمول' : 'Internet included'} value={c?.internetIncluded ? (ar ? 'نعم' : 'Yes') : ''} />
              <Field label={ar ? 'نوع دفع الإنترنت' : 'Internet payment'} value={str(c?.internetPaymentType)} />
            </Section>

            {c?.otherFees && c.otherFees.length > 0 ? (
              <Section title={ar ? 'رسوم أخرى' : 'Other fees'}>
                <ul className="space-y-2 text-sm">
                  {c.otherFees.map((f, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/90 px-3 py-2"
                    >
                      <span className="font-medium text-stone-800">{str(f.description)}</span>
                      <span className="tabular-nums font-semibold text-stone-900">{omr(ar, f.amount)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {c?.hasOtherTaxes ? (
              <Section title={ar ? 'ضرائب أخرى' : 'Other taxes'}>
                <Field label={ar ? 'الاسم' : 'Name'} value={str(c.otherTaxName)} />
                <Field label={ar ? 'النسبة' : 'Rate'} value={c.otherTaxRate != null ? String(c.otherTaxRate) : ''} />
                <Field label={ar ? 'شهرياً' : 'Monthly'} value={omr(ar, c.monthlyOtherTaxAmount)} />
                <Field label={ar ? 'الإجمالي' : 'Total'} value={omr(ar, c.totalOtherTaxAmount)} />
              </Section>
            ) : null}

            <Section title={ar ? 'حالة الاعتمادات والتواريخ' : 'Approval timestamps'}>
              <Field
                label={ar ? 'حالة العقد في الملف' : 'Contract status'}
                value={stageLabel(ar, (c?.status || booking.contractStage) as ContractStage, kind)}
              />
              <Field
                label={ar ? 'اعتماد إداري مبدئي' : 'Admin pre-approval'}
                value={
                  c?.adminApprovedAt || c?.adminApprovedBySerial || c?.adminApprovedByFirstName ? (
                    <>
                      {c?.adminApprovedAt ? (
                        <div className="font-semibold">{formatIsoLocal(c.adminApprovedAt, ar)}</div>
                      ) : null}
                      {actorDisplayLine(ar, c?.adminApprovedByFirstName, c?.adminApprovedByLastName, c?.adminApprovedBySerial) ? (
                        <div className="mt-1 text-sm font-normal text-stone-600">
                          {actorDisplayLine(ar, c?.adminApprovedByFirstName, c?.adminApprovedByLastName, c?.adminApprovedBySerial)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ''
                  )
                }
              />
              <Field
                label={
                  ar
                    ? kind === 'SALE'
                      ? 'اعتماد المشتري'
                      : kind === 'INVESTMENT'
                        ? 'اعتماد المستثمر'
                        : 'اعتماد المستأجر'
                    : kind === 'SALE'
                      ? 'Buyer approval'
                      : kind === 'INVESTMENT'
                        ? 'Investor approval'
                        : 'Tenant approval'
                }
                value={
                  c?.tenantApprovedAt || c?.tenantApprovedBySerial || c?.tenantApprovedByFirstName ? (
                    <>
                      {c?.tenantApprovedAt ? (
                        <div className="font-semibold">{formatIsoLocal(c.tenantApprovedAt, ar)}</div>
                      ) : null}
                      {actorDisplayLine(ar, c?.tenantApprovedByFirstName, c?.tenantApprovedByLastName, c?.tenantApprovedBySerial) ? (
                        <div className="mt-1 text-sm font-normal text-stone-600">
                          {actorDisplayLine(ar, c?.tenantApprovedByFirstName, c?.tenantApprovedByLastName, c?.tenantApprovedBySerial)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ''
                  )
                }
              />
              <Field
                label={ar ? 'اعتماد المالك' : 'Owner approval'}
                value={
                  c?.landlordApprovedAt || c?.landlordApprovedBySerial || c?.landlordApprovedByFirstName ? (
                    <>
                      {c?.landlordApprovedAt ? (
                        <div className="font-semibold">{formatIsoLocal(c.landlordApprovedAt, ar)}</div>
                      ) : null}
                      {actorDisplayLine(ar, c?.landlordApprovedByFirstName, c?.landlordApprovedByLastName, c?.landlordApprovedBySerial) ? (
                        <div className="mt-1 text-sm font-normal text-stone-600">
                          {actorDisplayLine(ar, c?.landlordApprovedByFirstName, c?.landlordApprovedByLastName, c?.landlordApprovedBySerial)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ''
                  )
                }
              />
              <Field
                label={ar ? 'أُنشئ' : 'Created'}
                value={
                  c?.createdAt ? (
                    <>
                      <div className="font-semibold">{formatIsoLocal(c.createdAt, ar)}</div>
                      {actorDisplayLine(ar, c?.contractCreatedByFirstName, c?.contractCreatedByLastName, c?.contractCreatedBySerial) ? (
                        <div className="mt-1 text-sm font-normal text-stone-600">
                          {actorDisplayLine(ar, c?.contractCreatedByFirstName, c?.contractCreatedByLastName, c?.contractCreatedBySerial)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ''
                  )
                }
              />
              <Field
                label={ar ? 'آخر تحديث' : 'Last updated'}
                value={
                  c?.updatedAt ? (
                    <>
                      <div className="font-semibold">{formatIsoLocal(c.updatedAt, ar)}</div>
                      {actorDisplayLine(ar, c?.contractUpdatedByFirstName, c?.contractUpdatedByLastName, c?.contractUpdatedBySerial) ? (
                        <div className="mt-1 text-sm font-normal text-stone-600">
                          {actorDisplayLine(ar, c?.contractUpdatedByFirstName, c?.contractUpdatedByLastName, c?.contractUpdatedBySerial)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ''
                  )
                }
              />
            </Section>

            {!hasAnyContractPayload ? (
              <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 p-5 text-amber-950 shadow-md ring-1 ring-amber-100">
                <div className="text-base font-bold">{ar ? 'تنبيه' : 'Notice'}</div>
                <p className="mt-2 text-sm leading-relaxed opacity-90">
                  {ar
                    ? 'تفاصيل العقد غير مخزنة بعد على الخادم لهذا الحجز. اطلب من الإدارة فتح صفحة العقد وحفظ/مزامنة الحالة مرة أخرى، أو افتح الموقع من نفس الجهاز الذي يحتوي العقد محلياً.'
                    : 'Contract details are not stored on the server for this booking yet. Ask admin to open the contract page once to re-sync, or use a device that has the contract in local storage.'}
                </p>
              </div>
            ) : null}

            <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-6 rounded-2xl border border-stone-200/90 bg-white/95 p-4 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-5">
              {canClientApprove || canOwnerApprove ? (
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-800 sm:text-base">
                  <input
                    type="checkbox"
                    checked={readConfirmed}
                    onChange={(e) => setReadConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    {ar
                      ? 'أقرّ بأنني قرأتُ تفاصيل العقد كاملةً وأوافق على ما ورد فيه.'
                      : 'I confirm that I have read the full contract details and agree to its terms.'}
                  </span>
                </label>
              ) : null}

              <div
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${canClientApprove || canOwnerApprove ? 'border-t border-stone-200/90 pt-6' : ''}`}
              >
                <Link
                  href={`/${locale}/admin/my-bookings`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  {ar ? '← العودة لحجوزاتي' : '← Back to my bookings'}
                </Link>

                {canClientApprove || canOwnerApprove ? (
                  <button
                    type="button"
                    onClick={approve}
                    disabled={saving || !readConfirmed}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition ${
                      saving || !readConfirmed
                        ? 'cursor-not-allowed bg-stone-400 opacity-80'
                        : 'bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                    }`}
                  >
                    {saving ? (ar ? 'جاري الاعتماد...' : 'Approving...') : ar ? '✓ اعتماد العقد' : '✓ Approve contract'}
                  </button>
                ) : (
                  <span className="text-center text-sm text-stone-500 sm:text-end">
                    {ar ? 'لا يوجد إجراء اعتماد متاح حالياً' : 'No approval action available right now'}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
