'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getContractById,
  updateContract,
  approveContractByAdmin,
  approveContractByTenant,
  approveContractByLandlord,
  approveContractByAdminFinal,
  cancelContract,
  revertContractToDraft,
  getContractMissingFields,
  isContractDataComplete,
  type RentalContract,
  type CheckInfo,
  type CheckType,
} from '@/lib/data/contracts';
import {
  calcMunicipalityFees,
  calcGracePeriodAmount,
  calcGracePeriodDays,
  calcEndDate,
  calcAnnualRent,
  calcRentFromArea,
  calcRentBaseForFees,
  calcOtherTax,
} from '@/lib/contractCalculations';
import { findContactByPhoneOrEmail, getContactById, getContactDisplayName, getAllContacts, isOmaniNationality, isCompanyContact, updateContact, type Contact } from '@/lib/data/addressBook';
import ContactFormModal from '@/components/admin/ContactFormModal';
import { getAllBookings, mergeBookingsFromServer, updateBooking } from '@/lib/data/bookings';
import { getPropertyLandlordContactId } from '@/lib/data/propertyLandlords';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { getChecksByContract, saveContractChecks } from '@/lib/data/contractChecks';
import { getDocumentsByBooking, getDocumentFiles, createDocumentRequests, formatDocumentTimestamp, areAllRequiredDocumentsApproved } from '@/lib/data/bookingDocuments';
import { getDocumentUploadLink, openWhatsAppWithMessage, openEmailWithMessage } from '@/lib/documentUploadLink';
import { getContractTypeTerms, getRequiredDocTypesForBooking, CHECK_TYPES, type RequiredCheck } from '@/lib/data/bookingTerms';
import { saveBookingChecks, getChecksByBooking, areAllChecksApproved } from '@/lib/data/bookingChecks';
import { getActiveBankAccounts, getBankAccountById, getBankAccountDisplay } from '@/lib/data/bankAccounts';

/** مدة الدفع: شهرياً، كل شهرين، كل 3 أشهر، كل 6 أشهر، سنوياً → عدد أشهر للفترة */
const PAYMENT_FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

/** شيكات الضمان/العربون - تظهر فقط عند اختيار دفع الضمان بشيك */
const DEPOSIT_RELATED_CHECK_IDS = ['SECURITY_CHEQUE', 'DEPOSIT_CHEQUE'];

/** نوع عقد العقار — يُستخدم لعرض الشيكات والشروط حسب نوع العقد */
type PropertyContractKind = 'RENT' | 'SALE' | 'INVESTMENT';

/** توليد الشيكات تلقائياً حسب مدة الدفع (للإيجار) أو من شروط العقد (للبيع/استثمار) */
function buildRequiredChecks(
  propertyId: string | number | undefined,
  rentPaymentMethod: string | undefined,
  durationMonths: number,
  rentPaymentFrequency?: string,
  customMonthlyRents?: number[],
  depositChequeRequired?: boolean,
  depositChequeDurationMonths?: 1 | 2 | 3 | 4 | 5 | 6,
  contractKind: PropertyContractKind = 'RENT'
): RequiredCheck[] {
  const fromTerms = propertyId ? getContractTypeTerms(String(propertyId), contractKind).requiredChecks : [];
  /** عقد البيع فقط يُعامل من الشروط دون شيكات إيجار؛ الإيجار والاستثمار نفس المنطق */
  if (contractKind === 'SALE') return fromTerms;
  let baseChecks = fromTerms.filter((r) => r.checkTypeId !== 'RENT_CHEQUE');
  /** شيك الضمان: مطلوب/غير مطلوب. غير مطلوب = لا نضيف. مطلوب = نضيف N شيك حسب المدة (1-6 أشهر)، بدون تاريخ */
  baseChecks = baseChecks.filter((r) => !DEPOSIT_RELATED_CHECK_IDS.includes(r.checkTypeId ?? ''));
  if (depositChequeRequired && depositChequeDurationMonths && depositChequeDurationMonths >= 1 && depositChequeDurationMonths <= 6) {
    const n = depositChequeDurationMonths;
    for (let i = 0; i < n; i++) {
      baseChecks.push({
        checkTypeId: 'SECURITY_CHEQUE',
        labelAr: n > 1 ? `شيك ضمان #${i + 1}` : 'شيك ضمان',
        labelEn: n > 1 ? `Security cheque #${i + 1}` : 'Security cheque',
      });
    }
  }
  if (rentPaymentMethod !== 'check' || !durationMonths || durationMonths < 1) {
    return baseChecks;
  }
  const periodMonths = PAYMENT_FREQUENCY_MONTHS[rentPaymentFrequency ?? 'monthly'] ?? 1;
  /** عند وجود إيجارات مخصصة: عدد الشيكات من طول المصفوفة وإلا من مدة العقد */
  const effectiveDuration = (customMonthlyRents?.length ?? 0) > 0 ? customMonthlyRents!.length : durationMonths;
  /** شهرياً→شيكات=عدد الأشهر، كل 3 أشهر→4 شيكات/سنة، نصف سنوي→2 شيكات/سنة، سنوياً→شيك واحد */
  const chequeCount = Math.ceil(effectiveDuration / periodMonths);
  const count = chequeCount;
  if (count === 0) return baseChecks;
  const rentLabel = CHECK_TYPES.find((c) => c.id === 'RENT_CHEQUE');
  const isInv = contractKind === 'INVESTMENT';
  const defaultAr = isInv ? 'شيك استثمار' : (rentLabel?.labelAr ?? 'شيك إيجار');
  const defaultEn = isInv ? 'Investment cheque' : (rentLabel?.labelEn ?? 'Rent cheque');
  const rentChecks: RequiredCheck[] = [];
  for (let i = 0; i < count; i++) {
    const suffix = count > 1 ? ` #${i + 1}` : '';
    rentChecks.push({
      checkTypeId: 'RENT_CHEQUE',
      labelAr: defaultAr + suffix,
      labelEn: defaultEn + suffix,
    });
  }
  return [...baseChecks, ...rentChecks];
}

/** حساب التاريخ الافتراضي لشيك الإيجار رقم i: يوم الاستحقاق من بداية الفترة (مدة الدفع تُحدد الشهر) */
function defaultCheckDateForIndex(startDate: string, rentDueDay: number, index: number, periodMonths = 1): string {
  if (!startDate || !rentDueDay) return '';
  try {
    const d = new Date(startDate + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + index * periodMonths);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const day = Math.min(rentDueDay, lastDay);
    d.setDate(day);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/** مبلغ الشيك عند مدة دفع > 1: مجموع إيجارات الأشهر في تلك الفترة */
function chequeAmountForPeriod(
  periodIndex: number,
  periodMonths: number,
  monthlyRent: number,
  customMonthlyRents: number[]
): number {
  const startMonth = periodIndex * periodMonths;
  if (customMonthlyRents.length > 0) {
    let sum = 0;
    for (let m = 0; m < periodMonths && startMonth + m < customMonthlyRents.length; m++) {
      sum += customMonthlyRents[startMonth + m] ?? monthlyRent;
    }
    return sum || monthlyRent * periodMonths;
  }
  return monthlyRent * periodMonths;
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة - بانتظار رفع المستندات', en: 'Draft - Pending docs' },
  ADMIN_APPROVED: { ar: 'اعتماد مبدئي من الإدارة', en: 'Preliminary admin approval' },
  TENANT_APPROVED: { ar: 'اعتمده المستأجر', en: 'Tenant Approved' },
  LANDLORD_APPROVED: { ar: 'اعتمده المالك', en: 'Landlord Approved' },
  APPROVED: { ar: 'معتمد - نافذ', en: 'Approved - Active' },
  CANCELLED: { ar: 'مُشطوب', en: 'Cancelled' },
};

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [contract, setContract] = useState<RentalContract | null>(null);
  const [form, setForm] = useState<Partial<RentalContract>>({});
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [checkFormData, setCheckFormData] = useState<Record<number, { checkNumber: string; amount: string; date: string }>>({});
  const [chequeAccountNumber, setChequeAccountNumber] = useState('');
  const [chequeAccountName, setChequeAccountName] = useState('');
  const [rentChecksCreated, setRentChecksCreated] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'edit' | 'final' | 'cancel' | 'tenant' | 'landlord' | null>(null);
  const [approvingAdmin, setApprovingAdmin] = useState(false);
  const lastSyncedBookingStageKeyRef = useRef<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    landlord: false, tenant: true, property: false, financial: true, dates: true,
    municipality: true, customRents: true, cheques: true, documents: true,
    manualCheques: true, guarantees: true, summary: true, finalSummary: true,
    broker: false, saleDates: true, saleData: true, contractTerms: true,
  });
  const [showAddBrokerModal, setShowAddBrokerModal] = useState(false);
  const toggleSection = (id: string) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  useEffect(() => setMounted(true), []);
  useEffect(() => { setAdminEditMode(false); }, [contract?.status, id]);

  const loadContract = useCallback(() => {
    const c = getContractById(id);
    setContract(c ?? null);
    if (c) {
      // ترحيل رسوم أخرى من النسخة القديمة (وصف/مبلغ واحد) إلى مصفوفة
      let otherFees = c.otherFees ?? [];
      if (otherFees.length === 0 && c.otherFeesDescription && (c.otherFeesAmount ?? 0) > 0) {
        otherFees = [{ description: c.otherFeesDescription, amount: c.otherFeesAmount ?? 0 }];
      }
      const hasOtherFees = c.hasOtherFees || otherFees.length > 0;
      const migratedPayments = (c.salePayments ?? []).map((p: any) => {
        // ترحيل "documentRef" القديم إلى documentUrl
        if (p && typeof p === 'object' && p.documentRef && !p.documentUrl) {
          const { documentRef, ...rest } = p;
          return { ...rest, documentUrl: String(documentRef) };
        }
        return p;
      });
      setForm({
        ...c,
        salePayments: migratedPayments.length > 0 ? migratedPayments : undefined,
        otherFees: otherFees.length > 0 ? otherFees : undefined,
        hasOtherFees,
      });
    }
  }, [id]);

  const syncFromContacts = useCallback(() => {
    const c = getContractById(id);
    if (!c) return;
    let updated = { ...c };
    if (c.bookingId) {
      const b = getAllBookings().find((x) => x.id === c.bookingId);
      if (b) {
        if (b.depositReceiptNumber && !(updated.depositCashReceiptNumber ?? '').trim()) {
          updated = { ...updated, depositCashReceiptNumber: b.depositReceiptNumber };
        }
        if ((b.priceAtBooking ?? 0) > 0 && (updated.depositCashAmount ?? 0) === 0) {
          const amount = b.priceAtBooking ?? 0;
          updated = { ...updated, depositCashAmount: amount, depositAmount: amount };
        }
        const tc = findContactByPhoneOrEmail(b.phone, b.email);
        if (tc) {
          const tenantOmani = isOmaniNationality((tc.nationality ?? '').trim() || (updated.tenantNationality ?? ''));
          updated = {
            ...updated,
            tenantName: (updated.tenantName || '').trim() || getContactDisplayName(tc, locale) || '',
            tenantEmail: (updated.tenantEmail || '').trim() || tc.email || '',
            tenantPhone: (updated.tenantPhone || '').trim() || tc.phone || '',
            tenantNationality: (updated.tenantNationality || '').trim() || tc.nationality || '',
            tenantGender: (updated.tenantGender || '').trim() || tc.gender || '',
            tenantCivilId: (updated.tenantCivilId || updated.tenantIdNumber || '').trim() || tc.civilId || '',
            tenantCivilIdExpiry: (updated.tenantCivilIdExpiry || '').trim() || tc.civilIdExpiry || '',
            tenantPassportNumber: tenantOmani ? undefined : ((updated.tenantPassportNumber || '').trim() || tc.passportNumber || undefined),
            tenantPassportExpiry: tenantOmani ? undefined : ((updated.tenantPassportExpiry || '').trim() || tc.passportExpiry || undefined),
            tenantWorkplace: (updated.tenantWorkplace || '').trim() || tc.workplace || '',
            tenantWorkplaceEn: (updated.tenantWorkplaceEn || '').trim() || tc.workplaceEn || '',
            tenantPosition: (updated.tenantPosition || '').trim() || tc.position || '',
          };
        }
      }
    }
    const lcId = getPropertyLandlordContactId(c.propertyId);
    if (lcId) {
      const lc = getContactById(lcId);
      if (lc) {
        const landlordOmani = isOmaniNationality((lc.nationality ?? '').trim() || (updated.landlordNationality ?? ''));
        updated = {
          ...updated,
          landlordName: (updated.landlordName || '').trim() || getContactDisplayName(lc, locale) || '',
          landlordEmail: (updated.landlordEmail || '').trim() || lc.email || '',
          landlordPhone: (updated.landlordPhone || '').trim() || lc.phone || '',
          landlordNationality: (updated.landlordNationality || '').trim() || lc.nationality || '',
          landlordGender: (updated.landlordGender || '').trim() || lc.gender || '',
          landlordCivilId: (updated.landlordCivilId || '').trim() || lc.civilId || '',
          landlordCivilIdExpiry: (updated.landlordCivilIdExpiry || '').trim() || lc.civilIdExpiry || '',
          landlordPassportNumber: landlordOmani ? undefined : ((updated.landlordPassportNumber || '').trim() || lc.passportNumber || undefined),
          landlordPassportExpiry: landlordOmani ? undefined : ((updated.landlordPassportExpiry || '').trim() || lc.passportExpiry || undefined),
          landlordWorkplace: (updated.landlordWorkplace || '').trim() || lc.workplace || '',
          landlordWorkplaceEn: (updated.landlordWorkplaceEn || '').trim() || lc.workplaceEn || '',
        };
      }
    }
    setForm(updated);
    updateContract(id, updated);
    loadContract();
  }, [id, locale, loadContract]);

  const syncContractStageToBookingAndServer = useCallback(async (updatedContract: RentalContract) => {
    if (!updatedContract.bookingId) return;
    if (typeof window === 'undefined') return;

    const kind = (updatedContract.propertyContractKind ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
    const stage = updatedContract.status as 'DRAFT' | 'ADMIN_APPROVED' | 'TENANT_APPROVED' | 'LANDLORD_APPROVED' | 'APPROVED' | 'CANCELLED';
    const syncKey = `${updatedContract.id}|${updatedContract.bookingId}|${stage}|${kind}`;

    // تحديث localStorage للحجز فوراً (إن كان موجوداً)
    let updatedBooking =
      updateBooking(updatedContract.bookingId, {
        // إضافة contractId ضروري حتى يستطيع العميل استنتاج أن الاعتماد صار على العميل
        // (ولا يبقى في وضع "عقد مسودة — بانتظار رفع المستندات").
        contractId: updatedContract.id,
        contractStage: stage,
        contractKind: kind,
      }) || null;

    // إذا لم يكن الحجز موجوداً محلياً (شائع عند فتح صفحة العقد مباشرة)، اجلبه من الخادم ثم حدّثه
    if (!updatedBooking) {
      try {
        const res = await fetch('/api/bookings', { cache: 'no-store', credentials: 'include' });
        const list = res.ok ? await res.json() : [];
        const serverBooking = Array.isArray(list) ? list.find((b) => b?.id === updatedContract.bookingId) : null;
        if (serverBooking) {
          const merged = {
            ...serverBooking,
            contractId: updatedContract.id,
            contractStage: stage,
            contractKind: kind,
          };
          // ندمجه محلياً حتى تتحدّث صفحات الإدارة بدون refresh
          mergeBookingsFromServer([merged]);
          updatedBooking = merged;
        } else {
          // fallback: إنشاء حجز حدّي لضمان إرسال contractStage/contractKind إلى DB
          const fallback = {
            id: updatedContract.bookingId,
            bookingId: updatedContract.bookingId,
            propertyId: updatedContract.propertyId,
            email: updatedContract.tenantEmail ?? '',
            phone: updatedContract.tenantPhone ?? '',
            contractId: updatedContract.id,
            contractStage: stage,
            contractKind: kind,
          } as any;
          mergeBookingsFromServer([fallback]);
          updatedBooking = fallback;
        }
      } catch {
        // تجاهل
      }
    }

    if (!updatedBooking) return;

    // منع التكرار غير الضروري
    if (lastSyncedBookingStageKeyRef.current === syncKey) return;
    lastSyncedBookingStageKeyRef.current = syncKey;

    // مزامنة مع الخادم كي يظهر نفس السيناريو على أجهزة العملاء المختلفة
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedBooking, contractId: updatedContract.id, contractStage: stage, contractKind: kind }),
      });
    } catch {
      // لا نوقف التدفق إذا فشلت المزامنة
    }
  }, []);

  // ضماناً: أي تغيير بحالة العقد يتم مزامنته على الخادم (بدون الاعتماد على return value للدوال)
  useEffect(() => {
    if (!contract?.bookingId) return;
    syncContractStageToBookingAndServer(contract).catch(() => {});
  }, [contract?.id, contract?.bookingId, contract?.status, syncContractStageToBookingAndServer]);

  useEffect(() => {
    const c = getContractById(id);
    setContract(c ?? null);
    if (c) {
      setForm({ ...c });
      syncFromContacts();
      const stored = getChecksByContract(c.id);
      const hasRent = stored.some((x) => x.checkTypeId === 'RENT_CHEQUE');
      setRentChecksCreated(hasRent);
      if (c.status !== 'ADMIN_APPROVED') setAdminEditMode(false);
    }
  }, [id, loadContract, syncFromContacts]);

  /** المزامنة من الحجز إلى العقد: عند اعتماد جميع المستندات والشيكات، نسخ بيانات الشيكات ورقم الحساب وبيانات مالك الشيكات إلى العقد */
  useEffect(() => {
    const c = getContractById(id);
    if (!c?.bookingId || !c.id) return;
    if (!areAllRequiredDocumentsApproved(c.bookingId) || !areAllChecksApproved(c.bookingId)) return;
    const bookingChecks = getChecksByBooking(c.bookingId);
    if (bookingChecks.length === 0) return;
    const kind = (c.propertyContractKind ?? 'RENT') as PropertyContractKind;
    const reqChecks = buildRequiredChecks(c.propertyId, c.rentPaymentMethod, c.durationMonths ?? 12, c.rentPaymentFrequency, c.customMonthlyRents, c.depositChequeRequired, c.depositChequeDurationMonths, kind);
    if (reqChecks.length === 0 || bookingChecks.length < reqChecks.length) return;
    const entries = reqChecks.map((rc, idx) => {
      const bk = bookingChecks[idx];
      return {
        checkTypeId: rc.checkTypeId,
        labelAr: rc.labelAr || '',
        labelEn: rc.labelEn || '',
        checkNumber: bk?.checkNumber ?? '',
        amount: typeof bk?.amount === 'number' ? bk.amount : parseFloat(String(bk?.amount || 0)) || 0,
        date: bk?.date ?? '',
        accountNumber: bk?.accountNumber ?? '',
        accountName: bk?.accountName ?? '',
        imageUrl: bk?.imageUrl,
      };
    });
    saveContractChecks(c.id, entries);
    const first = bookingChecks[0];
    const rentChecksUpdate: Partial<RentalContract> = {
      rentChecksOwnerType: first?.ownerType,
      rentChecksOwnerName: first?.ownerName ?? '',
      rentChecksOwnerCivilId: first?.ownerCivilId ?? '',
      rentChecksOwnerPhone: first?.ownerPhone ?? '',
      rentChecksCompanyName: first?.companyName ?? '',
      rentChecksCompanyRegNumber: first?.companyRegNumber ?? '',
      rentChecksAuthorizedRep: first?.authorizedRep ?? '',
      rentChecksBankName: first?.bankName ?? '',
      rentChecksBankBranch: first?.bankBranch ?? '',
    };
    updateContract(c.id, rentChecksUpdate);
    loadContract();
  }, [id, loadContract]);

  /** هل بيانات الشيكات ومالك الشيكات مأخوذة من مستندات المستأجر المرفوعة؟ (بعد المزامنة) */
  const fieldsFromTenantDocs = !!(contract?.bookingId && areAllRequiredDocumentsApproved(contract.bookingId) && (getChecksByBooking(contract.bookingId).length === 0 || areAllChecksApproved(contract.bookingId)));

  /** الشيكات المطلوبة: تُبنى تلقائياً حسب مدة الدفع (شهرياً=أشهر، كل 3 أشهر=4/سنة، نصف سنوي=2، سنوياً=1) */
  const storedChecks = contract?.id ? getChecksByContract(contract.id) : [];
  const existingRentCount = storedChecks.filter((c) => c.checkTypeId === 'RENT_CHEQUE').length;
  const requiredChecks = buildRequiredChecks(
    contract?.propertyId,
    form.rentPaymentMethod ?? contract?.rentPaymentMethod,
    form.durationMonths ?? contract?.durationMonths ?? 12,
    form.rentPaymentFrequency ?? contract?.rentPaymentFrequency,
    form.customMonthlyRents ?? contract?.customMonthlyRents,
    form.depositChequeRequired ?? contract?.depositChequeRequired,
    form.depositChequeDurationMonths ?? contract?.depositChequeDurationMonths,
    (contract?.propertyContractKind ?? 'RENT') as PropertyContractKind
  );

  useEffect(() => {
    if (!contract?.id || requiredChecks.length === 0) {
      setCheckFormData({});
      setChequeAccountNumber('');
      setChequeAccountName('');
      return;
    }
    const stored = getChecksByContract(contract.id);
    const monthlyRent = form.monthlyRent ?? contract?.monthlyRent ?? 0;
    const startDate = form.startDate ?? contract?.startDate ?? '';
    const rentDueDay = form.rentDueDay ?? contract?.rentDueDay ?? 1;
    const customRents = form.customMonthlyRents ?? contract?.customMonthlyRents ?? [];
    const periodMonths = PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1;
    const next: Record<number, { checkNumber: string; amount: string; date: string }> = {};
    let rentIndex = 0;
    requiredChecks.forEach((rc, idx) => {
      const existing = stored[idx];
      let amount = '';
      let date = '';
      if (rc.checkTypeId === 'RENT_CHEQUE') {
        const amt = chequeAmountForPeriod(rentIndex, periodMonths, monthlyRent, customRents);
        amount = amt > 0 ? String(amt) : '';
        date = startDate ? defaultCheckDateForIndex(startDate, rentDueDay, rentIndex, periodMonths) : '';
        rentIndex++;
      } else {
        amount = (existing?.amount != null && existing.amount > 0) ? String(existing.amount) : '';
        date = existing?.date ?? '';
        const isDepositCheque = DEPOSIT_RELATED_CHECK_IDS.includes(rc.checkTypeId ?? '');
        if (isDepositCheque) {
          date = ''; /** شيك الضمان: بدون تاريخ دائماً */
          if (!amount && (contract?.depositChequeAmount ?? 0) > 0) amount = String(contract.depositChequeAmount);
        }
      }
      const chkNum = existing?.checkNumber ?? '';
      const isDep = DEPOSIT_RELATED_CHECK_IDS.includes(rc.checkTypeId ?? '');
      next[idx] = {
        checkNumber: isDep && !chkNum && contract?.depositChequeNumber ? contract.depositChequeNumber : chkNum,
        amount,
        date: isDep ? '' : date,
      };
    });
    setCheckFormData(next);
    const firstWithAccount = stored.find((s) => s?.accountNumber || s?.accountName);
    let accNum = firstWithAccount?.accountNumber ?? '';
    let accName = firstWithAccount?.accountName ?? '';
    if ((!accNum || !accName) && contract?.rentChecksBankAccountId && typeof window !== 'undefined') {
      const bankAcc = getBankAccountById(contract.rentChecksBankAccountId);
      if (bankAcc) {
        accNum = accNum || (bankAcc.accountNumber ?? '');
        accName = accName || (bankAcc.nameAr ?? '');
      }
    }
    setChequeAccountNumber(accNum);
    setChequeAccountName(accName);
    if (contract.id) {
      const entries = requiredChecks.map((rc, idx) => ({
        checkTypeId: rc.checkTypeId,
        labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
        labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
        checkNumber: next[idx]?.checkNumber ?? '',
        amount: parseFloat(next[idx]?.amount || '0') || 0,
        date: next[idx]?.date ?? '',
        accountNumber: accNum,
        accountName: accName,
        imageUrl: stored[idx]?.imageUrl,
      }));
      saveContractChecks(contract.id, entries);
    }
  }, [
    contract?.id,
    contract?.propertyId,
    contract?.rentChecksBankAccountId,
    contract?.depositChequeAmount,
    contract?.depositChequeNumber,
    form.monthlyRent,
    form.startDate,
    form.rentDueDay,
    form.customMonthlyRents,
    form.rentPaymentFrequency,
    form.depositChequeRequired,
    form.depositChequeDurationMonths,
    requiredChecks.length,
    requiredChecks.map((r) => r.checkTypeId).join(','),
  ]);

  const saveChecksToStorage = (next: Record<number, { checkNumber: string; amount: string; date: string }>, accountOverride?: { accountNumber?: string; accountName?: string }) => {
    if (!contract?.id) return;
    const accNum = accountOverride?.accountNumber ?? chequeAccountNumber;
    const accName = accountOverride?.accountName ?? chequeAccountName;
    const stored = getChecksByContract(contract.id);
    const entries = requiredChecks.map((rc, idx) => ({
      checkTypeId: rc.checkTypeId,
      labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
      labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
      checkNumber: next[idx]?.checkNumber ?? '',
      amount: parseFloat(next[idx]?.amount || '0') || 0,
      date: next[idx]?.date ?? '',
      accountNumber: accNum,
      accountName: accName,
      imageUrl: stored[idx]?.imageUrl,
    }));
    saveContractChecks(contract.id, entries);
  };

  const handleCheckFieldChange = (index: number, field: 'checkNumber' | 'amount' | 'date', value: string) => {
    if (!contract?.id) return;
    let next: Record<number, { checkNumber: string; amount: string; date: string }> = {
      ...checkFormData,
      [index]: { ...(checkFormData[index] ?? { checkNumber: '', amount: '', date: '' }), [field]: value },
    };
    if (field === 'checkNumber' && index === 0 && value && !isNaN(parseInt(value))) {
      const firstNum = parseInt(value);
      for (let i = 1; i < requiredChecks.length; i++) {
        next = {
          ...next,
          [i]: {
            ...(next[i] ?? { checkNumber: '', amount: '', date: '' }),
            checkNumber: String(firstNum + i),
          },
        };
      }
    }
    setCheckFormData(next);
    saveChecksToStorage(next);
  };

  const handleChequeAccountChange = (field: 'accountNumber' | 'accountName', value: string) => {
    if (field === 'accountNumber') setChequeAccountNumber(value);
    else setChequeAccountName(value);
    const override = field === 'accountNumber' ? { accountNumber: value, accountName: chequeAccountName } : { accountNumber: chequeAccountNumber, accountName: value };
    saveChecksToStorage(checkFormData, override);
  };

  /** إنشاء X شيك تلقائياً - عدد الشيكات يعتمد على مدة الدفع */
  const handleCreateRentChecksAuto = () => {
    const duration = form.durationMonths ?? contract?.durationMonths ?? 12;
    const startDate = (form.startDate ?? contract?.startDate ?? '').trim() || new Date().toISOString().split('T')[0];
    const rentDueDay = form.rentDueDay ?? contract?.rentDueDay ?? 1;
    const monthlyRent = form.monthlyRent ?? contract?.monthlyRent ?? 0;
    const customRents = form.customMonthlyRents ?? contract?.customMonthlyRents ?? [];
    if (duration < 1 || !contract?.id) return;
    setForm((prev) => ({ ...prev, startDate: prev?.startDate || startDate, rentPaymentMethod: 'check' }));
    const fullRequired = buildRequiredChecks(
      contract?.propertyId,
      'check',
      duration,
      form.rentPaymentFrequency ?? contract?.rentPaymentFrequency,
      form.customMonthlyRents ?? contract?.customMonthlyRents,
      form.depositChequeRequired ?? contract?.depositChequeRequired,
      form.depositChequeDurationMonths ?? contract?.depositChequeDurationMonths,
      (contract?.propertyContractKind ?? 'RENT') as PropertyContractKind
    );
    const stored = getChecksByContract(contract.id);
    const periodMonths = PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1;
    const next: Record<number, { checkNumber: string; amount: string; date: string }> = {};
    let rentIdx = 0;
    fullRequired.forEach((rc, idx) => {
      const existing = stored[idx];
      let defaultAmount = '';
      let defaultDate = '';
      if (rc.checkTypeId === 'RENT_CHEQUE') {
        const amt = chequeAmountForPeriod(rentIdx, periodMonths, monthlyRent, customRents);
        defaultAmount = amt > 0 ? String(amt) : '';
        defaultDate = defaultCheckDateForIndex(startDate, rentDueDay, rentIdx, periodMonths);
        rentIdx++;
      }
      next[idx] = {
        checkNumber: existing?.checkNumber ?? '',
        amount: (existing?.amount != null && existing.amount > 0) ? String(existing.amount) : defaultAmount,
        date: existing?.date || defaultDate,
      };
    });
    setCheckFormData(next);
    const entries = fullRequired.map((rc, idx) => ({
      checkTypeId: rc.checkTypeId,
      labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
      labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
      checkNumber: next[idx]?.checkNumber ?? '',
      amount: parseFloat(next[idx]?.amount || '0') || 0,
      date: next[idx]?.date ?? '',
      accountNumber: chequeAccountNumber,
      accountName: chequeAccountName,
    }));
    saveContractChecks(contract.id, entries);
    setRentChecksCreated(true);
  };

  // حساب تلقائي: تاريخ الانتهاء عند تغيير البداية أو المدة (شهر)
  useEffect(() => {
    if (form.startDate && form.durationMonths && form.durationMonths > 0) {
      const end = calcEndDate(form.startDate, form.durationMonths);
      if (end) {
        setForm((prev) => ({ ...prev, endDate: end }));
      }
    }
  }, [form.startDate, form.durationMonths]);

  // عند تحميل عقد قديم: إن وُجد depositAmount دون depositCashAmount، انسخ للضمان النقدي
  useEffect(() => {
    if (!contract?.id) return;
    const dep = contract.depositAmount ?? 0;
    const cash = contract.depositCashAmount ?? 0;
    if (dep > 0 && cash === 0) {
      setForm((prev) => (prev.depositCashAmount != null && prev.depositCashAmount > 0 ? prev : { ...prev, depositCashAmount: dep }));
    }
  }, [contract?.id, contract?.depositAmount, contract?.depositCashAmount]);

  // حساب تلقائي: رسوم البلدية (3% من أساس الحساب = إجمالي الإيجار - التخفيض)
  useEffect(() => {
    const duration = form.durationMonths ?? contract?.durationMonths ?? 12;
    const customRents = form.customMonthlyRents ?? contract?.customMonthlyRents;
    const totalRent = (customRents && customRents.length > 0)
      ? customRents.reduce((a, b) => a + (b ?? 0), 0)
      : (form.monthlyRent ?? contract?.monthlyRent ?? 0) * duration;
    const rentBase = calcRentBaseForFees(totalRent, form.discountAmount ?? contract?.discountAmount ?? 0);
    const fees = Math.round(rentBase * 0.03 * 1000) / 1000;
    setForm((prev) => ({ ...prev, municipalityFees: fees }));
  }, [form.monthlyRent, form.durationMonths, form.customMonthlyRents, form.discountAmount, contract?.id, contract?.monthlyRent, contract?.durationMonths, contract?.customMonthlyRents, contract?.discountAmount]);

  // حساب تلقائي: فترة السماح (أيام) من الفرق بين تاريخ الاستئجار الفعلي وتاريخ البداية
  useEffect(() => {
    const actual = (form.actualRentalDate ?? contract?.actualRentalDate ?? '').toString().trim();
    const start = (form.startDate ?? contract?.startDate ?? '').toString().trim();
    const days = calcGracePeriodDays(actual, start);
    setForm((prev) => ({ ...prev, gracePeriodDays: days }));
  }, [form.actualRentalDate, form.startDate, contract?.actualRentalDate, contract?.startDate]);

  // حساب تلقائي: مبلغ فترة السماح
  useEffect(() => {
    const monthlyRent = form.monthlyRent ?? 0;
    const days = form.gracePeriodDays ?? 0;
    const amount = calcGracePeriodAmount(monthlyRent, days);
    setForm((prev) => ({ ...prev, gracePeriodAmount: amount }));
  }, [form.monthlyRent, form.gracePeriodDays]);

  // حساب تلقائي: الضريبة المضافة (من أساس الحساب = إجمالي - التخفيض)
  useEffect(() => {
    if (form.includesVAT) {
      const duration = form.durationMonths ?? 12;
      const totalRent = form.customMonthlyRents && form.customMonthlyRents.length > 0
        ? form.customMonthlyRents.reduce((a, b) => a + (b ?? 0), 0)
        : (form.monthlyRent ?? 0) * duration;
      const rentBase = calcRentBaseForFees(totalRent, form.discountAmount ?? 0);
      const vatRate = form.vatRate ?? 0.05;
      const totalVAT = rentBase * vatRate;
      const monthlyVAT = duration > 0 ? totalVAT / duration : 0;
      setForm((prev) => ({
        ...prev,
        monthlyVATAmount: Math.round(monthlyVAT * 1000) / 1000,
        totalVATAmount: Math.round(totalVAT * 1000) / 1000,
      }));
    } else {
      setForm((prev) => ({ ...prev, monthlyVATAmount: 0, totalVATAmount: 0 }));
    }
  }, [form.includesVAT, form.monthlyRent, form.durationMonths, form.vatRate, form.customMonthlyRents, form.discountAmount]);

  // حساب تلقائي: ضرائب أخرى (من أساس الحساب)
  useEffect(() => {
    if (form.hasOtherTaxes && (form.otherTaxRate ?? 0) > 0) {
      const duration = form.durationMonths ?? 12;
      const totalRent = form.customMonthlyRents && form.customMonthlyRents.length > 0
        ? form.customMonthlyRents.reduce((a, b) => a + (b ?? 0), 0)
        : (form.monthlyRent ?? 0) * duration;
      const rentBase = calcRentBaseForFees(totalRent, form.discountAmount ?? 0);
      const { monthlyOtherTaxAmount, totalOtherTaxAmount } = calcOtherTax(rentBase, duration, form.otherTaxRate ?? 0);
      setForm((prev) => ({
        ...prev,
        monthlyOtherTaxAmount,
        totalOtherTaxAmount,
      }));
    } else {
      setForm((prev) => ({ ...prev, monthlyOtherTaxAmount: 0, totalOtherTaxAmount: 0 }));
    }
  }, [form.hasOtherTaxes, form.otherTaxRate, form.monthlyRent, form.durationMonths, form.customMonthlyRents, form.discountAmount]);

  // حساب تلقائي: الإيجار من المساحة والسعر للمتر
  useEffect(() => {
    if (form.calculateByArea && form.rentArea && form.pricePerMeter) {
      const monthlyRent = calcRentFromArea(form.rentArea, form.pricePerMeter);
      setForm((prev) => ({ ...prev, monthlyRent, annualRent: monthlyRent * 12 }));
    }
  }, [form.calculateByArea, form.rentArea, form.pricePerMeter]);

  // تحديث مصفوفة الإيجارات المخصصة عند تغيير المدة أو الإيجار الشهري (فقط إذا مُفعّل)
  useEffect(() => {
    const current = form.customMonthlyRents ?? [];
    if (current.length === 0) return; // لا نُهيئ تلقائياً
    const duration = form.durationMonths ?? 12;
    const monthlyRent = form.monthlyRent ?? 0;
    if (duration > 0 && current.length !== duration) {
      const newRents = Array(duration).fill(monthlyRent);
      for (let i = 0; i < Math.min(current.length, duration); i++) {
        if (current[i] != null) newRents[i] = current[i];
      }
      setForm((prev) => ({ ...prev, customMonthlyRents: newRents }));
    }
  }, [form.durationMonths, form.monthlyRent]);

  const handleSave = () => {
    if (!contract) return;
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(contract.propertyId, dataOverrides);
    const savedKind = (form.propertyContractKind ?? (prop as { type?: string })?.type ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
    const monthlyRent = form.monthlyRent ?? 0;
    const duration = form.durationMonths ?? 12;

    // حفظ الشيكات في مخزن العقد (قبل التحديث) - مع الحفاظ على صور الشيكات المرفوعة
    const storedChecksForSave = getChecksByContract(contract.id);
    const checkEntries = requiredChecks.map((rc, idx) => ({
      checkTypeId: rc.checkTypeId ?? '',
      labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
      labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
      checkNumber: checkFormData[idx]?.checkNumber ?? '',
      amount: parseFloat(checkFormData[idx]?.amount || '0') || 0,
      date: checkFormData[idx]?.date ?? '',
      accountNumber: chequeAccountNumber,
      accountName: chequeAccountName,
      imageUrl: storedChecksForSave[idx]?.imageUrl,
    }));
    saveContractChecks(contract.id, checkEntries);

    const _updated = updateContract(id, {
      tenantName: form.tenantName,
      tenantEmail: form.tenantEmail,
      tenantPhone: form.tenantPhone,
      tenantNationality: form.tenantNationality,
      tenantGender: form.tenantGender,
      tenantCivilId: form.tenantCivilId,
      tenantCivilIdExpiry: form.tenantCivilIdExpiry,
      tenantPassportNumber: form.tenantPassportNumber,
      tenantPassportExpiry: form.tenantPassportExpiry,
      tenantIdNumber: form.tenantIdNumber,
      tenantWorkplace: form.tenantWorkplace,
      tenantWorkplaceEn: form.tenantWorkplaceEn,
      tenantPosition: form.tenantPosition,
      landlordName: form.landlordName,
      landlordEmail: form.landlordEmail,
      landlordPhone: form.landlordPhone,
      landlordNationality: form.landlordNationality,
      landlordGender: form.landlordGender,
      landlordCivilId: form.landlordCivilId,
      landlordCivilIdExpiry: form.landlordCivilIdExpiry,
      landlordPassportNumber: form.landlordPassportNumber,
      landlordPassportExpiry: form.landlordPassportExpiry,
      landlordWorkplace: form.landlordWorkplace,
      landlordWorkplaceEn: form.landlordWorkplaceEn,
      monthlyRent,
      annualRent: calcAnnualRent(monthlyRent),
      depositAmount: form.depositAmount ?? 0,
      checks: form.checks ?? [],
      guarantees: form.guarantees,
      startDate: form.startDate ?? '',
      endDate: form.endDate ?? calcEndDate(form.startDate ?? '', duration),
      durationMonths: duration,
      municipalityFees: form.municipalityFees ?? calcMunicipalityFees(monthlyRent, duration),
      gracePeriodDays: form.gracePeriodDays,
      gracePeriodAmount: form.gracePeriodAmount,
      rentDueDay: form.rentDueDay ?? 1,
      rentPaymentFrequency: form.rentPaymentFrequency,
      rentPaymentMethod: form.rentPaymentMethod,
      depositPaymentMethod: form.depositPaymentMethod,
      municipalityFormNumber: form.municipalityFormNumber,
      municipalityContractNumber: form.municipalityContractNumber,
      municipalityRegistrationFee: form.municipalityRegistrationFee ?? 1,
      includesVAT: form.includesVAT,
      vatRate: form.vatRate,
      monthlyVATAmount: form.monthlyVATAmount,
      totalVATAmount: form.totalVATAmount,
      internetFees: form.internetFees,
      electricityMeterReading: form.electricityMeterReading,
      waterMeterReading: form.waterMeterReading,
      electricityBillAmount: form.electricityBillAmount,
      waterBillAmount: form.waterBillAmount,
      calculateByArea: form.calculateByArea,
      rentArea: form.rentArea,
      pricePerMeter: form.pricePerMeter,
      customMonthlyRents: form.customMonthlyRents,
      contractType: form.contractType,
      actualRentalDate: form.actualRentalDate,
      unitHandoverDate: form.unitHandoverDate,
      rentReceiptNumber: form.rentReceiptNumber,
      depositReceiptNumber: form.depositReceiptNumber,
      depositCashAmount: form.depositCashAmount,
      depositCashDate: form.depositCashDate,
      depositCashReceiptNumber: form.depositCashReceiptNumber,
      depositChequeRequired: form.depositChequeRequired,
      depositChequeDurationMonths: form.depositChequeDurationMonths,
      depositChequeAmount: (() => {
        return requiredChecks.reduce((s, r, idx) =>
          DEPOSIT_RELATED_CHECK_IDS.includes(r.checkTypeId ?? '') ? s + (parseFloat(checkFormData[idx]?.amount || '0') || 0) : s, 0);
      })(),
      depositChequeNumber: (() => {
        const idx = requiredChecks.findIndex((r) => DEPOSIT_RELATED_CHECK_IDS.includes(r.checkTypeId ?? ''));
        return idx >= 0 ? (checkFormData[idx]?.checkNumber ?? '') : '';
      })(),
      discountAmount: form.discountAmount,
      hasOtherFees: form.hasOtherFees,
      otherFees: form.otherFees,
      hasOtherTaxes: form.hasOtherTaxes,
      otherTaxName: form.otherTaxName,
      otherTaxRate: form.otherTaxRate,
      monthlyOtherTaxAmount: form.monthlyOtherTaxAmount,
      totalOtherTaxAmount: form.totalOtherTaxAmount,
      rentChecksBankAccountId: form.rentChecksBankAccountId,
      rentChecksOwnerType: form.rentChecksOwnerType,
      rentChecksOwnerName: form.rentChecksOwnerName,
      rentChecksOwnerCivilId: form.rentChecksOwnerCivilId,
      rentChecksOwnerPhone: form.rentChecksOwnerPhone,
      rentChecksCompanyName: form.rentChecksCompanyName,
      rentChecksCompanyRegNumber: form.rentChecksCompanyRegNumber,
      rentChecksAuthorizedRep: form.rentChecksAuthorizedRep,
      rentChecksBankName: form.rentChecksBankName,
      rentChecksBankBranch: form.rentChecksBankBranch,
      propertyContractKind: form.propertyContractKind ?? savedKind,
      totalSaleAmount: form.totalSaleAmount,
      saleDate: form.saleDate,
      transferOfOwnershipDate: form.transferOfOwnershipDate,
      salePaymentMethod: form.salePaymentMethod,
      saleDatesNote: form.saleDatesNote,
      salePayments: form.salePayments,
      saleBrokerageFeePercent: form.saleBrokerageFeePercent,
      saleBrokerageFeePayer: form.saleBrokerageFeePayer,
      saleHousingFeePercent: form.saleHousingFeePercent,
      saleHousingFeePayer: form.saleHousingFeePayer,
      saleOtherFeesList: form.saleOtherFeesList,
      saleMunicipalityFees: form.saleMunicipalityFees,
      saleMunicipalityFeesPayer: form.saleMunicipalityFeesPayer,
      saleAdminFees: form.saleAdminFees,
      saleAdminFeesPayer: form.saleAdminFeesPayer,
      saleTransferFees: form.saleTransferFees,
      saleTransferFeesPayer: form.saleTransferFeesPayer,
      saleViaBroker: form.saleViaBroker,
      brokerContactId: form.brokerContactId,
      brokerName: form.brokerName,
      brokerPhone: form.brokerPhone,
      brokerEmail: form.brokerEmail,
      brokerCivilId: form.brokerCivilId,
    });
    const updated = _updated ?? getContractById(id);
    // مزامنة بيانات المالك من العقد إلى دفتر العناوين (جهة المالك المرتبطة بالعقار) حتى تظهر مكتملة عند المزامنة التالية
    if (updated && (form.landlordEmail?.trim() || form.landlordCivilId?.trim() || form.landlordPhone?.trim())) {
      const lcId = getPropertyLandlordContactId(updated.propertyId);
      if (lcId) {
        const lc = getContactById(lcId);
        if (lc) {
          const payload: Partial<Contact> = {};
          if (form.landlordEmail?.trim()) payload.email = form.landlordEmail.trim();
          if (form.landlordPhone?.trim()) payload.phone = form.landlordPhone.trim();
          if (form.landlordCivilId?.trim()) payload.civilId = form.landlordCivilId.trim();
          if (form.landlordCivilIdExpiry?.trim()) payload.civilIdExpiry = form.landlordCivilIdExpiry.trim();
          if (form.landlordPassportNumber?.trim()) payload.passportNumber = form.landlordPassportNumber.trim();
          if (form.landlordPassportExpiry?.trim()) payload.passportExpiry = form.landlordPassportExpiry.trim();
          if (Object.keys(payload).length > 0) updateContact(lcId, payload);
        }
      }
    }
    if (updated && updated.bookingId) {
      const bookingId = updated.bookingId;
      const propertyId = updated.propertyId;
      const contractType = (updated.contractType ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT';
      const booking = getAllBookings().find((b) => b.id === bookingId);
      const contact = booking ? findContactByPhoneOrEmail(booking.phone, booking.email) : null;

      // مزامنة شيكات العقد مع شيكات الحجز حتى يراها المستأجر في صفحة الرفع
      const ownerT = updated.rentChecksOwnerType ?? form.rentChecksOwnerType;
      const bankN = updated.rentChecksBankName ?? form.rentChecksBankName;
      const bankB = updated.rentChecksBankBranch ?? form.rentChecksBankBranch;
      const ownerExtras = (idx: number) => (idx === 0 ? {
        ownerType: ownerT,
        bankName: bankN,
        bankBranch: bankB,
        ownerName: updated.rentChecksOwnerName ?? form.rentChecksOwnerName,
        ownerCivilId: updated.rentChecksOwnerCivilId ?? form.rentChecksOwnerCivilId,
        ownerPhone: updated.rentChecksOwnerPhone ?? form.rentChecksOwnerPhone,
        companyName: updated.rentChecksCompanyName ?? form.rentChecksCompanyName,
        companyRegNumber: updated.rentChecksCompanyRegNumber ?? form.rentChecksCompanyRegNumber,
        authorizedRep: updated.rentChecksAuthorizedRep ?? form.rentChecksAuthorizedRep,
      } : {});
      const bookingCheckEntries = checkEntries.map((c, idx) => ({
        checkTypeId: c.checkTypeId,
        labelAr: c.labelAr,
        labelEn: c.labelEn,
        checkNumber: c.checkNumber,
        amount: c.amount,
        date: c.date,
        accountNumber: c.accountNumber,
        accountName: c.accountName,
        ...ownerExtras(idx),
      }));
      if (bookingCheckEntries.length > 0) {
        saveBookingChecks(bookingId, bookingCheckEntries);
      }

      // إنشاء طلبات رفع المستندات إن لم تكن موجودة
      const existingDocs = getDocumentsByBooking(bookingId);
      if (existingDocs.length === 0) {
        const filterByNationality = (list: import('@/lib/data/bookingTerms').ContractDocRequirement[], c: unknown): import('@/lib/data/bookingTerms').ContractDocRequirement[] =>
          (c && !isCompanyContact(c as Contact) && isOmaniNationality((c as { nationality?: string })?.nationality || ''))
            ? list.filter((r) => r.docTypeId !== 'PASSPORT')
            : list;
        const reqTypes = getRequiredDocTypesForBooking(propertyId, contractType, contact ?? null, filterByNationality);
        if (reqTypes.length > 0) {
          const requirements = reqTypes.map((r) => ({
            docTypeId: r.docTypeId,
            labelAr: r.labelAr ?? '',
            labelEn: r.labelEn ?? '',
            isRequired: r.isRequired ?? false,
          }));
          createDocumentRequests(bookingId, propertyId, requirements);
        }
      }

      // التأكد من ربط الحجز بالعقد (contractId) لظهور العقد في صفحة الحجوزات
      if (booking && booking.contractId !== updated.id) {
        updateBooking(bookingId, { contractId: updated.id });
      }
      // الاعتماد من الإدارة يتم يدوياً بعد رفع المستأجر للمستندات كاملة — لا نعتمد تلقائياً عند الحفظ
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadContract();
  };

  const addCheck = (type?: CheckType) => {
    const checks = [...(form.checks ?? []), { amount: 0, dueDate: new Date().toISOString().slice(0, 10), type: type ?? 'rent' }];
    setForm({ ...form, checks });
  };

  const updateCheck = (idx: number, updates: Partial<CheckInfo>) => {
    const checks = [...(form.checks ?? [])];
    checks[idx] = { ...checks[idx], ...updates };
    setForm({ ...form, checks });
  };

  const removeCheck = (idx: number) => {
    const checks = (form.checks ?? []).filter((_, i) => i !== idx);
    setForm({ ...form, checks });
  };

  const handleApproveAdmin = () => {
    if (approvingAdmin) return;
    setApprovingAdmin(true);
    // تقليل INP: نفصل العمل الثقيل عن حدث النقر
    setTimeout(() => {
      try {
        const c = getContractById(id);
        if (!c) return;
        if (!isContractDataComplete(c)) {
          const missing = getContractMissingFields(c, ar);
          alert(
            ar
              ? `يجب إكمال جميع بيانات ${tenantWordAr} والمالك قبل الاعتماد:\n\n${missing.join('\n')}`
              : `Please complete all ${tenantWordEn.toLowerCase()} and landlord data before approval:\n\n${missing.join('\n')}`
          );
          return;
        }
        if (c.bookingId) {
          if (!areAllRequiredDocumentsApproved(c.bookingId)) {
            alert(ar ? '⚠ لا يمكن اعتماد العقد — يجب رفع جميع المستندات المطلوبة واعتمادها أولاً.' : '⚠ Cannot approve contract — all required documents must be uploaded and approved first.');
            return;
          }
          // إن كان هناك شيكات مطلوبة، يجب اعتمادها قبل الاعتماد المبدئي
          if (!areAllChecksApproved(c.bookingId)) {
            alert(ar ? '⚠ لا يمكن اعتماد العقد — يجب تعبئة بيانات الشيكات المطلوبة واعتمادها أولاً.' : '⚠ Cannot approve contract — all required cheque data must be filled and approved first.');
            return;
          }
        }

        const updated = approveContractByAdmin(id);
        if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});

        // إرسال الرسائل يمكن أن يكون ثقيلاً — نفصله أيضاً
        if (c.bookingId && typeof window !== 'undefined') {
          setTimeout(() => {
            const b = getAllBookings().find((x) => x.id === c.bookingId);
            if (!b) return;
            const link = getDocumentUploadLink(window.location.origin, locale, c.propertyId, b.id, b.email);
            const msg = ar ? `مرحباً، يرجى إكمال إجراءات توثيق العقد عن طريق رفع المستندات المطلوبة:\n${link}` : `Hello, please complete the contract documentation by uploading the required documents:\n${link}`;
            if (b.phone) openWhatsAppWithMessage(b.phone, msg);
            if (b.email) openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link', msg);
          }, 0);
        }
        loadContract();
      } finally {
        setApprovingAdmin(false);
      }
    }, 0);
  };

  const handleApproveTenant = () => {
    const updated = approveContractByTenant(id);
    if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
    loadContract();
  };

  const handleApproveLandlord = () => {
    const updated = approveContractByLandlord(id);
    if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
    loadContract();
  };

  if (!contract) {
    return (
      <div className="space-y-8">
        <AdminPageHeader title={ar ? 'عقد الإيجار' : 'Rental Contract'} subtitle="" />
        <div className="admin-card p-16 text-center">
          <p className="text-gray-500">{ar ? 'العقد غير موجود' : 'Contract not found'}</p>
          <Link href={`/${locale}/admin/contracts`} className="text-[#8B6F47] hover:underline mt-2 inline-block">
            {ar ? 'العودة للعقود' : 'Back to contracts'}
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = contract.status === 'DRAFT';
  const isApproved = contract.status === 'APPROVED';
  const isCancelled = contract.status === 'CANCELLED';
  const isEditable = isDraft || (adminEditMode && contract.status === 'ADMIN_APPROVED');

  const dataOverrides = getPropertyDataOverrides();
  const property = getPropertyById(contract.propertyId, dataOverrides);
  const effectiveKind: PropertyContractKind = (contract.propertyContractKind ?? (property as { type?: string })?.type ?? 'RENT') as PropertyContractKind;
  const isSale = effectiveKind === 'SALE';
  const isInvestment = effectiveKind === 'INVESTMENT';
  /** عقد الاستثمار نفس شروط عقد الإيجار مع استبدال لفظ «إيجار» بـ«استثمار» */
  const isRent = effectiveKind === 'RENT' || isInvestment;

  const contractTitleAr = isSale ? 'عقد البيع' : isInvestment ? 'عقد الاستثمار' : 'عقد الإيجار';
  const contractTitleEn = isSale ? 'Sale Contract' : isInvestment ? 'Investment Contract' : 'Rental Contract';
  const backLinkAr = isSale ? 'العودة لعقود البيع' : isInvestment ? 'العودة لعقود الاستثمار' : 'العودة لعقود الإيجار';
  const backLinkEn = isSale ? 'Back to sale contracts' : isInvestment ? 'Back to investment contracts' : 'Back to contracts';

  /** للاستثمار: استبدال «إيجار» بـ«استثمار» و«المستأجر» بـ«المستثمر» في التسميات */
  const rentWordAr = isInvestment ? 'استثمار' : 'إيجار';
  const rentWordEn = isInvestment ? 'Investment' : 'Rent';
  const tenantWordAr = isInvestment ? 'المستثمر' : 'المستأجر';
  const tenantWordEn = isInvestment ? 'Investor' : 'Tenant';

  return (
    <>
    <div className="min-h-screen space-y-8">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <Link
          href={`/${locale}/admin/contracts`}
          className="inline-flex items-center gap-2 text-[#8B6F47] hover:text-[#6B5535] font-semibold mb-4"
        >
          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center">←</span>
          {ar ? backLinkAr : backLinkEn}
        </Link>
        <AdminPageHeader
          title={ar ? contractTitleAr : contractTitleEn}
          subtitle={[ar ? contract.propertyTitleAr : contract.propertyTitleEn, contract.unitKey ? ` - ${contract.unitKey}` : ''].filter(Boolean).join('')}
        />
      </div>

      {/* تنبيه البيانات الناقصة */}
      {isDraft && !isContractDataComplete(contract) && (
        <div className="admin-card border-amber-200 bg-amber-50/50">
          <div className="admin-card-body">
            <p className="font-semibold text-amber-800 mb-2">
              {ar ? '⚠ لا يمكن اعتماد العقد — يجب إكمال البيانات التالية:' : '⚠ Cannot approve contract — complete the following:'}
            </p>
            <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
              {getContractMissingFields(contract, ar).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-sm text-amber-700 mt-2">
              {ar ? 'البيانات تُجلب من دفتر العناوين. يمكنك: (١) تعبئة الحقول الناقصة في إطار «بيانات المالك» أدناه ثم حفظ العقد، أو (٢) إكمال بيانات المالك في دفتر العناوين وإعدادات العقار ثم النقر على «تحديث من دفتر العناوين».' : 'Data is loaded from the address book. You can: (1) Fill the missing fields in the "Landlord Data" section below and save the contract, or (2) Complete the landlord data in the address book and property settings, then click "Sync from address book".'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => { syncFromContacts(); loadContract(); }}
                className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 rounded-xl hover:bg-blue-200"
              >
                {ar ? 'تحديث من دفتر العناوين' : 'Sync from address book'}
              </button>
              <Link href={`/${locale}/admin/address-book`} className="px-4 py-2 text-sm font-semibold text-[#8B6F47] bg-amber-100 rounded-xl hover:bg-amber-200">
                {ar ? 'فتح دفتر العناوين' : 'Open address book'}
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* تنبيه المستندات والشيكات — لا يمكن الاعتماد إلا بعد رفع المستندات واعتمادها */}
      {isDraft && isContractDataComplete(contract) && contract.bookingId && (() => {
        const booking = getAllBookings().find((b) => b.id === contract.bookingId);
        const contact = booking ? findContactByPhoneOrEmail(booking.phone, booking.email) : null;
        const filterByNationality = (list: import('@/lib/data/bookingTerms').ContractDocRequirement[], co: unknown): import('@/lib/data/bookingTerms').ContractDocRequirement[] =>
          (co && !isCompanyContact(co as Contact) && isOmaniNationality((co as { nationality?: string })?.nationality || ''))
            ? list.filter((r) => r.docTypeId !== 'PASSPORT')
            : list;
        const reqDocTypes = getRequiredDocTypesForBooking(contract.propertyId, (contract.propertyContractKind ?? contract.contractType ?? 'RENT') as 'RENT' | 'SALE' | 'INVESTMENT', contact ?? null, filterByNationality);
        const reqChecks = buildRequiredChecks(contract.propertyId, contract.rentPaymentMethod, contract.durationMonths ?? 12, contract.rentPaymentFrequency, contract.customMonthlyRents, contract.depositChequeRequired, contract.depositChequeDurationMonths, (contract.propertyContractKind ?? 'RENT') as PropertyContractKind);
        const docsNotReady = reqDocTypes.length > 0 && !areAllRequiredDocumentsApproved(contract.bookingId);
        const checksNotReady = reqChecks.length > 0 && !areAllChecksApproved(contract.bookingId);
        if (!docsNotReady && !checksNotReady) return null;
        return (
          <div className="admin-card border-amber-200 bg-amber-50/50">
            <div className="admin-card-body">
              <p className="font-semibold text-amber-800 mb-2">
                {ar ? '⚠ لا يمكن اعتماد العقد إلا بعد:' : '⚠ Cannot approve contract until:'}
              </p>
              <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                {docsNotReady && <li>{ar ? 'رفع جميع المستندات المطلوبة واعتمادها' : 'All required documents are uploaded and approved'}</li>}
                {checksNotReady && <li>{ar ? 'تعبئة بيانات الشيكات المطلوبة واعتمادها' : 'Required cheque data is filled and approved'}</li>}
              </ul>
              <p className="text-sm text-amber-700 mt-2">
                {ar ? `يجب على ${tenantWordAr} رفع المستندات وتعبئة بيانات الشيكات من صفحة شروط العقد، ثم اعتماد كل مستند وشيك من لوحة المستندات.` : `${tenantWordEn} must upload documents and fill cheque data from the contract terms page, then approve each document and cheque from the documents panel.`}
              </p>
              {contract.bookingId && (
                <Link href={`/${locale}/admin/bookings?highlight=${contract.bookingId}`} className="inline-block mt-3 text-sm font-semibold text-[#8B6F47] hover:underline">
                  {ar ? '↗ الانتقال للحجوزات واعتماد المستندات' : '↗ Go to bookings to approve documents'}
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {/* حالة العقد والاعتمادات */}
      <div className="admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={`admin-badge ${isApproved ? 'admin-badge-success' : isCancelled ? 'bg-gray-100 text-gray-600' : isDraft ? 'admin-badge-warning' : 'admin-badge-info'}`}>
              {ar ? (contract.status === 'TENANT_APPROVED' && isInvestment ? 'اعتمده المستثمر' : STATUS_LABELS[contract.status]?.ar) : (contract.status === 'TENANT_APPROVED' && isInvestment ? 'Investor Approved' : STATUS_LABELS[contract.status]?.en)}
            </span>
            <span className="text-sm text-gray-500 mr-3 font-mono">{contract.id}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {contract.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleApproveAdmin}
                disabled={approvingAdmin}
                className={`px-4 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 ${approvingAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {approvingAdmin ? (ar ? 'جاري الاعتماد...' : 'Approving...') : (ar ? 'اعتماد مبدئي من الإدارة' : 'Preliminary Admin Approve')}
              </button>
            )}
            {contract.status === 'ADMIN_APPROVED' && (
              <>
                <button
                  type="button"
                  onClick={() => adminEditMode ? setAdminEditMode(false) : setConfirmAction('edit')}
                  className={`px-4 py-2 rounded-xl font-semibold ${adminEditMode ? 'text-emerald-700 bg-emerald-100 border border-emerald-300' : 'text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100'}`}
                >
                  {adminEditMode ? (ar ? '✓ إنهاء التعديل' : '✓ Done Editing') : (ar ? 'إرجاع للتعديل' : 'Return for Edit')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('final')}
                  className="px-4 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {ar ? 'اعتماد نهائي' : 'Final Approval'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                >
                  {ar ? 'شطب' : 'Cancel'}
                </button>
              </>
            )}
            {contract.status === 'ADMIN_APPROVED' && !adminEditMode && (
              <>
                <button type="button" onClick={() => setConfirmAction('tenant')} className="px-4 py-2 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100">
                  {ar ? (isSale ? 'اعتماد المشتري' : `اعتماد ${tenantWordAr}`) : (isSale ? 'Buyer Approve' : `${tenantWordEn} Approve`)}
                </button>
                <button type="button" onClick={() => setConfirmAction('landlord')} className="px-4 py-2 rounded-xl font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100">
                  {ar ? (isSale ? 'اعتماد البائع' : 'اعتماد المالك') : (isSale ? 'Seller Approve' : 'Landlord Approve')}
                </button>
              </>
            )}
            {(contract.status === 'TENANT_APPROVED' || contract.status === 'LANDLORD_APPROVED') && (
              <>
                {contract.status === 'TENANT_APPROVED' && (
                  <button type="button" onClick={() => setConfirmAction('landlord')} className="px-4 py-2 rounded-xl font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100">
                    {ar ? (isSale ? 'اعتماد البائع' : 'اعتماد المالك') : (isSale ? 'Seller Approve' : 'Landlord Approve')}
                  </button>
                )}
                {contract.status === 'LANDLORD_APPROVED' && (
                  <button type="button" onClick={() => setConfirmAction('tenant')} className="px-4 py-2 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100">
                    {ar ? (isSale ? 'اعتماد المشتري' : `اعتماد ${tenantWordAr}`) : (isSale ? 'Buyer Approve' : `${tenantWordEn} Approve`)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                >
                  {ar ? 'شطب' : 'Cancel'}
                </button>
              </>
            )}
          </div>
        </div>
        {!isDraft && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            {contract.adminApprovedAt && <span>{ar ? 'الإدارة:' : 'Admin:'} {new Date(contract.adminApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
            {contract.tenantApprovedAt && <span>{ar ? `${tenantWordAr}:` : `${tenantWordEn}:`} {new Date(contract.tenantApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
            {contract.landlordApprovedAt && <span>{ar ? 'المالك:' : 'Landlord:'} {new Date(contract.landlordApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
          </div>
        )}
      </div>

      {/* نموذج بيانات العقد - مقسم بأطر منفصلة */}
      <div className="space-y-6">
        {/* عقد البيع عبر وكيل: بيانات الوسيط (السمسار) — اختيار من دفتر العناوين أو إضافة جديد */}
        {isSale && form.saleViaBroker && (
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/30 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('broker')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-violet-50/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold">0</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'بيانات الوسيط (السمسار)' : 'Broker/Agent Data'}</h3>
              <span className="text-violet-600">{openSections.broker ? '▼' : '▶'}</span>
            </button>
            {openSections.broker && (() => {
              const contacts = getAllContacts(false).filter((c) => !c.archived);
              const applyBrokerFromContact = (c: Contact) => {
                setForm((prev) => ({
                  ...prev,
                  brokerContactId: c.id,
                  brokerName: getContactDisplayName(c, locale),
                  brokerPhone: c.phone ?? '',
                  brokerEmail: c.email ?? '',
                  brokerCivilId: c.civilId ?? '',
                }));
              };
              return (
              <div className="px-6 pb-6 pt-0 border-t border-violet-200 pt-4 space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="admin-input-label">{ar ? 'اختر وسيطاً من دفتر العناوين' : 'Select broker from address book'}</label>
                    <select
                      value={form.brokerContactId ?? ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) setForm((p) => ({ ...p, brokerContactId: undefined, brokerName: '', brokerPhone: '', brokerEmail: '', brokerCivilId: '' }));
                        else {
                          const c = getContactById(id);
                          if (c) applyBrokerFromContact(c);
                        }
                      }}
                      className="admin-select w-full"
                      disabled={!isEditable}
                    >
                      <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                      {contacts.slice(0, 200).map((c) => (
                        <option key={c.id} value={c.id}>
                          {getContactDisplayName(c, locale)} {c.phone ? ` — ${c.phone}` : ''}
                        </option>
                      ))}
                      {contacts.length > 200 && <option disabled>{ar ? `... و ${contacts.length - 200} غير معروضين` : `... and ${contacts.length - 200} more`}</option>}
                    </select>
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => setShowAddBrokerModal(true)}
                      className="px-4 py-2 rounded-xl font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 border border-violet-200"
                    >
                      {ar ? 'إضافة وسيط في دفتر العناوين' : 'Add broker to address book'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="admin-input-label">{ar ? 'اسم الوسيط *' : 'Broker name *'}</label>
                    <input type="text" value={form.brokerName ?? ''} onChange={(e) => setForm({ ...form, brokerName: e.target.value })} className="admin-input w-full" readOnly={!isEditable} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'هاتف الوسيط *' : 'Broker phone *'}</label>
                    <input type="tel" value={form.brokerPhone ?? ''} onChange={(e) => setForm({ ...form, brokerPhone: e.target.value })} className="admin-input w-full" readOnly={!isEditable} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'بريد الوسيط' : 'Broker email'}</label>
                    <input type="email" value={form.brokerEmail ?? ''} onChange={(e) => setForm({ ...form, brokerEmail: e.target.value })} className="admin-input w-full" readOnly={!isEditable} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'رقم البطاقة (الوسيط)' : 'Broker civil ID'}</label>
                    <input type="text" value={form.brokerCivilId ?? ''} onChange={(e) => setForm({ ...form, brokerCivilId: e.target.value })} className="admin-input w-full" readOnly={!isEditable} />
                  </div>
                </div>
                <p className="text-xs text-gray-600">{ar ? 'يمكنك اختيار وسيطاً من القائمة أعلاه أو إضافته جديداً من دفتر العناوين ثم اختياره.' : 'Select a broker from the list or add a new one to the address book, then select them.'}</p>
              </div>
              );
            })()}
          </div>
        )}

        <ContactFormModal
          open={showAddBrokerModal}
          onClose={() => setShowAddBrokerModal(false)}
          onSaved={(contact) => {
            setForm((prev) => ({
              ...prev,
              brokerContactId: contact.id,
              brokerName: getContactDisplayName(contact, locale),
              brokerPhone: contact.phone ?? '',
              brokerEmail: contact.email ?? '',
              brokerCivilId: contact.civilId ?? '',
            }));
            setShowAddBrokerModal(false);
          }}
          initialCategory="OTHER"
          locale={locale}
        />

        {/* 1. إطار بيانات المالك / البائع */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('landlord')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-amber-50/50 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">1</span>
            <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? (isSale ? 'بيانات البائع (المالك)' : 'بيانات المالك') : (isSale ? 'Seller (Owner) Data' : 'Landlord Data')}</h3>
            <span className="text-amber-600">{openSections.landlord ? '▼' : '▶'}</span>
                </button>
          {openSections.landlord && (
          <div className="px-6 pb-6 pt-0 border-t border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              <div>
                <label className="admin-input-label">{ar ? 'الاسم *' : 'Name *'}</label>
                <input
                  type="text"
                  value={form.landlordName ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                <input
                  type="text"
                  value={form.landlordNationality ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الجنس *' : 'Gender *'}</label>
                <select
                  value={form.landlordGender ?? ''}
                  className="admin-select w-full bg-gray-50 cursor-default"
                  disabled
                >
                  <option value="">{ar ? 'اختر' : 'Select'}</option>
                  <option value="MALE">{ar ? 'ذكر' : 'Male'}</option>
                  <option value="FEMALE">{ar ? 'أنثى' : 'Female'}</option>
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الهاتف *' : 'Phone *'}</label>
                <input
                  type="tel"
                  value={form.landlordPhone ?? ''}
                  readOnly={!isEditable}
                  onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordPhone: e.target.value })) : undefined}
                  className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'البريد *' : 'Email *'}</label>
                <input
                  type="email"
                  value={form.landlordEmail ?? ''}
                  readOnly={!isEditable}
                  onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordEmail: e.target.value })) : undefined}
                  className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'جهة العمل' : 'Workplace'}</label>
                <input
                  type="text"
                  value={form.landlordWorkplace ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                <input
                  type="text"
                  value={form.landlordCivilId ?? ''}
                  readOnly={!isEditable}
                  onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordCivilId: e.target.value })) : undefined}
                  className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'انتهاء البطاقة' : 'Civil ID Expiry'}</label>
                <input
                  type="date"
                  value={form.landlordCivilIdExpiry ?? ''}
                  readOnly={!isEditable}
                  onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordCivilIdExpiry: e.target.value })) : undefined}
                  className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                />
              </div>
              {!isOmaniNationality(form.landlordNationality ?? '') && (
                <>
                  <div>
                    <label className="admin-input-label">{ar ? 'رقم الجواز' : 'Passport No.'}</label>
                    <input
                      type="text"
                      value={form.landlordPassportNumber ?? ''}
                      readOnly={!isEditable}
                      onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordPassportNumber: e.target.value })) : undefined}
                      className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'انتهاء الجواز' : 'Passport Expiry'}</label>
                    <input
                      type="date"
                      value={form.landlordPassportExpiry ?? ''}
                      readOnly={!isEditable}
                      onChange={isEditable ? (e) => setForm((p) => ({ ...p, landlordPassportExpiry: e.target.value })) : undefined}
                      className={`admin-input w-full ${isEditable ? '' : 'bg-gray-50 cursor-default'}`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          )}
          </div>

        {/* 2. إطار بيانات المستأجر / المشتري */}
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('tenant')} className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-blue-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</span>
              <h3 className="text-lg font-bold text-gray-900">{ar ? (isSale ? 'بيانات المشتري (العميل)' : `بيانات ${tenantWordAr}`) : (isSale ? 'Buyer (Client) Data' : `${tenantWordEn} Data`)}</h3>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={syncFromContacts}
                className="px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
                >
                {ar ? 'تحديث من دفتر العناوين' : 'Sync from address book'}
                </button>
              <Link
                href={`/${locale}/admin/address-book`}
                className="px-3 py-1.5 text-sm font-semibold text-[#8B6F47] hover:underline"
              >
                {ar ? 'دفتر العناوين' : 'Address book'}
              </Link>
            </div>
            <span className="text-blue-600">{openSections.tenant ? '▼' : '▶'}</span>
          </button>
          {openSections.tenant && (
          <div className="px-6 pb-6 pt-0 border-t border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              <div>
                <label className="admin-input-label">{ar ? 'الاسم *' : 'Name *'}</label>
                <input
                  type="text"
                  value={form.tenantName ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                <input
                  type="text"
                  value={form.tenantNationality ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الجنس *' : 'Gender *'}</label>
                <select
                  value={form.tenantGender ?? ''}
                  className="admin-select w-full bg-gray-50 cursor-default"
                  disabled
                >
                  <option value="">{ar ? 'اختر' : 'Select'}</option>
                  <option value="MALE">{ar ? 'ذكر' : 'Male'}</option>
                  <option value="FEMALE">{ar ? 'أنثى' : 'Female'}</option>
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الهاتف *' : 'Phone *'}</label>
                <input
                  type="tel"
                  value={form.tenantPhone ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'البريد *' : 'Email *'}</label>
                <input
                  type="email"
                  value={form.tenantEmail ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'جهة العمل' : 'Workplace'}</label>
                <input
                  type="text"
                  value={form.tenantWorkplace ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'المنصب' : 'Position'}</label>
                <input
                  type="text"
                  value={form.tenantPosition ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                <input
                  type="text"
                  value={form.tenantCivilId ?? form.tenantIdNumber ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'انتهاء البطاقة' : 'Civil ID Expiry'}</label>
                <input
                  type="date"
                  value={form.tenantCivilIdExpiry ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              {!isOmaniNationality(form.tenantNationality ?? '') && (
                <>
                  <div>
                    <label className="admin-input-label">{ar ? 'رقم الجواز' : 'Passport No.'}</label>
                    <input
                      type="text"
                      value={form.tenantPassportNumber ?? ''}
                      readOnly
                      className="admin-input w-full bg-gray-50 cursor-default"
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'انتهاء الجواز' : 'Passport Expiry'}</label>
                    <input
                      type="date"
                      value={form.tenantPassportExpiry ?? ''}
                      readOnly
                      className="admin-input w-full bg-gray-50 cursor-default"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          )}
          </div>

        {/* 3. إطار بيانات العقار والبيانات الإضافية */}
        {(() => {
          const dataOverrides = getPropertyDataOverrides();
          const prop = contract?.propertyId ? getPropertyById(contract.propertyId, dataOverrides) : null;
          const p = prop as Record<string, unknown> | null;
          const EXTRA_LABELS: Record<string, { ar: string; en: string }> = {
            governorateAr: { ar: 'المحافظة', en: 'Governorate' },
            stateAr: { ar: 'الولاية', en: 'State' },
            areaAr: { ar: 'المنطقة', en: 'Area' },
            villageAr: { ar: 'الحي', en: 'Neighborhood' },
            landParcelNumber: { ar: 'رقم القطعة', en: 'Land Parcel No.' },
            propertyNumber: { ar: 'رقم المبنى', en: 'Building No.' },
            complexNumber: { ar: 'رقم المجمع', en: 'Complex No.' },
            landUseType: { ar: 'نوع استعمال الأرض', en: 'Land Use Type' },
            streetAlleyNumber: { ar: 'رقم السكة/الزقاق', en: 'Street/Alley No.' },
            electricityMeterNumber: { ar: 'رقم عداد الكهرباء', en: 'Electricity Meter' },
            waterMeterNumber: { ar: 'رقم عداد الماء', en: 'Water Meter' },
            surveyMapNumber: { ar: 'رقم الرسم المساحي', en: 'Survey Map No.' },
            buildingManagementNumber: { ar: 'رقم إدارة المبنى', en: 'Management No.' },
          };
          const extraKeys = Object.keys(EXTRA_LABELS);
          const hasExtra = p && extraKeys.some((k) => p[k] != null && String(p[k]).trim());
          return (
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/30 shadow-sm overflow-hidden">
              <button type="button" onClick={() => toggleSection('property')} className="w-full flex items-center justify-between gap-2 p-4 text-right hover:bg-slate-100/50 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold">3</span>
                <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'بيانات العقار والبيانات الإضافية' : 'Property & Extra Data'}</h3>
                <div onClick={(e) => e.stopPropagation()}>
                  {contract?.propertyId && (
                    <Link href={`/${locale}/admin/properties/${contract.propertyId}`} className="px-3 py-1.5 text-sm font-semibold text-[#8B6F47] hover:underline">
                      {ar ? 'عرض العقار' : 'View property'}
                    </Link>
                  )}
                </div>
                <span className="text-slate-600">{openSections.property ? '▼' : '▶'}</span>
              </button>
              {openSections.property && (
              <div className="px-6 pb-6 pt-0 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <div>
                  <label className="admin-input-label">{ar ? 'العقار' : 'Property'}</label>
                  <input type="text" value={ar ? (form.propertyTitleAr ?? contract?.propertyTitleAr ?? '') : (form.propertyTitleEn ?? contract?.propertyTitleEn ?? '')} readOnly className="admin-input w-full bg-gray-50 cursor-default" />
                </div>
                <div>
                  <label className="admin-input-label">{ar ? 'الوحدة' : 'Unit'}</label>
                  <input type="text" value={form.unitKey ?? contract?.unitKey ?? ''} readOnly className="admin-input w-full bg-gray-50 cursor-default" placeholder={ar ? '—' : '—'} />
                </div>
                {hasExtra && p && extraKeys.filter((k) => p[k] != null && String(p[k]).trim()).map((k) => (
                  <div key={k}>
                    <label className="admin-input-label">{ar ? EXTRA_LABELS[k]?.ar : EXTRA_LABELS[k]?.en}</label>
                    <input type="text" value={String(p[k] ?? '')} readOnly className="admin-input w-full bg-gray-50 cursor-default" />
                  </div>
                ))}
              </div>
              </div>
              )}
            </div>
          );
        })()}

        {/* عقد البيع: تاريخ البيع ونقل الملكية */}
        {isSale && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('saleDates')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-emerald-50/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">4</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'تاريخ البيع ونقل الملكية' : 'Sale Date & Transfer of Ownership'}</h3>
              <span className="text-emerald-600">{openSections.saleDates ? '▼' : '▶'}</span>
            </button>
            {openSections.saleDates && (
              <div className="px-6 pb-6 pt-0 border-t border-emerald-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="admin-input-label">{ar ? 'تاريخ البيع *' : 'Sale date *'}</label>
                    <input
                      type="date"
                      value={form.saleDate ?? ''}
                      onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'تاريخ نقل الملكية *' : 'Transfer of ownership date *'}</label>
                    <input
                      type="date"
                      value={form.transferOfOwnershipDate ?? ''}
                      onChange={(e) => setForm({ ...form, transferOfOwnershipDate: e.target.value })}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="admin-input-label">{ar ? 'ملاحظة' : 'Note'}</label>
                  <textarea
                    value={form.saleDatesNote ?? ''}
                    onChange={(e) => setForm({ ...form, saleDatesNote: e.target.value })}
                    className="admin-input w-full min-h-[80px]"
                    placeholder={ar ? 'أي ملاحظات إضافية بخصوص تاريخ البيع أو نقل الملكية' : 'Any notes regarding sale date or transfer of ownership'}
                    readOnly={!isEditable}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* عقد البيع: بيانات البيع (الثمن، الدفعات، الرسوم، الملخص) */}
        {isSale && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('saleData')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-emerald-50/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">5</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'بيانات البيع (الثمن والدفعات والرسوم)' : 'Sale Data (Price, Installments & Fees)'}</h3>
              <span className="text-emerald-600">{openSections.saleData ? '▼' : '▶'}</span>
            </button>
            {openSections.saleData && (() => {
              const salePrice = form.totalSaleAmount ?? 0;
              const payments = form.salePayments ?? [];
              const addPayment = () => setForm({ ...form, salePayments: [...payments, { installmentNumber: payments.length + 1, amount: 0, note: '' }] });
              const removePayment = (idx: number) => setForm({ ...form, salePayments: payments.filter((_, i) => i !== idx) });
              const updatePayment = (idx: number, upd: Partial<typeof payments[0]>) => setForm({ ...form, salePayments: payments.map((p, i) => i === idx ? { ...p, ...upd } : p) });
              const brokerageAmount = (form.saleBrokerageFeePercent ?? 0) * salePrice / 100;
              const housingAmount = (form.saleHousingFeePercent ?? 0) * salePrice / 100;
              const otherFeesList = form.saleOtherFeesList ?? [];
              const isImageLike = (mimeOrUrl: string) =>
                /image\//i.test(mimeOrUrl) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(mimeOrUrl) || /data:image\//i.test(mimeOrUrl);
              const openDoc = (p: (typeof payments)[number]) => {
                const u = p.documentUrl || p.documentFile?.dataUrl;
                if (!u) return;
                if (isImageLike(p.documentFile?.type || u)) setZoomedImageUrl(u);
                else window.open(u, '_blank');
              };
              const setPaymentFile = (idx: number, file: File | null) => {
                if (!file) {
                  updatePayment(idx, { documentFile: undefined });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = String(reader.result || '');
                  updatePayment(idx, { documentFile: { name: file.name, type: file.type || 'application/octet-stream', dataUrl } });
                };
                reader.readAsDataURL(file);
              };
              const totalOnSeller = (form.saleBrokerageFeePayer === 'seller' ? brokerageAmount : 0) + (form.saleHousingFeePayer === 'seller' ? housingAmount : 0)
                + otherFeesList.filter((f) => f.payer === 'seller').reduce((s, f) => s + (f.amount ?? 0), 0)
                + (form.saleMunicipalityFeesPayer === 'seller' ? (form.saleMunicipalityFees ?? 0) : 0)
                + (form.saleAdminFeesPayer === 'seller' ? (form.saleAdminFees ?? 0) : 0)
                + (form.saleTransferFeesPayer === 'seller' ? (form.saleTransferFees ?? 0) : 0);
              const totalOnBuyer = (form.saleBrokerageFeePayer === 'buyer' ? brokerageAmount : 0) + (form.saleHousingFeePayer === 'buyer' ? housingAmount : 0)
                + otherFeesList.filter((f) => f.payer === 'buyer').reduce((s, f) => s + (f.amount ?? 0), 0)
                + (form.saleMunicipalityFeesPayer === 'buyer' ? (form.saleMunicipalityFees ?? 0) : 0)
                + (form.saleAdminFeesPayer === 'buyer' ? (form.saleAdminFees ?? 0) : 0)
                + (form.saleTransferFeesPayer === 'buyer' ? (form.saleTransferFees ?? 0) : 0);
              const sellerFeeItems: Array<{ label: string; amount: number }> = [];
              const buyerFeeItems: Array<{ label: string; amount: number }> = [];
              const pushFee = (payer: 'seller' | 'buyer' | undefined, label: string, amount: number) => {
                const a = Number.isFinite(amount) ? amount : 0;
                if (!payer || a <= 0) return;
                (payer === 'seller' ? sellerFeeItems : buyerFeeItems).push({ label, amount: a });
              };
              pushFee(form.saleBrokerageFeePayer, `${ar ? 'رسوم السمسرة' : 'Brokerage fee'} (${(form.saleBrokerageFeePercent ?? 0).toFixed(2)}%)`, brokerageAmount);
              pushFee(form.saleHousingFeePayer, `${ar ? 'رسوم الإسكان' : 'Housing fee'} (${(form.saleHousingFeePercent ?? 0).toFixed(2)}%)`, housingAmount);
              pushFee(form.saleMunicipalityFeesPayer, ar ? 'رسوم بلدية' : 'Municipality fees', form.saleMunicipalityFees ?? 0);
              pushFee(form.saleAdminFeesPayer, ar ? 'رسوم إدارية' : 'Admin fees', form.saleAdminFees ?? 0);
              pushFee(form.saleTransferFeesPayer, ar ? 'رسوم نقل الملكية' : 'Transfer fees', form.saleTransferFees ?? 0);
              for (const f of otherFeesList) {
                pushFee(f.payer, `${ar ? 'رسوم أخرى' : 'Other fee'}: ${f.description || '—'}`, f.amount ?? 0);
              }
              return (
              <div className="px-6 pb-6 pt-0 border-t border-emerald-200 space-y-6">
                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.saleViaBroker} onChange={(e) => setForm({ ...form, saleViaBroker: e.target.checked })} className="rounded border-gray-300" readOnly={!isEditable} />
                    <span className="text-sm font-medium text-gray-700">{ar ? 'البيع عن طريق وكيل / سمسار' : 'Sale through broker/agent'}</span>
                  </label>
                </div>
                <div>
                  <label className="admin-input-label">{ar ? 'ثمن البيع (ر.ع) * — السعر المعروض أو سعر التفاوض' : 'Sale price (OMR) * — Listed or negotiated price'}</label>
                  <input type="number" min={0} step={0.01} value={form.totalSaleAmount ?? ''} onChange={(e) => setForm({ ...form, totalSaleAmount: parseFloat(e.target.value) || undefined })} className="admin-input w-full max-w-xs" readOnly={!isEditable} />
                </div>

                {/* الدفعات */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{ar ? 'الدفعات (طريقة الدفع على دفعات)' : 'Payment installments'}</h4>
                    {isEditable && <button type="button" onClick={addPayment} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">{ar ? '+ إضافة دفعة' : '+ Add installment'}</button>}
                  </div>
                  <div className="space-y-3">
                    {payments.map((p, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white border border-emerald-200/60 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">{ar ? `الدفعة ${p.installmentNumber}` : `Installment ${p.installmentNumber}`}</span>
                          {isEditable && <button type="button" onClick={() => removePayment(idx)} className="text-red-600 text-sm hover:underline">{ar ? 'حذف' : 'Remove'}</button>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <div>
                            <label className="admin-input-label text-xs">{ar ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</label>
                            <input type="number" min={0} step={0.01} value={p.amount || ''} onChange={(e) => updatePayment(idx, { amount: parseFloat(e.target.value) || 0 })} className="admin-input w-full" readOnly={!isEditable} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="admin-input-label text-xs">{ar ? 'ملاحظة (مثال: مقدم نقدي، عند التوقيع، عند نقل الملكية شيك)' : 'Note (e.g. down payment, on signing, transfer cheque)'}</label>
                            <input type="text" value={p.note || ''} onChange={(e) => updatePayment(idx, { note: e.target.value })} className="admin-input w-full" placeholder={ar ? 'الملاحظة' : 'Note'} readOnly={!isEditable} />
                          </div>
                          <div>
                            <label className="admin-input-label text-xs">{ar ? 'مستند الدفعة' : 'Payment document'}</label>
                            <div className="space-y-2">
                              <input
                                type="url"
                                value={p.documentUrl || ''}
                                onChange={(e) => updatePayment(idx, { documentUrl: e.target.value })}
                                className="admin-input w-full"
                                placeholder={ar ? 'رابط المستند (اختياري)' : 'Document URL (optional)'}
                                readOnly={!isEditable}
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => setPaymentFile(idx, e.target.files?.[0] ?? null)}
                                  className="block w-full text-xs"
                                  disabled={!isEditable}
                                />
                                {isEditable && (p.documentFile || p.documentUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => updatePayment(idx, { documentFile: undefined, documentUrl: '' })}
                                    className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap"
                                  >
                                    {ar ? 'إزالة' : 'Clear'}
                                  </button>
                                )}
                              </div>
                              {(p.documentFile?.dataUrl || p.documentUrl) && (
                                <button
                                  type="button"
                                  onClick={() => openDoc(p)}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                                >
                                  {isImageLike(p.documentFile?.type || p.documentUrl || '') ? (
                                    <img
                                      src={p.documentFile?.dataUrl || p.documentUrl}
                                      alt={p.documentFile?.name || (ar ? 'مستند الدفعة' : 'Payment document')}
                                      className="w-10 h-10 rounded-md object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-md flex items-center justify-center bg-gray-200 border border-gray-200 text-lg">📄</div>
                                  )}
                                  <div className="text-xs text-gray-700 text-right flex-1">
                                    <div className="font-semibold">{ar ? 'عرض المستند' : 'View document'}</div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {p.documentFile?.name || p.documentUrl}
                                    </div>
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {payments.length === 0 && <p className="text-sm text-gray-500">{ar ? 'لا توجد دفعات. اضغط «إضافة دفعة» لإضافة دفعات (مقدم، عند التوقيع، عند نقل الملكية، إلخ).' : 'No installments. Click "Add installment" to add payment schedule.'}</p>}
                  </div>
                </div>

                {/* الرسوم */}
                <div className="border-t border-emerald-200 pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{ar ? 'رسوم أخرى' : 'Fees'}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="admin-input-label text-xs">{ar ? 'رسوم السمسرة (%)' : 'Brokerage fee (%)'}</label>
                        <input type="number" min={0} max={100} step={0.01} value={form.saleBrokerageFeePercent ?? ''} onChange={(e) => setForm({ ...form, saleBrokerageFeePercent: parseFloat(e.target.value) || undefined })} className="admin-input w-full" readOnly={!isEditable} />
                      </div>
                      <div>
                        <label className="admin-input-label text-xs">{ar ? 'من يدفع' : 'Paid by'}</label>
                        <select value={form.saleBrokerageFeePayer ?? ''} onChange={(e) => setForm({ ...form, saleBrokerageFeePayer: (e.target.value || undefined) as 'seller'|'buyer' })} className="admin-select w-full" disabled={!isEditable}>
                          <option value="">—</option>
                          <option value="seller">{ar ? 'المالك' : 'Seller'}</option>
                          <option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option>
                        </select>
                      </div>
                      <div className="text-sm text-gray-600">{ar ? `المبلغ المحسوب: ${brokerageAmount.toFixed(2)} ر.ع` : `Calculated: ${brokerageAmount.toFixed(2)} OMR`}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="admin-input-label text-xs">{ar ? 'رسوم الإسكان (%)' : 'Housing fee (%)'}</label>
                        <input type="number" min={0} max={100} step={0.01} value={form.saleHousingFeePercent ?? ''} onChange={(e) => setForm({ ...form, saleHousingFeePercent: parseFloat(e.target.value) || undefined })} className="admin-input w-full" readOnly={!isEditable} />
                      </div>
                      <div>
                        <label className="admin-input-label text-xs">{ar ? 'من يدفع' : 'Paid by'}</label>
                        <select value={form.saleHousingFeePayer ?? ''} onChange={(e) => setForm({ ...form, saleHousingFeePayer: (e.target.value || undefined) as 'seller'|'buyer' })} className="admin-select w-full" disabled={!isEditable}>
                          <option value="">—</option>
                          <option value="seller">{ar ? 'المالك' : 'Seller'}</option>
                          <option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option>
                        </select>
                      </div>
                      <div className="text-sm text-gray-600">{ar ? `المبلغ المحسوب: ${housingAmount.toFixed(2)} ر.ع` : `Calculated: ${housingAmount.toFixed(2)} OMR`}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div><label className="admin-input-label text-xs">{ar ? 'رسوم بلدية (ر.ع)' : 'Municipality (OMR)'}</label><input type="number" min={0} step={0.01} value={form.saleMunicipalityFees ?? ''} onChange={(e) => setForm({ ...form, saleMunicipalityFees: parseFloat(e.target.value) || undefined })} className="admin-input w-full" readOnly={!isEditable} /></div>
                      <div><label className="admin-input-label text-xs">{ar ? 'من يدفع' : 'Paid by'}</label><select value={form.saleMunicipalityFeesPayer ?? ''} onChange={(e) => setForm({ ...form, saleMunicipalityFeesPayer: (e.target.value || undefined) as 'seller'|'buyer' })} className="admin-select w-full" disabled={!isEditable}><option value="">—</option><option value="seller">{ar ? 'المالك' : 'Seller'}</option><option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option></select></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div><label className="admin-input-label text-xs">{ar ? 'رسوم إدارية (ر.ع)' : 'Admin fees (OMR)'}</label><input type="number" min={0} step={0.01} value={form.saleAdminFees ?? ''} onChange={(e) => setForm({ ...form, saleAdminFees: parseFloat(e.target.value) || undefined })} className="admin-input w-full" readOnly={!isEditable} /></div>
                      <div><label className="admin-input-label text-xs">{ar ? 'من يدفع' : 'Paid by'}</label><select value={form.saleAdminFeesPayer ?? ''} onChange={(e) => setForm({ ...form, saleAdminFeesPayer: (e.target.value || undefined) as 'seller'|'buyer' })} className="admin-select w-full" disabled={!isEditable}><option value="">—</option><option value="seller">{ar ? 'المالك' : 'Seller'}</option><option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option></select></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div><label className="admin-input-label text-xs">{ar ? 'رسوم نقل الملكية (ر.ع)' : 'Transfer fees (OMR)'}</label><input type="number" min={0} step={0.01} value={form.saleTransferFees ?? ''} onChange={(e) => setForm({ ...form, saleTransferFees: parseFloat(e.target.value) || undefined })} className="admin-input w-full" readOnly={!isEditable} /></div>
                      <div><label className="admin-input-label text-xs">{ar ? 'من يدفع' : 'Paid by'}</label><select value={form.saleTransferFeesPayer ?? ''} onChange={(e) => setForm({ ...form, saleTransferFeesPayer: (e.target.value || undefined) as 'seller'|'buyer' })} className="admin-select w-full" disabled={!isEditable}><option value="">—</option><option value="seller">{ar ? 'المالك' : 'Seller'}</option><option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option></select></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="admin-input-label text-xs">{ar ? 'رسوم أخرى (وصف + مبلغ + من يدفع)' : 'Other fees'}</label>
                        {isEditable && <button type="button" onClick={() => setForm({ ...form, saleOtherFeesList: [...otherFeesList, { description: '', amount: 0, payer: 'buyer' }] })} className="text-sm text-emerald-600">{ar ? '+ إضافة' : '+ Add'}</button>}
                      </div>
                      {otherFeesList.map((f, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                          <input type="text" value={f.description} onChange={(e) => setForm({ ...form, saleOtherFeesList: otherFeesList.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) })} className="admin-input" placeholder={ar ? 'الوصف' : 'Description'} readOnly={!isEditable} />
                          <input type="number" min={0} step={0.01} value={f.amount || ''} onChange={(e) => setForm({ ...form, saleOtherFeesList: otherFeesList.map((x, i) => i === idx ? { ...x, amount: parseFloat(e.target.value) || 0 } : x) })} className="admin-input" placeholder={ar ? 'المبلغ' : 'Amount'} readOnly={!isEditable} />
                          <select value={f.payer} onChange={(e) => setForm({ ...form, saleOtherFeesList: otherFeesList.map((x, i) => i === idx ? { ...x, payer: e.target.value as 'seller'|'buyer' } : x) })} className="admin-select" disabled={!isEditable}><option value="seller">{ar ? 'المالك' : 'Seller'}</option><option value="buyer">{ar ? 'المشتري' : 'Buyer'}</option></select>
                          {isEditable && <button type="button" onClick={() => setForm({ ...form, saleOtherFeesList: otherFeesList.filter((_, i) => i !== idx) })} className="text-red-600 text-sm">{ar ? 'حذف' : 'Del'}</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ملخص مالي */}
                <div className="border-t border-emerald-200 pt-4 rounded-xl bg-emerald-50/50 p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{ar ? 'الملخص المالي / ملخص الحسابات' : 'Financial summary'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                      <div className="text-sm text-amber-800 font-medium">{ar ? 'إجمالي على المالك (ر.ع)' : 'Total on seller (OMR)'}</div>
                      {sellerFeeItems.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-amber-900/90">
                          {sellerFeeItems.map((it, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="truncate">{i + 1}. {it.label}</span>
                              <span className="font-semibold whitespace-nowrap">{it.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xl font-bold text-amber-900">{totalOnSeller.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                      <div className="text-sm text-blue-800 font-medium">{ar ? 'إجمالي على المشتري (ر.ع)' : 'Total on buyer (OMR)'}</div>
                      {buyerFeeItems.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-blue-900/90">
                          {buyerFeeItems.map((it, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="truncate">{i + 1}. {it.label}</span>
                              <span className="font-semibold whitespace-nowrap">{it.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xl font-bold text-blue-900">{totalOnBuyer.toFixed(2)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{ar ? 'يتم احتساب المبالغ أعلاه من الرسوم المسجلة فقط (سمسرة، إسكان، بلدية، إدارية، نقل ملكية، رسوم أخرى) حسب من يدفع كل رسم.' : 'Amounts above are from recorded fees only (brokerage, housing, municipality, admin, transfer, other), by payer.'}</p>
                </div>
              </div>
              );
            })()}
          </div>
        )}

        {/* عقد البيع: شروط العقد (من صفحة شروط العقار) */}
        {isSale && contract?.propertyId && (
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/30 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('contractTerms')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-slate-100/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold">6</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'شروط العقد' : 'Contract Terms'}</h3>
              <div onClick={(e) => e.stopPropagation()}>
                <Link href={`/${locale}/admin/properties/${contract.propertyId}/bookings/terms`} className="px-3 py-1.5 text-sm font-semibold text-[#8B6F47] hover:underline">
                  {ar ? 'عرض/تعديل الشروط' : 'View/Edit terms'}
                </Link>
              </div>
              <span className="text-slate-600">{openSections.contractTerms ? '▼' : '▶'}</span>
            </button>
            {openSections.contractTerms && (() => {
              const terms = getContractTypeTerms(String(contract.propertyId), 'SALE');
              const text = ar ? (terms.contractDocTermsAr ?? '') : (terms.contractDocTermsEn ?? '');
              return (
                <div className="px-6 pb-6 pt-0 border-t border-slate-200">
                  <div className="pt-4 whitespace-pre-wrap text-sm text-gray-700">{text || (ar ? 'لا توجد شروط محددة. يمكن إضافتها من صفحة شروط الحجز والعقد للعقار.' : 'No specific terms. You can add them from the property booking/contract terms page.')}</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 4. إطار التواريخ (للإيجار/الاستثمار) */}
        {isRent && (
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/20 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('dates')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-purple-50/50 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">4</span>
            <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'التواريخ' : 'Dates'}</h3>
            <span className="text-purple-600">{openSections.dates ? '▼' : '▶'}</span>
          </button>
          {openSections.dates && (
          <div className="px-6 pb-6 pt-0 border-t border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="admin-input-label">{ar ? 'مدة العقد (شهر)' : 'Duration (months)'}</label>
                <input
                  type="number"
                  min={1}
                  value={form.durationMonths ?? ''}
                  onChange={(e) => setForm({ ...form, durationMonths: parseInt(e.target.value, 10) || 12 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? (isInvestment ? 'تاريخ الاستثمار الفعلي' : 'تاريخ الاستئجار الفعلي') : (isInvestment ? 'Actual investment date' : 'Actual rental date')}</label>
                <input
                  type="date"
                  value={form.actualRentalDate ?? ''}
                  onChange={(e) => setForm({ ...form, actualRentalDate: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'تاريخ استلام الوحدة' : 'Unit handover date'}</label>
                <input
                  type="date"
                  value={form.unitHandoverDate ?? ''}
                  onChange={(e) => setForm({ ...form, unitHandoverDate: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'تاريخ البداية' : 'Start Date'}</label>
                <input
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'تاريخ النهاية (محسوب تلقائياً)' : 'End Date (auto)'}</label>
                <input
                  type="date"
                  value={form.endDate ?? ''}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? `يوم استحقاق ال${rentWordAr} (1-31)` : `${rentWordEn} due day (1-31)`}</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.rentDueDay ?? 1}
                  onChange={(e) => setForm({ ...form, rentDueDay: parseInt(e.target.value, 10) || 1 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
                <p className="text-xs text-gray-500 mt-0.5">{ar ? 'تأثير: تواريخ الشيكات تُحسب بناءً على هذا اليوم من كل فترة' : 'Cheque dates use this day of each period'}</p>
              </div>
            </div>
          </div>
          )}
        </div>
        )}

        {/* 5. إطار المالية والإيجار/الاستثمار - نظام متقدم */}
        {isRent && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('financial')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-emerald-50/50 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">5</span>
            <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? `المالية وال${rentWordAr}` : `Financial & ${rentWordEn}`}</h3>
            <span className="text-emerald-600">{openSections.financial ? '▼' : '▶'}</span>
          </button>
          {openSections.financial && (
          <div className="px-6 pb-6 pt-0 border-t border-emerald-200">
          <div className="mb-4 pt-4">
            <label className="admin-input-label">{ar ? 'نوع العقد' : 'Contract type'}</label>
            <select value={form.contractType ?? 'residential'} onChange={(e) => setForm({ ...form, contractType: e.target.value as 'residential' | 'commercial' })} className="admin-select w-full max-w-xs" disabled={!isEditable}>
              <option value="residential">{ar ? 'سكني' : 'Residential'}</option>
              <option value="commercial">{ar ? 'تجاري' : 'Commercial'}</option>
            </select>
          </div>

            {/* حساب الإيجار بالمتر - مثل عين عُمان */}
            <div className="mb-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="calculateByArea"
                  checked={!!form.calculateByArea}
                  onChange={(e) => setForm({ ...form, calculateByArea: e.target.checked })}
                  disabled={!isEditable}
                  className="rounded border-gray-300"
                />
                <label htmlFor="calculateByArea" className="admin-input-label cursor-pointer">{ar ? `حساب ال${rentWordAr} من المساحة (م² × سعر المتر)` : `Calculate ${rentWordEn.toLowerCase()} from area (m² × price/m)`}</label>
              </div>
              {form.calculateByArea && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-input-label">{ar ? 'المساحة (م²)' : 'Area (m²)'}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.rentArea ?? ''}
                      onChange={(e) => setForm({ ...form, rentArea: parseFloat(e.target.value) || 0 })}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'السعر للمتر (ر.ع)' : 'Price per m² (OMR)'}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.pricePerMeter ?? ''}
                      onChange={(e) => setForm({ ...form, pricePerMeter: parseFloat(e.target.value) || 0 })}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="admin-input-label">{ar ? `ال${rentWordAr} الشهري (ر.ع)` : `Monthly ${rentWordEn} (OMR)`}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.monthlyRent ?? ''}
                  onChange={(e) => setForm({ ...form, monthlyRent: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={form.calculateByArea ? true : !isEditable}
                  title={form.calculateByArea ? (ar ? 'يُحسب من المساحة والسعر' : 'Calculated from area') : undefined}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? `ال${rentWordAr} السنوي (ر.ع)` : `Annual ${rentWordEn} (OMR)`}</label>
                <input type="number" min={0} value={((form.monthlyRent ?? 0) * 12).toFixed(2)} readOnly className="admin-input w-full bg-gray-50" />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'إجمالي الضمان (ر.ع) — يُنعكس في الضمان النقدي أدناه' : 'Total deposit (OMR) — reflects in Cash deposit below'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.depositAmount ?? form.depositCashAmount ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setForm({ ...form, depositAmount: v, depositCashAmount: v });
                  }}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? (isInvestment ? 'فترة السماح (أيام) - محسوب تلقائياً من تاريخ الاستثمار الفعلي وتاريخ البداية' : 'فترة السماح (أيام) - محسوب تلقائياً من تاريخ الاستئجار الفعلي وتاريخ البداية') : (isInvestment ? 'Grace period (days) - auto from actual investment date & start date' : 'Grace period (days) - auto from actual rental date & start date')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.gracePeriodDays ?? 0}
                  readOnly
                  className="admin-input w-full bg-gray-50 cursor-default"
                />
                {(form.gracePeriodDays ?? 0) === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {ar ? (isInvestment ? '← أدخل "تاريخ الاستثمار الفعلي" و"تاريخ البداية" في قسم التواريخ' : '← أدخل "تاريخ الاستئجار الفعلي" و"تاريخ البداية" في قسم التواريخ') : (isInvestment ? '← Enter "Actual investment date" & "Start date" in Dates section' : '← Enter "Actual rental date" & "Start date" in Dates section')}
                  </p>
                )}
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'مبلغ فترة السماح (ر.ع)' : 'Grace amount (OMR)'}</label>
                <input type="number" min={0} value={(form.gracePeriodAmount ?? 0).toFixed(3)} readOnly className="admin-input w-full bg-gray-50" />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رسوم البلدية (3%)' : 'Municipality fees (3%)'}</label>
                <input type="number" min={0} value={(form.municipalityFees ?? 0).toFixed(3)} readOnly className="admin-input w-full bg-gray-50" />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'التخفيض (ر.ع)' : 'Discount (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.discountAmount ?? ''}
                  onChange={(e) => setForm({ ...form, discountAmount: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                  placeholder="0"
                />
              </div>
            </div>
            {/* توضيح سلوك طريقة الدفع */}
            <div className="mt-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200/60">
              <h4 className="text-sm font-bold text-amber-900 mb-2">💡 {ar ? 'سلوك النظام حسب طريقة الدفع' : 'System behavior by payment method'}</h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• <strong>{ar ? 'نقداً / تحويل بنكي / إلكتروني' : 'Cash / Transfer / Electronic'}:</strong> {ar ? 'جدول بالتاريخ والمبلغ (كم مقدار الدفع لكل فترة) + أرقام الإيصالات' : 'Table with date & amount per period + receipt numbers'}</li>
                <li>• <strong>{ar ? 'شيك' : 'Check'}:</strong> {ar ? `قسم الشيكات (7) يحتوي على شيك الضمان دائماً، وشيكات ال${rentWordAr} عند اختيار الدفع بشيك` : `Cheques section (7) always shows security cheque; ${rentWordEn.toLowerCase()} cheques when payment by cheque`}</li>
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includesVAT"
                  checked={!!form.includesVAT}
                  onChange={(e) => setForm({ ...form, includesVAT: e.target.checked, vatRate: (e.target.checked ? (form.vatRate ?? 0.05) : 0) })}
                  disabled={!isEditable}
                  className="rounded border-gray-300"
                />
                <label htmlFor="includesVAT" className="admin-input-label">{ar ? 'يتضمن ضريبة مضافة (5%)' : 'Includes VAT (5%)'}</label>
              </div>
              {form.includesVAT && (
                <>
              <div>
                    <label className="admin-input-label">{ar ? 'نسبة الضريبة (%)' : 'VAT rate (%)'}</label>
                <input
                  type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={((form.vatRate ?? 0.05) * 100)}
                      onChange={(e) => setForm({ ...form, vatRate: (parseFloat(e.target.value) || 0) / 100 })}
                  className="admin-input w-full"
                      readOnly={!isEditable}
                      placeholder="5"
                />
              </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'الضريبة الشهرية (ر.ع) - محسوبة تلقائياً' : 'Monthly VAT (OMR) - auto'}</label>
                    <input type="number" min={0} value={(form.monthlyVATAmount ?? 0).toFixed(3)} readOnly className="admin-input w-full bg-gray-50" />
            </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'إجمالي الضريبة (ر.ع) - محسوبة تلقائياً' : 'Total VAT (OMR) - auto'}</label>
                    <input type="number" min={0} value={(form.totalVATAmount ?? 0).toFixed(3)} readOnly className="admin-input w-full bg-gray-50" />
          </div>
                </>
              )}
              <div>
                <label className="admin-input-label">{ar ? 'رسوم الإنترنت (ر.ع)' : 'Internet fees (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.internetFees ?? ''}
                  onChange={(e) => setForm({ ...form, internetFees: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? `طريقة دفع ال${rentWordAr}` : `${rentWordEn} payment`}</label>
                <select
                  value={form.rentPaymentMethod ?? 'cash'}
                  onChange={(e) => setForm({ ...form, rentPaymentMethod: e.target.value as 'cash' | 'check' | 'bank_transfer' | 'electronic_payment' })}
                  className="admin-select w-full"
                  disabled={!isEditable}
                >
                  <option value="cash">{ar ? 'نقداً' : 'Cash'}</option>
                  <option value="check">{ar ? 'شيك' : 'Check'}</option>
                  <option value="bank_transfer">{ar ? 'تحويل بنكي' : 'Bank transfer'}</option>
                  <option value="electronic_payment">{ar ? 'دفع إلكتروني' : 'Electronic'}</option>
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'مدة الدفع' : 'Payment frequency'}</label>
                <select
                  value={form.rentPaymentFrequency ?? 'monthly'}
                  onChange={(e) => setForm({ ...form, rentPaymentFrequency: e.target.value as 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' })}
                  className="admin-select w-full"
                  disabled={!isEditable}
                >
                  <option value="monthly">{ar ? 'شهرياً' : 'Monthly'}</option>
                  <option value="bimonthly">{ar ? 'كل شهرين' : 'Every 2 months'}</option>
                  <option value="quarterly">{ar ? 'كل 3 أشهر' : 'Every 3 months'}</option>
                  <option value="semiannual">{ar ? 'كل 6 أشهر' : 'Every 6 months'}</option>
                  <option value="annual">{ar ? 'سنوياً' : 'Annually'}</option>
                </select>
                <p className="text-xs text-gray-500 mt-0.5">{ar ? 'تنطبق على جميع طرق الدفع (نقداً، شيك، تحويل، إلكتروني)' : 'Applies to all payment methods (cash, check, transfer, electronic)'}</p>
                {((form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'check') && (
                  <p className="text-xs text-purple-600 mt-0.5">
                    {ar ? `→ عدد الشيكات = ${form.durationMonths ?? contract?.durationMonths ?? 12} ÷ ${PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1} = ${Math.ceil((form.durationMonths ?? contract?.durationMonths ?? 12) / (PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1))} شيك` : `→ Cheques = ${form.durationMonths ?? contract?.durationMonths ?? 12} ÷ ${PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1} = ${Math.ceil((form.durationMonths ?? contract?.durationMonths ?? 12) / (PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1))} cheques`}
                  </p>
                )}
              </div>
            </div>
            {/* حقلان للضمان: النقدي (نقداً/تحويل/إلكتروني) + الشيك */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">{ar ? 'الضمان النقدي' : 'Cash Deposit'}</h4>
                <p className="text-xs text-blue-700 mb-3">{ar ? 'يُدفع نقداً أو تحويل بنكي أو دفع إلكتروني' : 'Paid in cash, bank transfer, or online'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-input-label">{ar ? 'المبلغ (ر.ع) — ينعكس في إجمالي الضمان أعلاه' : 'Amount (OMR) — reflects in Total deposit above'}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.depositCashAmount ?? form.depositAmount ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setForm({ ...form, depositCashAmount: v, depositAmount: v });
                      }}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'رقم الإيصال' : 'Receipt no.'}</label>
                    <input type="text" value={form.depositCashReceiptNumber ?? ''} onChange={(e) => setForm({ ...form, depositCashReceiptNumber: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم الإيصال' : 'Receipt number'} />
                    <p className="text-xs text-blue-600 mt-0.5">{ar ? 'يدخله المحاسب عند التأكد من الاستلام' : 'Entered by accountant on receipt confirmation'}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-900 mb-3">{ar ? 'الضمان شيك' : 'Cheque Deposit'}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="depositChequeRequired"
                    checked={!!(form.depositChequeRequired ?? contract?.depositChequeRequired)}
                    onChange={(e) => setForm({
                      ...form,
                      depositChequeRequired: e.target.checked,
                      depositChequeDurationMonths: e.target.checked ? (form.depositChequeDurationMonths ?? contract?.depositChequeDurationMonths ?? 1) : undefined,
                    })}
                    disabled={!isEditable}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="depositChequeRequired" className="admin-input-label cursor-pointer">
                    {ar ? 'مطلوب' : 'Required'}
                  </label>
                </div>
                {(form.depositChequeRequired ?? contract?.depositChequeRequired) && (
                  <div className="mb-3">
                    <label className="admin-input-label">{ar ? 'المدة (أشهر)' : 'Duration (months)'}</label>
                    <select
                      value={form.depositChequeDurationMonths ?? contract?.depositChequeDurationMonths ?? 1}
                      onChange={(e) => setForm({ ...form, depositChequeDurationMonths: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })}
                      className="admin-select w-full"
                      disabled={!isEditable}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} {ar ? (n === 1 ? 'شهر' : n === 2 ? 'شهرين' : 'أشهر') : (n === 1 ? 'month' : 'months')}</option>
                      ))}
                    </select>
                    <p className="text-xs text-emerald-600 mt-1">
                      {ar ? 'سيُضاف عدد الشيكات إلى قسم الشيكات (7) بدون تاريخ' : 'Cheques will be added to section (7) without date'}
                    </p>
                  </div>
                )}
                {((form.depositChequeRequired ?? contract?.depositChequeRequired) && requiredChecks.some((r) => DEPOSIT_RELATED_CHECK_IDS.includes(r.checkTypeId ?? ''))) && (
                  <p className="text-xs text-emerald-700">
                    {ar ? '→ المبلغ ورقم كل شيك في قسم الشيكات (7)' : '→ Amount & cheque no. for each in Cheques section (7)'}
                  </p>
                )}
              </div>
            </div>
            {/* أرقام الإيصالات: للإيجار عند نقداً/تحويل/إلكتروني */}
            {((form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'cash' || (form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'bank_transfer' || (form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'electronic_payment') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="admin-input-label">{ar ? `رقم إيصال ال${rentWordAr}` : `${rentWordEn} receipt no.`}</label>
                <input type="text" value={form.rentReceiptNumber ?? ''} onChange={(e) => setForm({ ...form, rentReceiptNumber: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم الإيصال' : 'Receipt number'} />
              </div>
            </div>
            )}

            {/* جدول الدفع: عند نقداً أو تحويل بنكي أو إلكتروني — جدول بالتاريخ والمبلغ */}
            {((form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'cash' || (form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'bank_transfer' || (form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'electronic_payment') && (() => {
              const duration = form.durationMonths ?? contract?.durationMonths ?? 12;
              const periodMonths = PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1;
              const count = Math.ceil(duration / periodMonths);
              const startDate = form.startDate ?? contract?.startDate ?? '';
              const rentDueDay = form.rentDueDay ?? contract?.rentDueDay ?? 1;
              const monthlyRent = form.monthlyRent ?? contract?.monthlyRent ?? 0;
              const customRents = form.customMonthlyRents ?? contract?.customMonthlyRents ?? [];
              return (
                <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">{ar ? 'جدول الدفع (التاريخ والمبلغ)' : 'Payment Schedule (Date & Amount)'}</h4>
                  <p className="text-xs text-blue-700 mb-3">{ar ? 'كم مقدار الدفع في كل فترة حسب مدة الدفع' : 'Amount due per period based on payment frequency'}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-blue-200 bg-blue-100/50">
                          <th className="text-right py-2 px-3 font-semibold">{ar ? '#' : '#'}</th>
                          <th className="text-right py-2 px-3 font-semibold">{ar ? 'التاريخ' : 'Date'}</th>
                          <th className="text-right py-2 px-3 font-semibold">{ar ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: count }).map((_, i) => {
                          const d = startDate ? defaultCheckDateForIndex(startDate, rentDueDay, i, periodMonths) : '-';
                          const amt = chequeAmountForPeriod(i, periodMonths, monthlyRent, customRents);
                          return (
                            <tr key={i} className="border-b border-blue-100">
                              <td className="py-2 px-3">{i + 1}</td>
                              <td className="py-2 px-3">{d}</td>
                              <td className="py-2 px-3 font-semibold">{amt.toFixed(2)} ر.ع</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* رسوم أخرى وضرائب أخرى */}
            <div className="mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasOtherFees"
                  checked={!!form.hasOtherFees}
                  onChange={(e) => setForm({
                    ...form,
                    hasOtherFees: e.target.checked,
                    otherFees: e.target.checked
                      ? (form.otherFees && form.otherFees.length > 0 ? form.otherFees : [{ description: '', amount: 0 }])
                      : []
                  })}
                  disabled={!isEditable}
                  className="rounded border-gray-300"
                />
                <label htmlFor="hasOtherFees" className="admin-input-label cursor-pointer">{ar ? 'رسوم أخرى' : 'Other fees'}</label>
              </div>
              {form.hasOtherFees && (form.otherFees ?? []).length > 0 && (
                <div className="space-y-3">
                  {(form.otherFees ?? []).map((fee, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end">
          <div>
                        <label className="admin-input-label">{ar ? 'وصف الرسوم' : 'Description'}</label>
                        <input
                          type="text"
                          value={fee.description}
                          onChange={(e) => {
                            const arr = [...(form.otherFees ?? [])];
                            arr[idx] = { ...arr[idx], description: e.target.value };
                            setForm({ ...form, otherFees: arr });
                          }}
                          className="admin-input w-full"
                          readOnly={!isEditable}
                          placeholder={ar ? 'مثال: رسوم صيانة' : 'e.g. Maintenance fee'}
                        />
                      </div>
              <div>
                        <label className="admin-input-label">{ar ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</label>
                <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={fee.amount || ''}
                          onChange={(e) => {
                            const arr = [...(form.otherFees ?? [])];
                            arr[idx] = { ...arr[idx], amount: parseFloat(e.target.value) || 0 };
                            setForm({ ...form, otherFees: arr });
                          }}
                  className="admin-input w-full"
                          readOnly={!isEditable}
                />
              </div>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, otherFees: (form.otherFees ?? []).filter((_, i) => i !== idx) })}
                          className="admin-btn-outline px-3 py-2"
                        >
                          {ar ? 'حذف' : 'Remove'}
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, otherFees: [...(form.otherFees ?? []), { description: '', amount: 0 }] })}
                      className="admin-btn-outline"
                    >
                      {ar ? '+ إضافة رسوم أخرى' : '+ Add other fee'}
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  id="hasOtherTaxes"
                  checked={!!form.hasOtherTaxes}
                  onChange={(e) => setForm({ ...form, hasOtherTaxes: e.target.checked, otherTaxRate: e.target.checked ? (form.otherTaxRate ?? 0.02) : 0 })}
                  disabled={!isEditable}
                  className="rounded border-gray-300"
                />
                <label htmlFor="hasOtherTaxes" className="admin-input-label cursor-pointer">{ar ? 'ضرائب أخرى' : 'Other taxes'}</label>
              </div>
              {form.hasOtherTaxes && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                    <label className="admin-input-label">{ar ? 'اسم الضريبة' : 'Tax name'}</label>
                <input
                      type="text"
                      value={form.otherTaxName ?? ''}
                      onChange={(e) => setForm({ ...form, otherTaxName: e.target.value })}
                  className="admin-input w-full"
                      readOnly={!isEditable}
                      placeholder={ar ? 'مثال: ضريبة استثمارية' : 'e.g. Investment tax'}
                />
              </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'نسبة الضريبة (%) - أدخل الرقم فقط مثل 2' : 'Tax rate (%) - enter number e.g. 2'}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={((form.otherTaxRate ?? 0) * 100) || ''}
                      onChange={(e) => setForm({ ...form, otherTaxRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="admin-input w-full"
                      readOnly={!isEditable}
                      placeholder="2"
                    />
            </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'إجمالي الضريبة (ر.ع)' : 'Total tax (OMR)'}</label>
                    <input type="number" min={0} value={(form.totalOtherTaxAmount ?? 0).toFixed(3)} readOnly className="admin-input w-full bg-gray-50" />
                  </div>
                </div>
              )}
          </div>

            {/* إيجارات شهرية مخصصة */}
            <div className="mt-4 p-4 bg-amber-50/30 rounded-xl border border-amber-200/50">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="useCustomMonthlyRents"
                  checked={!!(form.customMonthlyRents && form.customMonthlyRents.length > 0)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const duration = form.durationMonths ?? 12;
                      const rent = form.monthlyRent ?? 0;
                      setForm({ ...form, customMonthlyRents: Array(duration).fill(rent) });
                    } else {
                      setForm({ ...form, customMonthlyRents: [] });
                    }
                  }}
                  disabled={!isEditable}
                  className="rounded border-gray-300"
                />
                <label htmlFor="useCustomMonthlyRents" className="admin-input-label cursor-pointer">{ar ? (isInvestment ? 'استثمارات شهرية مخصصة (تعديل كل شهر)' : 'إيجارات شهرية مخصصة (تعديل كل شهر)') : (isInvestment ? 'Custom monthly investments (edit per month)' : 'Custom monthly rents (edit per month)')}</label>
              </div>
              <p className="text-xs text-gray-500 mb-2 -mt-1">
                {ar ? `عند التفعيل: شهر 1=300، شهر 2=350، شهر 3=300 مثلاً → الشيك 1=300، الشيك 2=350، الشيك 3=300. وإذا لم تُفعّل يُستخدم ال${rentWordAr} الشهري لجميع الشيكات.` : `When enabled: month 1=300, month 2=350, etc. → cheque 1=300, cheque 2=350. When disabled: monthly ${rentWordEn.toLowerCase()} applies to all cheques.`}
              </p>
              {form.customMonthlyRents && form.customMonthlyRents.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                  {form.customMonthlyRents.map((r, i) => (
                    <div key={i}>
                      <label className="admin-input-label text-xs">{ar ? `ش ${i + 1}` : `M${i + 1}`}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={r ?? ''}
                        onChange={(e) => {
                          const arr = [...form.customMonthlyRents!];
                          arr[i] = parseFloat(e.target.value) || 0;
                          setForm({ ...form, customMonthlyRents: arr });
                        }}
                        className="admin-input w-full text-sm"
                        readOnly={!isEditable}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
        )}

        {/* 6. إطار البلدية والعدادات (للإيجار/الاستثمار) */}
        {isRent && (
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 shadow-sm overflow-hidden">
          <button type="button" onClick={() => toggleSection('municipality')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-gray-100/50 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600 font-bold">6</span>
            <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'البلدية والعُدّادات' : 'Municipality & Meters'}</h3>
            <span className="text-gray-600">{openSections.municipality ? '▼' : '▶'}</span>
          </button>
          {openSections.municipality && (
          <div className="px-6 pb-6 pt-0 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
                <label className="admin-input-label">{ar ? 'رقم استمارة البلدية' : 'Municipality form no.'}</label>
                <input
                  type="text"
                  value={form.municipalityFormNumber ?? ''}
                  onChange={(e) => setForm({ ...form, municipalityFormNumber: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                  placeholder={ar ? 'رقم الاستمارة' : 'Form number'}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رقم عقد البلدية' : 'Municipality contract no.'}</label>
                <input
                  type="text"
                  value={form.municipalityContractNumber ?? ''}
                  onChange={(e) => setForm({ ...form, municipalityContractNumber: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                  placeholder={ar ? 'رقم العقد' : 'Contract number'}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رسوم التسجيل (ر.ع)' : 'Registration fee (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.municipalityRegistrationFee ?? 1}
                  onChange={(e) => setForm({ ...form, municipalityRegistrationFee: parseFloat(e.target.value) || 1 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'قراءة الكهرباء' : 'Electricity reading'}</label>
                <input
                  type="text"
                  value={form.electricityMeterReading ?? ''}
                  onChange={(e) => setForm({ ...form, electricityMeterReading: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'قراءة الماء' : 'Water reading'}</label>
                <input
                  type="text"
                  value={form.waterMeterReading ?? ''}
                  onChange={(e) => setForm({ ...form, waterMeterReading: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'مبلغ فاتورة الكهرباء (ر.ع)' : 'Electricity bill (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.electricityBillAmount ?? ''}
                  onChange={(e) => setForm({ ...form, electricityBillAmount: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'مبلغ فاتورة الماء (ر.ع)' : 'Water bill (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.waterBillAmount ?? ''}
                  onChange={(e) => setForm({ ...form, waterBillAmount: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isEditable}
                />
              </div>
            </div>
          </div>
          )}
        </div>
        )}

        {/* إيجارات/استثمارات شهرية مخصصة - قبل الشيكات (تُطبق على مبالغ الشيكات) */}
        {isRent && form.customMonthlyRents && form.customMonthlyRents.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('customRents')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-amber-50/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">6.1</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? (isInvestment ? 'الاستثمارات الشهرية المخصصة' : 'الإيجارات الشهرية المخصصة') : (isInvestment ? 'Custom Monthly Investments' : 'Custom Monthly Rents')}</h3>
              <span className="text-amber-600">{openSections.customRents ? '▼' : '▶'}</span>
            </button>
            {openSections.customRents && (
            <div className="px-6 pb-6 pt-0 border-t border-amber-200">
            <p className="text-sm text-amber-800 mb-3">
              {ar
                ? 'ستنعكس هذه القيم على مبالغ الشيكات أدناه حسب مدة الدفع: شهرياً→شيك 1=شهر 1، شيك 2=شهر 2… ؛ كل 3 أشهر→شيك 1=شهر 1+2+3، شيك 2=شهر 4+5+6…'
                : 'These values apply to cheque amounts based on payment frequency: monthly→cheque 1=month 1…; quarterly→cheque 1=months 1+2+3, cheque 2=months 4+5+6…'}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
              {form.customMonthlyRents.map((r, i) => (
                <div key={i} className="p-2 rounded-lg bg-white border border-amber-200/50">
                  <div className="text-xs text-gray-500 mb-0.5">{ar ? `شهر ${i + 1}` : `Month ${i + 1}`}</div>
                  <div className="font-semibold text-gray-900">{(r ?? 0).toFixed(2)} ر.ع</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200 text-sm font-semibold text-gray-700">
              {ar ? 'الإجمالي:' : 'Total:'} {form.customMonthlyRents.reduce((a, b) => a + (b ?? 0), 0).toFixed(2)} ر.ع
            </div>
            </div>
            )}
          </div>
        )}

        {/* إطار الشيكات - شيك الضمان دائماً، شيكات الإيجار/الاستثمار عند اختيار الدفع بشيك */}
        {contract?.id && requiredChecks.length > 0 && (() => {
            const contractChecks = getChecksByContract(contract.id);
            const bookingChecks = contract.bookingId ? getChecksByBooking(contract.bookingId) : [];
            const checksToShow = requiredChecks;
            const getStoredIdx = (idx: number) => idx;
            const duration = form.durationMonths ?? contract?.durationMonths ?? 12;
            const showCreateButton = (form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'check' && duration > 0 && requiredChecks.filter((r) => r.checkTypeId === 'RENT_CHEQUE').length === 0;
            return (
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 shadow-sm overflow-hidden">
                <button type="button" onClick={() => toggleSection('cheques')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-emerald-50/50 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">7</span>
                  <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'الشيكات' : 'Checks'}</h3>
                  <span className="text-emerald-600">{openSections.cheques ? '▼' : '▶'}</span>
                </button>
                {openSections.cheques && (
                <div className="px-6 pb-6 pt-0 border-t border-emerald-200">
                <p className="text-sm text-emerald-800 mb-4 pt-4">
                  {ar
                    ? `يُبنى تلقائياً حسب مدة الدفع: شهرياً→${duration} شيك، كل 3 أشهر→${Math.ceil(duration / 3)}، نصف سنوي→${Math.ceil(duration / 6)}، سنوياً→${Math.ceil(duration / 12)}. المبالغ: ${form.customMonthlyRents?.length ? (isInvestment ? 'من الاستثمارات المخصصة (6.1)' : 'من الإيجارات المخصصة (6.1)') : `من ال${rentWordAr} الشهري`}.`
                    : `Auto-built by payment frequency: monthly→${duration}, quarterly→${Math.ceil(duration / 3)}, semiannual→${Math.ceil(duration / 6)}, annual→${Math.ceil(duration / 12)}. Amounts: ${form.customMonthlyRents?.length ? (isInvestment ? 'from Custom Investments (6.1)' : 'from Custom Rents (6.1)') : `from monthly ${rentWordEn.toLowerCase()}`}.`}
                </p>
                {((form.rentPaymentMethod ?? contract?.rentPaymentMethod) === 'check') && (
                  <>
                    {/* معلومات مالك الشيكات والبنك - كما في عين عُمان (قبل إنشاء الشيكات) */}
                    <div className={`mb-4 p-4 rounded-xl border ${fieldsFromTenantDocs ? 'bg-emerald-50/60 border-emerald-300/70 ring-2 ring-emerald-200/50' : 'bg-indigo-50/50 border-indigo-200'}`} title={fieldsFromTenantDocs ? (ar ? `بيانات منسوخة من مستندات ${tenantWordAr} المرفوعة` : `Data synced from ${tenantWordEn.toLowerCase()} uploaded documents`) : undefined}>
                      <h6 className="admin-input-label font-semibold mb-3">{ar ? `👤 معلومات مالك الشيكات (تُطبق على جميع شيكات ال${rentWordAr})` : `Cheque owner info (applies to all ${rentWordEn.toLowerCase()} cheques)`}</h6>
                      <div className="mb-4 p-3 rounded-lg bg-white/60 border border-indigo-100">
                        <label className="admin-input-label block mb-2">{ar ? 'اسم الشخص الذي سيكتب باسمه الشيكات (من التفاصيل البنكية)' : 'Cheque payee name (select from bank details)'}</label>
                        <select
                          value={form.rentChecksBankAccountId ?? ''}
                          onChange={(e) => {
                            const accId = e.target.value;
                            if (!accId) {
                              setForm({ ...form, rentChecksBankAccountId: undefined, rentChecksBankName: '', rentChecksBankBranch: '', rentChecksOwnerType: 'tenant', rentChecksCompanyName: '' });
                              setChequeAccountNumber('');
                              setChequeAccountName('');
                              if (contract?.id) saveChecksToStorage(checkFormData, { accountNumber: '', accountName: '' });
                              return;
                            }
                            const acc = getBankAccountById(accId);
                            if (acc) {
                              const newAccNum = acc.accountNumber;
                              const newAccName = acc.nameAr ?? '';
                              setForm({
                                ...form,
                                rentChecksBankAccountId: accId,
                                rentChecksOwnerType: 'company',
                                rentChecksCompanyName: acc.nameAr,
                                rentChecksBankName: acc.bankNameAr,
                                rentChecksBankBranch: acc.branch ?? '',
                              });
                              setChequeAccountNumber(newAccNum);
                              setChequeAccountName(newAccName);
                              if (contract?.id) {
                                saveChecksToStorage(checkFormData, { accountNumber: newAccNum, accountName: newAccName });
                              }
                            }
                          }}
                          className="admin-select w-full"
                          disabled={!isEditable}
                        >
                          <option value="">{ar ? '— اختر من التفاصيل البنكية —' : '— Select from bank details —'}</option>
                          {(typeof window !== 'undefined' ? getActiveBankAccounts() : []).map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {getBankAccountDisplay(acc)}{acc.branch ? ` (${acc.branch})` : ''}
                            </option>
                          ))}
                        </select>
                        {form.rentChecksBankAccountId && (
                          <Link href={`/${locale}/admin/bank-details`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                            {ar ? '↗ إدارة الحسابات البنكية' : '↗ Manage bank accounts'}
                          </Link>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="admin-input-label">{ar ? 'الشيكات باسم *' : 'Cheques in name of *'}</label>
                          <select
                            value={form.rentChecksOwnerType ?? 'tenant'}
                            onChange={(e) => setForm({ ...form, rentChecksOwnerType: e.target.value as 'tenant' | 'other_individual' | 'company' })}
                            className="admin-select w-full"
                            disabled={!isEditable}
                          >
                            <option value="tenant">{ar ? tenantWordAr : tenantWordEn}</option>
                            <option value="other_individual">{ar ? 'شخص آخر' : 'Other individual'}</option>
                            <option value="company">{ar ? 'شركة' : 'Company'}</option>
                          </select>
                        </div>
                        {(form.rentChecksOwnerType ?? contract?.rentChecksOwnerType) === 'other_individual' && (
                          <>
                            <div>
                              <label className="admin-input-label">{ar ? 'الاسم *' : 'Name *'}</label>
                              <input type="text" value={form.rentChecksOwnerName ?? ''} onChange={(e) => setForm({ ...form, rentChecksOwnerName: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'اسم مالك الشيكات' : 'Cheque owner name'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                              <input type="text" value={form.rentChecksOwnerCivilId ?? ''} onChange={(e) => setForm({ ...form, rentChecksOwnerCivilId: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'الرقم المدني' : 'Civil ID'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                              <input type="text" value={form.rentChecksOwnerPhone ?? ''} onChange={(e) => setForm({ ...form, rentChecksOwnerPhone: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم الهاتف' : 'Phone number'} />
                            </div>
                          </>
                        )}
                        {(form.rentChecksOwnerType ?? contract?.rentChecksOwnerType) === 'company' && (
                          <>
                            <div>
                              <label className="admin-input-label">{ar ? 'اسم الشركة *' : 'Company name *'}</label>
                              <input type="text" value={form.rentChecksCompanyName ?? ''} onChange={(e) => setForm({ ...form, rentChecksCompanyName: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'اسم الشركة' : 'Company name'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'رقم السجل التجاري *' : 'Commercial reg. no. *'}</label>
                              <input type="text" value={form.rentChecksCompanyRegNumber ?? ''} onChange={(e) => setForm({ ...form, rentChecksCompanyRegNumber: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم السجل' : 'CR number'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'المفوض في السجل *' : 'Authorized rep. *'}</label>
                              <input type="text" value={form.rentChecksAuthorizedRep ?? ''} onChange={(e) => setForm({ ...form, rentChecksAuthorizedRep: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'المفوض في السجل' : 'Authorized representative'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                              <input type="text" value={form.rentChecksOwnerCivilId ?? ''} onChange={(e) => setForm({ ...form, rentChecksOwnerCivilId: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'الرقم المدني' : 'Civil ID'} />
                            </div>
                            <div>
                              <label className="admin-input-label">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                              <input type="text" value={form.rentChecksOwnerPhone ?? ''} onChange={(e) => setForm({ ...form, rentChecksOwnerPhone: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم الهاتف' : 'Phone number'} />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="admin-input-label">{ar ? 'اسم البنك *' : 'Bank name *'}</label>
                          <input type="text" value={form.rentChecksBankName ?? ''} onChange={(e) => setForm({ ...form, rentChecksBankName: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'مثال: بنك مسقط' : 'e.g. Bank Muscat'} />
                        </div>
                        <div>
                          <label className="admin-input-label">{ar ? 'الفرع *' : 'Branch *'}</label>
                          <input type="text" value={form.rentChecksBankBranch ?? ''} onChange={(e) => setForm({ ...form, rentChecksBankBranch: e.target.value })} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'مثال: الخوير' : 'e.g. Al Khoudh'} />
                        </div>
                        <div>
                          <label className="admin-input-label">{ar ? 'رقم الحساب *' : 'Account no. *'}</label>
                          <input type="text" value={chequeAccountNumber} onChange={(e) => handleChequeAccountChange('accountNumber', e.target.value)} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'رقم الحساب' : 'Account number'} />
                        </div>
                        <div>
                          <label className="admin-input-label">{ar ? 'اسم الحساب' : 'Account name'}</label>
                          <input type="text" value={chequeAccountName} onChange={(e) => handleChequeAccountChange('accountName', e.target.value)} className="admin-input w-full" readOnly={!isEditable} placeholder={ar ? 'اسم صاحب الحساب' : 'Account holder name'} />
                        </div>
                      </div>
                    </div>
                {showCreateButton && isDraft && (
                  <div className="mb-6 p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
                    <p className="text-sm text-purple-800 mb-3">
                      {ar
                        ? `اضغط لإنشاء شيكات ال${rentWordAr} تلقائياً (${duration} شهر ÷ مدة الدفع = ${requiredChecks.filter((r) => r.checkTypeId === 'RENT_CHEQUE').length} شيك):`
                        : `Click to create ${rentWordEn.toLowerCase()} cheques automatically (${duration} months ÷ payment frequency = ${requiredChecks.filter((r) => r.checkTypeId === 'RENT_CHEQUE').length} cheques):`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!contract?.id) return;
                        const startDate = form.startDate ?? contract?.startDate ?? '';
                        const rentDueDay = form.rentDueDay ?? contract?.rentDueDay ?? 1;
                        const monthlyRent = form.monthlyRent ?? contract?.monthlyRent ?? 0;
                        const customRents = form.customMonthlyRents ?? contract?.customMonthlyRents ?? [];
                        const periodMonths = PAYMENT_FREQUENCY_MONTHS[form.rentPaymentFrequency ?? contract?.rentPaymentFrequency ?? 'monthly'] ?? 1;
                        const chequeCount = Math.ceil(duration / periodMonths);
                        const entries = requiredChecks
                          .filter((r) => r.checkTypeId !== 'RENT_CHEQUE')
                          .map((rc, idx) => {
                            const existing = contractChecks[idx];
                            return {
                              checkTypeId: rc.checkTypeId,
                              labelAr: rc.labelAr || '',
                              labelEn: rc.labelEn || '',
                              checkNumber: existing?.checkNumber ?? '',
                              amount: existing?.amount ?? 0,
                              date: existing?.date ?? '',
                              accountNumber: chequeAccountNumber,
                              accountName: chequeAccountName,
                              imageUrl: existing?.imageUrl,
                            };
                          });
                        for (let i = 0; i < chequeCount; i++) {
                          const d = startDate ? defaultCheckDateForIndex(startDate, rentDueDay, i, periodMonths) : '';
                          const amt = chequeAmountForPeriod(i, periodMonths, monthlyRent, customRents);
                          entries.push({
                            checkTypeId: 'RENT_CHEQUE',
                            labelAr: chequeCount > 1 ? `شيك ${rentWordAr} #${i + 1}` : `شيك ${rentWordAr}`,
                            labelEn: chequeCount > 1 ? `${rentWordEn} cheque #${i + 1}` : `${rentWordEn} cheque`,
                            checkNumber: '',
                            amount: amt,
                            date: d,
                            accountNumber: chequeAccountNumber,
                            accountName: chequeAccountName,
                            imageUrl: undefined,
                          });
                        }
                        saveContractChecks(contract.id, entries);
                        setRentChecksCreated(true);
                      }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold"
                    >
                      {ar ? `إنشاء ${requiredChecks.filter((r) => r.checkTypeId === 'RENT_CHEQUE').length} شيك ${rentWordAr} تلقائياً` : `Create ${requiredChecks.filter((r) => r.checkTypeId === 'RENT_CHEQUE').length} ${rentWordEn.toLowerCase()} cheques automatically`}
                    </button>
                    <p className="text-xs text-purple-600 mt-2">
                      {ar ? '💡 عدد الشيكات = مدة العقد ÷ مدة الدفع (شهرياً=شيك/شهر، كل شهرين=شيك/شهرين، إلخ)' : '💡 Cheque count = contract duration ÷ payment frequency (monthly=1/mo, bimonthly=1/2mo, etc.)'}
                    </p>
                  </div>
                )}
                  </>
                )}
                {checksToShow.length > 0 && (
                <div className="space-y-3">
                  {checksToShow.map((rc, idx) => {
                    const cd = contractChecks[idx];
                    const bk = bookingChecks[idx];
                    const chequeImageUrl = cd?.imageUrl ?? bk?.imageUrl;
                    const fd = requiredChecks.length > 0 ? (checkFormData[idx] ?? { checkNumber: '', amount: '', date: '' }) : (cd ? { checkNumber: cd.checkNumber ?? '', amount: cd.amount != null ? String(cd.amount) : '', date: cd.date ?? '' } : null);
                    const label = ar ? (rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr) : (rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn);
                    const isApproved = bk ? !!bk.approvedAt && !bk.rejectedAt : false;
                    const isChequeRowEditable = isEditable && requiredChecks.length > 0;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col gap-2 ${isApproved ? 'bg-emerald-50/60 border-emerald-300/40' : fieldsFromTenantDocs && (cd?.checkNumber || cd?.amount || chequeImageUrl) ? 'bg-emerald-50/40 border-emerald-200/60 ring-2 ring-emerald-200/40' : 'bg-gray-50 border-gray-200'}`}
                        title={fieldsFromTenantDocs && (cd?.checkNumber || cd?.amount || chequeImageUrl) ? (ar ? `بيانات منسوخة من مستندات ${tenantWordAr}` : `Data synced from ${tenantWordEn.toLowerCase()} documents`) : undefined}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 mb-2">{label}</div>
                            {isChequeRowEditable ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                <div>
                                  <label className="admin-input-label text-xs">{ar ? 'رقم الشيك' : 'Cheque no.'}</label>
                                  <input
                                    type="text"
                                    value={fd?.checkNumber ?? ''}
                                    onChange={(e) => handleCheckFieldChange(idx, 'checkNumber', e.target.value)}
                                    className="admin-input w-full text-sm"
                                    placeholder={ar ? 'رقم الشيك' : 'Cheque #'}
                                  />
                                </div>
                                <div>
                                  <label className="admin-input-label text-xs">{ar ? 'المبلغ' : 'Amount'}</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={fd?.amount ?? ''}
                                    onChange={(e) => handleCheckFieldChange(idx, 'amount', e.target.value)}
                                    className="admin-input w-full text-sm"
                                    placeholder="0"
                                  />
                                </div>
                                {!DEPOSIT_RELATED_CHECK_IDS.includes(rc.checkTypeId ?? '') ? (
                                <div>
                                  <label className="admin-input-label text-xs">{ar ? 'التاريخ' : 'Date'}</label>
                                  <input
                                    type="date"
                                    value={fd?.date ?? ''}
                                    onChange={(e) => handleCheckFieldChange(idx, 'date', e.target.value)}
                                    className="admin-input w-full text-sm"
                                  />
                                </div>
                                ) : (
                                <div className="text-xs text-amber-600">
                                  {ar ? 'بدون تاريخ' : 'No date'}
                                </div>
                                )}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">{ar ? 'رقم الشيك:' : 'Cheque no:'}</span>{' '}
                                  <span className="font-medium">{cd?.checkNumber || fd?.checkNumber || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">{ar ? 'المبلغ:' : 'Amount:'}</span>{' '}
                                  <span className="font-medium">
                                    {cd?.amount != null
                                      ? `${cd.amount} ر.ع`
                                      : fd?.amount && parseFloat(fd.amount)
                                        ? `${parseFloat(fd.amount)} ر.ع`
                                        : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">{ar ? 'التاريخ:' : 'Date:'}</span>{' '}
                                  <span className="font-medium">
                                    {DEPOSIT_RELATED_CHECK_IDS.includes(rc.checkTypeId ?? '')
                                      ? (ar ? 'بدون تاريخ' : 'No date')
                                      : ((cd?.date || fd?.date) ? new Date(cd?.date || fd?.date || '').toLocaleDateString(ar ? 'ar-OM' : 'en-GB') : '—')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">{ar ? 'رقم الحساب:' : 'Account no:'}</span>{' '}
                                  <span className="font-medium">{cd?.accountNumber || chequeAccountNumber || '—'}</span>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-2">
                                  <span className="text-gray-500">{ar ? 'اسم الحساب:' : 'Account name:'}</span>{' '}
                                  <span className="font-medium">{cd?.accountName || chequeAccountName || '—'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {chequeImageUrl && (
                            <div className="flex-shrink-0">
                              <span className="text-xs text-gray-500 block mb-1">{ar ? 'صورة الشيك' : 'Cheque image'}</span>
                              <button type="button" onClick={() => setZoomedImageUrl(chequeImageUrl)} className="block focus:outline-none focus:ring-2 focus:ring-[#8B6F47] focus:ring-offset-2 rounded-lg overflow-hidden">
                                <img src={chequeImageUrl} alt={ar ? 'صورة الشيك' : 'Cheque'} className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg border border-gray-200 object-cover hover:opacity-90 cursor-zoom-in" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isApproved && bk?.approvedAt && (
                          <div className="text-emerald-700 text-xs font-medium">
                            {ar ? '✓ معتمد في' : '✓ Approved on'} {new Date(bk.approvedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}
                            {bk.approvedBy && (ar ? ` من قبل ${bk.approvedBy}` : ` by ${bk.approvedBy}`)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
                {checksToShow.length === 0 && !showCreateButton && (
                  <p className="text-sm text-gray-500 mt-2">
                    {ar ? `💡 اختر طريقة الدفع "شيك" ومدة ال${rentWordAr} لعرض زر إنشاء الشيكات` : `💡 Select payment method "Check" and ${rentWordEn.toLowerCase()} duration to show create cheques button`}
                  </p>
                )}
                </div>
                )}
              </div>
            );
          })()}

          {/* إطار المستندات المرفوعة */}
          {contract.bookingId && (() => {
            const docs = getDocumentsByBooking(contract.bookingId);
            if (docs.length === 0) return null;
            const STATUS_LABELS_DOC: Record<string, { ar: string; en: string }> = {
              PENDING: { ar: 'بانتظار الرفع', en: 'Pending' },
              UPLOADED: { ar: 'مرفوع', en: 'Uploaded' },
              APPROVED: { ar: 'معتمد', en: 'Approved' },
              REJECTED: { ar: 'مرفوض', en: 'Rejected' },
            };
            const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(url) || /data:image\//i.test(url);
            return (
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 shadow-sm overflow-hidden">
                <button type="button" onClick={() => toggleSection('documents')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-gray-100/50 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600 font-bold">8</span>
                  <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'المستندات المرفوعة' : 'Uploaded Documents'}</h3>
                  <span className="text-gray-600">{openSections.documents ? '▼' : '▶'}</span>
                </button>
                {openSections.documents && (
                <div className="px-6 pb-6 pt-0 border-t border-gray-200">
                <div className="space-y-4 pt-4">
                  {docs.map((d) => {
                    const sl = STATUS_LABELS_DOC[d.status];
                    const files = getDocumentFiles(d);
                    return (
                      <div key={d.id} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3 bg-gray-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900">{ar ? d.labelAr : d.labelEn}</div>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${d.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : d.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                            {ar ? sl?.ar : sl?.en}
                          </span>
                        </div>
                        {d.status === 'APPROVED' && d.approvedAt && (
                          <p className="text-emerald-600 text-xs -mt-2">
                            {ar ? '✓ اعتماد:' : '✓ Approved:'} {formatDocumentTimestamp(d.approvedAt, ar)}
                            {d.approvedBy && (ar ? ` — ${d.approvedBy}` : ` — ${d.approvedBy}`)}
                          </p>
                        )}
                        {files.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {files.filter((f) => !f.rejectedAt).map((f, fi) => {
                              const isImg = isImageUrl(f.url);
                              return isImg ? (
                                <button
                                  key={fi}
                                  type="button"
                                  onClick={() => setZoomedImageUrl(f.url)}
                                  className="block focus:outline-none focus:ring-2 focus:ring-[#8B6F47] focus:ring-offset-2 rounded-lg overflow-hidden"
                                >
                                  <img src={f.url} alt={f.name || (ar ? 'صورة المستند' : 'Document')} className="w-20 h-20 object-cover border border-gray-200 hover:border-[#8B6F47] transition-colors cursor-zoom-in" />
                                </button>
                              ) : (
                                <button
                                  key={fi}
                                  type="button"
                                  onClick={() => setZoomedImageUrl(f.url)}
                                  className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 hover:border-[#8B6F47] hover:bg-gray-200 transition-colors p-2 focus:outline-none focus:ring-2 focus:ring-[#8B6F47] focus:ring-offset-2"
                                >
                                  <span className="text-2xl">📄</span>
                                  <span className="text-xs text-gray-600 truncate max-w-full">PDF</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : d.status === 'PENDING' && (
                          <p className="text-gray-500 text-sm">{ar ? 'بانتظار الرفع' : 'Pending upload'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
                )}
              </div>
            );
          })()}

          {/* إطار الشيكات اليدوية/المحاسبة */}
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/20 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('manualCheques')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-amber-50/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">9</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'الشيكات (يدوي/محاسبة)' : 'Checks (Manual/Accounting)'}</h3>
              <span className="text-amber-600">{openSections.manualCheques ? '▼' : '▶'}</span>
            </button>
            {openSections.manualCheques && (
            <div className="px-6 pb-6 pt-0 border-t border-amber-200">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2 pt-4">
              <div className="flex gap-2">
                <Link
                  href={`/${locale}/admin/accounting?tab=cheques&action=add&propertyId=${contract.propertyId}&contractId=${id}`}
                  className="text-sm font-semibold text-amber-600 hover:underline"
                >
                  {ar ? 'إضافة شيك للمحاسبة' : 'Add cheque to accounting'}
                </Link>
                {isEditable && (
                  <>
                    <button type="button" onClick={() => addCheck('rent')} className="text-sm font-semibold text-blue-600 hover:underline">
                      + {ar ? `شيك ${rentWordAr}` : `${rentWordEn} check`}
                  </button>
                    <button type="button" onClick={() => addCheck('deposit')} className="text-sm font-semibold text-emerald-600 hover:underline">
                      + {ar ? 'شيك ضمان' : 'Deposit check'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {(form.checks ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">{ar ? 'لا توجد شيكات' : 'No checks'}</p>
            ) : (
              <div className="space-y-3">
                {(form.checks ?? []).map((ch, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      {isEditable && (
                        <select
                          value={ch.type ?? 'rent'}
                          onChange={(e) => updateCheck(i, { type: e.target.value as CheckType })}
                          className="admin-select w-28"
                        >
                          <option value="rent">{ar ? 'إيجار' : 'Rent'}</option>
                          <option value="deposit">{ar ? 'ضمان' : 'Deposit'}</option>
                          <option value="other">{ar ? 'آخر' : 'Other'}</option>
                        </select>
                      )}
                    <input
                      type="text"
                      placeholder={ar ? 'رقم الشيك' : 'Check #'}
                      value={ch.checkNumber ?? ''}
                      onChange={(e) => updateCheck(i, { checkNumber: e.target.value })}
                      className="admin-input flex-1 min-w-[100px]"
                        readOnly={!isEditable}
                    />
                    <input
                      type="number"
                      placeholder={ar ? 'المبلغ' : 'Amount'}
                      value={ch.amount || ''}
                      onChange={(e) => updateCheck(i, { amount: parseFloat(e.target.value) || 0 })}
                      className="admin-input w-24"
                        readOnly={!isEditable}
                    />
                    <input
                      type="date"
                      value={ch.dueDate ?? ''}
                      onChange={(e) => updateCheck(i, { dueDate: e.target.value })}
                      className="admin-input w-36"
                        readOnly={!isEditable}
                      />
                      {isEditable && (
                        <button type="button" onClick={() => removeCheck(i)} className="text-red-600 hover:underline text-sm">
                          {ar ? 'حذف' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input
                      type="text"
                        placeholder={ar ? 'اسم البنك' : 'Bank name'}
                      value={ch.bankName ?? ''}
                      onChange={(e) => updateCheck(i, { bankName: e.target.value })}
                        className="admin-input"
                        readOnly={!isEditable}
                      />
                      <input
                        type="text"
                        placeholder={ar ? 'الفرع' : 'Branch'}
                        value={ch.bankBranch ?? ''}
                        onChange={(e) => updateCheck(i, { bankBranch: e.target.value })}
                        className="admin-input"
                        readOnly={!isEditable}
                      />
                      <input
                        type="text"
                        placeholder={ar ? 'رقم الحساب' : 'Account no.'}
                        value={ch.bankAccount ?? ''}
                        onChange={(e) => updateCheck(i, { bankAccount: e.target.value })}
                        className="admin-input"
                        readOnly={!isEditable}
                      />
                      <input
                        type="text"
                        placeholder={ar ? 'اسم الحساب' : 'Account name'}
                        value={ch.accountName ?? ''}
                        onChange={(e) => updateCheck(i, { accountName: e.target.value })}
                        className="admin-input"
                        readOnly={!isEditable}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
            )}
          </div>

          {/* إطار الضمانات */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('guarantees')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-gray-100/50 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600 font-bold">10</span>
              <h3 className="text-lg font-bold text-gray-900 flex-1">{ar ? 'الضمانات' : 'Guarantees'}</h3>
              <span className="text-gray-600">{openSections.guarantees ? '▼' : '▶'}</span>
            </button>
            {openSections.guarantees && (
            <div className="px-6 pb-6 pt-0 border-t border-gray-200">
            <textarea
              value={form.guarantees ?? ''}
              onChange={(e) => setForm({ ...form, guarantees: e.target.value })}
              className="admin-input w-full resize-none"
              rows={3}
              readOnly={!isEditable}
            />
            </div>
            )}
          </div>

          {/* ملخص مالي - للإيجار/الاستثمار فقط (عقد البيع له ملخصه في بند 5) */}
          {isRent && (
          <div className="rounded-2xl border-2 border-[#8B6F47]/30 bg-gradient-to-r from-[#8B6F47]/10 to-[#8B6F47]/5 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('summary')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-[#8B6F47]/5 transition-colors">
              <h4 className="font-bold text-gray-900 flex-1">{ar ? 'ملخص مالي' : 'Financial Summary'}</h4>
              <span className="text-[#8B6F47]">{openSections.summary ? '▼' : '▶'}</span>
            </button>
            {openSections.summary && (
            <div className="px-6 pb-6 pt-0 border-t border-[#8B6F47]/20">
            <div className="space-y-2 text-sm pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {form.customMonthlyRents && form.customMonthlyRents.length > 0
                    ? (ar ? 'إجمالي الإيجار (مخصص):' : 'Total rent (custom):')
                    : (ar ? 'إجمالي الإيجار:' : 'Total rent:')}
                </span>
                <span className="font-semibold">
                  {form.customMonthlyRents && form.customMonthlyRents.length > 0
                    ? (form.customMonthlyRents.reduce((a, b) => a + (b ?? 0), 0)).toFixed(2)
                    : ((form.monthlyRent ?? 0) * (form.durationMonths ?? 12)).toFixed(2)}{' '}
                  ر.ع
                </span>
              </div>
              {(form.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>{ar ? 'التخفيض:' : 'Discount:'}</span>
                  <span className="font-semibold">-{(form.discountAmount ?? 0).toFixed(2)} ر.ع</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">{ar ? 'الضمان:' : 'Deposit:'}</span>
                <span className="font-semibold">{form.depositAmount ?? 0} ر.ع</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{ar ? 'رسوم البلدية (3%):' : 'Municipality (3%):'}</span>
                <span className="font-semibold">{form.municipalityFees ?? 0} ر.ع</span>
              </div>
              {form.includesVAT && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{ar ? 'الضريبة المضافة:' : 'VAT:'}</span>
                  <span className="font-semibold">{form.totalVATAmount ?? 0} ر.ع</span>
                </div>
              )}
              {form.hasOtherTaxes && (form.totalOtherTaxAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{form.otherTaxName || (ar ? 'ضرائب أخرى:' : 'Other taxes:')}</span>
                  <span className="font-semibold">{form.totalOtherTaxAmount ?? 0} ر.ع</span>
                </div>
              )}
              {(form.otherFees ?? []).filter((f) => (f.amount ?? 0) > 0).map((fee, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600">{fee.description || (ar ? 'رسوم أخرى' : 'Other fee')}</span>
                  <span className="font-semibold">{fee.amount ?? 0} ر.ع</span>
                </div>
              ))}
              {(form.internetFees ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{ar ? 'رسوم الإنترنت:' : 'Internet:'}</span>
                  <span className="font-semibold">{form.internetFees ?? 0} ر.ع</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="font-bold text-gray-900">{ar ? 'الإيجار السنوي:' : 'Annual rent:'}</span>
                <span className="font-bold text-[#8B6F47]">{((form.monthlyRent ?? 0) * 12).toFixed(2)} ر.ع</span>
              </div>
            </div>
            </div>
            </div>
            )}
          </div>
          )}

          {/* ملخص الحسابات النهائية - للإيجار/الاستثمار فقط */}
          {isRent && (
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleSection('finalSummary')} className="w-full flex items-center gap-2 p-4 text-right hover:bg-indigo-50/50 transition-colors">
              <h4 className="font-bold text-gray-900 flex-1">{ar ? 'ملخص الحسابات النهائية' : 'Final Calculations Summary'}</h4>
              <span className="text-indigo-600">{openSections.finalSummary ? '▼' : '▶'}</span>
            </button>
            {openSections.finalSummary && (
            <div className="px-6 pb-6 pt-0 border-t border-indigo-200">
            <div className="space-y-2 text-sm pt-4">
            <div className="space-y-2 text-sm">
              {(() => {
                const totalRent = form.customMonthlyRents && form.customMonthlyRents.length > 0
                  ? form.customMonthlyRents.reduce((a, b) => a + (b ?? 0), 0)
                  : (form.monthlyRent ?? 0) * (form.durationMonths ?? 12);
                const base = Math.max(0, totalRent - (form.discountAmount ?? 0));
                const municipality = form.municipalityFees ?? 0;
                const vat = form.totalVATAmount ?? 0;
                const otherTax = form.totalOtherTaxAmount ?? 0;
                const otherFeesTotal = (form.otherFees ?? []).reduce((a, f) => a + (f.amount ?? 0), 0);
                const internet = form.internetFees ?? 0;
                const grandTotal = base + municipality + vat + otherTax + otherFeesTotal + internet;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{ar ? 'أساس الإيجار (بعد التخفيض):' : 'Rent base:'}</span>
                      <span className="font-semibold">{base.toFixed(2)} ر.ع</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{ar ? 'رسوم البلدية:' : 'Municipality:'}</span>
                      <span className="font-semibold">{municipality.toFixed(2)} ر.ع</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{ar ? 'الضريبة المضافة:' : 'VAT:'}</span>
                      <span className="font-semibold">{vat.toFixed(2)} ر.ع</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{ar ? 'ضرائب أخرى:' : 'Other taxes:'}</span>
                      <span className="font-semibold">{otherTax.toFixed(2)} ر.ع</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{ar ? 'رسوم أخرى:' : 'Other fees:'}</span>
                      <span className="font-semibold">{otherFeesTotal.toFixed(2)} ر.ع</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t-2 border-indigo-200">
                      <span className="font-bold text-indigo-900">{ar ? 'الإجمالي الكلي (إيجار + رسوم + ضرائب):' : 'Grand total:'}</span>
                      <span className="font-bold text-indigo-700">{grandTotal.toFixed(2)} ر.ع</span>
                    </div>
                  </>
                );
              })()}
            </div>
            </div>
            </div>
            )}
          </div>
          )}

          {isEditable && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { handleSave(); if (adminEditMode) setAdminEditMode(false); }}
                className="px-6 py-3 rounded-xl font-bold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
              >
                {ar ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
              {saved && <span className="text-emerald-600 font-semibold">{ar ? 'تم الحفظ' : 'Saved'}</span>}
            </div>
          )}
        </div>
      {/* workaround: separates closing divs to avoid parser bug */}
      </div>

    {/* نافذة تنبيه تأكيد الإجراء */}
    {confirmAction && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60"
        onClick={() => setConfirmAction(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && setConfirmAction(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {confirmAction === 'edit' && (ar ? 'إرجاع للتعديل' : 'Return for Edit')}
            {confirmAction === 'final' && (ar ? 'اعتماد نهائي' : 'Final Approval')}
            {confirmAction === 'cancel' && (ar ? 'شطب العقد' : 'Cancel Contract')}
            {confirmAction === 'tenant' && (ar ? `اعتماد ${tenantWordAr}` : `${tenantWordEn} Approval`)}
            {confirmAction === 'landlord' && (ar ? 'اعتماد المالك' : 'Landlord Approval')}
          </h3>
          <p className="text-gray-600 mb-6">
            {confirmAction === 'edit' && (ar ? 'سيتم تمكين تعديل بيانات العقد. احفظ التعديلات عند الانتهاء.' : 'Contract will become editable. Save changes when done.')}
            {confirmAction === 'final' && (ar ? 'سيتم اعتماد العقد نهائياً وتحويل الحجز إلى مؤجر. هذا الإجراء لا يمكن التراجع عنه.' : 'Contract will be finally approved and booking will become rented. This cannot be undone.')}
            {confirmAction === 'cancel' && (ar ? 'سيتم شطب هذا العقد. لن يعود قابلاً للاستخدام.' : 'This contract will be cancelled and cannot be used.')}
            {confirmAction === 'tenant' && (ar ? `سيتم تسجيل اعتماد ${tenantWordAr} على العقد.` : `${tenantWordEn} approval will be recorded on the contract.`)}
            {confirmAction === 'landlord' && (ar ? 'سيتم تسجيل اعتماد المالك على العقد.' : 'Landlord approval will be recorded on the contract.')}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === 'edit') setAdminEditMode(true);
                else if (action === 'final') {
                  if (!contract?.bookingId) { alert(ar ? 'العقد غير مرتبط بحجز' : 'Contract has no booking'); return; }
                  if (!areAllRequiredDocumentsApproved(contract!.bookingId)) { alert(ar ? 'يجب اعتماد جميع المستندات أولاً' : 'Approve all documents first'); return; }
                  const bChecks = getChecksByBooking(contract!.bookingId);
                  if (bChecks.length > 0 && !areAllChecksApproved(contract!.bookingId)) { alert(ar ? 'يجب اعتماد جميع الشيكات أولاً' : 'Approve all cheques first'); return; }
                  const updated = approveContractByAdminFinal(id);
                  if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
                  loadContract();
                }
                else if (action === 'cancel') {
                  const updated = cancelContract(id);
                  if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
                  loadContract();
                }
                else if (action === 'tenant') {
                  const updated = approveContractByTenant(id);
                  if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
                  loadContract();
                }
                else if (action === 'landlord') {
                  const updated = approveContractByLandlord(id);
                  if (updated) syncContractStageToBookingAndServer(updated).catch(() => {});
                  loadContract();
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-semibold text-white ${
                confirmAction === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                confirmAction === 'final' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#8B6F47] hover:bg-[#6B5535]'
              }`}
            >
              {ar ? 'متابعة' : 'Continue'}
            </button>
    </div>
        </div>
      </div>
    )}

    {zoomedImageUrl && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90"
        onClick={() => setZoomedImageUrl(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && setZoomedImageUrl(null)}
        aria-label={ar ? 'إغلاق' : 'Close'}
      >
        <button
          type="button"
          onClick={() => setZoomedImageUrl(null)}
          className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl font-bold flex items-center justify-center z-10"
          aria-label={ar ? 'إغلاق' : 'Close'}
        >
          ✕
        </button>
        {/\.pdf$/i.test(zoomedImageUrl) || /data:application\/pdf/i.test(zoomedImageUrl) ? (
          <iframe
            src={zoomedImageUrl}
            title={ar ? 'عرض PDF' : 'View PDF'}
            className="w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={zoomedImageUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        )}
      </div>
    )}
    </>
  );
}
