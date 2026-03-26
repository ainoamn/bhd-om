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

/** تفاصيل اعتماد/إجراء للتوثيق: تاريخ ووقت + اسم المنفّذ + الرقم المتسلسل */
function ApprovalAuditCell({
  ar,
  atIso,
  firstName,
  lastName,
  serial,
}: {
  ar: boolean;
  atIso?: string;
  firstName?: string;
  lastName?: string;
  serial?: string;
}) {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (!atIso && !name && !serial) return null;
  return (
    <div className="space-y-2 border-s-2 border-[#8B6F47]/25 ps-3">
      {atIso ? (
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-stone-500">{ar ? 'التاريخ والوقت: ' : 'Date & time: '}</span>
          <span className="font-semibold text-stone-900">{formatIsoLocal(atIso, ar)}</span>
        </p>
      ) : null}
      {name ? (
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-stone-500">{ar ? 'اسم المنفّذ: ' : 'Performed by: '}</span>
          <span className="text-stone-800">{name}</span>
        </p>
      ) : null}
      {serial ? (
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-stone-500">{ar ? 'الرقم المتسلسل في النظام: ' : 'System serial no.: '}</span>
          <span className="font-mono font-semibold text-stone-900">{serial}</span>
        </p>
      ) : null}
    </div>
  );
}

function salePercentAmount(base: number, pct: number | null | undefined): number | null {
  if (pct == null || Number.isNaN(Number(pct))) return null;
  return Math.round(base * (Number(pct) / 100) * 1000) / 1000;
}

type SaleFeeLine = {
  key: string;
  labelAr: string;
  labelEn: string;
  amount: number;
  payer?: 'seller' | 'buyer';
};

function collectSaleFeeLines(c: Partial<RentalContract>, salePriceBase: number): SaleFeeLine[] {
  const lines: SaleFeeLine[] = [];
  const push = (key: string, labelAr: string, labelEn: string, amount: number | null | undefined, payer?: 'seller' | 'buyer') => {
    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) <= 0) return;
    lines.push({ key, labelAr, labelEn, amount: Number(amount), payer });
  };

  if (c.saleBrokerageFeePercent != null) {
    const amt = salePercentAmount(salePriceBase, c.saleBrokerageFeePercent);
    push('brokerage', `السمسرة (${c.saleBrokerageFeePercent}٪)`, `Brokerage (${c.saleBrokerageFeePercent}%)`, amt, c.saleBrokerageFeePayer);
  }
  if (c.saleHousingFeePercent != null) {
    const amt = salePercentAmount(salePriceBase, c.saleHousingFeePercent);
    push('housing', `رسوم الإسكان (${c.saleHousingFeePercent}٪)`, `Housing (${c.saleHousingFeePercent}%)`, amt, c.saleHousingFeePayer);
  }
  push('municipality', 'رسوم بلدية', 'Municipality fees', c.saleMunicipalityFees, c.saleMunicipalityFeesPayer);
  push('admin', 'رسوم إدارية', 'Admin fees', c.saleAdminFees, c.saleAdminFeesPayer);
  push('transfer', 'رسوم نقل الملكية', 'Transfer fees', c.saleTransferFees, c.saleTransferFeesPayer);

  (c.saleOtherFeesList ?? []).forEach((f, i) => {
    const desc = str(f.description) || '—';
    push(`other-${i}`, `أخرى: ${desc}`, `Other: ${desc}`, f.amount, f.payer);
  });

  return lines;
}

function partitionSaleFeeLines(lines: SaleFeeLine[]) {
  const buyer: SaleFeeLine[] = [];
  const seller: SaleFeeLine[] = [];
  const unknown: SaleFeeLine[] = [];
  for (const l of lines) {
    if (l.payer === 'buyer') buyer.push(l);
    else if (l.payer === 'seller') seller.push(l);
    else unknown.push(l);
  }
  const sum = (arr: SaleFeeLine[]) => Math.round(arr.reduce((s, x) => s + x.amount, 0) * 1000) / 1000;
  return {
    buyer,
    seller,
    unknown,
    buyerSum: sum(buyer),
    sellerSum: sum(seller),
    unknownSum: sum(unknown),
    totalSum: sum([...buyer, ...seller, ...unknown]),
  };
}

function SaleFeesByPayerBreakdown({
  c,
  salePriceBase,
  ar,
}: {
  c: Partial<RentalContract>;
  salePriceBase: number;
  ar: boolean;
}) {
  const lines = collectSaleFeeLines(c, salePriceBase);
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600">
        {ar ? 'لا توجد رسوم بيع إضافية مسجّلة (بخلاف ثمن البيع والدفعات أعلاه).' : 'No additional sale fees recorded (aside from sale price and installments above).'}
      </p>
    );
  }
  const p = partitionSaleFeeLines(lines);

  const toRows = (arr: SaleFeeLine[]) =>
    arr.map((l) => ({ label: ar ? l.labelAr : l.labelEn, value: omr(ar, l.amount) }));

  const colClass = 'rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4';

  return (
    <div className="space-y-4">
      <h3 className="text-[12px] font-medium leading-snug text-stone-800 sm:text-[13px]">{ar ? 'تفصيل الرسوم حسب الدافع' : 'Fees split by payer'}</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={colClass}>
          <p className="mb-3 border-b border-stone-100 pb-2 text-xs font-bold uppercase tracking-wide text-[#6B5535] sm:text-sm">
            {ar ? 'على المشتري' : 'Buyer pays'}
          </p>
          {p.buyer.length > 0 ? (
            <>
              <DataTable rows={toRows(p.buyer)} />
              <p className="mt-3 border-t border-stone-100 pt-2 text-end text-sm font-bold text-stone-900">
                {ar ? 'المجموع على المشتري: ' : 'Buyer subtotal: '}
                <span className="tabular-nums">{omr(ar, p.buyerSum)}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-500">{ar ? 'لا توجد رسوم مسجّلة على المشتري.' : 'No fees recorded for the buyer.'}</p>
          )}
        </div>
        <div className={colClass}>
          <p className="mb-3 border-b border-stone-100 pb-2 text-xs font-bold uppercase tracking-wide text-[#6B5535] sm:text-sm">
            {ar ? 'على البائع (المالك)' : 'Seller (owner) pays'}
          </p>
          {p.seller.length > 0 ? (
            <>
              <DataTable rows={toRows(p.seller)} />
              <p className="mt-3 border-t border-stone-100 pt-2 text-end text-sm font-bold text-stone-900">
                {ar ? 'المجموع على البائع: ' : 'Seller subtotal: '}
                <span className="tabular-nums">{omr(ar, p.sellerSum)}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-500">{ar ? 'لا توجد رسوم مسجّلة على البائع.' : 'No fees recorded for the seller.'}</p>
          )}
        </div>
      </div>

      {p.unknown.length > 0 ? (
        <div className={`${colClass} border-amber-200/80 bg-amber-50/30`}>
          <p className="mb-3 text-xs font-bold text-amber-900 sm:text-sm">
            {ar ? 'رسوم دون تحديد دافع في السجل' : 'Fees without payer on record'}
          </p>
          <DataTable rows={toRows(p.unknown)} />
          <p className="mt-3 border-t border-amber-100 pt-2 text-end text-sm font-bold text-amber-950">
            {ar ? 'مجموع غير المحدد: ' : 'Unspecified subtotal: '}
            <span className="tabular-nums">{omr(ar, p.unknownSum)}</span>
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border-2 border-[#8B6F47]/35 bg-gradient-to-br from-[#8B6F47]/[0.07] to-white p-3 sm:p-4">
        <p className="mb-3 text-[12px] font-medium text-stone-800 sm:text-[13px]">{ar ? 'ملخص المجاميع' : 'Totals summary'}</p>
        <DataTable
          rows={[
            { label: ar ? 'إجمالي ما على المشتري' : 'Total due from buyer', value: omr(ar, p.buyerSum) },
            { label: ar ? 'إجمالي ما على البائع' : 'Total due from seller', value: omr(ar, p.sellerSum) },
            ...(p.unknownSum > 0
              ? [{ label: ar ? 'إجمالي دون تحديد دافع' : 'Total (payer unspecified)', value: omr(ar, p.unknownSum) }]
              : []),
            {
              label: ar ? 'إجمالي الرسوم (المشتري + البائع' + (p.unknownSum > 0 ? ' + غير محدد' : '') + ')' : 'Total fees (all payers)',
              value: <span className="text-base font-bold text-[#5c4a32]">{omr(ar, p.totalSum)}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
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

type DataRow = { label: string; value: React.ReactNode };

function isEmptyValue(v: React.ReactNode): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && !v.trim()) return true;
  return false;
}

/** جدول بند / قيمة — متسق على كل الشاشات */
function DataTable({ rows, caption }: { rows: DataRow[]; caption?: string }) {
  const filtered = rows.filter((r) => !isEmptyValue(r.value));
  if (filtered.length === 0) return null;
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[min(100%,18rem)] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <tbody className="divide-y divide-stone-100">
          {filtered.map((row, i) => (
            <tr key={`${row.label}-${i}`} className="transition-colors hover:bg-[#8B6F47]/[0.04]">
              <th
                scope="row"
                className="w-[min(42%,11rem)] max-w-[45%] align-top bg-stone-50 px-3 py-2.5 text-start text-[0.8125rem] font-medium leading-snug text-stone-600 sm:w-[min(38%,13rem)] sm:px-4 sm:py-3 sm:text-sm"
              >
                {row.label}
              </th>
              <td className="align-top px-3 py-2.5 text-start text-sm font-semibold leading-relaxed text-stone-900 sm:px-4 sm:py-3 sm:text-[0.9375rem]">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** جدولان جنباً إلى جنب على الشاشات العريضة لتقليل الطول العمودي */
function DataTablePair({ rows, caption }: { rows: DataRow[]; caption?: string }) {
  const filtered = rows.filter((r) => !isEmptyValue(r.value));
  if (filtered.length === 0) return null;
  const mid = Math.ceil(filtered.length / 2);
  const left = filtered.slice(0, mid);
  const right = filtered.slice(mid);
  if (right.length === 0) return <DataTable rows={left} caption={caption} />;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <DataTable rows={left} caption={caption} />
      <DataTable rows={right} />
    </div>
  );
}

/** رأس جدول بيانات (مثل الدفعات والشيكات) — نمط موحّد */
function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-stone-200 bg-gradient-to-l from-[#8B6F47]/14 to-stone-50">{children}</tr>
    </thead>
  );
}

function buildPropertyDataRows(property: Property, ar: boolean): DataRow[] {
  const rows: DataRow[] = [];
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
  if (String(desc).trim()) {
    rows.push({
      label: ar ? 'الوصف' : 'Description',
      value: <span className="block max-w-none whitespace-pre-wrap font-normal leading-relaxed">{String(desc).trim()}</span>,
    });
  }
  return rows;
}

function Section({ title, children, step }: { title: string; children: React.ReactNode; step?: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md ring-1 ring-stone-900/[0.04]">
      <header className="flex items-center gap-3 border-b border-stone-200 bg-gradient-to-l from-[#8B6F47]/[0.1] via-[#C9A961]/[0.05] to-white px-4 py-3 sm:px-5 sm:py-3.5">
        {step != null ? (
          <span className="inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B6F47] to-[#6B5535] px-2 text-[11px] font-bold text-white shadow sm:h-9 sm:min-w-[2.25rem] sm:text-xs">
            {step}
          </span>
        ) : (
          <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#8B6F47]" aria-hidden />
        )}
        <h2 className="text-[14px] font-medium leading-snug text-stone-800 sm:text-[14px]">{title}</h2>
      </header>
      <div className="min-w-0 p-3 sm:p-4">{children}</div>
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

  /** أرقام الخطوات لتوحيد العناوين مع بيانات المشتري/المالك */
  const sectionSteps = useMemo(() => {
    const ec = effectiveContract;
    if (kind === 'SALE') {
      const br = !!ec?.saleViaBroker;
      return {
        broker: br ? 3 : undefined,
        saleDates: br ? 4 : 3,
        saleFinance: br ? 5 : 4,
        guarantees: br ? 6 : 5,
        approvals: br ? 7 : 6,
      };
    }
    let n = 3;
    const duration = n++;
    const finance = n++;
    const checks = !!(ec?.checks && Array.isArray(ec.checks) && ec.checks.length > 0);
    const checksStep = checks ? n++ : undefined;
    const rentAcct = hasRentAccountFields(ec);
    const rentAcctStep = rentAcct ? n++ : undefined;
    const guarantees = n++;
    const approvals = n;
    return { duration, finance, checks: checksStep, rentAcct: rentAcctStep, guarantees, approvals };
  }, [kind, effectiveContract]);

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
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 [&_.admin-page-subtitle]:mt-2 [&_.admin-page-subtitle]:text-base [&_.admin-page-subtitle]:sm:text-lg [&_.admin-page-title]:text-xl [&_.admin-page-title]:sm:text-2xl [&_.admin-page-title]:lg:text-[1.5rem]">
        <AdminPageHeader title={pageTitle} subtitle={ar ? 'اقرأ تفاصيل العقد ثم قم بالاعتماد' : 'Read contract details then approve'} />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-32 sm:px-6 sm:pb-40">
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

            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md ring-1 ring-stone-900/[0.04]">
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 bg-stone-50/80 px-4 py-3 sm:px-5">
                <KindBadge kind={kind} ar={ar} />
                <StageBadge stage={booking.contractStage} ar={ar} kind={kind} />
              </div>
              <DataTable
                rows={[
                  { label: ar ? 'رقم الحجز' : 'Booking ID', value: <span className="font-mono text-sm font-bold">{booking.id}</span> },
                  {
                    label: ar ? 'رقم العقد' : 'Contract ID',
                    value: c?.id ? (
                      <span className="font-mono text-sm font-bold break-all">{c.id}</span>
                    ) : (
                      <span className="text-sm font-normal text-stone-500">{ar ? 'غير مُسجّل بعد' : 'Not set'}</span>
                    ),
                  },
                ]}
              />
            </div>

            {property && (
              <section className="overflow-hidden rounded-xl border border-[#8B6F47]/25 bg-gradient-to-br from-[#8B6F47]/[0.07] via-white to-[#C9A961]/[0.06] shadow-md ring-1 ring-[#8B6F47]/10">
                <div className="flex items-center gap-3 border-b border-[#8B6F47]/20 bg-white/60 px-4 py-3 sm:px-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B6F47]/12 text-[#6B5535] ring-1 ring-[#8B6F47]/20" aria-hidden>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <h2 className="text-[14px] font-medium leading-snug text-stone-800 sm:text-[14px]">{ar ? 'العقار' : 'Property'}</h2>
                </div>
                <div className="p-3 sm:p-4">
                  <DataTablePair
                    caption={ar ? 'بيانات العقار' : 'Property details'}
                    rows={[
                      ...buildPropertyDataRows(property, ar),
                      { label: ar ? 'عنوان العقد (عربي)' : 'Contract title (AR)', value: str(c?.propertyTitleAr) },
                      { label: ar ? 'عنوان العقد (إنجليزي)' : 'Contract title (EN)', value: str(c?.propertyTitleEn) },
                      { label: ar ? 'مفتاح الوحدة' : 'Unit key', value: str(c?.unitKey) },
                    ]}
                  />
                </div>
              </section>
            )}

            <Section step={1} title={ar ? `بيانات ${actorLabel(ar, kind)}` : `${actorLabel(ar, kind)} details`}>
              <DataTablePair
                rows={[
                  { label: ar ? 'الاسم' : 'Name', value: str(c?.tenantName) || booking.name },
                  { label: ar ? 'البريد' : 'Email', value: str(c?.tenantEmail) || booking.email },
                  { label: ar ? 'الهاتف' : 'Phone', value: str(c?.tenantPhone) || booking.phone },
                  { label: ar ? 'الجنسية' : 'Nationality', value: str(c?.tenantNationality) },
                  { label: ar ? 'الجنس' : 'Gender', value: str(c?.tenantGender) },
                  { label: ar ? 'الرقم المدني' : 'Civil ID', value: str(c?.tenantCivilId) },
                  { label: ar ? 'انتهاء الرقم المدني' : 'Civil ID expiry', value: str(c?.tenantCivilIdExpiry) },
                  { label: ar ? 'رقم الجواز' : 'Passport', value: str(c?.tenantPassportNumber) },
                  { label: ar ? 'انتهاء الجواز' : 'Passport expiry', value: str(c?.tenantPassportExpiry) },
                  { label: ar ? 'جهة العمل' : 'Workplace', value: str(c?.tenantWorkplace) },
                  { label: ar ? 'جهة العمل (EN)' : 'Workplace (EN)', value: str(c?.tenantWorkplaceEn) },
                  { label: ar ? 'المنصب' : 'Position', value: str(c?.tenantPosition) },
                ]}
              />
            </Section>

            <Section step={2} title={ar ? `بيانات ${ownerLabel(ar, kind)}` : `${ownerLabel(ar, kind)} details`}>
              <DataTablePair
                rows={[
                  { label: ar ? 'الاسم' : 'Name', value: str(c?.landlordName) },
                  { label: ar ? 'البريد' : 'Email', value: str(c?.landlordEmail) },
                  { label: ar ? 'الهاتف' : 'Phone', value: str(c?.landlordPhone) },
                  { label: ar ? 'الجنسية' : 'Nationality', value: str(c?.landlordNationality) },
                  { label: ar ? 'الجنس' : 'Gender', value: str(c?.landlordGender) },
                  { label: ar ? 'الرقم المدني' : 'Civil ID', value: str(c?.landlordCivilId) },
                  { label: ar ? 'انتهاء الرقم المدني' : 'Civil ID expiry', value: str(c?.landlordCivilIdExpiry) },
                  { label: ar ? 'رقم الجواز' : 'Passport', value: str(c?.landlordPassportNumber) },
                  { label: ar ? 'انتهاء الجواز' : 'Passport expiry', value: str(c?.landlordPassportExpiry) },
                  { label: ar ? 'جهة العمل' : 'Workplace', value: str(c?.landlordWorkplace) },
                  { label: ar ? 'جهة العمل (EN)' : 'Workplace (EN)', value: str(c?.landlordWorkplaceEn) },
                ]}
              />
            </Section>

            {kind === 'SALE' && c?.saleViaBroker ? (
              <Section step={sectionSteps.broker} title={ar ? 'بيانات الوسيط (السمسار)' : 'Broker details'}>
                <DataTablePair
                  rows={[
                    { label: ar ? 'الاسم' : 'Name', value: str(c.brokerName) },
                    { label: ar ? 'الهاتف' : 'Phone', value: str(c.brokerPhone) },
                    { label: ar ? 'البريد' : 'Email', value: str(c.brokerEmail) },
                    { label: ar ? 'الرقم المدني' : 'Civil ID', value: str(c.brokerCivilId) },
                    { label: ar ? 'معرف جهة الاتصال' : 'Contact ID', value: str(c.brokerContactId) },
                  ]}
                />
              </Section>
            ) : null}

            {kind === 'SALE' ? (
              <Section step={sectionSteps.saleDates} title={ar ? 'تاريخ البيع ونقل الملكية' : 'Sale & transfer dates'}>
                <DataTablePair
                  rows={[
                    { label: ar ? 'تاريخ البيع' : 'Sale date', value: str(c?.saleDate) },
                    { label: ar ? 'تاريخ نقل الملكية' : 'Transfer date', value: str(c?.transferOfOwnershipDate) },
                    { label: ar ? 'ملاحظة' : 'Note', value: str(c?.saleDatesNote) },
                    { label: ar ? 'طريقة الدفع (ملخص)' : 'Payment method', value: str(c?.salePaymentMethod) },
                  ]}
                />
              </Section>
            ) : (
              <Section step={sectionSteps.duration} title={ar ? 'مدة العقد والتواريخ' : 'Duration & dates'}>
                <DataTable
                  rows={[
                    { label: ar ? 'مدة العقد (شهر)' : 'Duration (months)', value: c?.durationMonths != null ? String(c.durationMonths) : '' },
                    { label: ar ? 'تاريخ البداية' : 'Start date', value: str(c?.startDate) },
                    { label: ar ? 'تاريخ النهاية' : 'End date', value: str(c?.endDate) },
                    {
                      label:
                        ar
                          ? kind === 'INVESTMENT'
                            ? 'تاريخ بداية الاستثمار الفعلي'
                            : 'تاريخ الاستئجار الفعلي'
                          : kind === 'INVESTMENT'
                            ? 'Actual investment start'
                            : 'Actual rental date',
                      value: str(c?.actualRentalDate),
                    },
                    { label: ar ? 'تاريخ استلام الوحدة' : 'Handover date', value: str(c?.unitHandoverDate) },
                  ]}
                />
              </Section>
            )}

            {kind === 'SALE' ? (
              <Section step={sectionSteps.saleFinance} title={ar ? 'بيانات البيع والمالية' : 'Sale & finances'}>
                <div className="space-y-4">
                  <DataTablePair
                    rows={[{ label: ar ? 'ثمن البيع' : 'Sale price', value: omr(ar, c?.totalSaleAmount ?? booking.priceAtBooking ?? undefined) }]}
                  />
                  {c?.salePayments && c.salePayments.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                      <table className="w-full min-w-[28rem] border-collapse text-sm">
                        <DataTableHead>
                          <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'الدفعة' : '#'}</th>
                          <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'المبلغ' : 'Amount'}</th>
                          <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'ملاحظة' : 'Note'}</th>
                          <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'مستند' : 'Doc'}</th>
                        </DataTableHead>
                        <tbody className="divide-y divide-stone-100">
                          {c.salePayments.map((p, i) => (
                            <tr key={i} className="hover:bg-[#8B6F47]/[0.04]">
                              <td className="px-4 py-3 font-mono font-semibold text-stone-800">{p.installmentNumber}</td>
                              <td className="px-4 py-3 font-semibold tabular-nums text-stone-900">{omr(ar, p.amount)}</td>
                              <td className="px-4 py-3 text-stone-700">{str(p.note) || '—'}</td>
                              <td className="px-4 py-3">
                                {p.documentUrl ? (
                                  <a
                                    href={p.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-[#8B6F47] underline decoration-[#8B6F47]/40 underline-offset-2 hover:text-[#6B5535]"
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
                  <SaleFeesByPayerBreakdown c={c || {}} salePriceBase={salePriceBase} ar={ar} />
                </div>
              </Section>
            ) : (
              <Section step={sectionSteps.finance} title={financeLabels.section}>
                <DataTablePair
                  rows={[
                    { label: financeLabels.monthly, value: omr(ar, c?.monthlyRent ?? booking.priceAtBooking) },
                    { label: financeLabels.annual, value: omr(ar, c?.annualRent) },
                    { label: ar ? 'الضمان' : 'Deposit', value: omr(ar, c?.depositAmount) },
                    { label: ar ? 'رسوم البلدية' : 'Municipality fees', value: omr(ar, c?.municipalityFees) },
                    { label: ar ? 'تخفيض' : 'Discount', value: omr(ar, c?.discountAmount) },
                    { label: ar ? 'ضريبة مضافة' : 'VAT', value: c?.includesVAT ? (ar ? 'نعم' : 'Yes') : '' },
                    { label: ar ? 'نسبة الضريبة' : 'VAT rate', value: c?.vatRate != null ? String(c.vatRate) : '' },
                    { label: ar ? 'ضريبة شهرية' : 'Monthly VAT', value: omr(ar, c?.monthlyVATAmount) },
                    { label: ar ? 'إجمالي الضريبة' : 'Total VAT', value: omr(ar, c?.totalVATAmount) },
                    { label: ar ? 'رسوم إنترنت' : 'Internet fees', value: omr(ar, c?.internetFees) },
                    { label: ar ? 'فاتورة كهرباء' : 'Electricity bill', value: omr(ar, c?.electricityBillAmount) },
                    { label: ar ? 'فاتورة ماء' : 'Water bill', value: omr(ar, c?.waterBillAmount) },
                    { label: financeLabels.rentDueDay, value: c?.rentDueDay != null ? String(c.rentDueDay) : '' },
                    { label: ar ? 'تكرار الدفع' : 'Payment frequency', value: str(c?.rentPaymentFrequency) },
                    { label: financeLabels.rentPayMethod, value: str(c?.rentPaymentMethod) },
                    { label: ar ? 'طريقة دفع الضمان' : 'Deposit payment method', value: str(c?.depositPaymentMethod) },
                    { label: ar ? 'رقم استمارة البلدية' : 'Municipality form #', value: str(c?.municipalityFormNumber) },
                    { label: ar ? 'رقم عقد البلدية' : 'Municipality contract #', value: str(c?.municipalityContractNumber) },
                    { label: ar ? 'رسوم تسجيل البلدية' : 'Municipality registration fee', value: omr(ar, c?.municipalityRegistrationFee) },
                    { label: ar ? 'قراءة عداد الكهرباء' : 'Electricity meter', value: str(c?.electricityMeterReading) },
                    { label: ar ? 'قراءة عداد الماء' : 'Water meter', value: str(c?.waterMeterReading) },
                    { label: ar ? 'حسب المساحة' : 'By area', value: c?.calculateByArea ? (ar ? 'نعم' : 'Yes') : '' },
                    { label: ar ? 'المساحة (م²)' : 'Area m²', value: c?.rentArea != null ? String(c.rentArea) : '' },
                    { label: ar ? 'السعر للمتر' : 'Price/m²', value: omr(ar, c?.pricePerMeter) },
                    ...(c?.customMonthlyRents && c.customMonthlyRents.length > 0
                      ? [{ label: financeLabels.customMonthly, value: c.customMonthlyRents.map((x) => omr(ar, x)).join(' · ') }]
                      : []),
                    { label: ar ? 'ضمان نقدي' : 'Deposit cash', value: omr(ar, c?.depositCashAmount) },
                    { label: ar ? 'تاريخ الضمان النقدي' : 'Deposit cash date', value: str(c?.depositCashDate) },
                    { label: ar ? 'إيصال الضمان النقدي' : 'Deposit cash receipt', value: str(c?.depositCashReceiptNumber) },
                    { label: ar ? 'شيك ضمان — مبلغ' : 'Deposit cheque amount', value: omr(ar, c?.depositChequeAmount) },
                    { label: ar ? 'شيك ضمان — رقم' : 'Deposit cheque #', value: str(c?.depositChequeNumber) },
                    { label: ar ? 'شيك ضمان مطلوب' : 'Deposit cheque required', value: c?.depositChequeRequired ? (ar ? 'نعم' : 'Yes') : '' },
                    {
                      label: ar ? 'مدة شيك الضمان (أشهر)' : 'Deposit cheque months',
                      value: c?.depositChequeDurationMonths != null ? String(c.depositChequeDurationMonths) : '',
                    },
                  ]}
                />
              </Section>
            )}

            {kind !== 'SALE' && c?.checks && c.checks.length > 0 ? (
              <Section step={sectionSteps.checks} title={ar ? (kind === 'INVESTMENT' ? 'الشيكات (ملخص الاستثمار)' : 'الشيكات (ملخص العقد)') : kind === 'INVESTMENT' ? 'Contract cheques (investment)' : 'Contract cheques'}>
                <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                  <table className="w-full min-w-[24rem] border-collapse text-sm">
                    <DataTableHead>
                      <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'النوع' : 'Type'}</th>
                      <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'رقم الشيك' : 'Number'}</th>
                      <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'المبلغ' : 'Amount'}</th>
                      <th className="border-b border-stone-200 px-4 py-3 text-start text-xs font-bold text-stone-800 sm:text-sm">{ar ? 'الاستحقاق' : 'Due'}</th>
                    </DataTableHead>
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
              <Section step={sectionSteps.rentAcct} title={financeLabels.checksSection}>
                <DataTablePair
                  rows={[
                    { label: ar ? 'نوع مالك الشيكات' : 'Cheque owner type', value: str(c?.rentChecksOwnerType) },
                    { label: ar ? 'اسم مالك الشيكات' : 'Cheque owner name', value: str(c?.rentChecksOwnerName) },
                    { label: ar ? 'رقم مدني مالك الشيكات' : 'Owner civil ID', value: str(c?.rentChecksOwnerCivilId) },
                    { label: ar ? 'هاتف مالك الشيكات' : 'Owner phone', value: str(c?.rentChecksOwnerPhone) },
                    { label: ar ? 'الشركة' : 'Company', value: str(c?.rentChecksCompanyName) },
                    { label: ar ? 'رقم السجل' : 'CR', value: str(c?.rentChecksCompanyRegNumber) },
                    { label: ar ? 'المفوض' : 'Authorized rep', value: str(c?.rentChecksAuthorizedRep) },
                    { label: ar ? 'البنك' : 'Bank', value: str(c?.rentChecksBankName) },
                    { label: ar ? 'الفرع' : 'Branch', value: str(c?.rentChecksBankBranch) },
                    { label: ar ? 'معرف الحساب البنكي' : 'Bank account ID', value: str(c?.rentChecksBankAccountId) },
                  ]}
                />
              </Section>
            ) : null}

            <Section step={sectionSteps.guarantees} title={ar ? 'ضمانات وشروط إضافية' : 'Guarantees & notes'}>
              <DataTablePair
                rows={[
                  {
                    label: ar ? 'الضمانات' : 'Guarantees',
                    value: c?.guarantees ? <span className="block whitespace-pre-wrap font-normal leading-relaxed">{c.guarantees}</span> : '',
                  },
                  { label: ar ? 'نوع العقد (سكني/تجاري)' : 'Contract type', value: str(c?.contractType) },
                  { label: ar ? 'إنترنت مشمول' : 'Internet included', value: c?.internetIncluded ? (ar ? 'نعم' : 'Yes') : '' },
                  { label: ar ? 'نوع دفع الإنترنت' : 'Internet payment', value: str(c?.internetPaymentType) },
                ]}
              />
            </Section>

            {c?.otherFees && c.otherFees.length > 0 ? (
              <Section title={ar ? 'رسوم أخرى' : 'Other fees'}>
                <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                  <table className="w-full border-collapse text-sm">
                    <DataTableHead>
                      <th className="border-b border-stone-200 px-4 py-3 text-start font-bold text-stone-800">{ar ? 'الوصف' : 'Description'}</th>
                      <th className="border-b border-stone-200 px-4 py-3 text-end font-bold text-stone-800">{ar ? 'المبلغ' : 'Amount'}</th>
                    </DataTableHead>
                    <tbody className="divide-y divide-stone-100">
                      {c.otherFees.map((f, i) => (
                        <tr key={i} className="hover:bg-[#8B6F47]/[0.04]">
                          <td className="px-4 py-3 font-medium text-stone-800">{str(f.description)}</td>
                          <td className="px-4 py-3 text-end tabular-nums font-semibold text-stone-900">{omr(ar, f.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}

            {c?.hasOtherTaxes ? (
              <Section title={ar ? 'ضرائب أخرى' : 'Other taxes'}>
                <DataTable
                  rows={[
                    { label: ar ? 'الاسم' : 'Name', value: str(c.otherTaxName) },
                    { label: ar ? 'النسبة' : 'Rate', value: c.otherTaxRate != null ? String(c.otherTaxRate) : '' },
                    { label: ar ? 'شهرياً' : 'Monthly', value: omr(ar, c.monthlyOtherTaxAmount) },
                    { label: ar ? 'الإجمالي' : 'Total', value: omr(ar, c.totalOtherTaxAmount) },
                  ]}
                />
              </Section>
            ) : null}

            <Section step={sectionSteps.approvals} title={ar ? 'حالة الاعتمادات والتواريخ' : 'Approval status & audit trail'}>
              <p className="mb-4 text-sm leading-relaxed text-stone-600">
                {ar
                  ? 'يُعرض لكل خطوة: تاريخ ووقت الإجراء، واسم المنفّذ، والرقم المتسلسل في النظام عند التوفّر — لتوثيق المعاملة.'
                  : 'Each step shows date & time, performer name, and system serial when recorded — for audit purposes.'}
              </p>
              <DataTable
                rows={[
                  { label: ar ? 'حالة العقد في الملف' : 'Contract status', value: stageLabel(ar, (c?.status || booking.contractStage) as ContractStage, kind) },
                  {
                    label: ar ? 'اعتماد إداري مبدئي' : 'Admin pre-approval',
                    value:
                      c?.adminApprovedAt || c?.adminApprovedBySerial || c?.adminApprovedByFirstName ? (
                        <ApprovalAuditCell
                          ar={ar}
                          atIso={c?.adminApprovedAt}
                          firstName={c?.adminApprovedByFirstName}
                          lastName={c?.adminApprovedByLastName}
                          serial={c?.adminApprovedBySerial}
                        />
                      ) : (
                        ''
                      ),
                  },
                  {
                    label:
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
                            : 'Tenant approval',
                    value:
                      c?.tenantApprovedAt || c?.tenantApprovedBySerial || c?.tenantApprovedByFirstName ? (
                        <ApprovalAuditCell
                          ar={ar}
                          atIso={c?.tenantApprovedAt}
                          firstName={c?.tenantApprovedByFirstName}
                          lastName={c?.tenantApprovedByLastName}
                          serial={c?.tenantApprovedBySerial}
                        />
                      ) : (
                        ''
                      ),
                  },
                  {
                    label:
                      ar
                        ? kind === 'SALE'
                          ? 'اعتماد البائع (المالك)'
                          : 'اعتماد المالك'
                        : kind === 'SALE'
                          ? 'Seller (owner) approval'
                          : 'Owner approval',
                    value:
                      c?.landlordApprovedAt || c?.landlordApprovedBySerial || c?.landlordApprovedByFirstName ? (
                        <ApprovalAuditCell
                          ar={ar}
                          atIso={c?.landlordApprovedAt}
                          firstName={c?.landlordApprovedByFirstName}
                          lastName={c?.landlordApprovedByLastName}
                          serial={c?.landlordApprovedBySerial}
                        />
                      ) : (
                        ''
                      ),
                  },
                  {
                    label: ar ? 'إنشاء سجل العقد' : 'Contract record created',
                    value:
                      c?.createdAt ? (
                        <ApprovalAuditCell
                          ar={ar}
                          atIso={c.createdAt}
                          firstName={c?.contractCreatedByFirstName}
                          lastName={c?.contractCreatedByLastName}
                          serial={c?.contractCreatedBySerial}
                        />
                      ) : (
                        ''
                      ),
                  },
                  {
                    label: ar ? 'آخر تحديث للسجل' : 'Last record update',
                    value:
                      c?.updatedAt ? (
                        <ApprovalAuditCell
                          ar={ar}
                          atIso={c.updatedAt}
                          firstName={c?.contractUpdatedByFirstName}
                          lastName={c?.contractUpdatedByLastName}
                          serial={c?.contractUpdatedBySerial}
                        />
                      ) : (
                        ''
                      ),
                  },
                ]}
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

            {/* مسافة قبل الشريط السفلي حتى لا يغطي محتوى «حالة الاعتمادات» عند التمرير */}
            <div className="min-h-[10rem] w-full shrink-0 sm:min-h-[12rem]" aria-hidden />

            <div className="sticky bottom-4 z-10 mt-2 flex flex-col gap-6 rounded-2xl border border-stone-200/90 bg-white/95 p-4 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-5">
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
