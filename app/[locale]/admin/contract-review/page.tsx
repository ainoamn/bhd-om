'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getPropertyById, getPropertyDataOverrides, getPropertyDisplayText } from '@/lib/data/properties';
import type { PropertyBooking } from '@/lib/data/bookings';
import type { RentalContract } from '@/lib/data/contracts';

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
        const found = Array.isArray(list) ? (list.find((b: any) => String(b?.id) === String(bookingId)) as PropertyBooking | undefined) : undefined;
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

  const kind = useMemo<ContractKind>(() => {
    const k = (booking?.contractKind ?? 'RENT') as ContractKind;
    return k;
  }, [booking?.contractKind]);

  const contract = useMemo<Partial<RentalContract> | null>(() => {
    return (booking?.contractData as Partial<RentalContract> | undefined) ?? null;
  }, [booking?.contractData]);

  const canClientApprove = useMemo(() => {
    if (!booking?.contractStage) return false;
    if (booking.contractStage !== 'ADMIN_APPROVED') return false;
    // العميل ليس OWNER
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
      const nextContractData: Partial<RentalContract> | undefined = contract
        ? {
            ...contract,
            status: nextStage as any,
            tenantApprovedAt: canClientApprove ? now : (contract as any).tenantApprovedAt,
            landlordApprovedAt: canOwnerApprove ? now : (contract as any).landlordApprovedAt,
            updatedAt: now,
          }
        : undefined;

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
        } catch {}
        throw new Error(msg);
      }

      // تحديث العرض محلياً
      setBooking(payload);
      router.push(`/${locale}/admin/my-bookings`);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const dataOverrides = getPropertyDataOverrides();
  const property = booking ? getPropertyById(String(booking.propertyId), dataOverrides) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={ar ? 'مراجعة العقد واعتماده' : 'Review & approve contract'}
        subtitle={ar ? 'اقرأ ملخص العقد ثم قم بالاعتماد' : 'Read contract summary then approve'}
      />

      <div className="admin-card p-6 space-y-4">
        {!bookingId ? (
          <p className="text-gray-600">{ar ? 'رابط غير صالح' : 'Invalid link'}</p>
        ) : loading ? (
          <p className="text-gray-600">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : error ? (
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-600">{ar ? 'رقم الحجز' : 'Booking ID'}</div>
                <div className="font-semibold text-gray-900">{booking.id}</div>
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-semibold">{ar ? 'المرحلة:' : 'Stage:'}</span> {stageLabel(ar, booking.contractStage)}
              </div>
            </div>

            {property && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">{ar ? 'العقار' : 'Property'}</div>
                <div className="text-sm text-gray-700 mt-1">{getPropertyDisplayText(property)}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold text-gray-900">{ar ? 'بيانات العميل' : 'Client'}</div>
                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  <div><span className="text-gray-500">{ar ? 'الاسم:' : 'Name:'}</span> {contract?.tenantName || booking.name || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'البريد:' : 'Email:'}</span> {contract?.tenantEmail || booking.email || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'الهاتف:' : 'Phone:'}</span> {contract?.tenantPhone || booking.phone || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'الدور:' : 'Role:'}</span> {actorLabel(ar, kind)}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold text-gray-900">{ar ? 'بيانات المالك' : 'Owner'}</div>
                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  <div><span className="text-gray-500">{ar ? 'الاسم:' : 'Name:'}</span> {contract?.landlordName || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'البريد:' : 'Email:'}</span> {contract?.landlordEmail || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'الهاتف:' : 'Phone:'}</span> {contract?.landlordPhone || '—'}</div>
                  <div><span className="text-gray-500">{ar ? 'الدور:' : 'Role:'}</span> {ownerLabel(ar, kind)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">{ar ? 'ملخص مالي' : 'Financial summary'}</div>
              <div className="text-sm text-gray-700 mt-2">
                {kind === 'SALE' ? (
                  <div>
                    <span className="text-gray-500">{ar ? 'ثمن البيع:' : 'Sale price:'}</span>{' '}
                    {((contract as any)?.totalSaleAmount ?? booking.priceAtBooking ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500">{ar ? 'الإيجار الشهري:' : 'Monthly rent:'}</span>{' '}
                      {((contract as any)?.monthlyRent ?? booking.priceAtBooking ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500">{ar ? 'الإيجار السنوي:' : 'Annual rent:'}</span>{' '}
                      {((contract as any)?.annualRent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {!contract ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                <div className="font-semibold">{ar ? 'تنبيه' : 'Notice'}</div>
                <div className="text-sm mt-1">
                  {ar ? 'محتوى العقد غير متوفر بعد على هذا الجهاز. يرجى المحاولة لاحقاً.' : 'Contract content is not available yet on this device. Please try again later.'}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 items-center justify-between pt-2">
              <Link href={`/${locale}/admin/my-bookings`} className="text-[#8B6F47] font-semibold hover:underline">
                {ar ? '← العودة لحجوزاتي' : '← Back to my bookings'}
              </Link>

              {(canClientApprove || canOwnerApprove) ? (
                <button
                  type="button"
                  onClick={approve}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition-colors ${
                    saving ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {saving ? (ar ? 'جاري الاعتماد...' : 'Approving...') : (ar ? 'اعتماد العقد' : 'Approve contract')}
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

