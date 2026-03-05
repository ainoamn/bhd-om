'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getAllContracts,
  getContractByBooking,
  createContract,
  approveContractByAdmin,
  type RentalContract,
  type ContractStatus,
} from '@/lib/data/contracts';
import { getAllBookings, updateBooking, getBookingDisplayName } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { getPropertyLandlordContactId } from '@/lib/data/propertyLandlords';
import { getContactById, getContactDisplayName, findContactByPhoneOrEmail, isOmaniNationality } from '@/lib/data/addressBook';
import { isPropertyExtraDataComplete } from '@/lib/data/propertyExtraData';

const STATUS_LABELS: Record<ContractStatus, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة - بانتظار رفع المستندات', en: 'Draft - Pending docs' },
  ADMIN_APPROVED: { ar: 'اعتماد مبدئي من الإدارة', en: 'Preliminary admin approval' },
  TENANT_APPROVED: { ar: 'اعتمده المستأجر', en: 'Tenant Approved' },
  LANDLORD_APPROVED: { ar: 'اعتمده المالك', en: 'Landlord Approved' },
  APPROVED: { ar: 'معتمد - نافذ', en: 'Approved - Active' },
  CANCELLED: { ar: 'مُشطوب', en: 'Cancelled' },
};

export default function AdminContractsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const role = (session?.user as { role?: string })?.role;
  const canApproveContract = role === 'COMPANY' || role === 'ORG_MANAGER';

  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [bookings, setBookings] = useState<ReturnType<typeof getAllBookings>>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadData = () => {
    setContracts(getAllContracts());
    setBookings(getAllBookings());
  };

  useEffect(() => {
    loadData();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_rental_contracts' || e.key === 'bhd_property_bookings') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // إنشاء عقد تلقائياً عند القدوم من رابط createFrom
  useEffect(() => {
    const createFrom = searchParams?.get('createFrom');
    if (!createFrom || !mounted) return;
    const b = getAllBookings().find((x) => x.id === createFrom);
    if (!b || b.type !== 'BOOKING' || b.status !== 'CONFIRMED' || getContractByBooking(b.id)) return;
    if (!isPropertyExtraDataComplete(b.propertyId)) {
      const msgAr = 'يجب إكمال البيانات الإضافية للمبنى أولاً قبل إنشاء عقد الإيجار.\n\nاضغط موافق للانتقال إلى صفحة إكمال البيانات.';
      const msgEn = 'You must complete the additional building data before creating a rental contract.\n\nClick OK to go to the data completion page.';
      alert(locale === 'ar' ? msgAr : msgEn);
      window.location.href = `/${locale}/admin/properties/${b.propertyId}/extra-data`;
      return;
    }
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(b.propertyId, dataOverrides);
    if (!prop) return;
    const monthlyRent = b.priceAtBooking ?? (prop as { price?: number }).price ?? 0;
    const landlordContactId = getPropertyLandlordContactId(b.propertyId);
    const landlordContact = landlordContactId ? getContactById(landlordContactId) : null;
    const tenantContact = findContactByPhoneOrEmail(b.phone, b.email);
    const tenantName = tenantContact ? getContactDisplayName(tenantContact, locale) : getBookingDisplayName(b, locale);
    const landlordName = landlordContact ? getContactDisplayName(landlordContact, locale) : '';
    const contract = createContract({
      bookingId: b.id,
      propertyId: b.propertyId,
      unitKey: b.unitKey,
      propertyTitleAr: prop.titleAr,
      propertyTitleEn: prop.titleEn,
      tenantName: tenantName || b.name || '',
      tenantEmail: b.email || '',
      tenantPhone: b.phone || '',
      tenantNationality: tenantContact?.nationality ?? undefined,
      tenantGender: tenantContact?.gender ?? undefined,
      tenantCivilId: tenantContact?.civilId ?? undefined,
      tenantCivilIdExpiry: tenantContact?.civilIdExpiry ?? undefined,
      tenantPassportNumber: isOmaniNationality(tenantContact?.nationality ?? '') ? undefined : (tenantContact?.passportNumber ?? undefined),
      tenantPassportExpiry: isOmaniNationality(tenantContact?.nationality ?? '') ? undefined : (tenantContact?.passportExpiry ?? undefined),
      tenantWorkplace: tenantContact?.workplace ?? undefined,
      tenantWorkplaceEn: tenantContact?.workplaceEn ?? undefined,
      tenantPosition: tenantContact?.position ?? undefined,
      landlordName: landlordName || '',
      landlordEmail: landlordContact?.email ?? undefined,
      landlordPhone: landlordContact?.phone ?? undefined,
      landlordNationality: landlordContact?.nationality ?? undefined,
      landlordGender: landlordContact?.gender ?? undefined,
      landlordCivilId: landlordContact?.civilId ?? undefined,
      landlordCivilIdExpiry: landlordContact?.civilIdExpiry ?? undefined,
      landlordPassportNumber: isOmaniNationality(landlordContact?.nationality ?? '') ? undefined : (landlordContact?.passportNumber ?? undefined),
      landlordPassportExpiry: isOmaniNationality(landlordContact?.nationality ?? '') ? undefined : (landlordContact?.passportExpiry ?? undefined),
      landlordWorkplace: landlordContact?.workplace ?? undefined,
      landlordWorkplaceEn: landlordContact?.workplaceEn ?? undefined,
      monthlyRent,
      annualRent: monthlyRent * 12,
      depositAmount: b.priceAtBooking ?? monthlyRent,
      depositCashAmount: b.priceAtBooking ?? monthlyRent,
      depositCashReceiptNumber: b.depositReceiptNumber,
      checks: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      durationMonths: 12,
      status: 'DRAFT',
    });
    updateBooking(b.id, { contractId: contract.id });
    loadData();
    window.history.replaceState({}, '', `/${locale}/admin/contracts`);
    window.location.href = `/${locale}/admin/contracts/${contract.id}`;
  }, [searchParams?.get('createFrom'), mounted, locale]);

  const confirmedBookingsWithoutContract = bookings.filter(
    (b) => b.type === 'BOOKING' && b.status === 'CONFIRMED' && !getContractByBooking(b.id)
  );

  const handleCreateFromBooking = (bookingId: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    if (!isPropertyExtraDataComplete(b.propertyId)) {
      const msgAr = 'يجب إكمال البيانات الإضافية للمبنى أولاً قبل إنشاء عقد الإيجار.\n\nاضغط موافق للانتقال إلى صفحة إكمال البيانات.';
      const msgEn = 'You must complete the additional building data before creating a rental contract.\n\nClick OK to go to the data completion page.';
      alert(locale === 'ar' ? msgAr : msgEn);
      window.location.href = `/${locale}/admin/properties/${b.propertyId}/extra-data`;
      return;
    }
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(b.propertyId, dataOverrides);
    if (!prop) return;
    const monthlyRent = b.priceAtBooking ?? (prop as { price?: number }).price ?? 0;
    const landlordContactId = getPropertyLandlordContactId(b.propertyId);
    const landlordContact = landlordContactId ? getContactById(landlordContactId) : null;
    const tenantContact = findContactByPhoneOrEmail(b.phone, b.email);
    const tenantName = tenantContact ? getContactDisplayName(tenantContact, locale) : getBookingDisplayName(b, locale);
    const landlordName = landlordContact ? getContactDisplayName(landlordContact, locale) : '';
    const contract = createContract({
      bookingId: b.id,
      propertyId: b.propertyId,
      unitKey: b.unitKey,
      propertyTitleAr: prop.titleAr,
      propertyTitleEn: prop.titleEn,
      tenantName: tenantName || b.name || '',
      tenantEmail: b.email || '',
      tenantPhone: b.phone || '',
      tenantNationality: tenantContact?.nationality ?? undefined,
      tenantGender: tenantContact?.gender ?? undefined,
      tenantCivilId: tenantContact?.civilId ?? undefined,
      tenantCivilIdExpiry: tenantContact?.civilIdExpiry ?? undefined,
      tenantPassportNumber: isOmaniNationality(tenantContact?.nationality ?? '') ? undefined : (tenantContact?.passportNumber ?? undefined),
      tenantPassportExpiry: isOmaniNationality(tenantContact?.nationality ?? '') ? undefined : (tenantContact?.passportExpiry ?? undefined),
      tenantWorkplace: tenantContact?.workplace ?? undefined,
      tenantWorkplaceEn: tenantContact?.workplaceEn ?? undefined,
      tenantPosition: tenantContact?.position ?? undefined,
      landlordName: landlordName || '',
      landlordEmail: landlordContact?.email ?? undefined,
      landlordPhone: landlordContact?.phone ?? undefined,
      landlordNationality: landlordContact?.nationality ?? undefined,
      landlordGender: landlordContact?.gender ?? undefined,
      landlordCivilId: landlordContact?.civilId ?? undefined,
      landlordCivilIdExpiry: landlordContact?.civilIdExpiry ?? undefined,
      landlordPassportNumber: isOmaniNationality(landlordContact?.nationality ?? '') ? undefined : (landlordContact?.passportNumber ?? undefined),
      landlordPassportExpiry: isOmaniNationality(landlordContact?.nationality ?? '') ? undefined : (landlordContact?.passportExpiry ?? undefined),
      landlordWorkplace: landlordContact?.workplace ?? undefined,
      landlordWorkplaceEn: landlordContact?.workplaceEn ?? undefined,
      monthlyRent,
      annualRent: monthlyRent * 12,
      depositAmount: b.priceAtBooking ?? monthlyRent,
      depositCashAmount: b.priceAtBooking ?? monthlyRent,
      depositCashReceiptNumber: b.depositReceiptNumber,
      checks: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      durationMonths: 12,
      status: 'DRAFT',
    });
    updateBooking(b.id, { contractId: contract.id });
    loadData();
    window.location.href = `/${locale}/admin/contracts/${contract.id}`;
  };

  const handleApproveByAdmin = (id: string) => {
    approveContractByAdmin(id);
    loadData();
  };

  const filteredContracts = contracts.filter((c) => filterStatus === 'all' || c.status === filterStatus);

  const stats = {
    total: contracts.length,
    draft: contracts.filter((c) => c.status === 'DRAFT').length,
    approved: contracts.filter((c) => c.status === 'APPROVED').length,
    pendingApproval: contracts.filter((c) => ['ADMIN_APPROVED', 'TENANT_APPROVED', 'LANDLORD_APPROVED'].includes(c.status)).length,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={ar ? 'إدارة عقود الإيجار' : 'Rental Contracts Management'}
        subtitle={ar ? 'إنشاء وإدارة عقود الإيجار والاعتمادات' : 'Create and manage rental contracts and approvals'}
      />

      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">{ar ? 'الإجمالي' : 'Total'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="admin-card p-5 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase">{ar ? 'مسودة' : 'Draft'}</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.draft}</p>
        </div>
        <div className="admin-card p-5 border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">{ar ? 'قيد الاعتماد' : 'Pending'}</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.pendingApproval}</p>
        </div>
        <div className="admin-card p-5 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{ar ? 'معتمد' : 'Approved'}</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
        </div>
      </div>

      {/* حجوزات جاهزة لإنشاء عقد */}
      {confirmedBookingsWithoutContract.length > 0 && (
        <div className="admin-card p-6 border-[#8B6F47]/30 bg-[#8B6F47]/5">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{ar ? 'حجوزات جاهزة لإنشاء عقد' : 'Bookings Ready for Contract'}</h3>
          <p className="text-sm text-gray-600 mb-4">{ar ? 'الحجوزات المؤكدة والمكتملة المستندات يمكن تحويلها لعقد إيجار' : 'Confirmed bookings with completed documents can be converted to rental contract'}</p>
          <div className="space-y-2">
            {confirmedBookingsWithoutContract.map((b) => {
              const prop = getPropertyById(b.propertyId, getPropertyDataOverrides());
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-900">{getBookingDisplayName(b, locale)}</span>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-gray-600">{prop ? (ar ? prop.titleAr : prop.titleEn) : `#${b.propertyId}`}</span>
                    {b.unitKey && <span className="text-sm text-[#8B6F47] mr-2">({b.unitKey})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreateFromBooking(b.id)}
                    className="px-4 py-2 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
                  >
                    {ar ? 'إنشاء عقد' : 'Create Contract'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{ar ? 'عقود الإيجار' : 'Rental Contracts'}</h2>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {ar ? 'الكل' : 'All'}
            </button>
            {(['DRAFT', 'ADMIN_APPROVED', 'TENANT_APPROVED', 'LANDLORD_APPROVED', 'APPROVED', 'CANCELLED'] as ContractStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {ar ? STATUS_LABELS[s]?.ar : STATUS_LABELS[s]?.en}
              </button>
            ))}
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📋</div>
            <p className="text-gray-500 font-medium text-lg">{ar ? 'لا توجد عقود إيجار' : 'No rental contracts'}</p>
            <p className="text-gray-400 text-sm mt-1">{ar ? 'أنشئ عقداً من حجز مؤكد أو أضف عقداً جديداً' : 'Create from a confirmed booking or add a new contract'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[900px]">
              <thead>
                <tr>
                  <th>{ar ? 'العقد' : 'Contract'}</th>
                  <th>{ar ? 'العقار' : 'Property'}</th>
                  <th>{ar ? 'المستأجر' : 'Tenant'}</th>
                  <th>{ar ? 'الإيجار الشهري' : 'Monthly Rent'}</th>
                  <th>{ar ? 'المدة' : 'Duration'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono text-sm text-[#8B6F47]">{c.id.slice(0, 16)}...</span>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-gray-900">{ar ? c.propertyTitleAr : c.propertyTitleEn}</div>
                        {c.unitKey && <div className="text-xs text-gray-500">{c.unitKey}</div>}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-semibold text-gray-900">{c.tenantName}</div>
                        <div className="text-xs text-gray-500">{c.tenantPhone}</div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-gray-900">{c.monthlyRent.toLocaleString()} ر.ع</span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {new Date(c.startDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')} — {new Date(c.endDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          c.status === 'APPROVED' ? 'admin-badge-success' : c.status === 'DRAFT' ? 'admin-badge-warning' : c.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : 'admin-badge-info'
                        }`}
                      >
                        {ar ? STATUS_LABELS[c.status]?.ar : STATUS_LABELS[c.status]?.en}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/${locale}/admin/contracts/${c.id}`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                          {ar ? 'عرض / تعديل' : 'View / Edit'}
                        </Link>
                        {c.status === 'DRAFT' && canApproveContract && (
                          <button
                            type="button"
                            onClick={() => handleApproveByAdmin(c.id)}
                            className="text-sm font-medium text-emerald-600 hover:underline"
                          >
                            {ar ? 'اعتماد' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
