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
  /** نوع عقد العقار: إيجار، بيع، استثمار — يحدد هيكل العقد والعرض */
  propertyContractKind?: 'RENT' | 'SALE' | 'INVESTMENT';
  /** عقد البيع: ثمن البيع الإجمالي */
  totalSaleAmount?: number;
  /** عقد البيع: تاريخ البيع */
  saleDate?: string;
  /** عقد البيع: تاريخ نقل الملكية */
  transferOfOwnershipDate?: string;
  /** عقد البيع: طريقة الدفع (نقداً، شيك، تحويل، إلخ) - للتوافق مع النسخ القديمة */
  salePaymentMethod?: string;
  /** عقد البيع: ملاحظة في بند تاريخ البيع ونقل الملكية */
  saleDatesNote?: string;
  /** عقد البيع: الدفعات (رقم الدفعة، المبلغ، الملاحظة، مستند) */
  salePayments?: Array<{
    installmentNumber: number;
    amount: number;
    note: string;
    /** رابط خارجي للمستند (اختياري) */
    documentUrl?: string;
    /** ملف مرفوع (data URL) — مناسب لصور/ملفات صغيرة */
    documentFile?: { name: string; type: string; dataUrl: string };
  }>;
  /** عقد البيع: رسوم السمسرة (نسبة من 100) — يُحسب المبلغ من ثمن البيع */
  saleBrokerageFeePercent?: number;
  saleBrokerageFeePayer?: 'seller' | 'buyer';
  /** عقد البيع: رسوم الإسكان (نسبة من 100) */
  saleHousingFeePercent?: number;
  saleHousingFeePayer?: 'seller' | 'buyer';
  /** عقد البيع: رسوم أخرى (وصف + مبلغ + من يدفع) */
  saleOtherFeesList?: Array<{ description: string; amount: number; payer: 'seller' | 'buyer' }>;
  /** عقد البيع: رسوم بلدية */
  saleMunicipalityFees?: number;
  saleMunicipalityFeesPayer?: 'seller' | 'buyer';
  /** عقد البيع: رسوم إدارية */
  saleAdminFees?: number;
  saleAdminFeesPayer?: 'seller' | 'buyer';
  /** عقد البيع: رسوم نقل الملكية */
  saleTransferFees?: number;
  saleTransferFeesPayer?: 'seller' | 'buyer';
  /** عقد البيع: البيع عن طريق وكيل/سمسار */
  saleViaBroker?: boolean;
  /** معرف جهة الاتصال للوسيط في دفتر العناوين (عند الاختيار من الدفتر) */
  brokerContactId?: string;
  /** بيانات الوسيط (السمسار) عند البيع عن طريق وكيل */
  brokerName?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  brokerCivilId?: string;
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
  /** من نفّذ الاعتماد (للعرض مع التاريخ) */
  adminApprovedByFirstName?: string;
  adminApprovedByLastName?: string;
  adminApprovedBySerial?: string;
  tenantApprovedByFirstName?: string;
  tenantApprovedByLastName?: string;
  tenantApprovedBySerial?: string;
  landlordApprovedByFirstName?: string;
  landlordApprovedByLastName?: string;
  landlordApprovedBySerial?: string;
  /** من أنشأ سجل العقد / آخر من حدّثه (اختياري) */
  contractCreatedByFirstName?: string;
  contractCreatedByLastName?: string;
  contractCreatedBySerial?: string;
  contractUpdatedByFirstName?: string;
  contractUpdatedByLastName?: string;
  contractUpdatedBySerial?: string;

  createdAt: string;
  updatedAt: string;
}

/** بيانات المُعتمد لحفظها مع التواريخ */
export type ContractApprovalActor = {
  firstName?: string;
  lastName?: string;
  serial?: string;
};

const STORAGE_KEY = 'bhd_rental_contracts';
let didBulkSyncContracts = false;
let bulkSyncContractsInProgress = false;
let didHydrateContractsFromServer = false;
let hydrateContractsInProgress = false;
let contractsStore: RentalContract[] = [];

function syncContractToServer(contract: RentalContract): void {
  if (typeof window === 'undefined') return;
  if (!contract.bookingId) return;
  fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(contract),
  }).catch(() => {});
}

function getStored(): RentalContract[] {
  if (typeof window === 'undefined') return [];
  return contractsStore;
}

function save(list: RentalContract[]) {
  if (typeof window === 'undefined') return;
  try {
    contractsStore = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function generateId() {
  return `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAllContracts(): RentalContract[] {
  if (!didHydrateContractsFromServer && !hydrateContractsInProgress && typeof window !== 'undefined') {
    hydrateContractsInProgress = true;
    fetch('/api/contracts', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: RentalContract[]) => {
        if (Array.isArray(list) && list.length > 0) {
          mergeContractsFromServer(list);
          didHydrateContractsFromServer = true;
        }
      })
      .catch(() => {})
      .finally(() => {
        hydrateContractsInProgress = false;
      });
  }
  if (!didBulkSyncContracts && !bulkSyncContractsInProgress) {
    bulkSyncContractsInProgress = true;
    try {
      syncAllContractsToServer();
      didBulkSyncContracts = true;
    } finally {
      bulkSyncContractsInProgress = false;
    }
  }
  return getStored();
}

export function mergeContractsFromServer(list: RentalContract[]): number {
  const incoming = Array.isArray(list) ? list : [];
  if (incoming.length === 0) return 0;
  const current = getStored();
  const map = new Map(current.map((c) => [c.id, c] as const));
  let changed = 0;
  for (const c of incoming) {
    if (!c?.id) continue;
    const prev = map.get(c.id);
    if (!prev || String(prev.updatedAt || '') !== String(c.updatedAt || '')) {
      map.set(c.id, c);
      changed++;
    }
  }
  if (changed > 0) save(Array.from(map.values()));
  return changed;
}

export function syncAllContractsToServer(): number {
  const all = getStored();
  let queued = 0;
  for (const c of all) {
    if (!c?.id || !c.bookingId) continue;
    syncContractToServer(c);
    queued++;
  }
  return queued;
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
  syncContractToServer(contract);
  return contract;
}

export function updateContract(id: string, updates: Partial<RentalContract>): RentalContract | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  save(list);
  syncContractToServer(updated);
  return updated;
}

function setPropertyRentedFromContract(contract: RentalContract) {
  try {
    const kind = contract.propertyContractKind ?? 'RENT';
    const status = kind === 'SALE' ? 'SOLD' : 'RENTED';
    if (contract.unitKey) {
      updatePropertyUnit(contract.propertyId, contract.unitKey, { businessStatus: status, isPublished: false });
    } else {
      updateProperty(contract.propertyId, { businessStatus: status, isPublished: false });
    }
    if (contract.bookingId) {
      updateBookingStatus(contract.bookingId, status);
    }
    setContactCategoryForBooking(contract.tenantPhone, kind === 'SALE' ? 'CLIENT' : 'TENANT', contract.tenantEmail); // SALE→CLIENT, RENT/INVESTMENT→TENANT (type: 'CLIENT'|'TENANT')
  } catch {}
}

/** الحصول على قائمة الحقول الناقصة للاعتماد */
export function getContractMissingFields(c: RentalContract, ar = true): string[] {
  const kind = c.propertyContractKind ?? 'RENT';
  const tenantLabelAr = kind === 'SALE' ? 'المشتري' : kind === 'INVESTMENT' ? 'المستثمر' : 'المستأجر';
  const tenantLabelEn = kind === 'SALE' ? 'Buyer' : kind === 'INVESTMENT' ? 'Investor' : 'Tenant';
  const labels: Record<string, { ar: string; en: string }> = {
    tenantName: { ar: kind === 'SALE' ? 'اسم المشتري' : `اسم ${tenantLabelAr}`, en: kind === 'SALE' ? 'Buyer name' : `${tenantLabelEn} name` },
    tenantNationality: { ar: `جنسية ${tenantLabelAr}`, en: `${tenantLabelEn} nationality` },
    tenantGender: { ar: `جنس ${tenantLabelAr}`, en: `${tenantLabelEn} gender` },
    tenantPhone: { ar: `هاتف ${tenantLabelAr}`, en: `${tenantLabelEn} phone` },
    tenantEmail: { ar: `بريد ${tenantLabelAr}`, en: `${tenantLabelEn} email` },
    tenantCivilId: { ar: `رقم البطاقة (${tenantLabelAr})`, en: `${tenantLabelEn} civil ID` },
    tenantCivilIdExpiry: { ar: `انتهاء البطاقة (${tenantLabelAr})`, en: `${tenantLabelEn} civil ID expiry` },
    tenantPassportNumber: { ar: `رقم الجواز (${tenantLabelAr})`, en: `${tenantLabelEn} passport` },
    tenantPassportExpiry: { ar: `انتهاء الجواز (${tenantLabelAr})`, en: `${tenantLabelEn} passport expiry` },
    landlordName: { ar: kind === 'SALE' ? 'اسم البائع (المالك)' : 'اسم المالك', en: kind === 'SALE' ? 'Seller (owner) name' : 'Landlord name' },
    landlordNationality: { ar: kind === 'SALE' ? 'جنسية البائع' : 'جنسية المالك', en: kind === 'SALE' ? 'Seller nationality' : 'Landlord nationality' },
    landlordGender: { ar: kind === 'SALE' ? 'جنس البائع' : 'جنس المالك', en: kind === 'SALE' ? 'Seller gender' : 'Landlord gender' },
    landlordPhone: { ar: kind === 'SALE' ? 'هاتف البائع' : 'هاتف المالك', en: kind === 'SALE' ? 'Seller phone' : 'Landlord phone' },
    landlordEmail: { ar: kind === 'SALE' ? 'بريد البائع' : 'بريد المالك', en: kind === 'SALE' ? 'Seller email' : 'Landlord email' },
    landlordCivilId: { ar: kind === 'SALE' ? 'رقم البطاقة (البائع)' : 'رقم البطاقة (المالك)', en: kind === 'SALE' ? 'Seller civil ID' : 'Landlord civil ID' },
    landlordCivilIdExpiry: { ar: kind === 'SALE' ? 'انتهاء البطاقة (البائع)' : 'انتهاء البطاقة (المالك)', en: kind === 'SALE' ? 'Seller civil ID expiry' : 'Landlord civil ID expiry' },
    landlordPassportNumber: { ar: kind === 'SALE' ? 'رقم الجواز (البائع)' : 'رقم الجواز (المالك)', en: kind === 'SALE' ? 'Seller passport' : 'Landlord passport' },
    landlordPassportExpiry: { ar: kind === 'SALE' ? 'انتهاء الجواز (البائع)' : 'انتهاء الجواز (المالك)', en: kind === 'SALE' ? 'Seller passport expiry' : 'Landlord passport expiry' },
    totalSaleAmount: { ar: 'ثمن البيع', en: 'Sale price' },
    saleDate: { ar: 'تاريخ البيع', en: 'Sale date' },
    transferOfOwnershipDate: { ar: 'تاريخ نقل الملكية', en: 'Transfer of ownership date' },
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
  if (kind === 'SALE') {
    if (c.totalSaleAmount == null || c.totalSaleAmount <= 0) missing.push(labels.totalSaleAmount?.[ar ? 'ar' : 'en'] ?? 'Sale price');
    req('saleDate', c.saleDate);
    req('transferOfOwnershipDate', c.transferOfOwnershipDate);
    if (c.saleViaBroker) {
      const brokerLabels: Record<string, { ar: string; en: string }> = {
        brokerName: { ar: 'اسم الوسيط', en: 'Broker name' },
        brokerPhone: { ar: 'هاتف الوسيط', en: 'Broker phone' },
      };
      const br = (key: string, val: unknown) => {
        if (val === undefined || val === null || String(val).trim() === '') missing.push(brokerLabels[key]?.[ar ? 'ar' : 'en'] ?? key);
      };
      br('brokerName', c.brokerName);
      br('brokerPhone', c.brokerPhone);
    }
  }
  return missing;
}

/** هل بيانات العقد مكتملة للاعتماد؟ */
export function isContractDataComplete(c: RentalContract): boolean {
  return getContractMissingFields(c).length === 0;
}

export function approveContractByAdmin(id: string, actor?: ContractApprovalActor): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'DRAFT') return null;
  if (!isContractDataComplete(c)) return null; // لا يعتمد إذا كانت البيانات ناقصة
  const now = new Date().toISOString();
  const patch: Partial<RentalContract> = { status: 'ADMIN_APPROVED', adminApprovedAt: now };
  if (actor) {
    if (actor.firstName != null) patch.adminApprovedByFirstName = actor.firstName;
    if (actor.lastName != null) patch.adminApprovedByLastName = actor.lastName;
    if (actor.serial != null) patch.adminApprovedBySerial = actor.serial;
  }
  return updateContract(id, patch);
}

export function approveContractByTenant(id: string, actor?: ContractApprovalActor): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'ADMIN_APPROVED') return null;
  const now = new Date().toISOString();
  const patch: Partial<RentalContract> = { status: 'TENANT_APPROVED', tenantApprovedAt: now };
  if (actor) {
    if (actor.firstName != null) patch.tenantApprovedByFirstName = actor.firstName;
    if (actor.lastName != null) patch.tenantApprovedByLastName = actor.lastName;
    if (actor.serial != null) patch.tenantApprovedBySerial = actor.serial;
  }
  const updated = updateContract(id, patch);
  if (updated) {
    const next = getContractById(id)!;
    if (next.landlordApprovedAt) {
      updateContract(id, { status: 'APPROVED' });
      setPropertyRentedFromContract(next);
    }
  }
  return updated;
}

export function approveContractByLandlord(id: string, actor?: ContractApprovalActor): RentalContract | null {
  const c = getContractById(id);
  if (!c || (c.status !== 'ADMIN_APPROVED' && c.status !== 'TENANT_APPROVED')) return null;
  const now = new Date().toISOString();
  const patch: Partial<RentalContract> = {
    status: c.status === 'TENANT_APPROVED' ? 'APPROVED' : 'LANDLORD_APPROVED',
    landlordApprovedAt: now,
  };
  if (actor) {
    if (actor.firstName != null) patch.landlordApprovedByFirstName = actor.firstName;
    if (actor.lastName != null) patch.landlordApprovedByLastName = actor.lastName;
    if (actor.serial != null) patch.landlordApprovedBySerial = actor.serial;
  }
  const updated = updateContract(id, patch);
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
    adminApprovedByFirstName: undefined,
    adminApprovedByLastName: undefined,
    adminApprovedBySerial: undefined,
    tenantApprovedByFirstName: undefined,
    tenantApprovedByLastName: undefined,
    tenantApprovedBySerial: undefined,
    landlordApprovedByFirstName: undefined,
    landlordApprovedByLastName: undefined,
    landlordApprovedBySerial: undefined,
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
