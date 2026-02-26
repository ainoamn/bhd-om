/**
 * حجوزات العقارات وطلبات المعاينة
 * تُخزّن في localStorage للتوافق مع النظام الحالي
 */

import { updateProperty, updatePropertyUnit, getPropertyById, getPropertyDisplayByLevel, getPropertyDataOverrides } from '@/lib/data/properties';
import { ensureContactFromBooking, ensureCompanyContactFromBooking, findContactByPhoneOrEmail } from '@/lib/data/addressBook';
import { createDocument, searchDocuments, postUnpostedDocuments, updateDocument } from '@/lib/data/accounting';

import type { AuthorizedRepresentative } from './addressBook';

export type BookingType = 'BOOKING' | 'VIEWING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RENTED' | 'SOLD';

/** نوع الحاجز: شخصي أو شركة */
export type BookingContactType = 'PERSONAL' | 'COMPANY';

export interface PropertyBooking {
  id: string;
  propertyId: number;
  unitKey?: string;
  propertyTitleAr: string;
  propertyTitleEn: string;
  /** نوع الحاجز - للتوافق مع البيانات القديمة يُعتبر PERSONAL إن لم يُحدد */
  contactType?: BookingContactType;
  /** بيانات الشركة - عند contactType === 'COMPANY' */
  companyData?: {
    companyNameAr: string;
    companyNameEn?: string;
    commercialRegistrationNumber?: string;
    authorizedRepresentatives: AuthorizedRepresentative[];
  };
  /** الاسم (شخصي) أو اسم الشركة (شركة - للتوافق) */
  name: string;
  email: string;
  phone: string;
  /** الرقم المدني - مطلوب أو رقم الجواز */
  civilId?: string;
  /** رقم الجواز - اختياري لمن لا يوجد لديه رقم مدني */
  passportNumber?: string;
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
  /** تاريخ تأكيد المحاسب/مدير الحسابات لاستلام المبلغ */
  accountantConfirmedAt?: string;
  /** رقم الإيصال المُعيّن من المحاسب عند تأكيد الاستلام — ينعكس في مستندات العقد */
  depositReceiptNumber?: string;
  /** آخر 4 أرقام من البطاقة (عند الدفع ببطاقة) */
  cardLast4?: string;
  /** تاريخ انتهاء البطاقة MM/YY */
  cardExpiry?: string;
  /** اسم صاحب البطاقة */
  cardholderName?: string;
  /** ملاحظة المحاسب عند إتمام إلغاء الحجز (استرداد/خصم) */
  cancellationNote?: string;
  /** تاريخ إتمام عملية الإلغاء من المحاسب */
  cancellationCompletedAt?: string;
  createdAt: string;
}

/** طلب إلغاء حجز مرتبط بسند مالي - يذهب للمحاسبة لاسترداد/خصم المبلغ */
export interface BookingCancellationRequest {
  id: string;
  bookingId: string;
  requestedAt: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  /** المبلغ المسترد/المخصوم */
  amountToRefund: number;
  /** ملاحظة المحاسب عند إتمام العملية */
  accountantNote?: string;
  processedAt?: string;
  processedBy?: string;
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

/** تطبيع رقم الهاتف للمقارنة (إزالة المسافات والرموز، أخذ آخر 8 أرقام لعُمان) */
function normalizePhoneForCompare(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^968/, '').replace(/^0+/, '');
  return digits.slice(-8); // آخر 8 أرقام للتحقق من التكرار
}

/** هل نفس المستخدم؟ (مقارنة بريد أو هاتف) */
function isSameUser(
  a: { email?: string; phone?: string },
  b: { email?: string; phone?: string }
): boolean {
  const emailA = (a.email || '').trim().toLowerCase();
  const emailB = (b.email || '').trim().toLowerCase();
  if (emailA && emailB && emailA === emailB) return true;
  const phoneA = normalizePhoneForCompare(a.phone || '');
  const phoneB = normalizePhoneForCompare(b.phone || '');
  if (phoneA.length >= 8 && phoneB.length >= 8 && phoneA === phoneB) return true;
  return false;
}

/** الحجوزات النشطة لعقار/وحدة (غير ملغاة ولا مؤجرة بعقد) */
function getActiveBookingsForUnit(propertyId: number, unitKey?: string): PropertyBooking[] {
  const all = getStoredBookings();
  return all.filter(
    (b) =>
      b.type === 'BOOKING' &&
      b.propertyId === propertyId &&
      (b.unitKey || '') === (unitKey || '') &&
      b.status !== 'CANCELLED' &&
      b.status !== 'RENTED' &&
      b.status !== 'SOLD'
  );
}

/** التحقق من إمكانية إنشاء حجز جديد - لا يسمح بتكرار نفس المستخدم ولا بأكثر من حجزين لمستخدمين مختلفين */
export function canCreateBooking(
  propertyId: number,
  unitKey: string | undefined,
  email: string,
  phone: string
): { allowed: boolean; reason?: 'ALREADY_BOOKED' | 'MAX_REACHED' } {
  const active = getActiveBookingsForUnit(propertyId, unitKey);
  const user = { email: (email || '').trim(), phone: (phone || '').trim() };
  if (user.email.length < 3 && normalizePhoneForCompare(user.phone).length < 8) {
    return { allowed: true }; // لا نتحقق بدون بيانات كافية
  }
  for (const b of active) {
    if (isSameUser(b, user)) {
      return { allowed: false, reason: 'ALREADY_BOOKED' };
    }
  }
  const distinctUsers = new Set<string>();
  for (const b of active) {
    const key = `${(b.email || '').toLowerCase()}|${normalizePhoneForCompare(b.phone || '')}`;
    distinctUsers.add(key);
  }
  if (distinctUsers.size >= 2) {
    return { allowed: false, reason: 'MAX_REACHED' };
  }
  return { allowed: true };
}

/** هل للمستخدم حجز نشط لهذا العقار؟ (لعرض "هذا العقار محجوز لك") */
export function hasUserActiveBookingForProperty(
  propertyId: number,
  unitKey: string | undefined,
  email: string,
  phone: string
): boolean {
  return !!getUserActiveBookingForProperty(propertyId, unitKey, email, phone);
}

/** الحجز النشط للمستخدم لهذا العقار (إن وُجد) - لبناء رابط الشروط */
export function getUserActiveBookingForProperty(
  propertyId: number,
  unitKey: string | undefined,
  email: string,
  phone: string
): PropertyBooking | null {
  const active = getActiveBookingsForUnit(propertyId, unitKey);
  const user = { email: (email || '').trim(), phone: (phone || '').trim() };
  if (user.email.length < 3 && normalizePhoneForCompare(user.phone).length < 8) return null;
  return active.find((b) => isSameUser(b, user)) || null;
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

/** الحصول على اسم الحاجز للعرض - شركة أو شخص */
export function getBookingDisplayName(b: PropertyBooking, locale?: string): string {
  if (b.contactType === 'COMPANY' && b.companyData?.companyNameAr) {
    if (locale === 'en' && b.companyData.companyNameEn?.trim()) return b.companyData.companyNameEn;
    return b.companyData.companyNameAr;
  }
  return b.name || '—';
}

/** هل الحجز لشركة؟ */
export function isCompanyBooking(b: PropertyBooking): boolean {
  return b.contactType === 'COMPANY';
}

/** استخراج عرض الوحدة من unitKey (مثل shop-0 → محل 1، apartment-1 → شقة 2) */
export function getUnitDisplayFromProperty(prop: { multiUnitShops?: { unitNumber?: string }[]; multiUnitShowrooms?: { unitNumber?: string }[]; multiUnitApartments?: { unitNumber?: string }[] }, unitKey: string, ar: boolean): string {
  const match = unitKey.match(/^(shop|showroom|apartment)-(\d+)$/);
  if (!match) return unitKey;
  const [, type, idxStr] = match;
  const idx = parseInt(idxStr, 10);
  const typeLabels: Record<string, [string, string]> = {
    shop: ar ? ['محل', 'Shop'] : ['Shop', 'محل'],
    showroom: ar ? ['معرض', 'Showroom'] : ['Showroom', 'معرض'],
    apartment: ar ? ['شقة', 'Apartment'] : ['Apartment', 'شقة'],
  };
  const arr = type === 'shop' ? (prop.multiUnitShops || []) : type === 'showroom' ? (prop.multiUnitShowrooms || []) : (prop.multiUnitApartments || []);
  const unit = arr[idx];
  const unitNum = unit?.unitNumber || String(idx + 1);
  return `${typeLabels[type][0]} ${unitNum}`;
}

/** إنشاء إيصال محاسبي فوراً عند الحجز — برقم متسلسل، غير مقيد. المحاسب يؤكد الاستلام ليقيده */
function createAccountingReceiptFromBooking(booking: PropertyBooking): void {
  if (typeof window === 'undefined') return;
  if (booking.type !== 'BOOKING' || !booking.paymentConfirmed || !booking.priceAtBooking || booking.priceAtBooking <= 0) return;

  const existing = searchDocuments({ bookingId: booking.id });
  if (existing.length > 0) return;

  const paymentDate = booking.paymentDate?.trim() || (booking.createdAt ? booking.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));

  try {
    const contact = findContactByPhoneOrEmail(booking.phone, booking.email);
    const prop = getPropertyById(booking.propertyId, getPropertyDataOverrides());
    const propNum = prop ? getPropertyDisplayByLevel(prop, 'numberOnly') : booking.propertyTitleAr;
    const unitDisplay = booking.unitKey && prop ? getUnitDisplayFromProperty(prop, booking.unitKey, true) : booking.unitKey || '';
    const unitDisplayEn = booking.unitKey && prop ? getUnitDisplayFromProperty(prop, booking.unitKey, false) : booking.unitKey || '';
    const displayName = getBookingDisplayName(booking);
    const descAr = `إيصال حجز - رقم العقار: ${propNum}${unitDisplay ? ` - الوحدة: ${unitDisplay}` : ''} - ${displayName}`;
    const descEn = `Booking receipt - Property: ${propNum}${unitDisplayEn ? ` - Unit: ${unitDisplayEn}` : ''} - ${getBookingDisplayName(booking, 'en')}`;

    createDocument({
      type: 'RECEIPT',
      status: 'PENDING',
      date: paymentDate,
      dueDate: booking.paymentMethod === 'CHEQUE' && booking.paymentDate ? booking.paymentDate : undefined,
      contactId: contact?.id,
      bankAccountId: booking.bankAccountId?.trim() || undefined,
      propertyId: booking.propertyId,
      bookingId: booking.id,
      contractId: booking.contractId?.trim() || undefined,
      amount: booking.priceAtBooking,
      currency: 'OMR',
      totalAmount: booking.priceAtBooking,
      descriptionAr: descAr,
      descriptionEn: descEn,
      paymentMethod: (booking.cardLast4 ? 'CASH' : booking.paymentMethod) || 'CASH',
      paymentReference: booking.paymentReferenceNo?.trim() || (booking.cardLast4 ? `بطاقة ****${booking.cardLast4}` : `حجز-${booking.id}`),
      chequeNumber: booking.paymentMethod === 'CHEQUE' ? (booking.paymentReferenceNo?.trim() || undefined) : undefined,
      chequeDueDate: booking.paymentMethod === 'CHEQUE' && booking.paymentDate ? booking.paymentDate : undefined,
    });
  } catch {
    // لا نوقف عملية الحجز إذا فشل إنشاء الإيصال
  }
}

/** مزامنة الحجوزات المدفوعة مع المحاسبة — إنشاء إيصالات غير مقيدة للحجوزات التي لا تملك إيصالاً */
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

export function createBooking(data: Omit<PropertyBooking, 'id' | 'createdAt' | 'status'> & { paymentConfirmed?: boolean; priceAtBooking?: number; paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'; paymentReferenceNo?: string; paymentDate?: string; bankAccountId?: string; civilId?: string; passportNumber?: string; contactType?: BookingContactType; companyData?: PropertyBooking['companyData']; cardLast4?: string; cardExpiry?: string; cardholderName?: string }): PropertyBooking {
  const check = canCreateBooking(data.propertyId, data.unitKey, data.email, data.phone);
  if (!check.allowed) {
    if (check.reason === 'ALREADY_BOOKED') {
      throw new Error('ALREADY_BOOKED'); // هذا العقار محجوز لك بالفعل
    }
    if (check.reason === 'MAX_REACHED') {
      throw new Error('MAX_REACHED'); // تم الوصول للحد الأقصى من الحجوزات لهذا العقار
    }
  }
  const isCompany = data.contactType === 'COMPANY' && data.companyData?.companyNameAr && data.companyData.authorizedRepresentatives?.length;
  const booking: PropertyBooking = {
    ...data,
    contactType: isCompany ? 'COMPANY' : (data.contactType || 'PERSONAL'),
    companyData: isCompany ? data.companyData : undefined,
    name: isCompany ? data.companyData!.companyNameAr : data.name,
    email: data.email,
    phone: data.phone,
    id: generateId(),
    status: 'PENDING',
    paymentConfirmed: data.paymentConfirmed ?? false,
    civilId: data.civilId?.trim() || undefined,
    passportNumber: data.passportNumber?.trim() || undefined,
    priceAtBooking: data.priceAtBooking,
    paymentMethod: data.paymentMethod,
    paymentReferenceNo: data.paymentReferenceNo?.trim() || undefined,
    paymentDate: data.paymentDate?.trim() || undefined,
    bankAccountId: data.bankAccountId?.trim() || undefined,
    cardLast4: data.cardLast4?.trim().slice(-4) || undefined,
    cardExpiry: data.cardExpiry?.trim() || undefined,
    cardholderName: data.cardholderName?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const bookings = getStoredBookings();
  bookings.unshift(booking);
  saveBookings(bookings);
  const prop = getPropertyById(data.propertyId, getPropertyDataOverrides());
  const unitPart = data.unitKey && prop ? getUnitDisplayFromProperty(prop, data.unitKey, true) : null;
  const unitDisplay = unitPart ? `${data.propertyTitleAr} - ${unitPart}` : data.propertyTitleAr;
  try {
    if (isCompany) {
      ensureCompanyContactFromBooking(
        data.companyData!.companyNameAr,
        data.phone,
        data.email,
        {
          companyNameEn: data.companyData!.companyNameEn,
          commercialRegistrationNumber: data.companyData!.commercialRegistrationNumber,
          authorizedRepresentatives: data.companyData!.authorizedRepresentatives,
        },
        { propertyId: data.propertyId, unitKey: data.unitKey, unitDisplay }
      );
    } else {
      ensureContactFromBooking(data.name, data.phone, data.email, {
        propertyId: data.propertyId,
        unitKey: data.unitKey,
        unitDisplay,
        civilId: data.civilId?.trim() || undefined,
        passportNumber: data.passportNumber?.trim() || undefined,
      });
    }
  } catch {
    // الحجز مُسجّل؛ فشل ربط/تحديث دفتر العناوين فقط (لا نوقف العملية)
  }
  if (data.type === 'BOOKING' && data.paymentConfirmed) {
    setPropertyReservedOnPayment(data.propertyId, data.unitKey);
    createAccountingReceiptFromBooking(booking);
  }
  return booking;
}

export function getBookingsByProperty(propertyId: number): PropertyBooking[] {
  return getStoredBookings().filter((b) => b.propertyId === propertyId);
}

export function getAllBookings(): PropertyBooking[] {
  return getStoredBookings();
}

/** مزامنة جميع الحجوزات مع دفتر العناوين - إضافة جهات اتصال للحجوزات التي لا تملك جهة في الدفتر */
export function syncBookingContactsToAddressBook(): { added: number; updated: number } {
  if (typeof window === 'undefined') return { added: 0, updated: 0 };
  const all = getStoredBookings();
  let added = 0;
  let updated = 0;
  for (const b of all) {
    if (b.status === 'CANCELLED') continue;
    try {
      const prop = getPropertyById(b.propertyId, getPropertyDataOverrides());
      const unitPart = b.unitKey && prop ? getUnitDisplayFromProperty(prop, b.unitKey, true) : null;
      const unitDisplay = unitPart ? `${b.propertyTitleAr} - ${unitPart}` : b.propertyTitleAr;
      const opts = { propertyId: b.propertyId, unitKey: b.unitKey, unitDisplay };
      const isCompany = isCompanyBooking(b) && b.companyData?.companyNameAr && b.companyData.authorizedRepresentatives?.length;
      if (isCompany) {
        ensureCompanyContactFromBooking(
          b.companyData!.companyNameAr,
          b.phone,
          b.email,
          {
            companyNameEn: b.companyData!.companyNameEn,
            commercialRegistrationNumber: b.companyData!.commercialRegistrationNumber,
            authorizedRepresentatives: b.companyData!.authorizedRepresentatives,
          },
          opts
        );
        added++;
      } else {
        const existing = findContactByPhoneOrEmail(b.phone, b.email);
        if (!existing) {
          ensureContactFromBooking(b.name, b.phone, b.email, { ...opts, civilId: b.civilId, passportNumber: b.passportNumber });
          added++;
        } else if (!existing.linkedUnitDisplay && !existing.linkedPropertyId) {
          ensureContactFromBooking(b.name, b.phone, b.email, { ...opts, civilId: b.civilId, passportNumber: b.passportNumber });
          updated++;
        }
      }
    } catch {
      // تخطي الحجز الذي يسبب خطأ (مثل تكرار السجل التجاري) دون تعطيل الصفحة
    }
  }
  return { added, updated };
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

/** حجوزات مدفوعة بانتظار تأكيد المحاسب لاستلام المبلغ */
export function getBookingsPendingAccountantConfirmation(): PropertyBooking[] {
  return getStoredBookings().filter(
    (b) => b.type === 'BOOKING' && b.paymentConfirmed && b.priceAtBooking && b.priceAtBooking > 0 && !b.accountantConfirmedAt
  );
}

/** تأكيد استلام مبلغ الحجز من قبل المحاسب — اعتماد الإيصال وتقيده في الحسابات */
export function confirmBookingReceiptByAccountant(bookingId: string): PropertyBooking | null {
  const booking = getStoredBookings().find((b) => b.id === bookingId);
  if (!booking || booking.type !== 'BOOKING' || !booking.paymentConfirmed || !booking.priceAtBooking) return null;

  const docs = searchDocuments({ bookingId: bookingId });
  const receipt = docs.find((d) => d.type === 'RECEIPT' && (d.status === 'PENDING' || d.status === 'DRAFT'));
  if (receipt) {
    updateDocument(receipt.id, { status: 'APPROVED' });
    postUnpostedDocuments();
  }

  return updateBooking(bookingId, {
    accountantConfirmedAt: new Date().toISOString(),
    status: 'CONFIRMED',
    depositReceiptNumber: receipt?.serialNumber,
  });
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

const CANCELLATION_REQUESTS_KEY = 'bhd_booking_cancellation_requests';

function getStoredCancellationRequests(): BookingCancellationRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CANCELLATION_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCancellationRequests(list: BookingCancellationRequest[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CANCELLATION_REQUESTS_KEY, JSON.stringify(list));
  } catch {}
}

/** طلبات إلغاء الحجوزات بانتظار المحاسبة (استرداد/خصم المبلغ) */
export function getBookingsPendingCancellation(): (BookingCancellationRequest & { booking: PropertyBooking })[] {
  const requests = getStoredCancellationRequests().filter((r) => r.status === 'PENDING');
  const bookings = getStoredBookings();
  return requests
    .map((r) => {
      const booking = bookings.find((b) => b.id === r.bookingId);
      return booking ? { ...r, booking } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** هل الحجز لديه طلب إلغاء بانتظار المحاسبة؟ */
export function hasPendingCancellationRequest(bookingId: string): boolean {
  return getStoredCancellationRequests().some((r) => r.bookingId === bookingId && r.status === 'PENDING');
}

/** إنشاء طلب إلغاء حجز - يذهب للمحاسبة لاسترداد/خصم المبلغ (للحجوزات المرتبطة بسند مالي فقط) */
export function requestBookingCancellation(bookingId: string): BookingCancellationRequest | null {
  const bookings = getStoredBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking || !hasBookingFinancialLinkage(booking) || booking.status === 'CANCELLED') return null;
  if (booking.contractId?.trim()) return null; // حجز مرتبط بعقد - يُلغى من صفحة العقود
  if (hasPendingCancellationRequest(bookingId)) return null;
  const amount = booking.priceAtBooking ?? 0;
  const request: BookingCancellationRequest = {
    id: `BCR-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    bookingId,
    requestedAt: new Date().toISOString(),
    status: 'PENDING',
    amountToRefund: amount,
  };
  const list = [...getStoredCancellationRequests(), request];
  saveCancellationRequests(list);
  return request;
}

/** إتمام عملية الإلغاء من المحاسب - استرداد/خصم المبلغ ثم إلغاء الحجز وإظهار الملاحظة */
export function completeCancellationByAccountant(
  requestId: string,
  accountantNote: string
): { request: BookingCancellationRequest; booking: PropertyBooking } | null {
  const list = getStoredCancellationRequests();
  const idx = list.findIndex((r) => r.id === requestId && r.status === 'PENDING');
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const updatedRequest: BookingCancellationRequest = {
    ...list[idx],
    status: 'PROCESSED',
    accountantNote: accountantNote.trim() || undefined,
    processedAt: now,
    processedBy: 'المحاسب',
  };
  list[idx] = updatedRequest;
  saveCancellationRequests(list);
  const booking = updateBooking(updatedRequest.bookingId, {
    status: 'CANCELLED',
    cancellationNote: accountantNote.trim() || undefined,
    cancellationCompletedAt: now,
  });
  if (!booking) return null;
  return { request: updatedRequest, booking };
}
