'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getAllBookings, updateBookingStatus, createBooking, updateBooking, deleteBooking, hasBookingFinancialLinkage, syncPaidBookingsToAccounting, type PropertyBooking, type BookingStatus } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getUnitSerialNumber, properties } from '@/lib/data/properties';
import { getContractByBooking, hasContractForUnit, hasActiveContractForUnit } from '@/lib/data/contracts';
import { searchContacts, getContactDisplayName, getContactById, findContactByPhoneOrEmail, isOmaniNationality } from '@/lib/data/addressBook';
import { getActiveBankAccounts, getDefaultBankAccount, getBankAccountById } from '@/lib/data/bankAccounts';
import ContactFormModal from '@/components/admin/ContactFormModal';
import AddUnitModal from '@/components/admin/AddUnitModal';

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

  const loadData = () => {
    if (typeof window !== 'undefined') syncPaidBookingsToAccounting(); // مزامنة تلقائية مع المحاسبة
    setBookings(getAllBookings());
  };

  const [bankAccountsVersion, setBankAccountsVersion] = useState(0);

  useEffect(() => {
    loadData();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_property_bookings') loadData();
      if (e.key === 'bhd_bank_accounts') setBankAccountsVersion((v) => v + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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

  const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
    updateBookingStatus(bookingId, newStatus);
    loadData();
  };

  const isStatusLocked = (b: PropertyBooking) => hasContractForUnit(b.propertyId, b.unitKey);
  const hasContract = (b: PropertyBooking) => !!getContractByBooking(b.id);

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

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={ar ? 'إدارة الحجوزات' : 'Bookings Management'}
        subtitle={ar ? 'جميع حجوزات العقارات وطلبات المعاينة' : 'All property bookings and viewing requests'}
      />

      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">{ar ? 'الإجمالي' : 'Total'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="admin-card p-5 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase">{ar ? 'قيد الانتظار' : 'Pending'}</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="admin-card p-5 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{ar ? 'مؤكد' : 'Confirmed'}</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.confirmed}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">{ar ? 'ملغى' : 'Cancelled'}</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.cancelled}</p>
        </div>
        <div className="admin-card p-5 border-[#8B6F47]/30">
          <p className="text-xs font-semibold text-[#8B6F47] uppercase">{ar ? 'مدفوع' : 'Paid'}</p>
          <p className="text-2xl font-bold text-[#8B6F47] mt-1">{stats.withPayment}</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{ar ? 'طلبات الحجز والمعاينة' : 'Booking & Viewing Requests'}</h2>
          <div className="flex flex-wrap gap-2">
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
              className="admin-select text-sm py-2"
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
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[800px]">
              <thead>
                <tr>
                  <th>{ar ? 'العقار' : 'Property'}</th>
                  <th>{ar ? 'التاريخ' : 'Date'}</th>
                  <th>{ar ? 'العميل' : 'Client'}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{ar ? 'الوحدة' : 'Unit'}</th>
                  <th>{ar ? 'الدفع' : 'Payment'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const { serial, label } = getUnitDisplay(b.propertyId, b.unitKey);
                  const prop = getPropertyById(b.propertyId, dataOverrides);
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/${locale}/admin/properties/${b.propertyId}/bookings`} className="text-[#8B6F47] hover:underline font-medium">
                          {prop ? (ar ? prop.titleAr : prop.titleEn) : `#${b.propertyId}`}
                        </Link>
                      </td>
                      <td>
                        <span className="text-sm text-gray-600">
                          {new Date(b.createdAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold text-gray-900">{b.name}</div>
                          <a href={`tel:${b.phone}`} className="text-sm text-[#8B6F47] hover:underline">{b.phone}</a>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${b.type === 'BOOKING' ? 'admin-badge-info' : 'admin-badge-warning'}`}>
                          {ar ? TYPE_LABELS[b.type]?.ar : TYPE_LABELS[b.type]?.en}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{label}</div>
                          {serial && <div className="text-xs font-mono text-[#8B6F47]">{serial}</div>}
                        </div>
                      </td>
                      <td>
                        {b.type === 'BOOKING' ? (
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">{ar ? 'المبلغ:' : 'Amount:'}</span>{' '}
                              {b.priceAtBooking != null ? `${b.priceAtBooking.toLocaleString()} ر.ع` : '—'}
                            </div>
                            <div>
                              <span className={`admin-badge ${b.paymentConfirmed ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                                {b.paymentConfirmed ? (ar ? 'مدفوع' : 'Paid') : (ar ? 'لم يُدفع' : 'Not paid')}
                              </span>
                            </div>
                            {b.paymentConfirmed && b.paymentMethod && (
                              <div className="text-xs text-gray-600 space-y-0.5">
                                {b.bankAccountId && typeof window !== 'undefined' && (() => {
                                  const acc = getBankAccountById(b.bankAccountId);
                                  return acc ? (
                                    <div className="font-medium text-[#8B6F47]">
                                      {ar ? `${acc.nameAr} - ${acc.bankNameAr}` : `${acc.nameEn || acc.nameAr} - ${acc.bankNameEn || acc.bankNameAr}`}
                                    </div>
                                  ) : null;
                                })()}
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
                      <td>
                        {isStatusLocked(b) ? (
                          <span className="admin-badge admin-badge-success text-xs">
                            {ar ? 'مؤجر (عقد)' : 'Rented (contract)'}
                          </span>
                        ) : (
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                            className={`admin-select text-sm py-1 px-2 w-28 ${
                              b.status === 'CONFIRMED' ? 'border-emerald-200 bg-emerald-50' : b.status === 'RENTED' ? 'border-blue-200 bg-blue-50' : b.status === 'SOLD' ? 'border-green-200 bg-green-50' : b.status === 'CANCELLED' ? 'bg-gray-50' : 'border-amber-200 bg-amber-50'
                            }`}
                          >
                            <option value="PENDING">{ar ? 'قيد الانتظار' : 'Pending'}</option>
                            <option value="CONFIRMED">{ar ? 'قيد الإجراءات' : 'In progress'}</option>
                            <option value="RENTED">{ar ? 'مؤجر' : 'Rented'}</option>
                            <option value="SOLD">{ar ? 'مباع' : 'Sold'}</option>
                            <option value="CANCELLED">{ar ? 'ملغى' : 'Cancelled'}</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {b.status === 'CONFIRMED' && !hasContract(b) && (
                            <Link href={`/${locale}/admin/contracts?createFrom=${b.id}`} className="text-sm font-medium text-[#8B6F47] hover:underline font-semibold">
                              {ar ? 'إنشاء عقد' : 'Create contract'}
                            </Link>
                          )}
                          {!isStatusLocked(b) && (
                            <button
                              type="button"
                              onClick={() => {
                                const contact = findContactByPhoneOrEmail(b.phone, b.email);
                                setEditingBookingId(b.id);
                                setShowManualBooking(true);
                                setPropertySearch('');
                                setUnitSearch('');
                                setContactSearch('');
                                setContactDataConfirmedForBooking(!!contact);
                                setPropertyDropdownOpen(false);
                                setUnitDropdownOpen(false);
                                setContactDropdownOpen(false);
                                setManualForm({
                                  propertyId: String(b.propertyId),
                                  unitKey: b.unitKey || '',
                                  contactId: contact?.id || '',
                                  message: b.message || '',
                                  paymentConfirmed: b.paymentConfirmed ?? false,
                                  priceAtBooking: b.priceAtBooking != null ? String(b.priceAtBooking) : '',
                                  paymentMethod: (b.paymentMethod || '') as '' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
                                  paymentReferenceNo: b.paymentReferenceNo || '',
                                  paymentDate: b.paymentDate || '',
                                  bankAccountId: b.bankAccountId || '',
                                });
                              }}
                              className="text-sm font-medium text-[#8B6F47] hover:underline"
                            >
                              {ar ? 'تعديل' : 'Edit'}
                            </button>
                          )}
                          <Link href={`/${locale}/admin/properties/${b.propertyId}/bookings`} className="text-sm font-medium text-violet-600 hover:underline">
                            {ar ? 'حجوزات العقار' : 'Property'}
                          </Link>
                          <a
                            href={`https://wa.me/9689115341?text=${encodeURIComponent(ar ? `مرحباً، بخصوص طلب من ${b.name}` : `Hi, regarding request from ${b.name}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-emerald-600 hover:underline"
                          >
                            واتساب
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              if (hasBookingFinancialLinkage(b)) {
                                setDeleteBlockedId(b.id);
                              } else {
                                setDeleteConfirmId(b.id);
                              }
                            }}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            {ar ? 'حذف' : 'Delete'}
                          </button>
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
                  updateBooking(editingBookingId, {
                    propertyId: propId,
                    unitKey: manualForm.unitKey || undefined,
                    propertyTitleAr: prop.titleAr,
                    propertyTitleEn: prop.titleEn,
                    name: getContactDisplayName(contact, locale),
                    email: contact.email || '',
                    phone: contact.phone,
                    message: manualForm.message.trim() || undefined,
                    paymentConfirmed: manualForm.paymentConfirmed,
                    priceAtBooking: manualForm.priceAtBooking ? parseFloat(manualForm.priceAtBooking) : undefined,
                    paymentMethod: manualForm.paymentConfirmed && manualForm.paymentMethod ? manualForm.paymentMethod : undefined,
                    paymentReferenceNo: manualForm.paymentReferenceNo?.trim() || undefined,
                    paymentDate: manualForm.paymentDate?.trim() || undefined,
                    bankAccountId: manualForm.bankAccountId?.trim() || undefined,
                  });
                } else {
                  createBooking({
                    propertyId: propId,
                    unitKey: manualForm.unitKey || undefined,
                    propertyTitleAr: prop.titleAr,
                    propertyTitleEn: prop.titleEn,
                    name: getContactDisplayName(contact, locale),
                    email: contact.email || '',
                    phone: contact.phone,
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
                          <input
                            type="date"
                            value={manualForm.paymentDate}
                            onChange={(e) => setManualForm({ ...manualForm, paymentDate: e.target.value })}
                            className="admin-input w-full"
                          />
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
                          <input
                            type="date"
                            value={manualForm.paymentDate}
                            onChange={(e) => setManualForm({ ...manualForm, paymentDate: e.target.value })}
                            className="admin-input w-full"
                          />
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

      {/* Modal: لا يمكن الحذف - مرتبط بأمر حسابي، يمكن الإلغاء فقط */}
      {deleteBlockedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteBlockedId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-amber-700 mb-2">{ar ? 'لا يمكن حذف الحجز' : 'Cannot delete booking'}</h3>
            <p className="text-gray-600 mb-6">
              {ar
                ? 'هذا الحجز مرتبط بأمر حسابي أو إيصال أو شيك أو عقد. لا يمكن حذفه، ولكن يمكنك إلغاؤه من قائمة الحالة.'
                : 'This booking is linked to a financial record, receipt, cheque, or contract. It cannot be deleted, but you can cancel it from the status dropdown.'}
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
                  updateBookingStatus(deleteBlockedId, 'CANCELLED');
                  loadData();
                  setDeleteBlockedId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-700"
              >
                {ar ? 'إلغاء الحجز' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
