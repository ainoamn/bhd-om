/**
 * حجوزات العقارات وطلبات المعاينة
 * تُخزّن في localStorage للتوافق مع النظام الحالي
 */

import { updateProperty, updatePropertyUnit } from '@/lib/data/properties';
import { setContactCategoryForBooking, findContactByPhoneOrEmail } from '@/lib/data/addressBook';
import { createDocument, searchDocuments } from '@/lib/data/accounting';

export type BookingType = 'BOOKING' | 'VIEWING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RENTED' | 'SOLD';

export interface PropertyBooking {
  id: string;
  propertyId: number;
  unitKey?: string;
  propertyTitleAr: string;
  propertyTitleEn: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  type: BookingType;
  status: BookingStatus;
  viewingDate?: string;
  viewingTime?: string;
  /** العميل أكد إتمام الدفع */
  paymentConfirmed?: boolean;
  /** مبلغ الإيجار/السعر عند الحجز (لحساب العربون) */
  priceAtBooking?: number;
  /** طريقة الدفع: نقداً، تحويل، شيك */
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  /** رقم الإيصال (نقداً/تحويل) أو رقم الشيك */
  paymentReferenceNo?: string;
  /** تاريخ الإيصال أو الشيك (للتحويل والشيك) */
  paymentDate?: string;
  /** الحساب البنكي الذي تم/سيتم استلام الدفع عليه */
  bankAccountId?: string;
  /** ربط بعقد الإيجار عند إنشائه */
  contractId?: string;
  createdAt: string;
}

const STORAGE_KEY = 'bhd_property_bookings';

function getStoredBookings(): PropertyBooking[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings: PropertyBooking[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {}
}

function generateId(): string {
  return `BKG-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setPropertyReservedOnPayment(propertyId: number, unitKey?: string): void {
  try {
    if (unitKey) {
      // محجوز مع بقاء العقار منشوراً في الموقع
      updatePropertyUnit(propertyId, unitKey, { businessStatus: 'RESERVED', isPublished: true });
    } else {
      updateProperty(propertyId, { businessStatus: 'RESERVED', isPublished: true });
    }
  } catch {}
}

/** إنشاء إيصال محاسبي تلقائياً عند تأكيد دفع الحجز - تظهر العمليات في المحاسبة */
function createAccountingReceiptFromBooking(booking: PropertyBooking): void {
  if (typeof window === 'undefined') return;
  if (booking.type !== 'BOOKING' || !booking.paymentConfirmed || !booking.priceAtBooking || booking.priceAtBooking <= 0) return;

  // تجنب التكرار: إذا وُجد إيصال مرتبط بهذا الحجز فلا ننشئ آخر
  const existing = searchDocuments({ bookingId: booking.id });
  if (existing.length > 0) return;

  // للتحويل/الشيك: نحتاج التاريخ. للحجوزات القديمة أو من صفحة الحجز العامة نستخدم تاريخ الإنشاء
  const paymentDate = booking.paymentDate?.trim() || (booking.createdAt ? booking.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));

  try {
    const contact = findContactByPhoneOrEmail(booking.phone, booking.email);
    const descAr = `إيصال حجز - ${booking.propertyTitleAr}${booking.unitKey ? ` - ${booking.unitKey}` : ''} - ${booking.name}`;
    const descEn = `Booking receipt - ${booking.propertyTitleEn}${booking.unitKey ? ` - ${booking.unitKey}` : ''} - ${booking.name}`;

    createDocument({
      type: 'RECEIPT',
      status: 'APPROVED',
      date: paymentDate,
      contactId: contact?.id,
      bankAccountId: booking.bankAccountId?.trim() || undefined,
      propertyId: booking.propertyId,
      bookingId: booking.id,
      amount: booking.priceAtBooking,
      currency: 'OMR',
      totalAmount: booking.priceAtBooking,
      descriptionAr: descAr,
      descriptionEn: descEn,
      paymentMethod: booking.paymentMethod || 'CASH',
      paymentReference: booking.paymentReferenceNo?.trim() || `حجز-${booking.id}`,
    });
  } catch {
    // لا نوقف عملية الحجز إذا فشل إنشاء الإيصال
  }
}

/** مزامنة الحجوزات المدفوعة مع المحاسبة - إنشاء إيصالات للحجوزات التي لا تملك إيصالاً بعد */
export function syncPaidBookingsToAccounting(propertyId?: number): { created: number; skipped: number } {
  if (typeof window === 'undefined') return { created: 0, skipped: 0 };
  const all = getStoredBookings();
  const paid = all.filter((b) => b.type === 'BOOKING' && b.paymentConfirmed && b.priceAtBooking && b.priceAtBooking > 0);
  const filtered = propertyId ? paid.filter((b) => b.propertyId === propertyId) : paid;
  let created = 0;
  let skipped = 0;
  for (const b of filtered) {
    const existing = searchDocuments({ bookingId: b.id });
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    try {
      createAccountingReceiptFromBooking(b);
      created++;
    } catch {
      skipped++;
    }
  }
  return { created, skipped };
}

export function createBooking(data: Omit<PropertyBooking, 'id' | 'createdAt' | 'status'> & { paymentConfirmed?: boolean; priceAtBooking?: number; paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'; paymentReferenceNo?: string; paymentDate?: string; bankAccountId?: string }): PropertyBooking {
  const booking: PropertyBooking = {
    ...data,
    id: generateId(),
    status: 'PENDING',
    paymentConfirmed: data.paymentConfirmed ?? false,
    priceAtBooking: data.priceAtBooking,
    paymentMethod: data.paymentMethod,
    paymentReferenceNo: data.paymentReferenceNo?.trim() || undefined,
    paymentDate: data.paymentDate?.trim() || undefined,
    bankAccountId: data.bankAccountId?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const bookings = getStoredBookings();
  bookings.unshift(booking);
  saveBookings(bookings);
  if (data.type === 'BOOKING' && data.paymentConfirmed) {
    setPropertyReservedOnPayment(data.propertyId, data.unitKey);
    createAccountingReceiptFromBooking(booking);
  }
  setContactCategoryForBooking(data.phone, 'CLIENT', data.email);
  return booking;
}

export function getBookingsByProperty(propertyId: number): PropertyBooking[] {
  return getStoredBookings().filter((b) => b.propertyId === propertyId);
}

export function getAllBookings(): PropertyBooking[] {
  return getStoredBookings();
}

function syncPropertyStatusOnBookingChange(booking: PropertyBooking, newStatus: BookingStatus): void {
  if (booking.type !== 'BOOKING' || !booking.paymentConfirmed) return;
  try {
    if (newStatus === 'RENTED') {
      // مؤجر: يختفي عن العرض في الموقع
      if (booking.unitKey) updatePropertyUnit(booking.propertyId, booking.unitKey, { businessStatus: 'RENTED', isPublished: false });
      else updateProperty(booking.propertyId, { businessStatus: 'RENTED', isPublished: false });
    } else if (newStatus === 'SOLD') {
      // مباع: يختفي عن العرض في الموقع
      if (booking.unitKey) updatePropertyUnit(booking.propertyId, booking.unitKey, { businessStatus: 'SOLD', isPublished: false });
      else updateProperty(booking.propertyId, { businessStatus: 'SOLD', isPublished: false });
    } else if (newStatus === 'CANCELLED') {
      if (booking.unitKey) updatePropertyUnit(booking.propertyId, booking.unitKey, { businessStatus: 'AVAILABLE', isPublished: true });
      else updateProperty(booking.propertyId, { businessStatus: 'AVAILABLE', isPublished: true });
    }
  } catch {}
}

export function updateBookingStatus(id: string, status: BookingStatus, viewingDate?: string, viewingTime?: string): void {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx >= 0) {
    const booking = bookings[idx];
    bookings[idx] = { ...booking, status, viewingDate, viewingTime };
    saveBookings(bookings);
    syncPropertyStatusOnBookingChange(booking, status);
  }
}

export function updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | null {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const booking = bookings[idx];
  const updated = { ...booking, ...updates };
  bookings[idx] = updated;
  saveBookings(bookings);
  if (updates.status) syncPropertyStatusOnBookingChange(booking, updates.status);
  if (updated.type === 'BOOKING' && updated.paymentConfirmed && !booking.paymentConfirmed) {
    createAccountingReceiptFromBooking(updated);
  }
  return updated;
}

/** هل الحجز مرتبط بأمر حسابي أو إيصال أو شيك؟ (لا يمكن حذفه، فقط إلغاؤه) */
export function hasBookingFinancialLinkage(b: PropertyBooking): boolean {
  if (b.contractId?.trim()) return true;
  if (b.paymentConfirmed) return true;
  if (b.paymentReferenceNo?.trim()) return true;
  if (b.paymentMethod && (b.paymentMethod === 'CASH' || b.paymentMethod === 'BANK_TRANSFER' || b.paymentMethod === 'CHEQUE')) return true;
  if (b.bankAccountId?.trim()) return true;
  return false;
}

/** حذف حجز - يُسمح فقط للحجوزات غير المرتبطة بأي أمر حسابي أو دفع */
export function deleteBooking(id: string): boolean {
  const bookings = getStoredBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx < 0) return false;
  const booking = bookings[idx];
  if (hasBookingFinancialLinkage(booking)) return false;
  bookings.splice(idx, 1);
  saveBookings(bookings);
  return true;
}
