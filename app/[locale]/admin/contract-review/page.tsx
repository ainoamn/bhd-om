'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getPropertyById, getPropertyDataOverrides, getPropertyDisplayText } from '@/lib/data/properties';
import type { PropertyBooking } from '@/lib/data/bookings';
import type { CheckInfo, RentalContract } from '@/lib/data/contracts';
import { getContractByBooking, getContractById } from '@/lib/data/contracts';

type ContractKind = 'RENT' | 'SALE' | 'INVESTMENT';
type ContractStage = NonNullable<PropertyBooking['contractStage']>;

function stageLabel(ar: boolean, stage?: ContractStage) {
  if (!stage) return ar ? 'غير محدد' : 'Unknown';
  if (stage === 'DRAFT') return ar ? 'مسودة' : 'Draft';
  if (stage === 'ADMIN_APPROVED') return ar ? 'معتمد مبدئياً من الإدارة' : 'Admin prelim approved';
  if (stage === 'TENANT_APPROVED') return ar ? 'معتمد من العميل' : 'Client approved';
  if (stage === 'LANDLORD_APPROVED') return ar ? 'معتمد من المالك' : 'Owner approved';
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0 sm:w-52">{label}</span>
      <span className="text-gray-900 font-medium break-words flex-1">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white">
      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-2">{title}</h3>
      <div className="space-y-0">{children}</div>
    </div>
  );
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

  const kind = useMemo<ContractKind>(() => {
    return (booking?.contractKind ?? 'RENT') as ContractKind;
  }, [booking?.contractKind]);

  const effectiveContract = useMemo<Partial<RentalContract> | null>(() => {
    if (!booking) return null;
    const server = (booking.contractData || {}) as Partial<RentalContract>;
    const local = (localSnapshot || {}) as Partial<RentalContract>;
    return { ...local, ...server };
  }, [booking, localSnapshot]);

  const pageTitle = useMemo(() => {
    if (kind === 'SALE') return ar ? 'مراجعة عقد البيع واعتماده' : 'Review & approve sale contract';
    if (kind === 'INVESTMENT') return ar ? 'مراجعة عقد الاستثمار واعتماده' : 'Review & approve investment contract';
    return ar ? 'مراجعة عقد الإيجار واعتماده' : 'Review & approve rental contract';
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
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const nextStage: ContractStage = canClientApprove ? 'TENANT_APPROVED' : 'LANDLORD_APPROVED';
      const base = effectiveContract || {};
      const nextContractData: Partial<RentalContract> = {
        ...base,
        status: nextStage as RentalContract['status'],
        tenantApprovedAt: canClientApprove ? now : base.tenantApprovedAt,
        landlordApprovedAt: canOwnerApprove ? now : base.landlordApprovedAt,
        updatedAt: now,
      };

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

  const dataOverrides = getPropertyDataOverrides();
  const property = booking ? getPropertyById(String(booking.propertyId), dataOverrides) : null;

  const c = effectiveContract;
  const hasAnyContractPayload = !!(c && Object.keys(c).length > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={pageTitle} subtitle={ar ? 'اقرأ تفاصيل العقد ثم قم بالاعتماد' : 'Read contract details then approve'} />

      <div className="admin-card p-6 space-y-4">
        {!bookingId ? (
          <p className="text-gray-600">{ar ? 'رابط غير صالح' : 'Invalid link'}</p>
        ) : loading ? (
          <p className="text-gray-600">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : error && !booking ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
            <p className="font-semibold">{ar ? 'تنبيه' : 'Notice'}</p>
            <p className="text-sm mt-1">{error}</p>
            <Link href={`/${locale}/admin/my-bookings`} className="inline-block mt-3 text-[#8B6F47] font-semibold hover:underline">
              {ar ? 'العودة لحجوزاتي' : 'Back to my bookings'}
            </Link>
          </div>
        ) : !booking ? (
          <p className="text-gray-600">{ar ? 'لا توجد بيانات' : 'No data'}</p>
        ) : (
          <>
            {error ? (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-600">{ar ? 'رقم الحجز' : 'Booking ID'}</div>
                <div className="font-semibold text-gray-900">{booking.id}</div>
              </div>
              {c?.id ? (
                <div>
                  <div className="text-sm text-gray-600">{ar ? 'رقم العقد' : 'Contract ID'}</div>
                  <div className="font-semibold text-gray-900">{c.id}</div>
                </div>
              ) : null}
              <div className="text-sm text-gray-700">
                <span className="font-semibold">{ar ? 'المرحلة:' : 'Stage:'}</span> {stageLabel(ar, booking.contractStage)}
              </div>
            </div>

            {property && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">{ar ? 'العقار' : 'Property'}</div>
                <div className="text-sm text-gray-700 mt-1">{getPropertyDisplayText(property)}</div>
                <Field label={ar ? 'عنوان العقد (عربي)' : 'Title (AR)'} value={str(c?.propertyTitleAr)} />
                <Field label={ar ? 'عنوان العقد (إنجليزي)' : 'Title (EN)'} value={str(c?.propertyTitleEn)} />
                <Field label={ar ? 'مفتاح الوحدة' : 'Unit key'} value={str(c?.unitKey)} />
              </div>
            )}

            <Section title={ar ? `١. بيانات ${actorLabel(ar, kind)}` : `1. ${actorLabel(ar, kind)} details`}>
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

            <Section title={ar ? `٢. بيانات ${ownerLabel(ar, kind)}` : `2. ${ownerLabel(ar, kind)} details`}>
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
              <Section title={ar ? '٣. بيانات الوسيط (السمسار)' : '3. Broker'}>
                <Field label={ar ? 'الاسم' : 'Name'} value={str(c.brokerName)} />
                <Field label={ar ? 'الهاتف' : 'Phone'} value={str(c.brokerPhone)} />
                <Field label={ar ? 'البريد' : 'Email'} value={str(c.brokerEmail)} />
                <Field label={ar ? 'الرقم المدني' : 'Civil ID'} value={str(c.brokerCivilId)} />
                <Field label={ar ? 'معرف جهة الاتصال' : 'Contact ID'} value={str(c.brokerContactId)} />
              </Section>
            ) : null}

            {kind === 'SALE' ? (
              <Section title={ar ? '٤. تاريخ البيع ونقل الملكية' : '4. Sale & transfer dates'}>
                <Field label={ar ? 'تاريخ البيع' : 'Sale date'} value={str(c?.saleDate)} />
                <Field label={ar ? 'تاريخ نقل الملكية' : 'Transfer date'} value={str(c?.transferOfOwnershipDate)} />
                <Field label={ar ? 'ملاحظة' : 'Note'} value={str(c?.saleDatesNote)} />
                <Field label={ar ? 'طريقة الدفع (ملخص)' : 'Payment method'} value={str(c?.salePaymentMethod)} />
              </Section>
            ) : (
              <Section title={ar ? '٣. مدة العقد والتواريخ' : '3. Duration & dates'}>
                <Field label={ar ? 'مدة العقد (شهر)' : 'Duration (months)'} value={c?.durationMonths != null ? String(c.durationMonths) : ''} />
                <Field label={ar ? 'تاريخ البداية' : 'Start date'} value={str(c?.startDate)} />
                <Field label={ar ? 'تاريخ النهاية' : 'End date'} value={str(c?.endDate)} />
                <Field label={ar ? 'تاريخ الاستئجار الفعلي' : 'Actual rental date'} value={str(c?.actualRentalDate)} />
                <Field label={ar ? 'تاريخ استلام الوحدة' : 'Handover date'} value={str(c?.unitHandoverDate)} />
              </Section>
            )}

            {kind === 'SALE' ? (
              <Section title={ar ? '٥. بيانات البيع والمالية' : '5. Sale & finances'}>
                <Field
                  label={ar ? 'ثمن البيع' : 'Sale price'}
                  value={omr(ar, c?.totalSaleAmount ?? booking.priceAtBooking ?? undefined)}
                />
                {c?.salePayments && c.salePayments.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right border-b">{ar ? 'الدفعة' : '#'}</th>
                          <th className="px-3 py-2 text-right border-b">{ar ? 'المبلغ' : 'Amount'}</th>
                          <th className="px-3 py-2 text-right border-b">{ar ? 'ملاحظة' : 'Note'}</th>
                          <th className="px-3 py-2 text-right border-b">{ar ? 'مستند' : 'Doc'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.salePayments.map((p, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-3 py-2">{p.installmentNumber}</td>
                            <td className="px-3 py-2">{omr(ar, p.amount)}</td>
                            <td className="px-3 py-2">{str(p.note)}</td>
                            <td className="px-3 py-2">
                              {p.documentUrl ? (
                                <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] underline">
                                  {ar ? 'فتح' : 'Open'}
                                </a>
                              ) : p.documentFile?.name ? (
                                <span>{p.documentFile.name}</span>
                              ) : (
                                '—'
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
                    value={c?.saleBrokerageFeePercent != null ? `${c.saleBrokerageFeePercent}% (${payerLabel(ar, c.saleBrokerageFeePayer)})` : ''}
                  />
                  <Field
                    label={ar ? 'رسوم الإسكان (%)' : 'Housing %'}
                    value={c?.saleHousingFeePercent != null ? `${c.saleHousingFeePercent}% (${payerLabel(ar, c.saleHousingFeePayer)})` : ''}
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
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">{ar ? 'رسوم أخرى' : 'Other fees'}</div>
                    <ul className="text-sm space-y-1">
                      {c.saleOtherFeesList.map((f, i) => (
                        <li key={i}>
                          {str(f.description)} — {omr(ar, f.amount)} ({payerLabel(ar, f.payer)})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            ) : (
              <Section title={ar ? '٤. المالية والإيجار' : '4. Rent & finances'}>
                <Field label={ar ? 'الإيجار الشهري' : 'Monthly rent'} value={omr(ar, c?.monthlyRent ?? booking.priceAtBooking)} />
                <Field label={ar ? 'الإيجار السنوي' : 'Annual rent'} value={omr(ar, c?.annualRent)} />
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
                <Field label={ar ? 'يوم استحقاق الإيجار' : 'Rent due day'} value={c?.rentDueDay != null ? String(c.rentDueDay) : ''} />
                <Field label={ar ? 'تكرار الدفع' : 'Payment frequency'} value={str(c?.rentPaymentFrequency)} />
                <Field label={ar ? 'طريقة دفع الإيجار' : 'Rent payment method'} value={str(c?.rentPaymentMethod)} />
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
                  <Field
                    label={ar ? 'إيجارات شهرية مخصصة' : 'Custom monthly rents'}
                    value={c.customMonthlyRents.map((x) => omr(ar, x)).join(' · ')}
                  />
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
              <Section title={ar ? '٥. الشيكات (ملخص العقد)' : '5. Contract cheques'}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-right border-b">{ar ? 'النوع' : 'Type'}</th>
                        <th className="px-3 py-2 text-right border-b">{ar ? 'رقم الشيك' : 'Number'}</th>
                        <th className="px-3 py-2 text-right border-b">{ar ? 'المبلغ' : 'Amount'}</th>
                        <th className="px-3 py-2 text-right border-b">{ar ? 'الاستحقاق' : 'Due'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(c.checks as CheckInfo[]).map((ch, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2">{str(ch.type)}</td>
                          <td className="px-3 py-2">{str(ch.checkNumber)}</td>
                          <td className="px-3 py-2">{omr(ar, ch.amount)}</td>
                          <td className="px-3 py-2">{str(ch.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}

            <Section title={ar ? 'شيكات الإيجار — بيانات الحساب والمالك' : 'Rent cheques — account & owner'}>
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

            <Section title={ar ? 'ضمانات وشروط إضافية' : 'Guarantees & notes'}>
              <Field label={ar ? 'الضمانات' : 'Guarantees'} value={c?.guarantees ? <span className="whitespace-pre-wrap">{c.guarantees}</span> : ''} />
              <Field label={ar ? 'نوع العقد (سكني/تجاري)' : 'Contract type'} value={str(c?.contractType)} />
              <Field label={ar ? 'إنترنت مشمول' : 'Internet included'} value={c?.internetIncluded ? (ar ? 'نعم' : 'Yes') : ''} />
              <Field label={ar ? 'نوع دفع الإنترنت' : 'Internet payment'} value={str(c?.internetPaymentType)} />
            </Section>

            {c?.otherFees && c.otherFees.length > 0 ? (
              <Section title={ar ? 'رسوم أخرى (مصفوفة)' : 'Other fees'}>
                <ul className="text-sm space-y-1">
                  {c.otherFees.map((f, i) => (
                    <li key={i}>
                      {str(f.description)} — {omr(ar, f.amount)}
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
              <Field label={ar ? 'حالة العقد في الملف' : 'Contract status'} value={str(c?.status)} />
              <Field label={ar ? 'اعتماد إداري مبدئي' : 'Admin approved at'} value={str(c?.adminApprovedAt)} />
              <Field label={ar ? 'اعتماد العميل' : 'Tenant approved at'} value={str(c?.tenantApprovedAt)} />
              <Field label={ar ? 'اعتماد المالك' : 'Landlord approved at'} value={str(c?.landlordApprovedAt)} />
              <Field label={ar ? 'أُنشئ' : 'Created'} value={str(c?.createdAt)} />
              <Field label={ar ? 'آخر تحديث' : 'Updated'} value={str(c?.updatedAt)} />
            </Section>

            {!hasAnyContractPayload ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                <div className="font-semibold">{ar ? 'تنبيه' : 'Notice'}</div>
                <div className="text-sm mt-1">
                  {ar
                    ? 'تفاصيل العقد غير مخزنة بعد على الخادم لهذا الحجز. اطلب من الإدارة فتح صفحة العقد وحفظ/مزامنة الحالة مرة أخرى، أو افتح الموقع من نفس الجهاز الذي يحتوي العقد محلياً.'
                    : 'Contract details are not stored on the server for this booking yet. Ask admin to open the contract page once to re-sync, or use a device that has the contract in local storage.'}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 items-center justify-between pt-2">
              <Link href={`/${locale}/admin/my-bookings`} className="text-[#8B6F47] font-semibold hover:underline">
                {ar ? '← العودة لحجوزاتي' : '← Back to my bookings'}
              </Link>

              {canClientApprove || canOwnerApprove ? (
                <button
                  type="button"
                  onClick={approve}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition-colors ${
                    saving ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {saving ? (ar ? 'جاري الاعتماد...' : 'Approving...') : ar ? 'اعتماد العقد' : 'Approve contract'}
                </button>
              ) : (
                <span className="text-gray-500 text-sm">
                  {ar ? 'لا يوجد إجراء اعتماد متاح حالياً' : 'No approval action available right now'}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
