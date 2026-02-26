/**
 * عقود الإيجار - إدارة كاملة
 * تُخزّن في localStorage
 */

import { updateProperty, updatePropertyUnit } from './properties';
import { updateBookingStatus } from './bookings';
import { setContactCategoryForBooking, isOmaniNationality } from './addressBook';

export type ContractStatus =
  | 'DRAFT'           // مسودة - قيد الإدخال
  | 'ADMIN_APPROVED'  // اعتماد مبدئي من الإدارة
  | 'TENANT_APPROVED' // اعتمده المستأجر
  | 'LANDLORD_APPROVED' // اعتمده المالك
  | 'APPROVED'        // معتمد بالكامل - عقد نافذ
  | 'CANCELLED';     // مُشطوب/ملغى

export type CheckType = 'rent' | 'deposit' | 'other';

export interface CheckInfo {
  checkNumber?: string;
  amount: number;
  dueDate: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountName?: string;
  notes?: string;
  /** نوع الشيك: إيجار، ضمان، أو آخر */
  type?: CheckType;
}

export interface RentalContract {
  id: string;
  /** ربط بالحجز */
  bookingId?: string;
  propertyId: number;
  unitKey?: string;
  propertyTitleAr: string;
  propertyTitleEn: string;

  /** المستأجر */
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantNationality?: string;
  tenantGender?: string;
  tenantCivilId?: string;
  tenantCivilIdExpiry?: string;
  tenantPassportNumber?: string;
  tenantPassportExpiry?: string;
  tenantIdNumber?: string; // للتوافق
  /** جهة العمل (المستأجر) */
  tenantWorkplace?: string;
  tenantWorkplaceEn?: string;
  /** المنصب (المستأجر) */
  tenantPosition?: string;

  /** المالك */
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordNationality?: string;
  landlordGender?: string;
  landlordCivilId?: string;
  landlordCivilIdExpiry?: string;
  landlordPassportNumber?: string;
  landlordPassportExpiry?: string;
  /** جهة العمل (المالك) */
  landlordWorkplace?: string;
  landlordWorkplaceEn?: string;

  /** مالية العقد */
  monthlyRent: number;
  annualRent: number;
  depositAmount: number;
  /** الشيكات */
  checks: CheckInfo[];

  /** الضمانات */
  guarantees?: string;

  /** امتداد: رسوم البلدية (3% من إجمالي الإيجار) */
  municipalityFees?: number;
  /** امتداد: فترة السماح (أيام) */
  gracePeriodDays?: number;
  /** امتداد: مبلغ فترة السماح (محسوب) */
  gracePeriodAmount?: number;
  /** امتداد: يوم استحقاق الإيجار (1-31) */
  rentDueDay?: number;
  /** امتداد: مدة الدفع - شهرياً، كل شهرين، كل 3 أشهر، كل 6 أشهر، سنوياً */
  rentPaymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
  /** امتداد: طريقة دفع الإيجار */
  rentPaymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'electronic_payment';
  /** امتداد: طريقة دفع الضمان */
  depositPaymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'electronic_payment' | 'cash_and_check';
  /** امتداد: رقم استمارة البلدية */
  municipalityFormNumber?: string;
  /** امتداد: رقم عقد البلدية */
  municipalityContractNumber?: string;
  /** امتداد: رسوم تسجيل البلدية (عادة 1 ر.ع) */
  municipalityRegistrationFee?: number;
  /** امتداد: ضريبة مضافة */
  includesVAT?: boolean;
  /** امتداد: نسبة الضريبة (0.05 = 5%) */
  vatRate?: number;
  /** امتداد: قيمة الضريبة الشهرية */
  monthlyVATAmount?: number;
  /** امتداد: إجمالي الضريبة */
  totalVATAmount?: number;
  /** امتداد: رسوم الإنترنت */
  internetFees?: number;
  /** امتداد: قراءة عداد الكهرباء */
  electricityMeterReading?: string;
  /** امتداد: قراءة عداد الماء */
  waterMeterReading?: string;
  /** امتداد: حساب الإيجار بالمتر */
  calculateByArea?: boolean;
  /** امتداد: المساحة (متر مربع) */
  rentArea?: number;
  /** امتداد: السعر للمتر */
  pricePerMeter?: number;
  /** امتداد: إيجارات شهرية مخصصة (مصفوفة لكل شهر) */
  customMonthlyRents?: number[];

  /** امتداد: نوع العقد (سكني/تجاري) */
  contractType?: 'residential' | 'commercial';
  /** امتداد: تاريخ الاستئجار الفعلي */
  actualRentalDate?: string;
  /** امتداد: تاريخ استلام الوحدة */
  unitHandoverDate?: string;
  /** امتداد: رقم إيصال الإيجار */
  rentReceiptNumber?: string;
  /** امتداد: رقم إيصال الضمان */
  depositReceiptNumber?: string;
  /** امتداد: الضمان النقدي - المبلغ (نقداً/تحويل/إلكتروني) */
  depositCashAmount?: number;
  depositCashDate?: string;
  depositCashReceiptNumber?: string;
  /** امتداد: الضمان شيك - المبلغ ورقم الشيك (عند شيك واحد) */
  depositChequeAmount?: number;
  depositChequeNumber?: string;
  /** امتداد: شيك الضمان مطلوب */
  depositChequeRequired?: boolean;
  /** امتداد: مدة شيك الضمان بالأشهر (1-6) عند كونه مطلوباً */
  depositChequeDurationMonths?: 1 | 2 | 3 | 4 | 5 | 6;
  /** امتداد: مبلغ فاتورة الكهرباء/الماء */
  electricityBillAmount?: number;
  waterBillAmount?: number;
  /** امتداد: تخفيض (مبلغ ثابت يُطرح من إجمالي الإيجار) */
  discountAmount?: number;
  /** امتداد: رسوم أخرى - مصفوفة لدعم رسوم متعددة */
  hasOtherFees?: boolean;
  /** @deprecated استخدم otherFees بدلاً منه - للتوافق مع النسخ القديمة */
  otherFeesDescription?: string;
  /** @deprecated استخدم otherFees بدلاً منه - للتوافق مع النسخ القديمة */
  otherFeesAmount?: number;
  /** امتداد: رسوم أخرى (وصف ومبلغ لكل رسم) */
  otherFees?: Array<{ description: string; amount: number }>;
  /** امتداد: ضرائب أخرى */
  hasOtherTaxes?: boolean;
  otherTaxName?: string;
  otherTaxRate?: number;
  monthlyOtherTaxAmount?: number;
  totalOtherTaxAmount?: number;
  /** امتداد: نوع مالك شيكات الإيجار (كما في عين عُمان) */
  rentChecksOwnerType?: 'tenant' | 'other_individual' | 'company';
  /** امتداد: اسم مالك الشيكات (عند other/company) */
  rentChecksOwnerName?: string;
  /** امتداد: الرقم المدني لمالك الشيكات (عند other/company) */
  rentChecksOwnerCivilId?: string;
  /** امتداد: رقم الهاتف لمالك الشيكات (عند other/company) */
  rentChecksOwnerPhone?: string;
  /** امتداد: اسم الشركة (عند company) */
  rentChecksCompanyName?: string;
  /** امتداد: رقم السجل التجاري (عند company) */
  rentChecksCompanyRegNumber?: string;
  /** امتداد: المفوض في السجل (عند company) */
  rentChecksAuthorizedRep?: string;
  /** امتداد: الحساب البنكي (من التفاصيل البنكية) - تُكتب الشيكات باسم هذا الحساب */
  rentChecksBankAccountId?: string;
  /** امتداد: اسم البنك لشيكات الإيجار */
  rentChecksBankName?: string;
  /** امتداد: فرع البنك لشيكات الإيجار */
  rentChecksBankBranch?: string;
  /** امتداد: الإنترنت (مشمول/شهري/سنوي) */
  internetIncluded?: boolean;
  internetPaymentType?: 'monthly' | 'annually';

  /** التواريخ القانونية */
  startDate: string;
  endDate: string;
  /** مدة الإيجار بالأشهر */
  durationMonths: number;

  status: ContractStatus;
  adminApprovedAt?: string;
  tenantApprovedAt?: string;
  landlordApprovedAt?: string;

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_rental_contracts';

function getStored(): RentalContract[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: RentalContract[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function generateId() {
  return `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAllContracts(): RentalContract[] {
  return getStored();
}

export function getContractById(id: string): RentalContract | undefined {
  return getStored().find((c) => c.id === id);
}

export function getContractsByProperty(propertyId: number): RentalContract[] {
  return getStored().filter((c) => c.propertyId === propertyId);
}

export function getContractByBooking(bookingId: string): RentalContract | undefined {
  return getStored().find((c) => c.bookingId === bookingId);
}

/** هل يوجد عقد نافذ للوحدة؟ (معتمد أو قيد الاعتماد) */
export function hasActiveContractForUnit(propertyId: number, unitKey?: string): boolean {
  const list = getStored();
  return list.some(
    (c) =>
      c.propertyId === propertyId &&
      (unitKey ? c.unitKey === unitKey : !c.unitKey) &&
      c.status !== 'DRAFT' &&
      !isContractEnded(c)
  );
}

/** هل يوجد أي عقد للوحدة؟ (بما فيه المسودة - لقفل الحالة من صفحة الحجوزات) */
export function hasContractForUnit(propertyId: number, unitKey?: string): boolean {
  const list = getStored();
  return list.some(
    (c) =>
      c.propertyId === propertyId &&
      (unitKey ? c.unitKey === unitKey : !c.unitKey)
  );
}

function isContractEnded(c: RentalContract): boolean {
  try {
    return new Date(c.endDate) < new Date();
  } catch {
    return false;
  }
}

export function createContract(data: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt'>): RentalContract {
  const now = new Date().toISOString();
  const contract: RentalContract = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  const list = getStored();
  list.unshift(contract);
  save(list);
  // بعد إنشاء العقد يصبح العقار مؤجراً ولا يمكن تغيير الحالة من صفحة الحجوزات
  setPropertyRentedFromContract(contract);
  if (contract.bookingId) {
    updateBookingStatus(contract.bookingId, 'RENTED');
  }
  return contract;
}

export function updateContract(id: string, updates: Partial<RentalContract>): RentalContract | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  save(list);
  return updated;
}

function setPropertyRentedFromContract(contract: RentalContract) {
  try {
    if (contract.unitKey) {
      updatePropertyUnit(contract.propertyId, contract.unitKey, { businessStatus: 'RENTED', isPublished: false });
    } else {
      updateProperty(contract.propertyId, { businessStatus: 'RENTED', isPublished: false });
    }
    if (contract.bookingId) {
      updateBookingStatus(contract.bookingId, 'RENTED');
    }
    setContactCategoryForBooking(contract.tenantPhone, 'TENANT', contract.tenantEmail);
  } catch {}
}

/** الحصول على قائمة الحقول الناقصة للاعتماد */
export function getContractMissingFields(c: RentalContract, ar = true): string[] {
  const labels: Record<string, { ar: string; en: string }> = {
    tenantName: { ar: 'اسم المستأجر', en: 'Tenant name' },
    tenantNationality: { ar: 'جنسية المستأجر', en: 'Tenant nationality' },
    tenantGender: { ar: 'جنس المستأجر', en: 'Tenant gender' },
    tenantPhone: { ar: 'هاتف المستأجر', en: 'Tenant phone' },
    tenantEmail: { ar: 'بريد المستأجر', en: 'Tenant email' },
    tenantCivilId: { ar: 'رقم البطاقة (المستأجر)', en: 'Tenant civil ID' },
    tenantCivilIdExpiry: { ar: 'انتهاء البطاقة (المستأجر)', en: 'Tenant civil ID expiry' },
    tenantPassportNumber: { ar: 'رقم الجواز (المستأجر)', en: 'Tenant passport' },
    tenantPassportExpiry: { ar: 'انتهاء الجواز (المستأجر)', en: 'Tenant passport expiry' },
    landlordName: { ar: 'اسم المالك', en: 'Landlord name' },
    landlordNationality: { ar: 'جنسية المالك', en: 'Landlord nationality' },
    landlordGender: { ar: 'جنس المالك', en: 'Landlord gender' },
    landlordPhone: { ar: 'هاتف المالك', en: 'Landlord phone' },
    landlordEmail: { ar: 'بريد المالك', en: 'Landlord email' },
    landlordCivilId: { ar: 'رقم البطاقة (المالك)', en: 'Landlord civil ID' },
    landlordCivilIdExpiry: { ar: 'انتهاء البطاقة (المالك)', en: 'Landlord civil ID expiry' },
    landlordPassportNumber: { ar: 'رقم الجواز (المالك)', en: 'Landlord passport' },
    landlordPassportExpiry: { ar: 'انتهاء الجواز (المالك)', en: 'Landlord passport expiry' },
  };
  const missing: string[] = [];
  const req = (key: keyof RentalContract, val: unknown) => {
    if (val === undefined || val === null || String(val).trim() === '') {
      missing.push(labels[key as string]?.[ar ? 'ar' : 'en'] ?? key);
    }
  };
  req('tenantName', c.tenantName);
  req('tenantNationality', c.tenantNationality);
  req('tenantGender', c.tenantGender);
  req('tenantPhone', c.tenantPhone);
  req('tenantEmail', c.tenantEmail);
  const tenantCivil = (c.tenantCivilId ?? c.tenantIdNumber ?? '').trim();
  const tenantPassport = (c.tenantPassportNumber ?? '').trim();
  const tenantOmani = isOmaniNationality(c.tenantNationality ?? '');
  if (tenantOmani) {
    if (!tenantCivil) missing.push(labels.tenantCivilId?.[ar ? 'ar' : 'en'] ?? 'Tenant ID');
    else if (!(c.tenantCivilIdExpiry ?? '').trim()) missing.push(labels.tenantCivilIdExpiry?.[ar ? 'ar' : 'en'] ?? 'Tenant civil ID expiry');
  } else {
    if (!tenantCivil && !tenantPassport) missing.push(labels.tenantCivilId?.[ar ? 'ar' : 'en'] ?? 'Tenant ID');
    else if (tenantCivil && !(c.tenantCivilIdExpiry ?? '').trim()) missing.push(labels.tenantCivilIdExpiry?.[ar ? 'ar' : 'en'] ?? 'Tenant civil ID expiry');
    else if (tenantPassport && !(c.tenantPassportExpiry ?? '').trim()) missing.push(labels.tenantPassportExpiry?.[ar ? 'ar' : 'en'] ?? 'Tenant passport expiry');
  }
  req('landlordName', c.landlordName);
  req('landlordNationality', c.landlordNationality);
  req('landlordGender', c.landlordGender);
  req('landlordPhone', c.landlordPhone);
  req('landlordEmail', c.landlordEmail);
  const landlordCivil = (c.landlordCivilId ?? '').trim();
  const landlordPassport = (c.landlordPassportNumber ?? '').trim();
  const landlordOmani = isOmaniNationality(c.landlordNationality ?? '');
  if (landlordOmani) {
    if (!landlordCivil) missing.push(labels.landlordCivilId?.[ar ? 'ar' : 'en'] ?? 'Landlord ID');
    else if (!(c.landlordCivilIdExpiry ?? '').trim()) missing.push(labels.landlordCivilIdExpiry?.[ar ? 'ar' : 'en'] ?? 'Landlord civil ID expiry');
  } else {
    if (!landlordCivil && !landlordPassport) missing.push(labels.landlordCivilId?.[ar ? 'ar' : 'en'] ?? 'Landlord ID');
    else if (landlordCivil && !(c.landlordCivilIdExpiry ?? '').trim()) missing.push(labels.landlordCivilIdExpiry?.[ar ? 'ar' : 'en'] ?? 'Landlord civil ID expiry');
    else if (landlordPassport && !(c.landlordPassportExpiry ?? '').trim()) missing.push(labels.landlordPassportExpiry?.[ar ? 'ar' : 'en'] ?? 'Landlord passport expiry');
  }
  return missing;
}

/** هل بيانات العقد مكتملة للاعتماد؟ */
export function isContractDataComplete(c: RentalContract): boolean {
  return getContractMissingFields(c).length === 0;
}

export function approveContractByAdmin(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'DRAFT') return null;
  if (!isContractDataComplete(c)) return null; // لا يعتمد إذا كانت البيانات ناقصة
  const now = new Date().toISOString();
  return updateContract(id, { status: 'ADMIN_APPROVED', adminApprovedAt: now });
}

export function approveContractByTenant(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'ADMIN_APPROVED') return null;
  const now = new Date().toISOString();
  const updated = updateContract(id, { status: 'TENANT_APPROVED', tenantApprovedAt: now });
  if (updated) {
    const next = getContractById(id)!;
    if (next.landlordApprovedAt) {
      updateContract(id, { status: 'APPROVED' });
      setPropertyRentedFromContract(next);
    }
  }
  return updated;
}

export function approveContractByLandlord(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || (c.status !== 'ADMIN_APPROVED' && c.status !== 'TENANT_APPROVED')) return null;
  const now = new Date().toISOString();
  const updated = updateContract(id, {
    status: c.status === 'TENANT_APPROVED' ? 'APPROVED' : 'LANDLORD_APPROVED',
    landlordApprovedAt: now,
  });
  if (updated && c.status === 'TENANT_APPROVED') {
    setPropertyRentedFromContract(updated);
  }
  return updated;
}

/** إرجاع العقد لمسودة - يسمح للمدير بتعديل الحقول (فقط عندما لم يُعتمد مبدئياً بعد) */
export function revertContractToDraft(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status === 'DRAFT' || c.status === 'CANCELLED') return null;
  // بعد الاعتماد المبدئي لا يُسمح بالإرجاع لمسودة
  if (c.adminApprovedAt) return null;
  return updateContract(id, {
    status: 'DRAFT',
    adminApprovedAt: undefined,
    tenantApprovedAt: undefined,
    landlordApprovedAt: undefined,
  });
}

/** اعتماد نهائي من الإدارة - يحوّل العقد إلى معتمد بالكامل ويحوّل الحجز لمؤجر */
export function approveContractByAdminFinal(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'ADMIN_APPROVED') return null;
  const updated = updateContract(id, { status: 'APPROVED' });
  if (updated) setPropertyRentedFromContract(updated);
  return updated;
}

/** شطب/إلغاء العقد من قبل الإدارة */
export function cancelContract(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status === 'APPROVED' || c.status === 'CANCELLED') return null;
  return updateContract(id, { status: 'CANCELLED' });
}

/** اعتماد كامل - عند اكتمال جميع التوقيعات */
export function finalizeContractApproval(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c) return null;
  if (c.status === 'TENANT_APPROVED' && c.landlordApprovedAt) {
    return updateContract(id, { status: 'APPROVED' });
  }
  if (c.status === 'LANDLORD_APPROVED' && c.tenantApprovedAt) {
    const updated = updateContract(id, { status: 'APPROVED' });
    if (updated) setPropertyRentedFromContract(updated);
    return updated;
  }
  return null;
}
