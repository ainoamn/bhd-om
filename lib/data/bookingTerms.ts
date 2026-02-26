/**
 * شروط الحجز وتوثيق العقد الخاصة بكل عقار
 * يحددها صاحب العقار في صفحة الشروط
 * يدعم 3 أنواع عقود: بيع، إيجار، استثمار - لكل منها شروط مختلفة
 */

import { isOmaniNationality, isCompanyContact, getRepDisplayName } from './addressBook';

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
  { id: 'AUTHORIZED_REP_CARD', labelAr: 'بطاقة المفوض بالتوقيع (نسخة من الأمام ونسخة من الخلف)', labelEn: 'Authorized Representative Card (front and back copy)' },
  /** السجل التجاري للشركة المالكة لحساب الشيكات - عند الشيك باسم شركة أخرى غير المستأجر */
  { id: 'CHEQUE_OWNER_CR', labelAr: 'السجل التجاري الخاص بالشركة المالكة لحساب الشيكات', labelEn: 'Commercial Registration of the company that owns the cheque account' },
  /** عند الشيك باسم شركة: نسخة من بطاقة الموقع على الشيكات */
  { id: 'CHEQUE_SIGNATORY_CARD', labelAr: 'نسخة من بطاقة الموقع على الشيكات', labelEn: 'Copy of cheque signatory ID card' },
  /** عند الشيك باسم فرد آخر: صورة من بطاقة مالك حساب الشيكات */
  { id: 'CHEQUE_OWNER_ID', labelAr: 'صورة من بطاقة مالك حساب الشيكات', labelEn: 'Copy of cheque account owner ID card' },
  /** رسالة تضمن دفع الإيجار - عند الشيك باسم شركة أو فرد آخر غير المستأجر */
  { id: 'RENT_GUARANTEE_LETTER', labelAr: 'رسالة بأن الشيكات مقابل إيجار العقار (يُذكر العقار وتضمن دفع الإيجار)', labelEn: 'Letter stating cheques are for property rent (mentioning the property and guaranteeing payment)' },
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

/** نوع الشيك المطلوب من المستأجر */
export const CHECK_TYPES = [
  { id: 'SECURITY_CHEQUE', labelAr: 'شيك ضمان', labelEn: 'Security cheque' },
  { id: 'RENT_CHEQUE', labelAr: 'شيك إيجار', labelEn: 'Rent cheque' },
  { id: 'DEPOSIT_CHEQUE', labelAr: 'شيك عربون', labelEn: 'Deposit cheque' },
  { id: 'OTHER', labelAr: 'شيك آخر', labelEn: 'Other cheque' },
] as const;

export type CheckTypeId = (typeof CHECK_TYPES)[number]['id'];

export interface RequiredCheck {
  checkTypeId: string;
  labelAr?: string;
  labelEn?: string;
}

/** شروط توثيق العقد لنوع معين (بيع/إيجار/استثمار) */
export interface ContractTypeTerms {
  contractDocTermsAr?: string;
  contractDocTermsEn?: string;
  /** ملاحظة تظهر عند اكتمال تعبئة كل البيانات */
  completionNoteAr?: string;
  completionNoteEn?: string;
  /** ملاحظة تظهر عند الدخول للصفحة (استرجاع للطلب، مطلوب تحديث، طلب جديد...) */
  entryNoticeAr?: string;
  entryNoticeEn?: string;
  /** @deprecated استخدم requiredDocTypesForIndividuals - للتوافق مع البيانات القديمة */
  requiredDocTypes?: ContractDocRequirement[];
  /** المستندات المطلوبة من الأفراد (المستأجر الشخصي) */
  requiredDocTypesForIndividuals?: ContractDocRequirement[];
  /** المستندات المطلوبة من الشركات (السجل التجاري + بطاقات المفوضين تُضاف تلقائياً) */
  requiredDocTypesForCompanies?: ContractDocRequirement[];
  /** @deprecated استخدم requiredChecksForIndividuals - للتوافق مع البيانات القديمة */
  requiredChecks?: RequiredCheck[];
  /** الشيكات المطلوبة من الأفراد - يُعبّئ المستأجر بياناتها (رقم الشيك، المبلغ، التاريخ) */
  requiredChecksForIndividuals?: RequiredCheck[];
  /** الشيكات المطلوبة من الشركات - قد تختلف عن الأفراد (أقل أو أكثر) */
  requiredChecksForCompanies?: RequiredCheck[];
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

const DEFAULT_CONTRACT_DOC_TERMS_AR = '• يُطلب من المستأجر/المشتري إرفاق المستندات المطلوبة في القسم أدناه.\n• يجب تعبئة بيانات الشيكات إن وُجدت.\n• بعد الرفع والاعتماد، يتم إتمام توثيق العقد.';
const DEFAULT_CONTRACT_DOC_TERMS_EN = '• Tenant/buyer must provide the required documents listed below.\n• Fill in cheque details if required.\n• After upload and approval, contract documentation is completed.';
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
): {
  contractDocTermsAr: string;
  contractDocTermsEn: string;
  completionNoteAr?: string;
  completionNoteEn?: string;
  entryNoticeAr?: string;
  entryNoticeEn?: string;
  requiredDocTypes: ContractDocRequirement[];
  requiredDocTypesForIndividuals: ContractDocRequirement[];
  requiredDocTypesForCompanies: ContractDocRequirement[];
  requiredChecks: RequiredCheck[];
  requiredChecksForIndividuals: RequiredCheck[];
  requiredChecksForCompanies: RequiredCheck[];
} {
  const terms = getPropertyBookingTerms(propertyId);
  const typeTerms = terms.contractTermsByType?.[contractType];
  const legacyDocTypes = (typeTerms?.requiredDocTypes?.length ? typeTerms.requiredDocTypes : terms.requiredDocTypes) ?? DEFAULT_CONTRACT_DOC_REQUIREMENTS;
  const forIndividuals = typeTerms?.requiredDocTypesForIndividuals?.length
    ? typeTerms.requiredDocTypesForIndividuals
    : legacyDocTypes;
  const forCompanies = typeTerms?.requiredDocTypesForCompanies ?? [];
  const legacyChecks = typeTerms?.requiredChecks ?? [];
  const checksForIndividuals = typeTerms?.requiredChecksForIndividuals?.length
    ? typeTerms.requiredChecksForIndividuals
    : legacyChecks;
  const checksForCompanies = typeTerms?.requiredChecksForCompanies ?? [];
  return {
    contractDocTermsAr: typeTerms?.contractDocTermsAr ?? terms.contractDocTermsAr ?? DEFAULT_CONTRACT_DOC_TERMS_AR,
    contractDocTermsEn: typeTerms?.contractDocTermsEn ?? terms.contractDocTermsEn ?? DEFAULT_CONTRACT_DOC_TERMS_EN,
    completionNoteAr: typeTerms?.completionNoteAr,
    completionNoteEn: typeTerms?.completionNoteEn,
    entryNoticeAr: typeTerms?.entryNoticeAr,
    entryNoticeEn: typeTerms?.entryNoticeEn,
    requiredDocTypes: forIndividuals,
    requiredDocTypesForIndividuals: forIndividuals,
    requiredDocTypesForCompanies: forCompanies,
    requiredChecks: checksForIndividuals,
    requiredChecksForIndividuals: checksForIndividuals,
    requiredChecksForCompanies: checksForCompanies,
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

/** الحصول على قائمة المستندات المطلوبة حسب جهة الاتصال (فرد أو شركة) - للاستخدام في واجهة المستأجر والإدارة */
export function getRequiredDocTypesForBooking(
  propertyId: number | string,
  contractType: ContractType,
  contact: { companyData?: { authorizedRepresentatives?: Array<{ name: string; nationality?: string }> }; contactType?: string; phone?: string; email?: string } | null,
  filterByNationality?: (list: ContractDocRequirement[], c: unknown) => ContractDocRequirement[]
): ContractDocRequirement[] {
  const ctt = getContractTypeTerms(propertyId, contractType);
  const isCompany = !!contact && isCompanyContact(contact as import('./addressBook').Contact);
  if (isCompany && contact) {
    const companyBase = buildCompanyDocRequirementsFromTerms(contact);
    const extra = ctt.requiredDocTypesForCompanies ?? [];
    const baseIds = new Set(companyBase.map((d) => d.docTypeId));
    const merged: ContractDocRequirement[] = [...companyBase];
    extra.forEach((e) => {
      if (e.docTypeId === 'COMMERCIAL_REGISTRATION') return;
      if (!baseIds.has(e.docTypeId) || e.docTypeId.startsWith('CUSTOM_')) {
        merged.push(e);
        baseIds.add(e.docTypeId);
      }
    });
    return merged;
  }
  const ind = ctt.requiredDocTypesForIndividuals ?? ctt.requiredDocTypes;
  return filterByNationality ? filterByNationality(ind, contact) : ind;
}

/** بناء مستندات الشركة: السجل التجاري + بطاقة كل مفوض */
export function buildCompanyDocRequirementsFromTerms(
  contact: { companyData?: { authorizedRepresentatives?: Array<{ name: string; nationality?: string }> } }
): { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] {
  const reps = contact.companyData?.authorizedRepresentatives || [];
  const result: { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] = [
    { docTypeId: 'COMMERCIAL_REGISTRATION', labelAr: 'السجل التجاري', labelEn: 'Commercial Registration', isRequired: true },
  ];
  reps.forEach((r, i) => {
    const omani = isOmaniNationality(r.nationality || '');
    const namePart = (r.name || '').trim() ? ` - ${(r.name || '').trim()}` : ` ${i + 1}`;
    const idCardSuffix = ' (نسخة من الأمام ونسخة من الخلف)';
    const idCardSuffixEn = ' (front and back copy)';
    result.push({ docTypeId: 'AUTHORIZED_REP_CARD', labelAr: `بطاقة المفوض بالتوقيع${namePart}${idCardSuffix}`, labelEn: `Authorized Rep Card${namePart}${idCardSuffixEn}`, isRequired: true });
    if (!omani) {
      result.push({ docTypeId: 'PASSPORT', labelAr: `جواز المفوض${namePart}`, labelEn: `Rep Passport${namePart}`, isRequired: true });
    }
  });
  return result;
}

/** معرّفات المستندات الإضافية لمالك الشيكات - تُزال عند العودة للمستأجر */
export const CHEQUE_OWNER_DOC_TYPE_IDS = ['CHEQUE_OWNER_CR', 'CHEQUE_SIGNATORY_CARD', 'CHEQUE_OWNER_ID', 'RENT_GUARANTEE_LETTER'] as const;

/** المستندات الإضافية عند الشيك باسم شركة أو فرد آخر (غير المستأجر) */
export function getChequeOwnerExtraDocRequirements(
  ownerType: 'tenant' | 'other_individual' | 'company'
): { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] {
  if (ownerType === 'tenant') return [];
  const chequeOwnerCr = CONTRACT_DOC_TYPES.find((d) => d.id === 'CHEQUE_OWNER_CR');
  const chequeSignatory = CONTRACT_DOC_TYPES.find((d) => d.id === 'CHEQUE_SIGNATORY_CARD');
  const chequeOwnerId = CONTRACT_DOC_TYPES.find((d) => d.id === 'CHEQUE_OWNER_ID');
  const rentLetter = CONTRACT_DOC_TYPES.find((d) => d.id === 'RENT_GUARANTEE_LETTER');
  if (ownerType === 'company') {
    return [
      { docTypeId: 'CHEQUE_OWNER_CR', labelAr: chequeOwnerCr?.labelAr ?? 'السجل التجاري الخاص بالشركة المالكة لحساب الشيكات', labelEn: chequeOwnerCr?.labelEn ?? 'Commercial Registration of cheque account owner company', isRequired: true },
      { docTypeId: 'CHEQUE_SIGNATORY_CARD', labelAr: chequeSignatory?.labelAr ?? 'نسخة من بطاقة الموقع على الشيكات', labelEn: chequeSignatory?.labelEn ?? 'Copy of cheque signatory ID card', isRequired: true },
      { docTypeId: 'RENT_GUARANTEE_LETTER', labelAr: rentLetter?.labelAr ?? 'رسالة بأن الشيكات مقابل إيجار العقار', labelEn: rentLetter?.labelEn ?? 'Letter stating cheques are for property rent', isRequired: true },
    ];
  }
  if (ownerType === 'other_individual') {
    return [
      { docTypeId: 'CHEQUE_OWNER_ID', labelAr: chequeOwnerId?.labelAr ?? 'صورة من بطاقة مالك حساب الشيكات', labelEn: chequeOwnerId?.labelEn ?? 'Copy of cheque account owner ID card', isRequired: true },
      { docTypeId: 'RENT_GUARANTEE_LETTER', labelAr: rentLetter?.labelAr ?? 'رسالة بأن الشيكات مقابل إيجار العقار', labelEn: rentLetter?.labelEn ?? 'Letter stating cheques are for property rent', isRequired: true },
    ];
  }
  return [];
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
