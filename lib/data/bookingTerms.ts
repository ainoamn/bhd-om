/**
 * شروط الحجز الخاصة بكل عقار
 * يحددها صاحب العقار في صفحة الحجوزات
 */

export interface PropertyBookingTerms {
  bookingTermsAr: string;
  bookingTermsEn: string;
  bookingDepositNoteAr: string;
  bookingDepositNoteEn: string;
  /** قيمة الحجز بالريال العماني - عند استيفائها يتم حجز المبلغ تلقائياً */
  bookingDepositAmount?: number;
}

const STORAGE_KEY = 'bhd_booking_terms';

function getStoredTerms(): Record<string, PropertyBookingTerms> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTerms(terms: Record<string, PropertyBookingTerms>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch {}
}

const DEFAULT_TERMS_AR = '• مبلغ الحجز (العربون) لا يقل عن إيجار شهر واحد، أو حسب الشروط التي تحددها إدارة العقار.\n• يجب على المستأجر دفع مبلغ الحجز قبل إتمام عملية الحجز.\n• بعد استيفاء المتطلبات والدفع، يستلم مدير العقار طلب الحجز ويتم التأكيد للعميل بأن الحجز تم بنجاح.\n• يرجى التحقق من الشروط الإضافية مع إدارة العقار.';
const DEFAULT_TERMS_EN = '• The booking deposit is at least one month\'s rent, or as per terms set by property management.\n• The tenant must pay the booking deposit before completing the booking process.\n• After fulfilling requirements and payment, the property manager receives the booking request and confirms to the client that the booking was successful.\n• Please verify additional terms with property management.';
const DEFAULT_DEPOSIT_AR = 'مبلغ لا يقل عن إيجار شهر واحد (أو حسب الشروط التي تحددها الإدارة)';
const DEFAULT_DEPOSIT_EN = 'Amount not less than one month\'s rent (or as per terms set by management)';

function getDefaultTerms(): PropertyBookingTerms {
  return {
    bookingTermsAr: DEFAULT_TERMS_AR,
    bookingTermsEn: DEFAULT_TERMS_EN,
    bookingDepositNoteAr: DEFAULT_DEPOSIT_AR,
    bookingDepositNoteEn: DEFAULT_DEPOSIT_EN,
    bookingDepositAmount: undefined,
  };
}

export function getPropertyBookingTerms(propertyId: number | string): PropertyBookingTerms {
  const key = String(propertyId);
  const stored = getStoredTerms()[key];
  if (stored) return { ...getDefaultTerms(), ...stored };
  return getDefaultTerms();
}

export function savePropertyBookingTerms(propertyId: number | string, terms: Partial<PropertyBookingTerms>): void {
  const key = String(propertyId);
  const current = getPropertyBookingTerms(propertyId);
  const updated = { ...current, ...terms };
  const all = getStoredTerms();
  all[key] = updated;
  saveTerms(all);
}
