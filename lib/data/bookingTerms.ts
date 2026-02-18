/**
 * شروط الحجز وتوثيق العقد الخاصة بكل عقار
 * يحددها صاحب العقار في صفحة الشروط
 * يدعم 3 أنواع عقود: بيع، إيجار، استثمار - لكل منها شروط مختلفة
 */

/** نوع العقد: بيع، إيجار، استثمار */
export type ContractType = 'SALE' | 'RENT' | 'INVESTMENT';

export const CONTRACT_TYPES: { id: ContractType; labelAr: string; labelEn: string }[] = [
  { id: 'SALE', labelAr: 'عقود البيع', labelEn: 'Sale Contracts' },
  { id: 'RENT', labelAr: 'عقود الإيجار', labelEn: 'Rental Contracts' },
  { id: 'INVESTMENT', labelAr: 'عقود الاستثمار', labelEn: 'Investment Contracts' },
];

export const CONTRACT_DOC_TYPES = [
  { id: 'ID_CARD', labelAr: 'بطاقة الهوية (نسخة من الأمام ونسخة من الخلف)', labelEn: 'ID Card (front and back copy)' },
  { id: 'PASSPORT', labelAr: 'جواز السفر', labelEn: 'Passport' },
  { id: 'EMPLOYMENT', labelAr: 'إثبات العمل / راتب', labelEn: 'Employment / Salary proof' },
  { id: 'PREVIOUS_RENT', labelAr: 'عقد إيجار سابق', labelEn: 'Previous rent contract' },
  { id: 'BANK_STATEMENT', labelAr: 'كشف حساب بنكي', labelEn: 'Bank statement' },
  { id: 'FAMILY_CARD', labelAr: 'بطاقة العائلة', labelEn: 'Family card' },
  { id: 'COMMERCIAL_REGISTRATION', labelAr: 'السجل التجاري', labelEn: 'Commercial Registration' },
  { id: 'AUTHORIZED_REP_CARD', labelAr: 'بطاقة المفوض بالتوقيع', labelEn: 'Authorized Representative Card' },
  { id: 'OTHER', labelAr: 'مستند آخر', labelEn: 'Other document' },
] as const;

export type ContractDocTypeId = (typeof CONTRACT_DOC_TYPES)[number]['id'];

export interface ContractDocRequirement {
  /** معرّف ثابت (مثل ID_CARD) أو CUSTOM_xxx لمستند مخصص */
  docTypeId: string;
  labelAr?: string;
  labelEn?: string;
  isRequired: boolean;
}

/** شروط توثيق العقد لنوع معين (بيع/إيجار/استثمار) */
export interface ContractTypeTerms {
  contractDocTermsAr?: string;
  contractDocTermsEn?: string;
  requiredDocTypes?: ContractDocRequirement[];
}

export interface PropertyBookingTerms {
  bookingTermsAr: string;
  bookingTermsEn: string;
  bookingDepositNoteAr: string;
  bookingDepositNoteEn: string;
  /** قيمة الحجز بالريال العماني - عند استيفائها يتم حجز المبلغ تلقائياً */
  bookingDepositAmount?: number;
  /** @deprecated استخدم contractTermsByType بدلاً منه - للتوافق مع البيانات القديمة */
  contractDocTermsAr?: string;
  contractDocTermsEn?: string;
  /** @deprecated استخدم contractTermsByType بدلاً منه */
  requiredDocTypes?: ContractDocRequirement[];
  /** شروط توثيق العقد حسب نوع العقد (بيع، إيجار، استثمار) */
  contractTermsByType?: Partial<Record<ContractType, ContractTypeTerms>>;
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

/** المستندات الافتراضية لتوثيق العقد: جواز السفر، بطاقة الهوية، إثبات العمل (مطلوبة)؛ عقد إيجار سابق، كشف حساب بنكي، بطاقة العائلة (اختيارية) */
export const DEFAULT_CONTRACT_DOC_REQUIREMENTS: ContractDocRequirement[] = [
  { docTypeId: 'PASSPORT', labelAr: 'جواز السفر', labelEn: 'Passport', isRequired: true },
  { docTypeId: 'ID_CARD', labelAr: 'بطاقة الهوية (نسخة من الأمام ونسخة من الخلف)', labelEn: 'ID Card (front and back copy)', isRequired: true },
  { docTypeId: 'EMPLOYMENT', labelAr: 'إثبات العمل / راتب', labelEn: 'Employment / Salary proof', isRequired: true },
  { docTypeId: 'PREVIOUS_RENT', labelAr: 'عقد إيجار سابق', labelEn: 'Previous rent contract', isRequired: false },
  { docTypeId: 'BANK_STATEMENT', labelAr: 'كشف حساب بنكي', labelEn: 'Bank statement', isRequired: false },
  { docTypeId: 'FAMILY_CARD', labelAr: 'بطاقة العائلة', labelEn: 'Family card', isRequired: false },
];

export function getPropertyBookingTerms(propertyId: number | string): PropertyBookingTerms {
  const key = String(propertyId);
  const stored = getStoredTerms()[key];
  if (stored) {
    const merged = { ...getDefaultTerms(), ...stored };
    if (!merged.requiredDocTypes?.length) merged.requiredDocTypes = DEFAULT_CONTRACT_DOC_REQUIREMENTS;
    return merged;
  }
  return { ...getDefaultTerms(), requiredDocTypes: DEFAULT_CONTRACT_DOC_REQUIREMENTS };
}

/** الحصول على شروط توثيق العقد لنوع معين - يعتمد على نوع العقار (بيع/إيجار/استثمار) */
export function getContractTypeTerms(
  propertyId: number | string,
  contractType: ContractType
): { contractDocTermsAr: string; contractDocTermsEn: string; requiredDocTypes: ContractDocRequirement[] } {
  const terms = getPropertyBookingTerms(propertyId);
  const typeTerms = terms.contractTermsByType?.[contractType];
  return {
    contractDocTermsAr: typeTerms?.contractDocTermsAr ?? terms.contractDocTermsAr ?? '',
    contractDocTermsEn: typeTerms?.contractDocTermsEn ?? terms.contractDocTermsEn ?? '',
    requiredDocTypes:
      (typeTerms?.requiredDocTypes?.length ? typeTerms.requiredDocTypes : terms.requiredDocTypes) ??
      DEFAULT_CONTRACT_DOC_REQUIREMENTS,
  };
}

export function savePropertyBookingTerms(propertyId: number | string, terms: Partial<PropertyBookingTerms>): void {
  const key = String(propertyId);
  const current = getPropertyBookingTerms(propertyId);
  const updated = { ...current, ...terms };
  const all = getStoredTerms();
  all[key] = updated;
  saveTerms(all);
}

/** حفظ شروط توثيق العقد لنوع معين */
export function saveContractTypeTerms(
  propertyId: number | string,
  contractType: ContractType,
  typeTerms: Partial<ContractTypeTerms>
): void {
  const current = getPropertyBookingTerms(propertyId);
  const existing = current.contractTermsByType ?? {};
  const updated = {
    ...existing,
    [contractType]: { ...(existing[contractType] ?? {}), ...typeTerms },
  };
  savePropertyBookingTerms(propertyId, { contractTermsByType: updated });
}
