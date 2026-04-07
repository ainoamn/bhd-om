'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { updateBookingStatus, createBooking, updateBooking, deleteBooking, hasBookingFinancialLinkage, syncPaidBookingsToAccounting, getBookingDisplayName, isCompanyBooking, requestBookingCancellation, hasPendingCancellationRequest, canCreateBooking, mergeBookingsFromServer, type PropertyBooking, type BookingStatus } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getUnitSerialNumber, properties } from '@/lib/data/properties';
import { getContractByBooking, hasActiveContractForUnit, type RentalContract } from '@/lib/data/contracts';
import { areAllRequiredDocumentsApproved, getDocumentsByBooking, hasDocumentsNeedingConfirmation } from '@/lib/data/bookingDocuments';
import { getChecksByBooking, areAllChecksApproved } from '@/lib/data/bookingChecks';
import { getDocumentUploadLink, openWhatsAppWithMessage, openEmailWithMessage } from '@/lib/documentUploadLink';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import { searchContacts, getContactDisplayName, getContactById, findContactByPhoneOrEmail, isOmaniNationality, isCompanyContact } from '@/lib/data/addressBook';
import { getActiveBankAccounts, getDefaultBankAccount, getBankAccountById } from '@/lib/data/bankAccounts';
import ContactFormModal from '@/components/admin/ContactFormModal';
import AddUnitModal from '@/components/admin/AddUnitModal';
import BookingDocumentsPanel from '@/components/admin/BookingDocumentsPanel';
import DateInput from '@/components/shared/DateInput';

/** يطابق النص مع خيارات البحث - يدعم العربية والأرقام */
function matchesSearch(text: string, search: string): boolean {
  if (!search.trim()) return true;
  const normalize = (str: string) =>
    str
      .replace(/\s+/g, ' ')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .trim();
  const t = normalize(text);
  const s = normalize(search);
  return t.includes(s) || t.replace(/\s/g, '').includes(s.replace(/\s/g, ''));
}

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

type ContractStageLike = 'DRAFT' | 'ADMIN_APPROVED' | 'TENANT_APPROVED' | 'LANDLORD_APPROVED' | 'APPROVED' | 'CANCELLED';

function getDisplayContractStageForBooking(b: PropertyBooking, contractStatus?: string): ContractStageLike | undefined {
  const stage = (b.contractStage || contractStatus) as ContractStageLike | undefined;
  const reqs = Array.isArray((b as any)?.signatureRequests) ? ((b as any).signatureRequests as any[]) : [];
  const latestClient = reqs.find((r) => String(r?.actorRole) === 'CLIENT');
  const latestOwner = reqs.find((r) => String(r?.actorRole) === 'OWNER');
  const clientPendingOrFailed = ['PENDING', 'FAILED'].includes(String(latestClient?.status || ''));
  const ownerPendingOrFailed = ['PENDING', 'FAILED'].includes(String(latestOwner?.status || ''));
  if (stage === 'TENANT_APPROVED' && clientPendingOrFailed) return 'ADMIN_APPROVED';
  if (stage === 'LANDLORD_APPROVED' && ownerPendingOrFailed) return 'TENANT_APPROVED';
  return stage;
}

/** هل الوحدة/العقار متاح للحجز؟ (لا حجز فعال ولا عقد إيجار نافذ) - excludeBookingId لاستثناء حجز عند التعديل */
function isUnitAvailableForBooking(
  propertyId: number,
  unitKey: string | undefined,
  bookings: PropertyBooking[],
  excludeBookingId?: string
): boolean {
  if (hasActiveContractForUnit(propertyId, unitKey)) return false;
  const hasActiveBooking = bookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      b.propertyId === propertyId &&
      (b.unitKey || '') === (unitKey || '') &&
      b.status !== 'CANCELLED'
  );
  return !hasActiveBooking;
}

export default function AdminBookingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'BOOKING' | 'VIEWING'>('ALL');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [manualForm, setManualForm] = useState({
    propertyId: '',
    unitKey: '',
    contactId: '',
    message: '',
    paymentConfirmed: false,
    priceAtBooking: '',
    paymentMethod: '' as '' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
    paymentReferenceNo: '',
    paymentDate: '',
    bankAccountId: '',
  });
  const [propertySearch, setPropertySearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEditContactForBooking, setShowEditContactForBooking] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [contactDataConfirmedForBooking, setContactDataConfirmedForBooking] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteBlockedId, setDeleteBlockedId] = useState<string | null>(null);
  const [documentsPanelBooking, setDocumentsPanelBooking] = useState<PropertyBooking | null>(null);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(e.target as Node)) setPropertyDropdownOpen(false);
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target as Node)) setUnitDropdownOpen(false);
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target as Node)) setContactDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => setMounted(true), []);

  const loadData = async () => {
    if (typeof window !== 'undefined') syncPaidBookingsToAccounting(); // مزامنة تلقائية مع المحاسبة
    try {
      const res = await fetch('/api/bookings', { credentials: 'include', cache: 'no-store' });
      const serverBookings = res.ok ? await res.json() : [];
      if (Array.isArray(serverBookings)) {
        setBookings(serverBookings);
        if (serverBookings.length > 0) mergeBookingsFromServer(serverBookings);
        return;
      }
    } catch {
      // ignore
    }
    setBookings([]);
  };

  const [bankAccountsVersion, setBankAccountsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadData();
    })();

    const onFocus = () => {
      if (!cancelled) void loadData();
    };
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') void loadData();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    // polling احتياطي خفيف فقط.
    const iv = window.setInterval(() => {
      if (cancelled || document.visibilityState !== 'visible') return;
      void loadData();
    }, 60000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_property_bookings' || e.key === 'bhd_booking_documents' || e.key === 'bhd_booking_cancellation_requests') loadData();
      if (e.key === 'bhd_bank_accounts') setBankAccountsVersion((v) => v + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(iv);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const bankAccounts = typeof window !== 'undefined' ? getActiveBankAccounts() : [];
  const defaultBankAccount = typeof window !== 'undefined' ? getDefaultBankAccount() : null;

  const contacts = showManualBooking && typeof window !== 'undefined' ? searchContacts(contactSearch) : [];

  const getUnitDisplay = (propertyId: number, unitKey?: string) => {
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(propertyId, dataOverrides);
    const baseProp = properties.find((p: { id: number }) => p.id === propertyId);
    const serial = (prop as { serialNumber?: string })?.serialNumber || (baseProp as { serialNumber?: string })?.serialNumber || '';
    if (!unitKey) return { serial, label: ar ? 'عقار كامل' : 'Full property' };
    const [unitType, idxStr] = unitKey.split('-');
    const idx = parseInt(idxStr, 10);
    const typeMap: Record<string, { ar: string; en: string }> = {
      shop: { ar: 'محل', en: 'Shop' },
      showroom: { ar: 'معرض', en: 'Showroom' },
      apartment: { ar: 'شقة', en: 'Apartment' },
    };
    const typeKey = unitType === 'shop' ? 'shop' : unitType === 'showroom' ? 'showroom' : 'apartment';
    const unitSerial = serial ? getUnitSerialNumber(serial, typeKey, idx) : '';
    const label = ar ? `${typeMap[unitType]?.ar || unitType} ${idx + 1}` : `${typeMap[unitType]?.en || unitType} ${idx + 1}`;
    return { serial: unitSerial, label };
  };

  const syncBookingToServer = (b: PropertyBooking) => {
    fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).catch(() => {});
  };

  const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
    updateBookingStatus(bookingId, newStatus);
    const updated = bookings.find((b) => b.id === bookingId);
    if (updated) syncBookingToServer({ ...updated, status: newStatus });
    void loadData();
  };

  const getContractForBooking = (b: PropertyBooking) => {
    const hasServerContract =
      !!String((b as PropertyBooking & { contractId?: unknown }).contractId || '').trim() ||
      !!((b as PropertyBooking & { contractData?: unknown }).contractData);
    if (hasServerContract) {
      const cd = ((b as PropertyBooking & { contractData?: Record<string, unknown> }).contractData || {}) as Record<string, unknown>;
      return {
        id: String((b as PropertyBooking & { contractId?: unknown }).contractId || b.id),
        status: String((b as PropertyBooking & { contractStage?: unknown }).contractStage || 'DRAFT'),
        monthlyRent: Number(cd.monthlyRent || 0),
        annualRent: Number(cd.annualRent || 0),
        startDate: String(cd.startDate || ''),
        endDate: String(cd.endDate || ''),
      } as Pick<RentalContract, 'id' | 'status' | 'monthlyRent' | 'annualRent' | 'startDate' | 'endDate'>;
    }
    return getContractByBooking(b.id);
  };
  const getApprovedContractForBooking = (b: PropertyBooking) => {
    const c = getContractForBooking(b);
    return c && String(c.status) === 'APPROVED' ? c : undefined;
  };
  const isStatusLocked = (b: PropertyBooking) => !!getContractForBooking(b);
  const hasContract = (b: PropertyBooking) => !!getContractForBooking(b);

  const termsForProperty = (propId: number) => getPropertyBookingTerms(String(propId));
  const canCreateContract = (b: PropertyBooking) => {
    if (!b.accountantConfirmedAt?.trim()) return false;
    const terms = termsForProperty(b.propertyId);
    const hasRequired = (terms.requiredDocTypes || []).some((r) => r.isRequired);
    if (!hasRequired) return true;
    return getDocumentsByBooking(b.id).length > 0 && areAllRequiredDocumentsApproved(b.id);
  };

  const filteredBookings = bookings.filter((b) => {
    const typeMatch = filterType === 'ALL' || b.type === filterType;
    const propMatch = filterProperty === 'all' || String(b.propertyId) === filterProperty;
    return typeMatch && propMatch;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
    confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
    withPayment: bookings.filter((b) => b.type === 'BOOKING' && b.paymentConfirmed).length,
  };

  const propertyIds = [...new Set(bookings.map((b) => b.propertyId))];
  const dataOverrides = getPropertyDataOverrides();

  const selectedPropId = filterProperty !== 'all' ? parseInt(filterProperty, 10) : null;
  const selectedProp = selectedPropId ? getPropertyById(selectedPropId, dataOverrides) : null;

  return (
    <div className="space-y-8">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <Link
              href={`/${locale}/admin/bookings`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all bg-white text-gray-900 shadow-sm"
            >
              {ar ? 'إدارة الحجوزات كاملة' : 'All Bookings'}
            </Link>
            <Link
              href={propertyIds.length > 0 ? `/${locale}/admin/properties/${filterProperty !== 'all' ? filterProperty : propertyIds[0]}/bookings` : `/${locale}/admin/properties`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                false ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              {ar ? 'إدارة حجز عقار معين' : 'Property Bookings'}
            </Link>
          </div>
          {propertyIds.length > 0 && (
            <select
              onChange={(e) => {
                const v = e.target.value;
                if (v) window.location.href = `/${locale}/admin/properties/${v}/bookings`;
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:ring-2 focus:ring-[#8B6F47]/20 focus:border-[#8B6F47] outline-none"
              value=""
            >
              <option value="">{ar ? '— اختر عقار —' : '— Select property —'}</option>
              {propertyIds.map((pid) => {
                const p = getPropertyById(pid, dataOverrides);
                return (
                  <option key={pid} value={pid}>
                    {p ? (ar ? p.titleAr : p.titleEn) : `#${pid}`}
                  </option>
                );
              })}
            </select>
          )}
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
              {ar ? 'حجوزات العقارات' : 'Property Bookings'}
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              {selectedProp ? (ar ? selectedProp.titleAr : selectedProp.titleEn) : (ar ? 'جميع العقارات' : 'All Properties')}
            </p>
            {selectedProp && (
              <p className="text-sm font-mono text-[#8B6F47] mt-0.5">
                {ar ? 'رقم العقار:' : 'Property:'} {(selectedProp as { serialNumber?: string })?.serialNumber || '—'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {(selectedPropId || propertyIds[0] || properties[0]?.id) && (
              <>
                <Link
                  href={`/${locale}/admin/accounting?tab=cheques&action=add&propertyId=${selectedPropId || propertyIds[0] || properties[0]?.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
                >
                  <span>📝</span>
                  {ar ? 'إضافة شيك' : 'Add Cheque'}
                </Link>
                <Link
                  href={`/${locale}/admin/properties/${selectedPropId || propertyIds[0] || properties[0]?.id}/bookings/terms`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all"
                >
                  <span>📋</span>
                  {ar ? 'الشروط' : 'Terms'}
                </Link>
                <Link
                  href={`/${locale}/properties/${selectedPropId || propertyIds[0] || properties[0]?.id}/book`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
                >
                  <span>🔗</span>
                  {ar ? 'عرض صفحة الحجز' : 'View Booking Page'}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

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

      <div className={`bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{ar ? 'طلبات الحجز والمعاينة' : 'Booking & Viewing Requests'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ar ? 'قم بتأكيد الحجز أو تغيير الحالة من القائمة أدناه.' : 'Confirm bookings or update status from the list below.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                setEditingBookingId(null);
                setShowManualBooking(true);
                setPropertySearch('');
                setUnitSearch('');
                setContactSearch('');
                setContactDataConfirmedForBooking(false);
                setPropertyDropdownOpen(false);
                setUnitDropdownOpen(false);
                setContactDropdownOpen(false);
                setManualForm({ propertyId: '', unitKey: '', contactId: '', message: '', paymentConfirmed: false, priceAtBooking: '', paymentMethod: '', paymentReferenceNo: '', paymentDate: '', bankAccountId: '' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-sm"
            >
              <span>➕</span>
              {ar ? 'إضافة حجز يدوي' : 'Add Manual Booking'}
            </button>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              {(['ALL', 'BOOKING', 'VIEWING'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {f === 'ALL' ? (ar ? 'الكل' : 'All') : ar ? TYPE_LABELS[f]?.ar : TYPE_LABELS[f]?.en}
                </button>
              ))}
            </div>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#8B6F47]/20 focus:border-[#8B6F47] outline-none bg-white"
            >
              <option value="all">{ar ? 'كل العقارات' : 'All Properties'}</option>
              {propertyIds.map((pid) => {
                const p = getPropertyById(pid, dataOverrides);
                return (
                  <option key={pid} value={pid}>
                    {p ? (ar ? p.titleAr : p.titleEn) : `#${pid}`}
                  </option>
                );
              })}
            </select>
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
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'رقم الحجز' : 'Booking #'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{ar ? 'العقار' : 'Property'}</th>
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
                  {filteredBookings.map((b) => {
                    const { serial, label } = getUnitDisplay(b.propertyId, b.unitKey);
                    const prop = getPropertyById(b.propertyId, dataOverrides);
                    const propSerial = (prop as { serialNumber?: string })?.serialNumber || '';
                    return (
                      <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-[#8B6F47] font-semibold" title={b.bookingSerial || b.id}>
                            {b.bookingSerial || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/${locale}/admin/properties/${b.propertyId}/bookings`} className="text-[#8B6F47] hover:underline font-medium">
                            {prop ? (ar ? prop.titleAr : prop.titleEn) : `#${b.propertyId}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium">
                            {new Date(b.createdAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${b.type === 'BOOKING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                            {ar ? TYPE_LABELS[b.type]?.ar : TYPE_LABELS[b.type]?.en}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {!b.unitKey ? (
                            <div>
                              <div className="text-gray-500">{ar ? 'عقار كامل' : 'Full property'}</div>
                              {propSerial && <div className="text-xs font-mono text-[#8B6F47] mt-0.5">{propSerial}</div>}
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-gray-900">{label}</div>
                              <div className="text-xs font-mono text-[#8B6F47] mt-0.5">{serial || b.unitKey}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {b.type === 'BOOKING' ? (
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">{ar ? 'المبلغ:' : 'Amount:'}</span>{' '}
                                {b.priceAtBooking != null ? `${b.priceAtBooking.toLocaleString()} ر.ع` : '—'}
                              </div>
                              <div>
                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${b.paymentConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {b.paymentConfirmed ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'لم يُدفع' : 'Not paid')}
                                </span>
                              </div>
                              {b.paymentConfirmed && b.paymentMethod && (
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>
                                    {b.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : b.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل في حساب البنك' : 'Bank transfer') : (ar ? 'شيك' : 'Cheque')}
                                  </div>
                                  {b.paymentReferenceNo && <div>{ar ? 'رقم الإيصال/الشيك:' : 'Ref:'} {b.paymentReferenceNo}</div>}
                                  {b.paymentDate && <div>{ar ? 'التاريخ:' : 'Date:'} {new Date(b.paymentDate + 'T12:00:00').toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</div>}
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
                                const displayStage = getDisplayContractStageForBooking(b, c?.status);
                                const contractStatusLabel = !c ? (ar ? 'عقد قيد الإعداد' : 'Contract in progress') : displayStage === 'APPROVED'
                                  ? (ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)')
                                  : displayStage === 'ADMIN_APPROVED'
                                    ? (ar ? 'بانتظار توقيع المشتري' : 'Waiting for buyer signature')
                                    : displayStage === 'TENANT_APPROVED'
                                      ? (ar ? 'بانتظار توقيع البائع (المالك)' : 'Waiting for seller (owner) signature')
                                      : displayStage === 'LANDLORD_APPROVED'
                                    ? allDocsAndChecksApproved
                                      ? (ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval')
                                      : (ar ? 'تم اعتماده مبدئياً من قبل الإدارة وفي انتظار إكمال البيانات من قبل المستأجر لاعتماد المستندات' : 'Preliminarily approved by admin, awaiting tenant to complete data for document approval')
                                    : (ar ? 'عقد مسودة - بانتظار رفع المستندات' : 'Draft - pending document upload');
                                const docUploadLink = typeof window !== 'undefined' ? getDocumentUploadLink(window.location.origin, locale, b.propertyId, b.id, b.email) : '';
                                const docMsg = ar ? `مرحباً، يرجى إكمال إجراءات توثيق العقد عن طريق رفع المستندات المطلوبة:\n${docUploadLink}` : `Hello, please complete the contract documentation by uploading the required documents:\n${docUploadLink}`;
                                const needsDocs = c && c.status !== 'APPROVED';
                                const needsApproval = hasDocumentsNeedingConfirmation(b.id) || (getChecksByBooking(b.id).length > 0 && !areAllChecksApproved(b.id));
                                const propKind = ((getPropertyById(b.propertyId, getPropertyDataOverrides()) as { type?: 'RENT' | 'SALE' | 'INVESTMENT' } | null)?.type ?? 'RENT') as
                                  | 'RENT'
                                  | 'SALE'
                                  | 'INVESTMENT';
                                const contractsHref = c?.id
                                  ? `/${locale}/admin/contracts/${c.id}`
                                  : `/${locale}/admin/contracts?kind=${propKind}`;
                                return (
                                  <>
                                    <span className={`inline-flex px-3 py-1 rounded-xl text-sm font-semibold border ${isApproved ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      {contractStatusLabel}
                                    </span>
                                    {needsApproval && (
                                      <button
                                        type="button"
                                        onClick={() => setDocumentsPanelBooking(b)}
                                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border border-amber-500/40"
                                      >
                                        📋 {ar ? 'اعتماد المستندات' : 'Approve documents'}
                                      </button>
                                    )}
                                    {approved && (
                                      <div className="text-xs text-gray-600">
                                        {approved.monthlyRent.toLocaleString()} ر.ع/شهر • {approved.annualRent.toLocaleString()} ر.ع/سنة • {new Date(approved.startDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')} — {new Date(approved.endDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}
                                      </div>
                                    )}
                                    <Link href={contractsHref} className="text-xs text-[#8B6F47] hover:underline block">
                                      {ar ? 'تعديل من صفحة العقود' : 'Edit from contracts page'}
                                    </Link>
                                    {needsDocs && docUploadLink && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        <button
                                          type="button"
                                          onClick={() => b.phone && openWhatsAppWithMessage(b.phone, docMsg)}
                                          disabled={!b.phone}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                          title={ar ? 'إرسال بالواتساب' : 'Send via WhatsApp'}
                                        >
                                          💬 {ar ? 'واتساب' : 'WhatsApp'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => b.email && openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link', docMsg)}
                                          disabled={!b.email}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                          title={ar ? 'إرسال بالبريد' : 'Send via email'}
                                        >
                                          ✉ {ar ? 'بريد' : 'Email'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => navigator.clipboard.writeText(docUploadLink)}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          title={ar ? 'نسخ الرابط' : 'Copy link'}
                                        >
                                          📋 {ar ? 'نسخ الرابط' : 'Copy link'}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : b.type === 'BOOKING' ? (
                            <div className="space-y-1">
                              <div
                                className={`inline-flex px-3 py-2 rounded-xl border text-sm font-semibold ${
                                  b.status === 'CONFIRMED' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700' : b.status === 'RENTED' ? 'border-blue-200 bg-blue-50/50 text-blue-700' : b.status === 'SOLD' ? 'border-green-200 bg-green-50/50 text-green-700' : b.status === 'CANCELLED' ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-amber-200 bg-amber-50/50 text-amber-700'
                                }`}
                              >
                                {ar ? STATUS_LABELS[b.status].ar : STATUS_LABELS[b.status].en}
                              </div>
                              {b.type === 'BOOKING' && b.paymentConfirmed && !b.accountantConfirmedAt && (
                                <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant confirmation'}</p>
                              )}
                              {b.status === 'CONFIRMED' && b.accountantConfirmedAt && (
                                <p className="text-xs text-emerald-600 font-medium">{ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed'}</p>
                              )}
                              {b.status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(b.id) && (
                                <p className="text-xs text-amber-600 font-medium" title={ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}>📋 {ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}</p>
                              )}
                              {b.status === 'CANCELLED' && b.cancellationNote && (
                                <p className="text-xs text-gray-600 italic" title={ar ? 'ملاحظة المحاسب' : 'Accountant note'}>{b.cancellationNote}</p>
                              )}
                              {!hasContract(b) && b.status !== 'CANCELLED' && (() => {
                                if (hasBookingFinancialLinkage(b)) {
                                  if (hasPendingCancellationRequest(b.id)) {
                                    return <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار المحاسبة (استرداد/خصم)' : '⏳ Pending accounting (refund)'}</p>;
                                  }
                                  return (
                                    <button type="button" onClick={() => { requestBookingCancellation(b.id); loadData(); }} className="text-xs text-red-600 hover:underline font-medium" title={ar ? 'يرسل الطلب للمحاسبة لاسترداد/خصم المبلغ' : 'Sends to accounting for refund/deduction'}>
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
                                  <Link href={`/${locale}/admin/contracts?createFrom=${b.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors">
                                    <span>📋</span>
                                    {ar ? 'إنشاء عقد' : 'Create Contract'}
                                  </Link>
                                )}
                              </>
                            )}
                            <a href={`https://wa.me/9689115341?text=${encodeURIComponent(ar ? `مرحباً، بخصوص طلب ${b.type === 'BOOKING' ? 'الحجز' : 'المعاينة'} من ${getBookingDisplayName(b, locale)}` : `Hi, regarding ${b.type} request from ${getBookingDisplayName(b, locale)}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                              <span>💬</span>
                              واتساب
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {filteredBookings.map((b) => {
                const { serial, label } = getUnitDisplay(b.propertyId, b.unitKey);
                const prop = getPropertyById(b.propertyId, dataOverrides);
                const propSerial = (prop as { serialNumber?: string })?.serialNumber || '';
                return (
                  <div key={b.id} className="p-5 space-y-4">
                    {b.bookingSerial && (
                      <p className="text-xs font-mono font-semibold text-[#8B6F47]">{ar ? 'رقم الحجز:' : 'Booking:'} {b.bookingSerial}</p>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{getBookingDisplayName(b, locale)}</p>
                        <p className="text-sm text-gray-500">{b.email}</p>
                        <a href={`tel:${b.phone}`} className="text-sm text-[#8B6F47] font-semibold">{b.phone}</a>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${b.type === 'BOOKING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {ar ? TYPE_LABELS[b.type]?.ar : TYPE_LABELS[b.type]?.en}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span>{new Date(b.createdAt).toLocaleString(ar ? 'ar-OM' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <Link href={`/${locale}/admin/properties/${b.propertyId}/bookings`} className="text-[#8B6F47] font-medium">
                        {prop ? (ar ? prop.titleAr : prop.titleEn) : `#${b.propertyId}`}
                      </Link>
                      {b.unitKey ? (
                        <span className="font-medium">• {label}<span className="font-mono text-[#8B6F47]"> ({serial || b.unitKey})</span></span>
                      ) : (
                        <span className="font-medium">• {ar ? 'عقار كامل' : 'Full property'}{propSerial && <span className="font-mono text-[#8B6F47]"> ({propSerial})</span>}</span>
                      )}
                      {b.type === 'BOOKING' && (
                        <span className={b.paymentConfirmed ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                          • {b.paymentConfirmed ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'لم يُدفع' : 'Not paid')} {b.priceAtBooking != null ? ` • ${b.priceAtBooking.toLocaleString()} ر.ع` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isStatusLocked(b) ? (
                        <div className="flex-1 p-3 rounded-xl bg-blue-50 border border-blue-200">
                          {(() => {
                            const c = getContractForBooking(b);
                            const approved = getApprovedContractForBooking(b);
                            const isApproved = !!approved;
                            const allDocsAndChecksApproved = areAllRequiredDocumentsApproved(b.id) && (getChecksByBooking(b.id).length === 0 || areAllChecksApproved(b.id));
                            const displayStage = getDisplayContractStageForBooking(b, c?.status);
                            const contractStatusLabel = !c ? (ar ? 'عقد قيد الإعداد' : 'Contract in progress') : displayStage === 'APPROVED'
                              ? (ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)')
                              : displayStage === 'ADMIN_APPROVED'
                                ? (ar ? 'بانتظار توقيع المشتري' : 'Waiting for buyer signature')
                                : displayStage === 'TENANT_APPROVED'
                                  ? (ar ? 'بانتظار توقيع البائع (المالك)' : 'Waiting for seller (owner) signature')
                                  : displayStage === 'LANDLORD_APPROVED'
                                ? allDocsAndChecksApproved
                                  ? (ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval')
                                  : (ar ? 'تم اعتماده مبدئياً من قبل الإدارة وفي انتظار إكمال البيانات من قبل المستأجر لاعتماد المستندات' : 'Preliminarily approved by admin, awaiting tenant to complete data for document approval')
                                : (ar ? 'عقد مسودة - بانتظار رفع المستندات' : 'Draft - pending document upload');
                            const docUploadLink = typeof window !== 'undefined' ? getDocumentUploadLink(window.location.origin, locale, b.propertyId, b.id, b.email) : '';
                            const docMsg = ar ? `مرحباً، يرجى إكمال إجراءات توثيق العقد عن طريق رفع المستندات المطلوبة:\n${docUploadLink}` : `Hello, please complete the contract documentation by uploading the required documents:\n${docUploadLink}`;
                            const needsDocs = c && c.status !== 'APPROVED';
                            const needsApprovalCard = hasDocumentsNeedingConfirmation(b.id) || (getChecksByBooking(b.id).length > 0 && !areAllChecksApproved(b.id));
                            return (
                              <>
                                <span className={`text-sm font-semibold ${isApproved ? 'text-blue-700' : 'text-amber-700'}`}>
                                  {contractStatusLabel}
                                </span>
                                {needsApprovalCard && (
                                  <button
                                    type="button"
                                    onClick={() => setDocumentsPanelBooking(b)}
                                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border border-amber-500/40"
                                  >
                                    📋 {ar ? 'اعتماد المستندات' : 'Approve documents'}
                                  </button>
                                )}
                                <Link href={`/${locale}/admin/contracts`} className="text-xs text-[#8B6F47] hover:underline block mt-1">{ar ? 'من العقود' : 'From contracts'}</Link>
                                {needsDocs && docUploadLink && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => b.phone && openWhatsAppWithMessage(b.phone, docMsg)}
                                      disabled={!b.phone}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      💬 واتساب
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => b.email && openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link', docMsg)}
                                      disabled={!b.email}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      ✉ بريد
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(docUploadLink)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    >
                                      📋 {ar ? 'نسخ الرابط' : 'Copy link'}
                                    </button>
                                  </div>
                                )}
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
                          {b.type === 'BOOKING' && b.paymentConfirmed && !b.accountantConfirmedAt && <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار تأكيد المحاسب' : '⏳ Pending accountant'}</p>}
                          {b.status === 'CONFIRMED' && b.accountantConfirmedAt && <p className="text-xs text-emerald-600 font-medium">{ar ? '✓ مؤكد الدفع' : '✓ Payment confirmed'}</p>}
                          {b.status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(b.id) && <p className="text-xs text-amber-600 font-medium">📋 {ar ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}</p>}
                          {b.status === 'CANCELLED' && b.cancellationNote && <p className="text-xs text-gray-600 italic">{b.cancellationNote}</p>}
                          {!hasContract(b) && b.status !== 'CANCELLED' && (
                            hasBookingFinancialLinkage(b) ? (
                              hasPendingCancellationRequest(b.id) ? (
                                <p className="text-xs text-amber-600">{ar ? '⏳ بانتظار المحاسبة' : '⏳ Pending accounting'}</p>
                              ) : (
                                <button type="button" onClick={() => { requestBookingCancellation(b.id); loadData(); }} className="text-xs text-red-600 hover:underline font-medium">{ar ? 'إلغاء الحجز' : 'Cancel booking'}</button>
                              )
                            ) : (
                              <button type="button" onClick={() => handleStatusChange(b.id, 'CANCELLED')} className="text-xs text-red-600 hover:underline font-medium">{ar ? 'إلغاء الحجز' : 'Cancel booking'}</button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 space-y-1">
                          <select value={b.status} onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-[#8B6F47]/20">
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
                          <button type="button" onClick={() => setDocumentsPanelBooking(b)} className="relative inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 border border-[#8B6F47]/30">
                            📄 {ar ? 'المستندات' : 'Documents'}
                            {hasDocumentsNeedingConfirmation(b.id) && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">!</span>}
                          </button>
                          {canCreateContract(b) && (
                            <Link href={`/${locale}/admin/contracts?createFrom=${b.id}`} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47]">
                              📋 {ar ? 'إنشاء عقد' : 'Create Contract'}
                            </Link>
                          )}
                        </>
                      )}
                      <a href={`https://wa.me/9689115341?text=${encodeURIComponent(ar ? `مرحباً، بخصوص طلب ${b.type === 'BOOKING' ? 'الحجز' : 'المعاينة'} من ${getBookingDisplayName(b, locale)}` : `Hi, regarding ${b.type} request from ${getBookingDisplayName(b, locale)}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-emerald-600 bg-emerald-50">
                        💬 واتساب
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {documentsPanelBooking && (
        <BookingDocumentsPanel
          open={!!documentsPanelBooking}
          onClose={() => setDocumentsPanelBooking(null)}
          booking={documentsPanelBooking}
          propertyId={documentsPanelBooking.propertyId}
          locale={locale}
          onCreateContract={() => {
            setDocumentsPanelBooking(null);
            window.location.href = `/${locale}/admin/contracts?createFrom=${documentsPanelBooking!.id}`;
          }}
        />
      )}

      {/* Modal: إضافة حجز يدوي */}
      {showManualBooking && (
        <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => {
          setShowManualBooking(false);
          setEditingBookingId(null);
          setPropertySearch('');
          setUnitSearch('');
          setContactSearch('');
        }}
      >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{editingBookingId ? (ar ? 'تعديل الحجز' : 'Edit Booking') : (ar ? 'إضافة حجز يدوي' : 'Add Manual Booking')}</h3>
              <p className="text-sm text-gray-500 mt-1">{editingBookingId ? (ar ? 'تعديل بيانات الحجز' : 'Edit booking details') : (ar ? 'أدخل بيانات العميل والوحدة المحجوزة' : 'Enter client and unit details')}</p>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const propId = parseInt(manualForm.propertyId, 10);
                const prop = getPropertyById(propId, dataOverrides);
                const contact = manualForm.contactId ? getContactById(manualForm.contactId) : null;
                if (!prop || !manualForm.propertyId || !contact) {
                  alert(ar ? 'يرجى اختيار العميل من دفتر العناوين أو إضافة جهة اتصال جديدة.' : 'Please select a client from the address book or add a new contact.');
                  return;
                }
                if (!isUnitAvailableForBooking(propId, manualForm.unitKey || undefined, bookings, editingBookingId || undefined)) {
                  alert(ar ? 'الوحدة المحددة محجوزة أو مؤجرة. يرجى اختيار وحدة أخرى.' : 'The selected unit is booked or rented. Please select another unit.');
                  return;
                }
                const bookCheck = canCreateBooking(propId, manualForm.unitKey || undefined, contact.email || '', contact.phone || '');
                if (!bookCheck.allowed) {
                  if (bookCheck.reason === 'ALREADY_BOOKED') {
                    alert(ar ? 'هذا العميل لديه حجز نشط لهذا العقار بالفعل. لا يمكن إنشاء حجز مكرر.' : 'This client already has an active booking for this property. Duplicate booking not allowed.');
                    return;
                  }
                  if (bookCheck.reason === 'MAX_REACHED') {
                    alert(ar ? 'تم الوصول للحد الأقصى من الحجوزات لهذا العقار (حجزان من مستخدمين مختلفين).' : 'Maximum bookings reached for this property (2 from different users).');
                    return;
                  }
                }
                const needsCivilId = isOmaniNationality(contact.nationality);
                const hasCivilId = !!(contact.civilId?.trim() && contact.civilIdExpiry?.trim());
                const hasPassport = !!(contact.passportNumber?.trim() && contact.passportExpiry?.trim());
                if (needsCivilId && !hasCivilId) {
                  setShowEditContactForBooking(contact.id);
                  alert(ar ? 'بيانات البطاقة المدنية وتاريخ الانتهاء مطلوبة. يرجى تحديث بيانات العميل.' : 'Civil ID and expiry date are required. Please update the client data.');
                  return;
                }
                if (needsCivilId && hasCivilId && contact.civilIdExpiry) {
                  const expiry = new Date(contact.civilIdExpiry + 'T12:00:00');
                  const today = new Date();
                  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
                  if (isNaN(expiry.getTime()) || expiry < minDate) {
                    setShowEditContactForBooking(contact.id);
                    alert(ar ? 'تاريخ انتهاء البطاقة المدنية يجب أن يكون بعد 30 يوماً على الأقل. يرجى التحديث.' : 'Civil ID expiry must be at least 30 days from now. Please update.');
                    return;
                  }
                }
                if (!needsCivilId && !hasPassport) {
                  setShowEditContactForBooking(contact.id);
                  alert(ar ? 'بيانات جواز السفر وتاريخ الانتهاء مطلوبة للوفد. يرجى تحديث بيانات العميل.' : 'Passport number and expiry date are required for expats. Please update the client data.');
                  return;
                }
                if (!needsCivilId && hasPassport && contact.passportExpiry) {
                  const expiry = new Date(contact.passportExpiry + 'T12:00:00');
                  const today = new Date();
                  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
                  if (isNaN(expiry.getTime()) || expiry < minDate) {
                    setShowEditContactForBooking(contact.id);
                    alert(ar ? 'تاريخ انتهاء جواز السفر يجب أن يكون بعد 90 يوماً على الأقل. يرجى التحديث.' : 'Passport expiry must be at least 90 days from now. Please update.');
                    return;
                  }
                }
                if (manualForm.paymentConfirmed) {
                  if (!manualForm.paymentMethod) {
                    alert(ar ? 'يرجى اختيار طريقة الدفع (نقداً، تحويل، أو شيك).' : 'Please select payment method (cash, transfer, or cheque).');
                    return;
                  }
                  if (!manualForm.bankAccountId?.trim() || !bankAccounts.some((a) => a.id === manualForm.bankAccountId)) {
                    alert(ar ? 'يرجى اختيار الحساب البنكي الذي تم/سيتم استلام الدفع عليه.' : 'Please select the bank account for payment.');
                    return;
                  }
                  if (!manualForm.paymentReferenceNo?.trim()) {
                    alert(ar ? (manualForm.paymentMethod === 'CHEQUE' ? 'يرجى إدخال رقم الشيك.' : 'يرجى إدخال رقم الإيصال.') : (manualForm.paymentMethod === 'CHEQUE' ? 'Please enter cheque number.' : 'Please enter receipt number.'));
                    return;
                  }
                  if ((manualForm.paymentMethod === 'BANK_TRANSFER' || manualForm.paymentMethod === 'CHEQUE') && !manualForm.paymentDate?.trim()) {
                    alert(ar ? 'يرجى إدخال التاريخ.' : 'Please enter the date.');
                    return;
                  }
                }
                if (editingBookingId) {
                  const isCompany = isCompanyContact(contact) && contact.companyData?.companyNameAr && contact.companyData.authorizedRepresentatives?.length;
                  updateBooking(editingBookingId, {
                    propertyId: propId,
                    unitKey: manualForm.unitKey || undefined,
                    propertyTitleAr: prop.titleAr,
                    propertyTitleEn: prop.titleEn,
                    contactType: isCompany ? 'COMPANY' : 'PERSONAL',
                    name: getContactDisplayName(contact, locale),
                    email: contact.email || '',
                    phone: contact.phone,
                    civilId: contact.civilId?.trim() || undefined,
                    passportNumber: contact.passportNumber?.trim() || undefined,
                    companyData: isCompany ? {
                      companyNameAr: contact.companyData!.companyNameAr,
                      companyNameEn: contact.companyData!.companyNameEn,
                      commercialRegistrationNumber: contact.companyData!.commercialRegistrationNumber,
                      authorizedRepresentatives: contact.companyData!.authorizedRepresentatives,
                    } : undefined,
                    message: manualForm.message.trim() || undefined,
                    paymentConfirmed: manualForm.paymentConfirmed,
                    priceAtBooking: manualForm.priceAtBooking ? parseFloat(manualForm.priceAtBooking) : undefined,
                    paymentMethod: manualForm.paymentConfirmed && manualForm.paymentMethod ? manualForm.paymentMethod : undefined,
                    paymentReferenceNo: manualForm.paymentReferenceNo?.trim() || undefined,
                    paymentDate: manualForm.paymentDate?.trim() || undefined,
                    bankAccountId: manualForm.bankAccountId?.trim() || undefined,
                  });
                } else {
                  const isCompany = isCompanyContact(contact) && contact.companyData?.companyNameAr && contact.companyData.authorizedRepresentatives?.length;
                  createBooking({
                    propertyId: propId,
                    unitKey: manualForm.unitKey || undefined,
                    propertyTitleAr: prop.titleAr,
                    propertyTitleEn: prop.titleEn,
                    contactType: isCompany ? 'COMPANY' : 'PERSONAL',
                    name: getContactDisplayName(contact, locale),
                    email: contact.email || '',
                    phone: contact.phone,
                    civilId: contact.civilId?.trim() || undefined,
                    passportNumber: contact.passportNumber?.trim() || undefined,
                    companyData: isCompany ? {
                      companyNameAr: contact.companyData!.companyNameAr,
                      companyNameEn: contact.companyData!.companyNameEn,
                      commercialRegistrationNumber: contact.companyData!.commercialRegistrationNumber,
                      authorizedRepresentatives: contact.companyData!.authorizedRepresentatives,
                    } : undefined,
                    message: manualForm.message.trim() || undefined,
                    type: 'BOOKING',
                    paymentConfirmed: manualForm.paymentConfirmed,
                    priceAtBooking: manualForm.priceAtBooking ? parseFloat(manualForm.priceAtBooking) : undefined,
                    paymentMethod: manualForm.paymentConfirmed && manualForm.paymentMethod ? manualForm.paymentMethod : undefined,
                    paymentReferenceNo: manualForm.paymentReferenceNo?.trim() || undefined,
                    paymentDate: manualForm.paymentDate?.trim() || undefined,
                    bankAccountId: manualForm.bankAccountId?.trim() || undefined,
                  });
                }
                setShowManualBooking(false);
                setEditingBookingId(null);
                setManualForm({ propertyId: '', unitKey: '', contactId: '', message: '', paymentConfirmed: false, priceAtBooking: '', paymentMethod: '', paymentReferenceNo: '', paymentDate: '', bankAccountId: '' });
                setPropertySearch('');
                setUnitSearch('');
                setContactSearch('');
                setContactDataConfirmedForBooking(false);
                loadData();
              }}
            >
              <div ref={propertyDropdownRef} className="relative">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-sm font-semibold text-gray-700">{ar ? 'العقار' : 'Property'}</label>
                  <Link
                    href={`/${locale}/admin/properties/new`}
                    className="text-sm font-semibold text-[#8B6F47] hover:underline"
                  >
                    {ar ? '➕ إضافة عقار جديد' : '➕ Add new property'}
                  </Link>
                </div>
                <input
                  type="text"
                  value={manualForm.propertyId && !propertySearch ? (() => {
                    const p = properties.find((x: { id: number }) => x.id === parseInt(manualForm.propertyId, 10));
                    const prop = p ? getPropertyById(p.id, dataOverrides) as { landParcelNumber?: string; propertyNumber?: string; serialNumber?: string; titleAr?: string; titleEn?: string } : null;
                    const landNum = prop?.landParcelNumber;
                    const propNum = prop?.propertyNumber || prop?.serialNumber || '';
                    return [landNum, propNum].filter(Boolean).join(' - ') || (ar ? prop?.titleAr : prop?.titleEn) || '';
                  })() : propertySearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPropertySearch(v);
                    if (!v) setManualForm({ ...manualForm, propertyId: '', unitKey: '' });
                    setPropertyDropdownOpen(true);
                  }}
                  onFocus={() => setPropertyDropdownOpen(true)}
                  placeholder={ar ? 'ابحث برقم القطعة أو العقار أو العنوان...' : 'Search by parcel, property number or title...'}
                  className="admin-input w-full"
                />
                {propertyDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {(() => {
                      const list = properties
                        .filter((p: { type?: string }) => p.type === 'RENT' || p.type === 'INVESTMENT')
                        .filter((p: { id: number }) => {
                          const prop = getPropertyById(p.id, dataOverrides) as { propertySubTypeAr?: string };
                          const isMulti = prop?.propertySubTypeAr === 'متعدد الوحدات';
                          if (!isMulti && !isUnitAvailableForBooking(p.id, undefined, bookings, editingBookingId || undefined)) return false;
                          return true;
                        })
                        .map((p: { id: number }) => {
                          const prop = getPropertyById(p.id, dataOverrides) as { titleAr?: string; titleEn?: string; landParcelNumber?: string; propertyNumber?: string; serialNumber?: string; propertyTypeAr?: string; propertySubTypeAr?: string; governorateAr?: string; stateAr?: string; areaAr?: string; villageAr?: string };
                          const landNum = prop?.landParcelNumber;
                          const propNum = prop?.propertyNumber || prop?.serialNumber || '';
                          const line1 = [landNum, propNum].filter(Boolean).join(' - ') || prop?.titleAr || `#${p.id}`;
                          const line2 = prop?.propertySubTypeAr ? `${prop?.propertyTypeAr || ''} ${prop?.propertySubTypeAr}`.trim() : prop?.propertyTypeAr || '';
                          const line3 = [prop?.governorateAr, prop?.stateAr, prop?.areaAr, prop?.villageAr].filter(Boolean).join(' - ') || '';
                          const searchText = [line1, line2, line3, prop?.titleAr, prop?.titleEn, String(p.id)].filter(Boolean).join(' ');
                          return { id: p.id, line1, line2, line3, searchText };
                        });
                      const filtered = list.filter((x) => matchesSearch(x.searchText, propertySearch));
                      return filtered.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</div>
                      ) : (
                        filtered.map((x) => (
                          <button
                            key={x.id}
                            type="button"
                            onClick={() => {
                              setManualForm({ ...manualForm, propertyId: String(x.id), unitKey: '' });
                              setPropertySearch('');
                              setPropertyDropdownOpen(false);
                              setUnitSearch('');
                            }}
                            className="w-full text-right p-3 hover:bg-[#8B6F47]/10 border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <div className="text-sm font-semibold text-[#8B6F47]">{x.line1}</div>
                            <div className="text-sm text-gray-700">{x.line2}</div>
                            <div className="text-xs text-gray-500">{x.line3}</div>
                          </button>
                        ))
                      );
                    })()}
                  </div>
                )}
              </div>
              {manualForm.propertyId && (() => {
                const prop = getPropertyById(manualForm.propertyId, dataOverrides) as { propertySubTypeAr?: string; propertyTypeAr?: string; landParcelNumber?: string; propertyNumber?: string; serialNumber?: string; governorateAr?: string; stateAr?: string; areaAr?: string; villageAr?: string; multiUnitShops?: unknown[]; multiUnitShowrooms?: unknown[]; multiUnitApartments?: unknown[] } | undefined;
                const isMulti = prop?.propertySubTypeAr === 'متعدد الوحدات';
                const landNum = prop?.landParcelNumber;
                const propNum = prop?.propertyNumber || prop?.serialNumber || '';
                const propTypeLine = prop?.propertySubTypeAr ? `${prop?.propertyTypeAr || ''} ${prop?.propertySubTypeAr}`.trim() : prop?.propertyTypeAr || '';
                const locationLine = [prop?.governorateAr, prop?.stateAr, prop?.areaAr, prop?.villageAr].filter(Boolean).join(' - ') || '';
                if (!isMulti) {
                  return (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="text-sm font-semibold text-[#8B6F47]">{[landNum, propNum].filter(Boolean).join(' - ') || '—'}</div>
                      <div className="text-sm font-medium text-gray-800 mt-0.5">{propTypeLine || '—'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{locationLine || '—'}</div>
                    </div>
                  );
                }
                const propId = parseInt(manualForm.propertyId, 10);
                const shops = prop?.multiUnitShops || [];
                const showrooms = prop?.multiUnitShowrooms || [];
                const apartments = prop?.multiUnitApartments || [];
                const unitTypePrefix = (key: string) => (key.startsWith('shop') ? 'S' : key.startsWith('showroom') ? 'M' : 'A');
                const allUnits: { key: string; unitType: string; unitNum: string }[] = [
                  { key: '', unitType: '', unitNum: '' },
                  ...shops.map((_, i) => ({ key: `shop-${i}`, unitType: ar ? 'محل' : 'Shop', unitNum: String(i + 1) })),
                  ...showrooms.map((_, i) => ({ key: `showroom-${i}`, unitType: ar ? 'معرض' : 'Showroom', unitNum: String(i + 1) })),
                  ...apartments.map((_, i) => ({ key: `apartment-${i}`, unitType: ar ? 'شقة' : 'Apartment', unitNum: String(i + 1) })),
                ];
                const units = allUnits.filter((u) => isUnitAvailableForBooking(propId, u.key || undefined, bookings, editingBookingId || undefined));
                return (
                  <>
                    <div ref={unitDropdownRef} className="relative">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-sm font-semibold text-gray-700">{ar ? 'الوحدة' : 'Unit'}</label>
                        <button
                          type="button"
                          onClick={() => setShowAddUnit(true)}
                          className="text-sm font-semibold text-[#8B6F47] hover:underline"
                        >
                          {ar ? '➕ إضافة وحدة جديدة' : '➕ Add new unit'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={manualForm.unitKey && !unitSearch ? (() => {
                          if (!manualForm.unitKey) return '';
                          const u = units.find((x) => x.key === manualForm.unitKey);
                          if (!u) return ar ? '— (محجوزة/مؤجرة)' : '— (booked/rented)';
                          const line1 = u.key ? [landNum, propNum, `${unitTypePrefix(u.key)}${propNum}`].filter(Boolean).join(' - ') : [landNum, propNum].filter(Boolean).join(' - ');
                          return `${u.unitType} ${u.unitNum} | ${line1 || '—'}`;
                        })() : unitSearch}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUnitSearch(v);
                          if (!v) setManualForm({ ...manualForm, unitKey: '' });
                          setUnitDropdownOpen(true);
                        }}
                        onFocus={() => setUnitDropdownOpen(true)}
                        placeholder={ar ? 'ابحث بالوحدة أو الرقم...' : 'Search by unit or number...'}
                        className="admin-input w-full"
                      />
                      {unitDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                          {(() => {
                            const unitList = units.map((u) => {
                              const line1 = u.key ? [landNum, propNum, `${unitTypePrefix(u.key)}${propNum}`].filter(Boolean).join(' - ') : [landNum, propNum].filter(Boolean).join(' - ');
                              const optLabel = u.key ? `${u.unitType} ${u.unitNum} | ${line1 || '—'}` : (ar ? 'عقار كامل' : 'Full property');
                              return { ...u, line1, optLabel, searchText: `${u.unitType} ${u.unitNum} ${line1} ${landNum} ${propNum}` };
                            });
                            const filtered = unitList.filter((x) => matchesSearch(x.searchText, unitSearch));
                            return filtered.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                {units.length === 0 ? (ar ? 'جميع الوحدات محجوزة أو مؤجرة' : 'All units are booked or rented') : (ar ? 'لا توجد نتائج' : 'No results')}
                              </div>
                            ) : (
                              filtered.map((u) => (
                                <button
                                  key={u.key || 'full'}
                                  type="button"
                                  onClick={() => {
                                    setManualForm({ ...manualForm, unitKey: u.key });
                                    setUnitSearch('');
                                    setUnitDropdownOpen(false);
                                  }}
                                  className="w-full text-right p-3 hover:bg-[#8B6F47]/10 border-b border-gray-100 last:border-0 transition-colors"
                                >
                                  <div className="text-sm font-semibold text-[#8B6F47]">{u.optLabel}</div>
                                </button>
                              ))
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    {(manualForm.unitKey || isMulti) && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="text-sm font-semibold text-[#8B6F47]">
                          {(manualForm.unitKey
                            ? [landNum, propNum, `${unitTypePrefix(manualForm.unitKey)}${propNum}`]
                            : [landNum, propNum]
                          )
                            .filter(Boolean)
                            .join(' - ') || '—'}
                        </div>
                        <div className="text-sm font-medium text-gray-800 mt-0.5">{propTypeLine || '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{locationLine || '—'}</div>
                      </div>
                    )}
                  </>
                );
              })()}
              <div ref={contactDropdownRef} className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العميل من دفتر العناوين *' : 'Client from address book *'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualForm.contactId ? (() => {
                      const c = getContactById(manualForm.contactId);
                      if (!c) return contactSearch;
                      const parts = [getContactDisplayName(c, locale), c.phone];
                      if (c.civilId?.trim()) parts.push(c.civilId);
                      return parts.join(' • ');
                    })() : contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      if (manualForm.contactId) setManualForm({ ...manualForm, contactId: '' });
                      setContactDropdownOpen(true);
                    }}
                    onFocus={() => setContactDropdownOpen(true)}
                    placeholder={ar ? 'ابحث بالاسم أو الهاتف أو الرقم المدني...' : 'Search by name, phone or civil ID...'}
                    className="admin-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => { setManualForm({ ...manualForm, contactId: '' }); setContactSearch(''); }}
                    className={`px-4 py-2.5 rounded-xl font-semibold ${manualForm.contactId ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'invisible'}`}
                    title={ar ? 'مسح الاختيار' : 'Clear selection'}
                  >
                    {ar ? '✕' : '✕'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddContact(true)}
                    className="px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30"
                    title={ar ? 'إضافة جهة اتصال جديدة' : 'Add new contact'}
                  >
                    {ar ? '➕ إضافة' : '➕ Add'}
                  </button>
                </div>
                {contactDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {contacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</div>
                    ) : (
                      contacts.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setManualForm({
                              ...manualForm,
                              contactId: c.id,
                            });
                            setContactDataConfirmedForBooking(false);
                            setContactSearch('');
                            setContactDropdownOpen(false);
                          }}
                          className="w-full text-right p-3 hover:bg-[#8B6F47]/10 border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <div className="text-sm font-semibold text-[#8B6F47]">{getContactDisplayName(c, locale)}</div>
                          <div className="text-xs text-gray-500">
                            {[c.phone, c.civilId].filter(Boolean).join(' • ')}
                            {c.email ? ` • ${c.email}` : ''}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
                <textarea
                  value={manualForm.message}
                  onChange={(e) => setManualForm({ ...manualForm, message: e.target.value })}
                  className="admin-input w-full resize-none"
                  rows={2}
                />
              </div>
              {/* قسم بيانات الدفع */}
              <div className="p-4 rounded-xl border-2 border-[#8B6F47]/30 bg-[#8B6F47]/5 space-y-4">
                <h4 className="text-sm font-bold text-[#8B6F47] border-b border-[#8B6F47]/30 pb-2">
                  {ar ? 'بيانات الدفع' : 'Payment details'}
                </h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'مبلغ الإيجار عند الحجز (ر.ع)' : 'Rent amount at booking (OMR)'}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={manualForm.priceAtBooking}
                    onChange={(e) => setManualForm({ ...manualForm, priceAtBooking: e.target.value })}
                    className="admin-input w-full"
                    placeholder="350"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paymentConfirmed"
                    checked={manualForm.paymentConfirmed}
                    onChange={(e) => setManualForm({
                      ...manualForm,
                      paymentConfirmed: e.target.checked,
                      paymentMethod: e.target.checked ? manualForm.paymentMethod : '',
                      paymentReferenceNo: e.target.checked ? manualForm.paymentReferenceNo : '',
                      paymentDate: e.target.checked ? manualForm.paymentDate : '',
                      bankAccountId: e.target.checked && defaultBankAccount ? defaultBankAccount.id : (e.target.checked ? manualForm.bankAccountId : ''),
                    })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="paymentConfirmed" className="text-sm font-medium text-gray-700">
                    {ar ? 'تم دفع مبلغ الحجز' : 'Deposit paid'}
                  </label>
                </div>
                {manualForm.paymentConfirmed && (
                  <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-sm font-semibold text-gray-700">{ar ? 'الحساب البنكي للاستلام *' : 'Bank account for payment *'}</label>
                        <Link
                          href={`/${locale}/admin/bank-details`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-[#8B6F47] hover:underline shrink-0"
                        >
                          {ar ? '➕ إضافة حساب جديد' : '➕ Add new account'}
                        </Link>
                      </div>
                      <select
                        value={manualForm.bankAccountId && bankAccounts.some((a) => a.id === manualForm.bankAccountId) ? manualForm.bankAccountId : ''}
                        onChange={(e) => setManualForm({ ...manualForm, bankAccountId: e.target.value })}
                        className="admin-select w-full"
                      >
                        <option value="">{ar ? '— اختر الحساب —' : '— Select account —'}</option>
                        {bankAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {ar ? `${acc.nameAr} - ${acc.bankNameAr}${acc.accountNumber ? ` (${acc.accountNumber})` : ''}` : `${acc.nameEn || acc.nameAr} - ${acc.bankNameEn || acc.bankNameAr}${acc.accountNumber ? ` (${acc.accountNumber})` : ''}`}
                          </option>
                        ))}
                      </select>
                      {bankAccounts.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {ar ? 'لا توجد حسابات بنكية. أضف حساباً من صفحة التفاصيل البنكية.' : 'No bank accounts. Add one from the bank details page.'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'طريقة الدفع' : 'Payment method'}</label>
                      <select
                        value={manualForm.paymentMethod}
                        onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value as '' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' })}
                        className="admin-select w-full"
                      >
                        <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                        <option value="CASH">{ar ? 'نقداً' : 'Cash'}</option>
                        <option value="BANK_TRANSFER">{ar ? 'تحويل في حساب البنك' : 'Bank transfer'}</option>
                        <option value="CHEQUE">{ar ? 'شيك' : 'Cheque'}</option>
                      </select>
                    </div>
                    {manualForm.paymentMethod === 'CASH' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الإيصال' : 'Receipt number'}</label>
                        <input
                          type="text"
                          value={manualForm.paymentReferenceNo}
                          onChange={(e) => setManualForm({ ...manualForm, paymentReferenceNo: e.target.value })}
                          className="admin-input w-full"
                          placeholder={ar ? 'أدخل رقم الإيصال' : 'Enter receipt number'}
                        />
                      </div>
                    )}
                    {manualForm.paymentMethod === 'BANK_TRANSFER' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الإيصال' : 'Receipt number'}</label>
                          <input
                            type="text"
                            value={manualForm.paymentReferenceNo}
                            onChange={(e) => setManualForm({ ...manualForm, paymentReferenceNo: e.target.value })}
                            className="admin-input w-full"
                            placeholder={ar ? 'أدخل رقم الإيصال' : 'Enter receipt number'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                          <DateInput value={manualForm.paymentDate} onChange={(v) => setManualForm({ ...manualForm, paymentDate: v })} locale={locale} className="w-full" />
                        </div>
                      </div>
                    )}
                    {manualForm.paymentMethod === 'CHEQUE' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الشيك' : 'Cheque number'}</label>
                          <input
                            type="text"
                            value={manualForm.paymentReferenceNo}
                            onChange={(e) => setManualForm({ ...manualForm, paymentReferenceNo: e.target.value })}
                            className="admin-input w-full"
                            placeholder={ar ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                          <DateInput value={manualForm.paymentDate} onChange={(v) => setManualForm({ ...manualForm, paymentDate: v })} locale={locale} className="w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualBooking(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
                >
                  {editingBookingId ? (ar ? 'حفظ التعديلات' : 'Save Changes') : (ar ? 'إضافة الحجز' : 'Add Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ContactFormModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSaved={(contact) => {
          setManualForm({
            ...manualForm,
            contactId: contact.id,
          });
          setContactDataConfirmedForBooking(true);
          setShowAddContact(false);
        }}
        initialName={contactSearch}
        initialEmail=""
        initialPhone=""
        locale={locale}
      />
      <ContactFormModal
        open={!!showEditContactForBooking}
        onClose={() => setShowEditContactForBooking(null)}
        onSaved={(contact) => {
          setManualForm({
            ...manualForm,
            contactId: contact.id,
          });
          setContactDataConfirmedForBooking(true);
          setShowEditContactForBooking(null);
        }}
        editContactId={showEditContactForBooking}
        locale={locale}
      />
      <AddUnitModal
        open={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        onAdded={(unitKey) => {
          setManualForm({ ...manualForm, unitKey });
          setShowAddUnit(false);
          setUnitDropdownOpen(false);
        }}
        propertyId={parseInt(manualForm.propertyId, 10) || 0}
        locale={locale}
      />

      {/* Modal: تأكيد الحذف - للحجوزات غير المرتبطة بأمر حسابي */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{ar ? 'تأكيد حذف الحجز' : 'Confirm delete booking'}</h3>
            <p className="text-gray-600 mb-6">
              {ar
                ? 'هل أنت متأكد من حذف هذا الحجز؟ سيتم التأكد أن الحجز غير مرتبط بأي أمر حسابي ولم يقم العميل بدفع أي مبلغ.'
                : 'Are you sure you want to delete this booking? This confirms the booking is not linked to any financial record and no payment was made.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteBooking(deleteConfirmId)) {
                    loadData();
                    setDeleteConfirmId(null);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                {ar ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: لا يمكن الحذف - مرتبط بسند مالي، الطلب يذهب للمحاسبة */}
      {deleteBlockedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteBlockedId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-amber-700 mb-2">{ar ? 'لا يمكن حذف الحجز' : 'Cannot delete booking'}</h3>
            <p className="text-gray-600 mb-6">
              {ar
                ? 'هذا الحجز مرتبط بسند مالي أو دفع. لإلغائه يجب إرسال طلب للمحاسبة لاسترداد/خصم المبلغ، ثم إتمام العملية من لوحة المحاسبة.'
                : 'This booking is linked to a financial document or payment. To cancel, a request must be sent to accounting for refund/deduction, then completed from the accounting dashboard.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteBlockedId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                {ar ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => {
                  requestBookingCancellation(deleteBlockedId);
                  loadData();
                  setDeleteBlockedId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-700"
              >
                {ar ? 'إرسال طلب إلغاء للمحاسبة' : 'Send cancel request to accounting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
