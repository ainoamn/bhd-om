'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { getPropertyById, getPropertyDataOverrides, getPropertyDisplayText } from '@/lib/data/properties';
import { getPropertyExtraDataPairs } from '@/lib/data/propertyExtraData';
import { getContractTypeTerms, getRequiredDocTypesForBooking, getChequeOwnerExtraDocRequirements, CHEQUE_OWNER_DOC_TYPE_IDS, CONTRACT_DOC_TYPES, CHECK_TYPES, type ContractType } from '@/lib/data/bookingTerms';
import { getChecksByBooking, saveBookingChecks, areAllChecksApproved } from '@/lib/data/bookingChecks';
import { getBookingsByProperty, getAllBookings, getUnitDisplayFromProperty } from '@/lib/data/bookings';
import {
  getDocumentsByBooking,
  uploadDocument,
  createDocumentRequests,
  addMissingDocumentRequests,
  removeDocumentRequest,
  removeDocumentRequestsByTypes,
  replaceFileInDocument,
  getDocumentFiles,
  hasRejectedFiles,
  formatDocumentTimestamp,
  areAllRequiredDocumentsApproved,
  type BookingDocument,
} from '@/lib/data/bookingDocuments';
import { updateBooking, getBookingDisplayName, type PropertyBooking } from '@/lib/data/bookings';
import { getContractByBooking } from '@/lib/data/contracts';
import { getBankAccountById } from '@/lib/data/bankAccounts';
import { findContactByPhoneOrEmail, updateContact, ensureContactFromBooking, isOmaniNationality, isCompanyContact, getContactDisplayName, getContactLocalizedField, getRepDisplayName } from '@/lib/data/addressBook';
import { getAllNationalityValues } from '@/lib/data/nationalities';
import TranslateField from '@/components/admin/TranslateField';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';

/** جلب جهة الاتصال للحجز مع تفضيل النوع المطابق (شخصي/شركة) لتجنب الخلط عند تشابه الهاتف */
function getContactForBooking(b: PropertyBooking) {
  const prefer = b.contactType === 'COMPANY' ? ('COMPANY' as const) : ('PERSONAL' as const);
  return findContactByPhoneOrEmail(b.phone, b.email, { preferContactType: prefer });
}

/** عرض الشيكات عند وجود عقد مُزامَن أو عند وجود شيكات مطلوبة من شروط العقار */

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'بانتظار الرفع', en: 'Pending upload' },
  UPLOADED: { ar: 'مرفوع - بانتظار الاعتماد', en: 'Uploaded - Pending approval' },
  APPROVED: { ar: 'معتمد', en: 'Approved' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
};

/** حالات العقد للعرض بجانب كل عقد في قائمة الاختيار */
const CONTRACT_STATUS: Record<string, { ar: string; en: string; className: string }> = {
  approved: { ar: 'معتمد', en: 'Approved', className: 'bg-emerald-500/30 text-white border-emerald-500/50' },
  rejected: { ar: 'مرفوض', en: 'Rejected', className: 'bg-red-500/30 text-white border-red-500/50' },
  returned: { ar: 'معاد', en: 'Returned', className: 'bg-amber-500/30 text-white border-amber-500/50' },
  incomplete: { ar: 'نواقص', en: 'Incomplete', className: 'bg-amber-500/20 text-white border-amber-500/40' },
  update_requested: { ar: 'طلب تحديث', en: 'Update requested', className: 'bg-blue-500/30 text-white border-blue-500/50' },
  new: { ar: 'جديد', en: 'New', className: 'bg-white/20 text-white border-white/30' },
};

type ContractStatusKey = keyof typeof CONTRACT_STATUS;

/** حساب حالة العقد لحجز معين */
function getContractStatusForBooking(
  bookingId: string,
  propertyId: number | string,
  contractType: ContractType,
  contact: ReturnType<typeof getContactForBooking>
): ContractStatusKey {
  const docs = getDocumentsByBooking(bookingId);
  const checks = getChecksByBooking(bookingId);
  const baseReqTypes = getRequiredDocTypesForBooking(
    propertyId,
    contractType,
    contact ?? null,
    (list, c) => filterDocTypesByNationality(list, c as { nationality?: string } | null)
  );
  const chequeOwnerType = (checks[0]?.ownerType as 'tenant' | 'other_individual' | 'company') || 'tenant';
  const extraReqTypes = getChequeOwnerExtraDocRequirements(chequeOwnerType);
  const reqDocTypes = [...baseReqTypes];
  extraReqTypes.forEach((e) => {
    if (!reqDocTypes.some((r) => r.docTypeId === e.docTypeId)) {
      reqDocTypes.push(e);
    }
  });
  const isOmani = contact && !isCompanyContact(contact) && isOmaniNationality(contact.nationality || '');
  const displayDocs = isOmani ? docs.filter((d) => d.docTypeId !== 'PASSPORT') : docs;
  const ctt = getContractTypeTerms(propertyId, contractType);
  const requiredChecksForB = (contact && isCompanyContact(contact))
    ? (ctt.requiredChecksForCompanies ?? [])
    : (ctt.requiredChecksForIndividuals ?? ctt.requiredChecks ?? []);
  /** شيكات مزامنة من العقد لها أولوية؛ وإلا نستخدم شيكات شروط العقار */
  const effectiveRequiredChecks = checks.length > 0
    ? checks.map((c) => ({ checkTypeId: c.checkTypeId, labelAr: c.labelAr, labelEn: c.labelEn }))
    : requiredChecksForB;
  const reqDocCount = reqDocTypes.length;
  const hasRejectedDoc = displayDocs.some((d) => d.status === 'REJECTED' || hasRejectedFiles(d));
  const hasRejectedCheck = effectiveRequiredChecks.some((_, i) => !!checks[i]?.rejectedAt);
  const hasReplacedFiles = displayDocs.some((d) => getDocumentFiles(d).some((f) => f.replacedAt));
  const allDocsApproved = reqDocCount === 0 || (displayDocs.length > 0 && areAllRequiredDocumentsApproved(bookingId));
  const allChecksApproved = effectiveRequiredChecks.length === 0 || areAllChecksApproved(bookingId);
  const hasAnyUpload = displayDocs.some((d) => getDocumentFiles(d).length > 0);
  const hasChequeData = effectiveRequiredChecks.some((_, i) => {
    const c = checks[i];
    return c?.checkNumber?.trim() && (c?.amount != null && c.amount > 0);
  });
  const missingDocUploads = reqDocTypes.some((r) => {
    const found = displayDocs.find((d) => d.docTypeId === r.docTypeId || (r.docTypeId.startsWith('CUSTOM_') && d.docTypeId.startsWith('CUSTOM_')));
    return r.isRequired && (!found || getDocumentFiles(found!).length === 0);
  });
  const missingChequeData = effectiveRequiredChecks.length > 0 && !effectiveRequiredChecks.every((rc, i) => {
    const c = checks[i];
    const isRent = rc.checkTypeId === 'RENT_CHEQUE';
    const hasImage = !!(c?.imageUrl);
    return c?.checkNumber?.trim() && (c?.amount != null && c.amount >= 0) && (!isRent || !!c?.date) && hasImage;
  });
  const nothingSubmitted = !hasAnyUpload && !hasChequeData;
  const entryNoticeExists = !!((ctt as { entryNoticeAr?: string; entryNoticeEn?: string }).entryNoticeAr || (ctt as { entryNoticeAr?: string; entryNoticeEn?: string }).entryNoticeEn);

  if (reqDocCount > 0 && displayDocs.length === 0 && effectiveRequiredChecks.length === 0) return 'new';
  if (allDocsApproved && allChecksApproved) return 'approved';
  if ((hasRejectedDoc || hasRejectedCheck) && (hasReplacedFiles || (hasRejectedDoc && displayDocs.some((d) => d.status === 'UPLOADED')))) return 'returned';
  if (hasRejectedDoc || hasRejectedCheck) return 'rejected';
  if (entryNoticeExists && (nothingSubmitted || missingDocUploads || missingChequeData)) return 'update_requested';
  if (nothingSubmitted) return 'new';
  if (missingDocUploads || missingChequeData) return 'incomplete';
  return 'new';
}

/** تصفية المستندات حسب الجنسية: عماني لا يُطلب منه جواز سفر، وافد يُطلب منه صورة الجواز */
function filterDocTypesByNationality(
  reqTypes: { docTypeId: string; labelAr?: string; labelEn?: string; isRequired: boolean }[],
  contact: { nationality?: string } | null
) {
  if (contact && isOmaniNationality(contact.nationality || '')) {
    return reqTypes.filter((r) => r.docTypeId !== 'PASSPORT');
  }
  return reqTypes;
}

export default function ContractTermsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const bookingIdParam = searchParams?.get('bookingId');
  const emailParam = searchParams?.get('email');
  const phoneParam = searchParams?.get('phone');
  const civilIdParam = searchParams?.get('civilId');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [bookingId, setBookingId] = useState<string | null>(bookingIdParam || null);
  const [booking, setBooking] = useState<PropertyBooking | null>(null);
  const [matchedBookings, setMatchedBookings] = useState<PropertyBooking[]>([]);
  const [email, setEmail] = useState(emailParam || '');
  const [phone, setPhone] = useState(phoneParam || '');
  const [civilId, setCivilId] = useState(civilIdParam || '');
  const [verifyError, setVerifyError] = useState('');
  const [docs, setDocs] = useState<BookingDocument[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    secondName: '',
    thirdName: '',
    familyName: '',
    nameEn: '',
    nationality: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    phoneCountryCode: '968',
    phone: '',
    phoneSecondaryCountryCode: '968',
    phoneSecondary: '',
    email: '',
    civilId: '',
    civilIdExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    workplace: '',
    workplaceEn: '',
    address: '',
    addressEn: '',
    notes: '',
    notesEn: '',
    tags: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileFormErrors, setProfileFormErrors] = useState<Record<string, string>>({});
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const chequeImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const hasShownRejectionModal = useRef(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [checkFormData, setCheckFormData] = useState<Record<number, { checkNumber: string; amount: string; date: string }>>({});
  /** رقم الحساب واسم الحساب - يُدخَل مرة واحدة ويُطبَّق على كل الشيكات */
  const [chequeAccountNumber, setChequeAccountNumber] = useState('');
  const [chequeAccountName, setChequeAccountName] = useState('');
  const [chequeImageUrls, setChequeImageUrls] = useState<Record<number, string>>({});
  const [chequeImageUploading, setChequeImageUploading] = useState<number | null>(null);
  const [chequeNumberErrors, setChequeNumberErrors] = useState<Record<number, string>>({});
  /** نموذج المفوضين بالتوقيع للشركات - يُعرض عندما يوجد أكثر من مفوض أو عند الحاجة لإدخالهم */
  const [companyRepsForm, setCompanyRepsForm] = useState<Array<{ id: string; name: string; nameEn: string; civilId: string; civilIdExpiry: string; phoneCountryCode: string; phone: string; nationality: string; passportNumber: string; passportExpiry: string }>>([]);
  /** نافذة أسباب الرفض - تُفتح عند الدخول إذا كان العقد مرفوضاً */
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => setMounted(true), []);

  const dataOverrides = getPropertyDataOverrides();
  const property = getPropertyById(id, dataOverrides);
  const contractType: ContractType = (property as { type?: ContractType })?.type ?? 'RENT';
  const contractTypeTerms = getContractTypeTerms(id, contractType);
  const currentContact = booking ? getContactForBooking(booking) : null;
  const isOmani = (currentContact && !isCompanyContact(currentContact) && isOmaniNationality(currentContact.nationality || '')) || (profileForm.nationality && isOmaniNationality(profileForm.nationality));
  const displayDocs = isOmani ? docs.filter((d) => d.docTypeId !== 'PASSPORT') : docs;
  const requiredDocTypes = getRequiredDocTypesForBooking(
    id,
    contractType,
    currentContact ?? null,
    (list, c) => filterDocTypesByNationality(list, c as { nationality?: string } | null)
  );

  const getDocLabel = (r: { docTypeId: string; labelAr?: string; labelEn?: string }) => {
    if (r.docTypeId.startsWith('CUSTOM_')) {
      return ar ? (r.labelAr || r.labelEn || '') : (r.labelEn || r.labelAr || '');
    }
    const doc = CONTRACT_DOC_TYPES.find((d) => d.id === r.docTypeId);
    return doc ? (ar ? doc.labelAr : doc.labelEn) : r.docTypeId;
  };

  const getCheckLabel = (r: { checkTypeId: string; labelAr?: string; labelEn?: string }) => {
    const ct = CHECK_TYPES.find((c) => c.id === r.checkTypeId);
    return ar ? (r.labelAr || ct?.labelAr || '') : (r.labelEn || ct?.labelEn || '');
  };

  const requiredChecks = (currentContact && isCompanyContact(currentContact))
    ? (contractTypeTerms.requiredChecksForCompanies ?? [])
    : (contractTypeTerms.requiredChecksForIndividuals ?? contractTypeTerms.requiredChecks ?? []);

  const contract = bookingId ? getContractByBooking(bookingId) : undefined;
  const bookingChecksList = bookingId ? getChecksByBooking(bookingId) : [];
  /** شيكات مزامنة من العقد لها أولوية؛ وإلا نستخدم شيكات شروط العقار */
  const effectiveRequiredChecks = bookingChecksList.length > 0
    ? bookingChecksList.map((c) => ({ checkTypeId: c.checkTypeId, labelAr: c.labelAr, labelEn: c.labelEn }))
    : requiredChecks;

  /** إيجار شهر واحد - من العقد أو الحجز أو العقار - لتعبئة مبلغ الشيكات تلقائياً */
  const monthlyRent = (() => {
    if (contract?.monthlyRent != null && contract.monthlyRent > 0) return contract.monthlyRent;
    if (!booking || !property) return 0;
    if (booking.priceAtBooking != null && booking.priceAtBooking > 0) return booking.priceAtBooking;
    const prop = property as { price?: number; multiUnitShops?: { price: number }[]; multiUnitShowrooms?: { price: number }[]; multiUnitApartments?: { price: number }[] };
    if (booking.unitKey) {
      const m = booking.unitKey.match(/^(shop|showroom|apartment)-(\d+)$/);
      if (m) {
        const idx = parseInt(m[2], 10);
        if (m[1] === 'shop') return prop.multiUnitShops?.[idx]?.price ?? prop.price ?? 0;
        if (m[1] === 'showroom') return prop.multiUnitShowrooms?.[idx]?.price ?? prop.price ?? 0;
        if (m[1] === 'apartment') return prop.multiUnitApartments?.[idx]?.price ?? prop.price ?? 0;
      }
    }
    return prop.price ?? 0;
  })();

  /** بيانات مالك الشيكات - تُطبَّق على جميع الشيكات */
  const [chequeOwnerType, setChequeOwnerType] = useState<'tenant' | 'other_individual' | 'company'>('tenant');
  const [chequeBankName, setChequeBankName] = useState('');
  const [chequeBankBranch, setChequeBankBranch] = useState('');
  const [chequeOwnerName, setChequeOwnerName] = useState('');
  const [chequeOwnerCivilId, setChequeOwnerCivilId] = useState('');
  const [chequeOwnerPhone, setChequeOwnerPhone] = useState('');
  const [chequeCompanyName, setChequeCompanyName] = useState('');
  const [chequeCompanyRegNumber, setChequeCompanyRegNumber] = useState('');
  const [chequeAuthorizedRep, setChequeAuthorizedRep] = useState('');

  /** المستندات الإضافية عند اختيار الشيك باسم شركة أو فرد آخر */
  const chequeOwnerExtraDocs = getChequeOwnerExtraDocRequirements(chequeOwnerType);
  const effectiveRequiredDocTypes = [
    ...requiredDocTypes,
    ...chequeOwnerExtraDocs.filter((e) => !requiredDocTypes.some((r) => r.docTypeId === e.docTypeId)),
  ];

  /** إضافة/إزالة المستندات الإضافية حسب مالك الشيكات - لا نحذف عند التحميل الأولي (قبل تعيين النوع من الشيكات المخزنة) */
  const chequeOwnerSettledRef = useRef(false);
  useEffect(() => {
    if (!bookingId) return;
    const stored = getChecksByBooking(bookingId);
    const storedOwnerType = (stored[0]?.ownerType as 'tenant' | 'other_individual' | 'company') || 'tenant';
    if (chequeOwnerType === 'tenant') {
      if (storedOwnerType !== 'tenant') return;
      if (!chequeOwnerSettledRef.current) return;
      const removed = removeDocumentRequestsByTypes(bookingId, [...CHEQUE_OWNER_DOC_TYPE_IDS]);
      if (removed > 0) setDocs(getDocumentsByBooking(bookingId));
      return;
    }
    chequeOwnerSettledRef.current = true;
    if (stored.length === 0) return;
    const extras = getChequeOwnerExtraDocRequirements(chequeOwnerType);
    if (extras.length === 0) return;
    addMissingDocumentRequests(bookingId, parseInt(id, 10), extras.map((r) => ({
      docTypeId: r.docTypeId,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      isRequired: r.isRequired,
    })));
    setDocs(getDocumentsByBooking(bookingId));
  }, [bookingId, id, chequeOwnerType]);

  useEffect(() => {
    if (!bookingId || effectiveRequiredChecks.length === 0) {
      setCheckFormData({});
      setChequeAccountNumber('');
      setChequeAccountName('');
      setChequeImageUrls({});
      setChequeBankName('');
      setChequeBankBranch('');
      setChequeOwnerType('tenant');
      setChequeOwnerName('');
      setChequeOwnerCivilId('');
      setChequeOwnerPhone('');
      setChequeCompanyName('');
      setChequeCompanyRegNumber('');
      setChequeAuthorizedRep('');
      return;
    }
    const stored = getChecksByBooking(bookingId);
    const defaultAmount = monthlyRent > 0 ? String(monthlyRent) : '';
    const next: Record<number, { checkNumber: string; amount: string; date: string }> = {};
    const imageUrls: Record<number, string> = {};
    effectiveRequiredChecks.forEach((rc, idx) => {
      const existing = stored[idx];
      const hasAmount = existing?.amount != null && existing.amount > 0;
      next[idx] = {
        checkNumber: existing?.checkNumber ?? '',
        amount: hasAmount ? String(existing.amount) : defaultAmount,
        date: existing?.date ?? '',
      };
      if (existing?.imageUrl) imageUrls[idx] = existing.imageUrl;
    });
    setCheckFormData(next);
    setChequeImageUrls(imageUrls);
    const firstWithAccount = stored.find((s) => s?.accountNumber || s?.accountName);
    let accNum = firstWithAccount?.accountNumber ?? '';
    let accName = firstWithAccount?.accountName ?? '';
    const first = stored[0];
    let bankN = first?.bankName ?? contract?.rentChecksBankName ?? '';
    let bankB = first?.bankBranch ?? contract?.rentChecksBankBranch ?? '';
    if ((!accNum || !accName || !bankN) && contract?.rentChecksBankAccountId && typeof window !== 'undefined') {
      const bankAcc = getBankAccountById(contract.rentChecksBankAccountId);
      if (bankAcc) {
        accNum = accNum || bankAcc.accountNumber || '';
        accName = accName || bankAcc.nameAr || '';
        bankN = bankN || bankAcc.bankNameAr || '';
        bankB = bankB || bankAcc.branch || '';
      }
    }
    setChequeAccountNumber(accNum);
    setChequeAccountName(accName);
    setChequeOwnerType((first?.ownerType || contract?.rentChecksOwnerType) as 'tenant' | 'other_individual' | 'company' || 'tenant');
    setChequeBankName(bankN);
    setChequeBankBranch(bankB);
    setChequeOwnerName(first?.ownerName ?? contract?.rentChecksOwnerName ?? '');
    setChequeOwnerCivilId(first?.ownerCivilId ?? contract?.rentChecksOwnerCivilId ?? '');
    setChequeOwnerPhone(first?.ownerPhone ?? contract?.rentChecksOwnerPhone ?? '');
    setChequeCompanyName(first?.companyName ?? contract?.rentChecksCompanyName ?? '');
    setChequeCompanyRegNumber(first?.companyRegNumber ?? contract?.rentChecksCompanyRegNumber ?? '');
    setChequeAuthorizedRep(first?.authorizedRep ?? contract?.rentChecksAuthorizedRep ?? '');
    if (defaultAmount && Object.keys(next).some((k) => !stored[Number(k)]?.amount)) {
      const ownerT = (first?.ownerType || contract?.rentChecksOwnerType) as 'tenant' | 'other_individual' | 'company' || 'tenant';
      const entries = effectiveRequiredChecks.map((rc, idx) => ({
        checkTypeId: rc.checkTypeId,
        labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
        labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
        checkNumber: next[idx]?.checkNumber ?? '',
        amount: parseFloat(next[idx]?.amount || '0') || 0,
        date: next[idx]?.date ?? '',
        accountNumber: accNum,
        accountName: accName,
        ...(idx === 0 ? {
          ownerType: ownerT,
          bankName: bankN || undefined,
          bankBranch: bankB || undefined,
          ownerName: first?.ownerName ?? contract?.rentChecksOwnerName ?? undefined,
          ownerCivilId: first?.ownerCivilId ?? contract?.rentChecksOwnerCivilId ?? undefined,
          ownerPhone: first?.ownerPhone ?? contract?.rentChecksOwnerPhone ?? undefined,
          companyName: first?.companyName ?? contract?.rentChecksCompanyName ?? undefined,
          companyRegNumber: first?.companyRegNumber ?? contract?.rentChecksCompanyRegNumber ?? undefined,
          authorizedRep: first?.authorizedRep ?? contract?.rentChecksAuthorizedRep ?? undefined,
        } : {}),
        imageUrl: stored[idx]?.imageUrl ?? imageUrls[idx],
      }));
      saveBookingChecks(bookingId, entries);
    }
  }, [bookingId, effectiveRequiredChecks.length, effectiveRequiredChecks.map((r) => r.checkTypeId).join(','), monthlyRent, contract?.rentChecksOwnerType, contract?.rentChecksBankName, contract?.rentChecksBankBranch, contract?.rentChecksBankAccountId, contract?.rentChecksOwnerName, contract?.rentChecksOwnerCivilId, contract?.rentChecksOwnerPhone, contract?.rentChecksCompanyName, contract?.rentChecksCompanyRegNumber, contract?.rentChecksAuthorizedRep]);

  /** فتح نافذة أسباب الرفض عند الدخول إذا كان العقد مرفوضاً */
  useEffect(() => {
    if (!bookingId || !booking || hasShownRejectionModal.current) return;
    const contact = getContactForBooking(booking);
    const status = getContractStatusForBooking(bookingId, id, contractType, contact);
    if (status === 'rejected') {
      hasShownRejectionModal.current = true;
      setShowRejectionModal(true);
    }
  }, [bookingId, booking?.id, id, contractType]);

  /** indices of RENT_CHEQUE only - for auto-fill logic */
  const rentChequeIndices = effectiveRequiredChecks
    .map((rc, idx) => (rc.checkTypeId === 'RENT_CHEQUE' ? idx : -1))
    .filter((i) => i >= 0);
  const firstRentIndex = rentChequeIndices[0] ?? -1;

  /** indices of security cheques (ضمان، عربون، أخرى) - رقم ومبلغ تلقائي، التاريخ غير إلزامي */
  const securityChequeIndices = effectiveRequiredChecks
    .map((rc, idx) => (rc.checkTypeId !== 'RENT_CHEQUE' ? idx : -1))
    .filter((i) => i >= 0);
  const firstSecurityIndex = securityChequeIndices[0] ?? -1;

  /** هل اكتملت كل البيانات (مستندات، شيكات، بيانات مالك الشيكات) لإظهار رسالة الشكر */
  const baseOwnerComplete = chequeAccountNumber.trim().length > 0 &&
    chequeAccountName.trim().length > 0 &&
    chequeBankName.trim().length > 0 &&
    chequeBankBranch.trim().length > 0;
  const otherIndividualComplete = chequeOwnerName.trim().length > 0 &&
    chequeOwnerCivilId.trim().length > 0 &&
    chequeOwnerPhone.trim().length > 0;
  const companyComplete = chequeCompanyName.trim().length > 0 &&
    chequeCompanyRegNumber.trim().length > 0 &&
    chequeAuthorizedRep.trim().length > 0 &&
    chequeOwnerCivilId.trim().length > 0 &&
    chequeOwnerPhone.trim().length > 0;
  const chequeOwnerComplete = !effectiveRequiredChecks.length || (
    baseOwnerComplete &&
    (chequeOwnerType === 'tenant' || (chequeOwnerType === 'other_individual' && otherIndividualComplete) || (chequeOwnerType === 'company' && companyComplete))
  );
  const allRequiredDocsUploaded = effectiveRequiredDocTypes
    .filter((r) => r.isRequired)
    .every((r) => {
      const found = docs.find((d) => d.docTypeId === r.docTypeId || (r.docTypeId.startsWith('CUSTOM_') && d.docTypeId.startsWith('CUSTOM_')));
      return !!found && getDocumentFiles(found).length > 0;
    });
  const allChequesComplete = effectiveRequiredChecks.length === 0 || (
    effectiveRequiredChecks.every((_, i) => {
      const fd = checkFormData[i] ?? { checkNumber: '', amount: '', date: '' };
      const isRent = effectiveRequiredChecks[i]?.checkTypeId === 'RENT_CHEQUE';
      const storedChecks = bookingId ? getChecksByBooking(bookingId) : [];
      const hasImage = !!(chequeImageUrls[i] || storedChecks[i]?.imageUrl);
      return fd.checkNumber.trim().length > 0 && (fd.amount !== '' && parseFloat(String(fd.amount)) >= 0) && (!isRent || !!fd.date) && hasImage;
    }) && chequeOwnerComplete
  );
  const isAllDataComplete = !!bookingId && allRequiredDocsUploaded && allChequesComplete;

  const emptyCheckFields = () => ({ checkNumber: '', amount: '', date: '' });

  type OwnerOverride = {
    ownerType?: 'tenant' | 'other_individual' | 'company';
    bankName?: string;
    bankBranch?: string;
    ownerName?: string;
    ownerCivilId?: string;
    ownerPhone?: string;
    companyName?: string;
    companyRegNumber?: string;
    authorizedRep?: string;
  };
  const saveChecksToStorage = (
    next: Record<number, { checkNumber: string; amount: string; date: string }>,
    accountOverride?: { accountNumber?: string; accountName?: string },
    ownerOverride?: OwnerOverride,
    imageOverrides?: Record<number, string>
  ) => {
    if (!bookingId) return;
    const accNum = accountOverride?.accountNumber ?? chequeAccountNumber;
    const accName = accountOverride?.accountName ?? chequeAccountName;
    const ownerT = ownerOverride?.ownerType ?? chequeOwnerType;
    const bankN = ownerOverride?.bankName ?? chequeBankName;
    const bankB = ownerOverride?.bankBranch ?? chequeBankBranch;
    const oName = ownerOverride?.ownerName ?? chequeOwnerName;
    const oCivil = ownerOverride?.ownerCivilId ?? chequeOwnerCivilId;
    const oPhone = ownerOverride?.ownerPhone ?? chequeOwnerPhone;
    const cName = ownerOverride?.companyName ?? chequeCompanyName;
    const cReg = ownerOverride?.companyRegNumber ?? chequeCompanyRegNumber;
    const aRep = ownerOverride?.authorizedRep ?? chequeAuthorizedRep;
    const stored = getChecksByBooking(bookingId);
    const entries = effectiveRequiredChecks.map((rc, idx) => ({
      checkTypeId: rc.checkTypeId,
      labelAr: rc.labelAr || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelAr || '',
      labelEn: rc.labelEn || CHECK_TYPES.find((c) => c.id === rc.checkTypeId)?.labelEn || '',
      checkNumber: next[idx]?.checkNumber ?? '',
      amount: parseFloat(next[idx]?.amount || '0') || 0,
      date: next[idx]?.date ?? '',
      accountNumber: accNum,
      accountName: accName,
      ...(idx === 0 ? {
        ownerType: ownerT,
        bankName: bankN || undefined,
        bankBranch: bankB || undefined,
        ownerName: oName || undefined,
        ownerCivilId: oCivil || undefined,
        ownerPhone: oPhone || undefined,
        companyName: cName || undefined,
        companyRegNumber: cReg || undefined,
        authorizedRep: aRep || undefined,
      } : {}),
      imageUrl: imageOverrides?.[idx] ?? chequeImageUrls[idx] ?? stored[idx]?.imageUrl,
    }));
    saveBookingChecks(bookingId, entries);
  };

  const handleChequeAccountChange = (field: 'accountNumber' | 'accountName', value: string) => {
    if (field === 'accountNumber') setChequeAccountNumber(value);
    else setChequeAccountName(value);
    const override = field === 'accountNumber' ? { accountNumber: value, accountName: chequeAccountName } : { accountNumber: chequeAccountNumber, accountName: value };
    saveChecksToStorage(checkFormData, override);
  };

  const handleChequeOwnerChange = (field: 'ownerType' | 'bankName' | 'bankBranch', value: string) => {
    if (field === 'ownerType') setChequeOwnerType(value as 'tenant' | 'other_individual' | 'company');
    else if (field === 'bankName') setChequeBankName(value);
    else setChequeBankBranch(value);
    const ownerOverride: OwnerOverride = {};
    if (field === 'ownerType') ownerOverride.ownerType = value as 'tenant' | 'other_individual' | 'company';
    else if (field === 'bankName') { ownerOverride.bankName = value; ownerOverride.bankBranch = chequeBankBranch; }
    else { ownerOverride.bankName = chequeBankName; ownerOverride.bankBranch = value; }
    saveChecksToStorage(checkFormData, undefined, ownerOverride);
  };

  const handleChequeOwnerExtraChange = (field: keyof OwnerOverride, value: string) => {
    if (field === 'ownerName') setChequeOwnerName(value);
    else if (field === 'ownerCivilId') setChequeOwnerCivilId(value);
    else if (field === 'ownerPhone') setChequeOwnerPhone(value);
    else if (field === 'companyName') setChequeCompanyName(value);
    else if (field === 'companyRegNumber') setChequeCompanyRegNumber(value);
    else if (field === 'authorizedRep') setChequeAuthorizedRep(value);
    const ownerOverride: OwnerOverride = {
      ownerType: chequeOwnerType,
      bankName: chequeBankName,
      bankBranch: chequeBankBranch,
      ownerName: chequeOwnerName,
      ownerCivilId: chequeOwnerCivilId,
      ownerPhone: chequeOwnerPhone,
      companyName: chequeCompanyName,
      companyRegNumber: chequeCompanyRegNumber,
      authorizedRep: chequeAuthorizedRep,
      [field]: value,
    };
    saveChecksToStorage(checkFormData, undefined, ownerOverride);
  };

  const handleCheckFieldChange = (index: number, field: 'checkNumber' | 'amount' | 'date', value: string) => {
    if (!bookingId) return;
    let next: Record<number, { checkNumber: string; amount: string; date: string }> = {
      ...checkFormData,
      [index]: { ...(checkFormData[index] ?? emptyCheckFields()), [field]: value },
    };

    /** تلقائي لشيكات الإيجار: رقم متسلسل، نسخ المبلغ، تواريخ بالأشهر المتسلسلة */
    if (effectiveRequiredChecks[index]?.checkTypeId === 'RENT_CHEQUE' && rentChequeIndices.includes(index)) {
      const isFirstRent = index === firstRentIndex;
      if (field === 'checkNumber' && isFirstRent && value.trim()) {
        const base = parseInt(value.replace(/\D/g, ''), 10);
        if (!Number.isNaN(base)) {
          rentChequeIndices.forEach((ri, pos) => {
            const v = pos === 0 ? value : String(base + pos);
            next = { ...next, [ri]: { ...(next[ri] ?? emptyCheckFields()), checkNumber: v } };
          });
        }
      } else if (field === 'amount') {
        rentChequeIndices.forEach((ri) => {
          next = { ...next, [ri]: { ...(next[ri] ?? emptyCheckFields()), amount: value } };
        });
      } else if (field === 'date' && isFirstRent && value) {
        const d = new Date(value + 'T12:00:00');
        if (!Number.isNaN(d.getTime())) {
          rentChequeIndices.forEach((ri, pos) => {
            const copy = new Date(d);
            copy.setMonth(copy.getMonth() + pos);
            const y = copy.getFullYear();
            const m = String(copy.getMonth() + 1).padStart(2, '0');
            const day = String(copy.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;
            next = { ...next, [ri]: { ...(next[ri] ?? emptyCheckFields()), date: dateStr } };
          });
        }
      }
    }

    /** تلقائي لشيكات الضمان: رقم متسلسل، نسخ المبلغ. التاريخ غير إلزامي */
    if (effectiveRequiredChecks[index]?.checkTypeId !== 'RENT_CHEQUE' && securityChequeIndices.includes(index)) {
      const isFirstSecurity = index === firstSecurityIndex;
      if (field === 'checkNumber' && isFirstSecurity && value.trim()) {
        const base = parseInt(value.replace(/\D/g, ''), 10);
        if (!Number.isNaN(base)) {
          securityChequeIndices.forEach((ri, pos) => {
            const v = pos === 0 ? value : String(base + pos);
            next = { ...next, [ri]: { ...(next[ri] ?? emptyCheckFields()), checkNumber: v } };
          });
        }
      } else if (field === 'amount') {
        securityChequeIndices.forEach((ri) => {
          next = { ...next, [ri]: { ...(next[ri] ?? emptyCheckFields()), amount: value } };
        });
      }
    }

    /** منع تكرار رقم الشيك */
    const numbers = Object.values(next).map((f) => (f?.checkNumber ?? '').trim()).filter(Boolean);
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    const hasDuplicates = duplicates.length > 0;
    const errs: Record<number, string> = {};
    if (hasDuplicates) {
      const dupSet = new Set(duplicates);
      Object.entries(next).forEach(([k, v]) => {
        const num = (v?.checkNumber ?? '').trim();
        if (num && dupSet.has(num)) errs[Number(k)] = ar ? 'رقم الشيك مكرر' : 'Duplicate cheque number';
      });
      setChequeNumberErrors(errs);
      return;
    }
    setChequeNumberErrors({});

    setCheckFormData(next);
    saveChecksToStorage(next);
  };

  const handleChequeImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bookingId) return;
    setChequeImageUploading(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/booking-documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        const nextUrls = { ...chequeImageUrls, [idx]: data.url };
        setChequeImageUrls(nextUrls);
        saveChecksToStorage(checkFormData, undefined, undefined, nextUrls);
      } else {
        alert(ar ? 'فشل رفع صورة الشيك' : 'Cheque image upload failed');
      }
    } catch {
      alert(ar ? 'حدث خطأ أثناء الرفع' : 'Upload error');
    } finally {
      setChequeImageUploading(null);
      e.target.value = '';
    }
  };

  const normalizePhone = (p: string) => p.replace(/\D/g, '').replace(/^968/, '').replace(/^0/, '');
  const normalizeCivilId = (c: string) => c.replace(/\D/g, '').trim();

  const isMatch = (b: PropertyBooking) => {
    if (b.type !== 'BOOKING' || (b.status !== 'PENDING' && b.status !== 'CONFIRMED')) return false;
    const emailVal = email.trim();
    const phoneVal = phone.trim().replace(/\s/g, '');
    const civilIdVal = civilId.trim();
    if (emailVal && b.email?.toLowerCase() === emailVal.toLowerCase()) return true;
    if (phoneVal && normalizePhone(b.phone) === normalizePhone(phoneVal)) return true;
    if (civilIdVal && normalizeCivilId((b as { civilId?: string }).civilId || '') === normalizeCivilId(civilIdVal)) return true;
    if (civilIdVal && normalizeCivilId((b as { passportNumber?: string }).passportNumber || '') === normalizeCivilId(civilIdVal)) return true;
    const contact = getContactForBooking(b);
    if (civilIdVal && contact?.companyData?.commercialRegistrationNumber && normalizeCivilId(contact.companyData.commercialRegistrationNumber) === normalizeCivilId(civilIdVal)) return true;
    return false;
  };

  /** التحقق من اكتمال جميع البيانات الإلزامية لتوثيق العقد - شخصي أو شركة */
  const hasRequiredContactData = (b: PropertyBooking) => {
    const contact = getContactForBooking(b);
    if (!contact) return false;
    if (isCompanyContact(contact)) {
      const cd = contact.companyData;
      if (!cd) return false;
      const companyNameOk = (cd.companyNameAr || '').trim().length >= 1;
      const crOk = (cd.commercialRegistrationNumber || '').trim().length >= 1;
      const crExpiryOk = !!(cd.commercialRegistrationExpiry || '').trim();
      const establishmentOk = !!(cd.establishmentDate || '').trim();
      const phoneOk = (contact.phone || '').replace(/\D/g, '').length >= 8;
      const phoneSecondaryOk = (contact.phoneSecondary || '').replace(/\D/g, '').length >= 8;
      const emailOk = (contact.email || '').trim().length >= 3;
      const repsOk = (cd.authorizedRepresentatives || []).length >= 1;
      const repsDataOk = (cd.authorizedRepresentatives || []).every((r) => {
        const nameOk = (r.name || '').trim().length >= 1;
        const phoneROk = (r.phone || '').replace(/\D/g, '').length >= 8;
        const posOk = (r.position || '').trim().length >= 1;
        const omani = isOmaniNationality(r.nationality || '');
        const idOk = omani
          ? !!(r.civilId || '').trim() && !!(r.civilIdExpiry || '').trim()
          : !!(r.civilId || '').trim() && !!(r.passportNumber || '').trim() && !!(r.passportExpiry || '').trim();
        return nameOk && phoneROk && posOk && idOk;
      });
      return companyNameOk && crOk && crExpiryOk && establishmentOk && phoneOk && phoneSecondaryOk && emailOk && repsOk && repsDataOk;
    }
    const firstNameOk = (contact.firstName || '').trim().length >= 1;
    const secondNameOk = (contact.secondName || '').trim().length >= 1;
    const familyNameOk = (contact.familyName || '').trim().length >= 1;
    const nameEnOk = (contact.nameEn || '').trim().length >= 1;
    const nationalityOk = (contact.nationality || '').trim().length >= 1;
    const genderOk = !!(contact.gender || '').trim();
    const phoneOk = (contact.phone || '').replace(/\D/g, '').length >= 8;
    const phoneSecondaryOk = (contact.phoneSecondary || '').replace(/\D/g, '').length >= 8;
    const emailOk = (contact.email || '').trim().length >= 3;
    const addressOk = !!(contact.address?.fullAddress || contact.address?.fullAddressEn || '').trim();
    const workplaceOk = (contact.workplace || '').trim().length >= 1;
    const workplaceEnOk = (contact.workplaceEn || '').trim().length >= 1;
    const omani = isOmaniNationality(contact.nationality || '');
    const civilOk = omani
      ? !!(contact.civilId || '').trim() && !!(contact.civilIdExpiry || '').trim()
      : !!(contact.passportNumber || '').trim() && !!(contact.passportExpiry || '').trim();
    return firstNameOk && secondNameOk && familyNameOk && nameEnOk && nationalityOk && genderOk && phoneOk && phoneSecondaryOk && emailOk && addressOk && workplaceOk && workplaceEnOk && civilOk;
  };

  const loadBookingIntoView = (match: PropertyBooking) => {
    const propId = match.propertyId;
    const prop = getPropertyById(propId, dataOverrides);
    const matchContractType: ContractType = (prop as { type?: ContractType })?.type ?? 'RENT';
    const contact = getContactForBooking(match);
    let reqTypes = getRequiredDocTypesForBooking(propId, matchContractType, contact ?? null, (list, c) => filterDocTypesByNationality(list, c as { nationality?: string } | null));
    let docList = getDocumentsByBooking(match.id);
    if (docList.length === 0 && reqTypes.length > 0) {
      createDocumentRequests(
        match.id,
        propId,
        reqTypes.map((r) => ({
          docTypeId: r.docTypeId,
          labelAr: r.labelAr || '',
          labelEn: r.labelEn || '',
          isRequired: r.isRequired,
        }))
      );
      docList = getDocumentsByBooking(match.id);
    }
    if (contact && !isCompanyContact(contact) && isOmaniNationality(contact.nationality || '')) {
      const passportDoc = docList.find((d) => d.docTypeId === 'PASSPORT');
      if (passportDoc) {
        removeDocumentRequest(passportDoc.id);
        docList = getDocumentsByBooking(match.id);
      }
    }
    setBookingId(match.id);
    setBooking(match);
    setDocs(docList);
    setMatchedBookings([]);
    if (contact && isCompanyContact(contact)) {
      const reps = contact.companyData?.authorizedRepresentatives || [];
      const loaded = reps.length > 0
        ? reps.map((r) => {
            const ph = parsePhoneToCountryAndNumber(r.phone || '');
            return {
              id: (r as { id?: string }).id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: getRepDisplayName(r) !== '—' ? getRepDisplayName(r) : (r.name || ''),
              nameEn: r.nameEn || '',
              civilId: r.civilId || '',
              civilIdExpiry: r.civilIdExpiry || '',
              phoneCountryCode: ph.code || '968',
              phone: ph.number || '',
              nationality: r.nationality || '',
              passportNumber: r.passportNumber || '',
              passportExpiry: r.passportExpiry || '',
            };
          })
        : [{ id: `rep-${Date.now()}`, name: '', nameEn: '', civilId: '', civilIdExpiry: '', phoneCountryCode: '968', phone: '', nationality: '', passportNumber: '', passportExpiry: '' }];
      setCompanyRepsForm(loaded);
    } else {
      setCompanyRepsForm([]);
    }
    if (!hasRequiredContactData(match)) {
      setShowCompleteProfile(true);
      const parts = (match.name || '').trim().split(/\s+/).filter(Boolean);
      const ph = parsePhoneToCountryAndNumber(match.phone || contact?.phone || '');
      const phSec = parsePhoneToCountryAndNumber(contact?.phoneSecondary || '');
      setProfileForm({
        firstName: contact?.firstName || parts[0] || '',
        secondName: contact?.secondName || (parts.length > 2 ? parts[1] : '') || '',
        thirdName: contact?.thirdName || (parts.length > 3 ? parts[2] : '') || '',
        familyName: contact?.familyName || (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '') || '',
        nameEn: contact?.nameEn || '',
        nationality: contact?.nationality || '',
        gender: (contact?.gender as 'MALE' | 'FEMALE') || 'MALE',
        phoneCountryCode: ph.code,
        phone: ph.number,
        phoneSecondaryCountryCode: phSec.code,
        phoneSecondary: phSec.number,
        email: match.email || contact?.email || '',
        civilId: (match as { civilId?: string }).civilId || contact?.civilId || '',
        civilIdExpiry: contact?.civilIdExpiry || '',
        passportNumber: (match as { passportNumber?: string }).passportNumber || contact?.passportNumber || '',
        passportExpiry: contact?.passportExpiry || '',
        workplace: contact?.workplace || '',
        workplaceEn: contact?.workplaceEn || '',
        address: contact?.address?.fullAddress || '',
        addressEn: contact?.address?.fullAddressEn || '',
        notes: contact?.notes || '',
        notesEn: contact?.notesEn || '',
        tags: (contact?.tags || []).join(', '),
      });
    } else {
      setShowCompleteProfile(false);
    }
  };

  const getFieldErrorClass = (field: string) =>
    profileFormErrors[field] ? 'border-2 border-red-500 ring-2 ring-red-500/30 bg-red-500/10' : '';

  /** إطار أحمر للحقول الإلزامية الفارغة، أخضر عند التعبئة */
  const getRequiredBorderClass = (value: string | number | undefined): string => {
    const isEmpty = value === undefined || value === null || value === '' || (typeof value === 'string' && !value.trim());
    return isEmpty ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30';
  };

  /** بناء رقم الهاتف الكامل مع كود الدولة */
  const getFullPhone = (countryCode: string, local: string) => {
    const digits = (countryCode + local).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  };

  /** حفظ المفوضين بالتوقيع للشركة */
  const saveCompanyReps = () => {
    if (!bookingId || !booking) return;
    const contact = getContactForBooking(booking);
    if (!contact || !isCompanyContact(contact)) return;
    const validReps = companyRepsForm.filter((r) => (r.name || '').trim() && (r.phone || '').replace(/\D/g, '').length >= 8);
    if (validReps.length === 0) return;
    const existingReps = contact.companyData?.authorizedRepresentatives || [];
    const repsToSave = validReps.map((f) => {
      const existing = existingReps.find((r) => (r as { id?: string }).id === f.id) as { firstName?: string; secondName?: string; thirdName?: string; familyName?: string } | undefined;
      const fullPhone = getFullPhone(f.phoneCountryCode, f.phone);
      const omani = isOmaniNationality((f.nationality || '').trim());
      const nameParts = (f.name || '').trim().split(/\s+/).filter(Boolean);
      const firstName = existing?.firstName ?? nameParts[0] ?? '';
      const secondName = existing?.secondName ?? (nameParts.length > 2 ? nameParts[1] : '');
      const thirdName = existing?.thirdName ?? (nameParts.length > 3 ? nameParts[2] : '');
      const familyName = existing?.familyName ?? (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
      const fullName = f.name.trim() || [firstName, secondName, thirdName, familyName].filter(Boolean).join(' ');
      return {
        id: f.id,
        firstName: firstName || undefined,
        secondName: secondName || undefined,
        thirdName: thirdName || undefined,
        familyName: familyName || undefined,
        name: fullName,
        nameEn: (f.nameEn || '').trim() || undefined,
        civilId: (f.civilId || '').trim() || undefined,
        civilIdExpiry: (f.civilIdExpiry || '').trim() || undefined,
        nationality: (f.nationality || '').trim() || undefined,
        passportNumber: !omani ? (f.passportNumber || '').trim() || undefined : undefined,
        passportExpiry: !omani ? (f.passportExpiry || '').trim() || undefined : undefined,
        phone: fullPhone,
        position: ar ? 'مفوض بالتوقيع' : 'Authorized Representative',
        contactId: (existing as { contactId?: string })?.contactId,
      };
    });
    try {
      const cd = contact.companyData;
      updateContact(contact.id, {
        companyData: {
          companyNameAr: cd?.companyNameAr ?? '',
          companyNameEn: cd?.companyNameEn,
          commercialRegistrationNumber: cd?.commercialRegistrationNumber ?? '',
          commercialRegistrationExpiry: cd?.commercialRegistrationExpiry,
          establishmentDate: cd?.establishmentDate,
          authorizedRepresentatives: repsToSave,
        },
      });
      const updatedContact = getContactForBooking(booking);
      const propId = parseInt(id, 10);
      const property = getPropertyById(id, dataOverrides);
      const cType: ContractType = (property as { type?: ContractType })?.type ?? 'RENT';
      const reqTypes = getRequiredDocTypesForBooking(id, cType, updatedContact ?? null, (list, c) => filterDocTypesByNationality(list, c as { nationality?: string } | null));
      if (reqTypes.length > 0) {
        addMissingDocumentRequests(bookingId, propId, reqTypes.map((r) => ({
          docTypeId: r.docTypeId,
          labelAr: r.labelAr || CONTRACT_DOC_TYPES.find((d) => d.id === r.docTypeId)?.labelAr || '',
          labelEn: r.labelEn || CONTRACT_DOC_TYPES.find((d) => d.id === r.docTypeId)?.labelEn || '',
          isRequired: r.isRequired,
        })));
        setDocs(getDocumentsByBooking(bookingId));
      }
      if (booking && !hasRequiredContactData(booking)) setShowCompleteProfile(true);
      else setShowCompleteProfile(false);
    } catch {}
  };

  /** حفظ البيانات الجزئية تلقائياً عند إكمال أي حقل */
  const savePartialProfile = () => {
    if (!bookingId || !booking) return;
    const f = profileForm;
    const fullPhone = getFullPhone(f.phoneCountryCode, f.phone);
    const fullPhoneSec = getFullPhone(f.phoneSecondaryCountryCode, f.phoneSecondary);
    const fullName = [f.firstName, f.secondName, f.thirdName, f.familyName].filter(Boolean).join(' ');
    if (!fullName.trim() || !fullPhone) return;
    const omani = isOmaniNationality(f.nationality || '');
    const tagsArr = f.tags?.split(/[,،]/).map((t) => t.trim()).filter(Boolean) || [];
    const contactPayload = {
      firstName: f.firstName.trim() || undefined,
      secondName: f.secondName?.trim() || undefined,
      thirdName: f.thirdName?.trim() || undefined,
      familyName: f.familyName.trim() || undefined,
      nameEn: f.nameEn?.trim() || undefined,
      nationality: f.nationality?.trim() || undefined,
      gender: f.gender,
      phone: fullPhone,
      phoneSecondary: fullPhoneSec || undefined,
      email: f.email?.trim() || undefined,
      civilId: f.civilId?.trim() || undefined,
      civilIdExpiry: f.civilIdExpiry?.trim() || undefined,
      passportNumber: f.passportNumber?.trim() || undefined,
      passportExpiry: f.passportExpiry?.trim() || undefined,
      workplace: f.workplace?.trim() || undefined,
      workplaceEn: f.workplaceEn?.trim() || undefined,
      address: (f.address?.trim() || f.addressEn?.trim()) ? { fullAddress: f.address?.trim() || undefined, fullAddressEn: f.addressEn?.trim() || undefined } : undefined,
      notes: f.notes?.trim() || undefined,
      notesEn: f.notesEn?.trim() || undefined,
      tags: tagsArr.length ? tagsArr : undefined,
    };
    const existingContact = getContactForBooking(booking) || findContactByPhoneOrEmail(fullPhone, f.email?.trim());
    if (existingContact) {
      try { updateContact(existingContact.id, contactPayload); } catch {}
    } else {
      try {
        const prop = getPropertyById(booking.propertyId, dataOverrides);
        const unitPart = booking.unitKey && prop ? getUnitDisplayFromProperty(prop, booking.unitKey, true) : null;
        const unitDisplay = unitPart ? `${booking.propertyTitleAr} - ${unitPart}` : booking.propertyTitleAr;
        const newContact = ensureContactFromBooking(fullName, fullPhone, f.email?.trim() || undefined, {
          propertyId: booking.propertyId,
          unitKey: booking.unitKey,
          unitDisplay,
          civilId: omani ? f.civilId?.trim() : undefined,
          passportNumber: !omani ? f.passportNumber?.trim() : undefined,
        });
        updateContact(newContact.id, contactPayload);
      } catch {}
    }
    updateBooking(bookingId, {
      name: fullName,
      phone: fullPhone,
      email: f.email?.trim() || undefined,
      civilId: omani ? f.civilId?.trim() : f.passportNumber?.trim(),
      passportNumber: !omani ? f.passportNumber?.trim() : undefined,
    } as Partial<PropertyBooking>);
    setBooking((b) => b ? { ...b, name: fullName, phone: fullPhone, email: f.email?.trim() || b.email } : b);
  };

  /** فتح نموذج التعديل وملء البيانات من جهة الاتصال */
  const handleEditProfile = () => {
    if (!booking) return;
    const contact = getContactForBooking(booking);
    const parsePhone = (p: string) => {
      const { code, number } = parsePhoneToCountryAndNumber(p);
      return { countryCode: code, local: number };
    };
    const ph = parsePhone(contact?.phone || booking.phone || '');
    const phSec = parsePhone(contact?.phoneSecondary || '');
    setProfileForm({
      firstName: contact?.firstName || '',
      secondName: contact?.secondName || '',
      thirdName: contact?.thirdName || '',
      familyName: contact?.familyName || '',
      nameEn: contact?.nameEn || '',
      nationality: contact?.nationality || '',
      gender: (contact?.gender as 'MALE' | 'FEMALE') || 'MALE',
      phoneCountryCode: ph.countryCode,
      phone: ph.local,
      phoneSecondaryCountryCode: phSec.countryCode,
      phoneSecondary: phSec.local,
      email: contact?.email || booking.email || '',
      civilId: (booking as { civilId?: string }).civilId || contact?.civilId || '',
      civilIdExpiry: contact?.civilIdExpiry || '',
      passportNumber: (booking as { passportNumber?: string }).passportNumber || contact?.passportNumber || '',
      passportExpiry: contact?.passportExpiry || '',
      workplace: contact?.workplace || '',
      workplaceEn: contact?.workplaceEn || '',
      address: contact?.address?.fullAddress || '',
      addressEn: contact?.address?.fullAddressEn || '',
      notes: contact?.notes || '',
      notesEn: contact?.notesEn || '',
      tags: (contact?.tags || []).join(', '),
    });
    setShowCompleteProfile(true);
  };

  const handleCompleteProfileSubmit = () => {
    setProfileError('');
    setProfileFormErrors({});
    const f = profileForm;
    const firstNameVal = f.firstName.trim();
    const secondNameVal = f.secondName.trim();
    const familyNameVal = f.familyName.trim();
    const nameEnVal = f.nameEn.trim();
    const nationalityVal = f.nationality.trim();
    const phoneVal = getFullPhone(f.phoneCountryCode, f.phone);
    const phoneSecondaryVal = getFullPhone(f.phoneSecondaryCountryCode, f.phoneSecondary);
    const emailVal = f.email.trim();
    const phoneDigits = phoneVal.replace(/\D/g, '');
    const phoneSecDigits = phoneSecondaryVal.replace(/\D/g, '');
    const addressVal = f.address.trim() || f.addressEn.trim();
    const workplaceVal = f.workplace.trim();
    const workplaceEnVal = f.workplaceEn.trim();
    const omani = isOmaniNationality(nationalityVal);
    const civilVal = f.civilId.trim();
    const civilExpVal = f.civilIdExpiry.trim();
    const passVal = f.passportNumber.trim();
    const passExpVal = f.passportExpiry.trim();

    const errors: Record<string, string> = {};
    if (!firstNameVal) errors.firstName = ar ? 'مطلوب' : 'Required';
    if (!secondNameVal) errors.secondName = ar ? 'مطلوب' : 'Required';
    if (!familyNameVal) errors.familyName = ar ? 'مطلوب' : 'Required';
    if (!nameEnVal) errors.nameEn = ar ? 'مطلوب' : 'Required';
    if (!nationalityVal) errors.nationality = ar ? 'مطلوبة' : 'Required';
    const isOmaniPhone = f.phoneCountryCode === '968';
    if (!phoneVal || phoneDigits.length < 8) errors.phone = ar ? 'مطلوب (8 أرقام على الأقل للعماني)' : 'Required (at least 8 digits for Omani)';
    else if (isOmaniPhone && phoneDigits.replace(/^968/, '').length < 8) errors.phone = ar ? 'رقم عماني: 8 أرقام بعد 968' : 'Omani: 8 digits after 968';
    const isOmaniPhoneSec = f.phoneSecondaryCountryCode === '968';
    if (!phoneSecondaryVal || phoneSecDigits.length < 8) errors.phoneSecondary = ar ? 'مطلوب (8 أرقام على الأقل)' : 'Required (at least 8 digits)';
    else if (isOmaniPhoneSec && phoneSecDigits.replace(/^968/, '').length < 8) errors.phoneSecondary = ar ? 'رقم عماني: 8 أرقام' : 'Omani: 8 digits';
    if (!emailVal || emailVal.length < 3) errors.email = ar ? 'مطلوب' : 'Required';
    if (!workplaceVal) errors.workplace = ar ? 'مطلوبة' : 'Required';
    if (!workplaceEnVal) errors.workplaceEn = ar ? 'مطلوبة' : 'Required';
    if (!addressVal) errors.address = ar ? 'مطلوب (عربي أو إنجليزي)' : 'Required (Arabic or English)';
    if (omani) {
      if (!civilVal) errors.civilId = ar ? 'مطلوب للمواطنين العمانيين' : 'Required for Omani nationals';
      if (!civilExpVal) errors.civilIdExpiry = ar ? 'مطلوب' : 'Required';
      else if (civilExpVal) {
        const expiry = new Date(civilExpVal + 'T12:00:00');
        const today = new Date();
        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
        if (isNaN(expiry.getTime()) || expiry < minDate) errors.civilIdExpiry = ar ? 'يجب أن يكون بعد 30 يوماً على الأقل' : 'Must be at least 30 days from today';
      }
    } else if (nationalityVal.trim()) {
      if (!passVal) errors.passportNumber = ar ? 'مطلوب للوفد' : 'Required for expatriates';
      if (!passExpVal) errors.passportExpiry = ar ? 'مطلوب' : 'Required';
      else if (passExpVal) {
        const expiry = new Date(passExpVal + 'T12:00:00');
        const today = new Date();
        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
        if (isNaN(expiry.getTime()) || expiry < minDate) errors.passportExpiry = ar ? 'يجب أن يكون بعد 90 يوماً على الأقل' : 'Must be at least 90 days from today';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileFormErrors(errors);
      setProfileError(ar ? 'يرجى تعبئة جميع الحقول الإلزامية وتصحيح الأخطاء' : 'Please fill in all required fields and correct errors');
      setTimeout(() => document.getElementById('contract-profile-errors')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }
    if (!bookingId || !booking) return;

    const fullName = [firstNameVal, secondNameVal, f.thirdName?.trim(), familyNameVal].filter(Boolean).join(' ');
    if (omani) {
      const currentDocs = getDocumentsByBooking(bookingId);
      const passportDoc = currentDocs.find((d) => d.docTypeId === 'PASSPORT');
      if (passportDoc) {
        removeDocumentRequest(passportDoc.id);
        setDocs(getDocumentsByBooking(bookingId));
      }
    }
    updateBooking(bookingId, {
      name: fullName,
      phone: phoneVal,
      email: emailVal || undefined,
      civilId: omani ? civilVal : passVal || undefined,
      passportNumber: !omani ? passVal : undefined,
    } as Partial<PropertyBooking>);

    const prop = getPropertyById(booking.propertyId, dataOverrides);
    const unitPart = booking.unitKey && prop ? getUnitDisplayFromProperty(prop, booking.unitKey, true) : null;
    const unitDisplay = unitPart ? `${booking.propertyTitleAr} - ${unitPart}` : booking.propertyTitleAr;
    const existingContact = getContactForBooking(booking) || findContactByPhoneOrEmail(phoneVal, emailVal);

    const tagsArr = f.tags?.split(/[,،]/).map((t) => t.trim()).filter(Boolean) || [];
    const contactPayload = {
      firstName: firstNameVal,
      secondName: secondNameVal || undefined,
      thirdName: f.thirdName?.trim() || undefined,
      familyName: familyNameVal,
      nameEn: nameEnVal || undefined,
      nationality: nationalityVal,
      gender: f.gender,
      phone: phoneVal,
      phoneSecondary: phoneSecondaryVal || undefined,
      email: emailVal || undefined,
      civilId: omani ? civilVal : undefined,
      civilIdExpiry: omani ? civilExpVal : undefined,
      passportNumber: !omani ? passVal : undefined,
      passportExpiry: !omani ? passExpVal : undefined,
      workplace: workplaceVal || undefined,
      workplaceEn: workplaceEnVal || undefined,
      address: { fullAddress: f.address.trim() || undefined, fullAddressEn: f.addressEn.trim() || undefined },
      notes: f.notes?.trim() || undefined,
      notesEn: f.notesEn?.trim() || undefined,
      tags: tagsArr.length ? tagsArr : undefined,
    };

    if (existingContact) {
      updateContact(existingContact.id, contactPayload);
    } else {
      const newContact = ensureContactFromBooking(fullName, phoneVal, emailVal || undefined, {
        propertyId: booking.propertyId,
        unitKey: booking.unitKey,
        unitDisplay,
        civilId: omani ? civilVal : undefined,
        passportNumber: !omani ? passVal : undefined,
      });
      updateContact(newContact.id, contactPayload);
    }

    setBooking({
      ...booking,
      name: fullName,
      phone: phoneVal,
      email: emailVal || undefined,
      civilId: omani ? civilVal : passVal,
      passportNumber: !omani ? passVal : undefined,
    } as PropertyBooking);
    setProfileFormErrors({});
    setProfileError('');
    setShowCompleteProfile(false);
  };

  const verifyAndLoad = () => {
    setVerifyError('');
    const emailVal = email.trim();
    const phoneVal = phone.trim().replace(/\s/g, '');
    const civilIdVal = civilId.trim();
    if (!emailVal && !phoneVal && !civilIdVal) {
      setVerifyError(ar ? 'أدخل الرقم المدني أو رقم الهاتف أو البريد الإلكتروني' : 'Enter civil ID, phone number, or email');
      return;
    }
    const allBookings = getAllBookings();
    const matches = allBookings.filter(isMatch);
    if (matches.length === 0) {
      setVerifyError(ar ? 'لم يتم العثور على حجز بهذا الرقم المدني أو رقم الهاتف أو البريد' : 'No booking found with this civil ID, phone number, or email');
    } else if (matches.length === 1) {
      const match = matches[0];
      if (match.propertyId !== parseInt(id, 10)) {
        router.push(`/${locale}/properties/${match.propertyId}/contract-terms?bookingId=${match.id}`);
      } else {
        loadBookingIntoView(match);
      }
    } else {
      setMatchedBookings(matches);
    }
  };

  const handleSelectBooking = (match: PropertyBooking) => {
    if (match.propertyId !== parseInt(id, 10)) {
      router.push(`/${locale}/properties/${match.propertyId}/contract-terms?bookingId=${match.id}`);
    } else {
      loadBookingIntoView(match);
    }
  };

  useEffect(() => {
    if (bookingIdParam) {
      const bookings = getBookingsByProperty(parseInt(id, 10));
      const match = bookings.find(
        (b) => b.id === bookingIdParam && b.type === 'BOOKING' && (b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'RENTED') && b.propertyId === parseInt(id, 10)
      );
      if (match) {
        loadBookingIntoView(match);
        if (match.email) setEmail(match.email);
        if (match.phone) setPhone(match.phone);
        setVerifyError('');
      } else {
        setVerifyError(ar ? 'رابط غير صالح أو انتهت صلاحيته' : 'Invalid or expired link');
      }
    } else if ((emailParam || phoneParam || civilIdParam) && mounted) {
      const allBookings = getAllBookings();
      const matches = allBookings.filter((b) => {
        if (b.type !== 'BOOKING' || (b.status !== 'PENDING' && b.status !== 'CONFIRMED')) return false;
        if (emailParam && b.email?.toLowerCase() === emailParam.trim().toLowerCase()) return true;
        if (phoneParam && normalizePhone(b.phone) === normalizePhone(phoneParam)) return true;
        if (civilIdParam && normalizeCivilId((b as { civilId?: string }).civilId || '') === normalizeCivilId(civilIdParam)) return true;
        if (civilIdParam && normalizeCivilId((b as { passportNumber?: string }).passportNumber || '') === normalizeCivilId(civilIdParam)) return true;
        return false;
      });
      setPhone(phoneParam || '');
      setEmail(emailParam || '');
      setCivilId(civilIdParam || '');
      setVerifyError('');
      if (matches.length === 1) {
        const match = matches[0];
        if (match.propertyId !== parseInt(id, 10)) {
          router.push(`/${locale}/properties/${match.propertyId}/contract-terms?bookingId=${match.id}`);
        } else {
          loadBookingIntoView(match);
        }
      } else if (matches.length > 1) {
        setMatchedBookings(matches);
      }
    }
  }, [id, bookingIdParam, emailParam, phoneParam, civilIdParam, mounted, ar]);

  const refreshDocs = () => {
    if (bookingId) setDocs(getDocumentsByBooking(bookingId));
  };

  /** التحديث التلقائي عند تغيّر المستندات أو الشيكات من تبويب آخر (الإدارة) */
  useEffect(() => {
    if (!bookingId || typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if ((e.key === 'bhd_booking_documents' || e.key === 'bhd_booking_checks') && bookingId) {
        setDocs(getDocumentsByBooking(bookingId));
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && bookingId) {
        setDocs(getDocumentsByBooking(bookingId));
      }
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || docs.length > 0 || requiredDocTypes.length === 0) return;
      const allBookings = getAllBookings();
      const b = allBookings.find((x) => x.id === bookingId);
    const contact = b ? getContactForBooking(b) : null;
    let reqTypes = getRequiredDocTypesForBooking(id, contractType, contact ?? null, (list, c) => filterDocTypesByNationality(list, c as { nationality?: string } | null));
    const storedChecks = getChecksByBooking(bookingId);
    const chequeOwner = (storedChecks[0]?.ownerType as 'tenant' | 'other_individual' | 'company') || 'tenant';
    const extraFromChequeOwner = getChequeOwnerExtraDocRequirements(chequeOwner);
    extraFromChequeOwner.forEach((e) => {
      if (!reqTypes.some((r) => r.docTypeId === e.docTypeId)) reqTypes = [...reqTypes, e];
    });
      if (reqTypes.length > 0) {
        createDocumentRequests(
          bookingId,
          parseInt(id, 10),
          reqTypes.map((r) => ({
            docTypeId: r.docTypeId,
            labelAr: r.labelAr || '',
            labelEn: r.labelEn || '',
            isRequired: r.isRequired,
          }))
        );
        setDocs(getDocumentsByBooking(bookingId));
      }
  }, [bookingId, id, docs.length, requiredDocTypes.length]);

  const handleFileSelect = async (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingId(docId);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/booking-documents', { method: 'POST', body: formData });
        const data = await res.json();
if (data.url) {
          const uploadedBy = booking ? getBookingDisplayName(booking, locale) : undefined;
          uploadDocument(docId, data.url, file.name, uploadedBy);
        } else {
          alert(ar ? 'فشل الرفع' : 'Upload failed');
        }
      }
      refreshDocs();
    } catch {
      alert(ar ? 'حدث خطأ أثناء الرفع' : 'An error occurred during upload');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const triggerFileInput = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const triggerReplaceInput = (docId: string, fileUrl: string) => {
    const key = `replace-${docId}-${encodeURIComponent(fileUrl)}`;
    replaceInputRefs.current[key]?.click();
  };

  const handleReplaceFileSelect = async (docId: string, oldFileUrl: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingId(docId);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/booking-documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        replaceFileInDocument(docId, oldFileUrl, data.url, file.name);
        refreshDocs();
      } else {
        alert(ar ? 'فشل الرفع' : 'Upload failed');
      }
    } catch {
      alert(ar ? 'حدث خطأ أثناء الرفع' : 'An error occurred during upload');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">🔍</div>
          <p className="text-white mb-6 text-lg">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1612] via-[#0f0d0b] to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B6F47]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#C9A961]/10 rounded-full blur-3xl" />
        </div>
        <PageHero
          title={matchedBookings.length > 0 ? (ar ? 'اختر العقد' : 'Select Contract') : (ar ? 'شروط توثيق العقد' : 'Contract Documentation Terms')}
          subtitle={matchedBookings.length > 0 ? (ar ? 'لديك أكثر من عقد جاهز للتوقيع' : 'You have multiple contracts ready for signing') : (ar ? property.titleAr : property.titleEn)}
          compact
          backgroundImage={property.image}
        />
      </div>

      <section className="relative -mt-16 pb-24 md:pb-32 text-white">
        <div className="container mx-auto px-4 max-w-3xl text-white">
          <div
            className={`rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 text-white [&_p]:!text-white [&_span]:!text-white [&_label]:!text-white [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_li]:!text-white [&_a]:!text-white [&_input]:!text-white [&_textarea]:!text-white [&_div]:!text-white [&_strong]:!text-white ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {(bookingId || matchedBookings.length > 0) && (
              <div className="px-6 pt-6 pb-0">
                <Link
                  href={`/${locale}/properties/${id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white transition-colors"
                >
                  <span>←</span>
                  {ar ? 'العودة لصفحة العقار' : 'Back to property'}
                </Link>
              </div>
            )}
            {(bookingId || matchedBookings.length > 0) && ((contractTypeTerms as { entryNoticeAr?: string; entryNoticeEn?: string }).entryNoticeAr || (contractTypeTerms as { entryNoticeAr?: string; entryNoticeEn?: string }).entryNoticeEn) && (
              <div className="mx-6 mt-6 mb-0 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40">
                <p className="text-white text-sm font-medium whitespace-pre-line">
                  {ar ? ((contractTypeTerms as { entryNoticeAr?: string; entryNoticeEn?: string }).entryNoticeAr || (contractTypeTerms as { entryNoticeEn?: string }).entryNoticeEn) : ((contractTypeTerms as { entryNoticeEn?: string }).entryNoticeEn || (contractTypeTerms as { entryNoticeAr?: string }).entryNoticeAr)}
                </p>
              </div>
            )}
            {matchedBookings.length > 0 ? (
              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'اختر العقد للمتابعة' : 'Select contract to continue'}
                </h2>
                <p className="text-white text-sm mb-6">
                  {ar ? 'لديك أكثر من عقد جاهز للتوقيع. اختر العقد الذي تريد استكمال توثيقه.' : 'You have more than one contract ready for signing. Select the contract you want to complete.'}
                </p>
                <div className="space-y-3">
                  {matchedBookings.map((b) => {
                    const prop = getPropertyById(b.propertyId, dataOverrides);
                    const unitLabel = b.unitKey && prop
                      ? getUnitDisplayFromProperty(prop, b.unitKey, ar)
                      : null;
                    const displayTitle = unitLabel
                      ? (ar ? `${b.propertyTitleAr} - ${unitLabel}` : `${b.propertyTitleEn} - ${unitLabel}`)
                      : (ar ? b.propertyTitleAr : b.propertyTitleEn);
                    const bContractType: ContractType = (prop as { type?: ContractType })?.type ?? 'RENT';
                    const status = getContractStatusForBooking(b.id, b.propertyId, bContractType, getContactForBooking(b));
                    const statusInfo = CONTRACT_STATUS[status];
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBooking(b)}
                        className="w-full text-right p-5 rounded-2xl border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] hover:border-[#8B6F47]/50 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold text-white group-hover:text-white">{displayTitle}</div>
                          <span className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border ${statusInfo.className}`}>
                            {ar ? statusInfo.ar : statusInfo.en}
                          </span>
                        </div>
                        <div className="text-sm text-white mt-1">
                          {ar ? 'عقد توثيق' : 'Contract documentation'} · {b.propertyId}
                          {b.unitKey && ` · ${unitLabel}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setMatchedBookings([])}
                  className="mt-6 text-white hover:text-white text-sm"
                >
                  {ar ? '← تغيير بيانات التحقق' : '← Change verification data'}
                </button>
              </div>
            ) : !bookingId ? (
              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'تأكيد هويتك' : 'Verify your identity'}
                </h2>
                <p className="text-white text-sm mb-6">
                  {ar ? 'أدخل الرقم المدني أو رقم الجواز أو رقم السجل التجاري أو رقم الهاتف أو البريد الإلكتروني الذي استخدمته عند طلب الحجز.' : 'Enter civil ID, passport, commercial registration number, phone, or email you used when booking.'}
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={civilId}
                    onChange={(e) => setCivilId(e.target.value)}
                    placeholder={ar ? 'الرقم المدني أو رقم الجواز أو رقم السجل التجاري' : 'Civil ID, passport or commercial registration number'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={ar ? 'رقم الهاتف' : 'Phone number'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={ar ? 'البريد الإلكتروني' : 'Email address'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <p className="text-white text-xs">
                    {ar ? 'أدخل أحد الخيارات على الأقل' : 'Enter at least one'}
                  </p>
                  {verifyError && <p className="text-white text-sm">{verifyError}</p>}
                  <button
                    type="button"
                    onClick={verifyAndLoad}
                    className="w-full px-6 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all"
                  >
                    {ar ? 'متابعة' : 'Continue'}
                  </button>
                </div>
              </div>
            ) : showCompleteProfile ? (
              <div className="p-8">
                {/* رسالة الشكر عند اكتمال كل البيانات */}
                {isAllDataComplete && (
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-6 text-center mb-8">
                    <p className="text-2xl font-bold text-white mb-3">
                      {ar ? 'شكراً لكم!' : 'Thank you!'}
                    </p>
                    <p className="text-white text-base leading-relaxed mb-2">
                      {ar
                        ? 'نشكركم على إكمال جميع البيانات المطلوبة لتوثيق العقد.'
                        : 'Thank you for completing all required information for contract documentation.'}
                    </p>
                    <p className="text-white text-sm">
                      {ar
                        ? 'سيتم مراجعة المستندات والبيانات المرفوعة والرجوع إليكم في أقرب فرصة.'
                        : 'Your uploaded documents and information will be reviewed, and we will get back to you as soon as possible.'}
                    </p>
                    {((contractTypeTerms as { completionNoteAr?: string; completionNoteEn?: string }).completionNoteAr || (contractTypeTerms as { completionNoteAr?: string; completionNoteEn?: string }).completionNoteEn) && (
                      <p className="text-white text-sm mt-4 pt-4 border-t border-white/20">
                        {ar ? ((contractTypeTerms as { completionNoteAr?: string; completionNoteEn?: string }).completionNoteAr || (contractTypeTerms as { completionNoteEn?: string }).completionNoteEn) : ((contractTypeTerms as { completionNoteEn?: string }).completionNoteEn || (contractTypeTerms as { completionNoteAr?: string }).completionNoteAr)}
                      </p>
                    )}
                  </div>
                )}
                <h2 className="text-xl font-bold !text-white mb-4">
                  {ar ? 'إكمال البيانات الإلزامية لتوثيق العقد' : 'Complete required information for contract'}
                </h2>
                {/* شروط توثيق العقد - من إعدادات العقار في لوحة الإدارة */}
                <div className="mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-base font-bold !text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center !text-white text-sm">📋</span>
                    {ar ? 'شروط توثيق العقد' : 'Contract Documentation Terms'}
                  </h3>
                  <p className="!text-white text-sm leading-relaxed whitespace-pre-line">
                    {ar ? (contractTypeTerms.contractDocTermsAr || contractTypeTerms.contractDocTermsEn) : (contractTypeTerms.contractDocTermsEn || contractTypeTerms.contractDocTermsAr)}
                  </p>
                </div>
                {booking && (() => {
                  const c = getContactForBooking(booking);
                  if (c && isCompanyContact(c)) {
                    const showRepsForm = true;
                    return (
                      <div className="mb-6 p-6 rounded-2xl bg-white/[0.05] border border-white/10">
                        <h3 className="text-lg font-bold !text-white mb-2 flex items-center gap-2">
                          <span>🏢</span>
                          {ar ? 'المفوضون بالتوقيع' : 'Authorized Representatives'}
                        </h3>
                        <p className="!text-white text-sm mb-4">
                          {ar ? 'إذا كان في السجل أكثر من مفوض، يرجى إدخال بيانات كل مفوض أدناه (الاسم بالغتين، رقم البطاقة، رقم الهاتف).' : 'If the register has more than one representative, please enter each rep\'s details below (name in both languages, civil ID, phone).'}
                        </p>
                        <div className="space-y-6">
                          {companyRepsForm.map((rep, idx) => (
                            <div key={rep.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">{ar ? `المفوض ${idx + 1}` : `Rep ${idx + 1}`}</span>
                                {companyRepsForm.length > 1 && (
                                  <button type="button" onClick={() => setCompanyRepsForm((arr) => arr.filter((_, i) => i !== idx))} className="text-xs text-white hover:underline">
                                    {ar ? 'حذف' : 'Remove'}
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-white mb-1">{ar ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</label>
                                  <input type="text" value={rep.name} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))} onBlur={saveCompanyReps} placeholder={ar ? 'الاسم الكامل' : 'Full name'} className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(rep.name)}`} />
                                </div>
                                <TranslateField label={ar ? 'الاسم (EN) *' : 'Name (EN) *'} value={rep.nameEn} onChange={(v) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, nameEn: v } : r))} sourceValue={rep.name} onTranslateFromSource={(v) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, nameEn: v } : r))} translateFrom="ar" locale={locale} variant="dark" inputErrorClass={getRequiredBorderClass(rep.nameEn)} onBlur={saveCompanyReps} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
                                <label className="block text-xs text-white mb-1">{ar ? 'رقم البطاقة' : 'Civil ID'}</label>
                                  <input type="text" value={rep.civilId} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, civilId: e.target.value } : r))} onBlur={saveCompanyReps} placeholder={ar ? 'رقم البطاقة المدنية' : 'Civil ID number'} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white focus:border-[#8B6F47] outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs text-white mb-1">{ar ? 'انتهاء البطاقة' : 'Civil ID expiry'}</label>
                                  <input type="date" value={rep.civilIdExpiry} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, civilIdExpiry: e.target.value } : r))} onBlur={saveCompanyReps} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#8B6F47] outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs text-white mb-1">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                                  <div className="flex gap-2">
                                    <PhoneCountryCodeSelect value={rep.phoneCountryCode} onChange={(v) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, phoneCountryCode: v } : r))} onBlur={saveCompanyReps} locale={locale as 'ar' | 'en'} variant="dark" />
                                    <input type="tel" value={rep.phone} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, phone: e.target.value.replace(/\D/g, '').slice(0, 15) } : r))} onBlur={saveCompanyReps} placeholder="91234567" className={`flex-1 px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(rep.phone)}`} />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'الجنسية (لتحديد جواز السفر)' : 'Nationality (for passport requirement)'}</label>
                                <input list={`nationalities-reps-${idx}`} value={rep.nationality} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, nationality: e.target.value } : r))} onBlur={saveCompanyReps} placeholder={ar ? 'عماني، سعودي...' : 'Omani, Saudi...'} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white focus:border-[#8B6F47] outline-none" />
                                <datalist id={`nationalities-reps-${idx}`}>{getAllNationalityValues(locale).map((v) => <option key={v} value={v} />)}</datalist>
                              </div>
                              {rep.nationality && !isOmaniNationality(rep.nationality) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <div>
                                    <label className="block text-xs text-white mb-1">{ar ? 'رقم الجواز *' : 'Passport number *'}</label>
                                    <input type="text" value={rep.passportNumber} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, passportNumber: e.target.value } : r))} onBlur={saveCompanyReps} className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white outline-none focus:ring-2 ${getRequiredBorderClass(rep.passportNumber)}`} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-white mb-1">{ar ? 'انتهاء الجواز *' : 'Passport expiry *'}</label>
                                    <input type="date" value={rep.passportExpiry} onChange={(e) => setCompanyRepsForm((arr) => arr.map((r, i) => i === idx ? { ...r, passportExpiry: e.target.value } : r))} onBlur={saveCompanyReps} className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white outline-none focus:ring-2 ${getRequiredBorderClass(rep.passportExpiry)}`} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => setCompanyRepsForm((arr) => [...arr, { id: `rep-${Date.now()}`, name: '', nameEn: '', civilId: '', civilIdExpiry: '', phoneCountryCode: '968', phone: '', nationality: '', passportNumber: '', passportExpiry: '' }])} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47]/20 border border-[#8B6F47]/40 hover:bg-[#8B6F47]/30 transition-all">
                            <span>+</span> {ar ? 'إضافة مفوض' : 'Add representative'}
                          </button>
                          <button type="button" onClick={saveCompanyReps} className="mr-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
                            {ar ? 'حفظ المفوضين' : 'Save representatives'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {!booking || !isCompanyContact(getContactForBooking(booking)!) ? (
                <p className="text-white text-sm mb-6">
                  {ar ? 'يرجى تعبئة جميع الحقول المميزة بـ * قبل المتابعة إلى رفع المستندات وتوثيق عقد الإيجار.' : 'Please fill in all fields marked with * before proceeding to upload documents and finalize the rental contract.'}
                </p>
                ) : null}
                {/* ملخص بيانات العقد: العقار، التواريخ، المالية - من العقد أو من الحجز والعقار */}
                {bookingId && property && (
                  <div className="mb-8 space-y-6">
                    <h3 className="text-base font-bold !text-white flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📋</span>
                      {ar ? 'ملخص العقد' : 'Contract Summary'}
                    </h3>

                    {/* ٣. بيانات العقار والبيانات الإضافية */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.06]">
                        <h4 className="text-sm font-semibold text-white">{ar ? '٣. بيانات العقار والبيانات الإضافية' : '3. Property & Extra Data'}</h4>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-white font-semibold text-lg whitespace-pre-line">{getPropertyDisplayText(property)}</p>
                        </div>
                        {(() => {
                          const extraPairs = getPropertyExtraDataPairs(id, ar, true);
                          return extraPairs.length > 0 ? (
                            <div>
                              <p className="text-white text-xs font-medium mb-2 opacity-90">{ar ? 'البيانات الإضافية للمبنى:' : 'Building extra data:'}</p>
                              <div className="rounded-xl border border-white/10 overflow-hidden">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {extraPairs.map(({ label, value }, i) => (
                                      <tr key={i} className={i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}>
                                        <td className="px-4 py-2.5 text-white/90 w-40 sm:w-48">{label}</td>
                                        <td className="px-4 py-2.5 text-white font-medium">{value}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* ٤. التواريخ فقط */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.06]">
                        <h4 className="text-sm font-semibold text-white">{ar ? '٤. التواريخ فقط' : '4. Dates only'}</h4>
                      </div>
                      <div className="p-5">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="bg-white/[0.02]">
                              <td className="px-4 py-3 text-white/90">{ar ? 'مدة العقد (شهر)' : 'Contract duration (months)'}</td>
                              <td className="px-4 py-3 text-white font-semibold">{contract?.durationMonths ?? 12}</td>
                            </tr>
                            {contract?.startDate && contract?.endDate && (
                              <tr className="bg-white/[0.04]">
                                <td className="px-4 py-3 text-white/90">{ar ? 'الفترة' : 'Period'}</td>
                                <td className="px-4 py-3 text-white font-medium">{contract.startDate} — {contract.endDate}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ٥. المالية والإيجار فقط */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/10 bg-white/[0.06]">
                        <h4 className="text-sm font-semibold text-white">{ar ? '٥. المالية والإيجار فقط' : '5. Financial & Rent only'}</h4>
                      </div>
                      <div className="p-5">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="bg-white/[0.02]">
                              <td className="px-4 py-3 text-white/90">{ar ? 'الإيجار الشهري (ر.ع)' : 'Monthly rent (OMR)'}</td>
                              <td className="px-4 py-3 text-white font-semibold text-lg">{(contract?.monthlyRent ?? monthlyRent)?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '—'}</td>
                            </tr>
                            <tr className="bg-white/[0.04]">
                              <td className="px-4 py-3 text-white/90">{ar ? 'الإيجار السنوي (ر.ع)' : 'Annual rent (OMR)'}</td>
                              <td className="px-4 py-3 text-white font-semibold text-lg">{(contract?.annualRent ?? (monthlyRent * 12))?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {/* بيانات الشيكات المطلوبة - مع معلومات مالك الشيكات */}
                {effectiveRequiredChecks.length > 0 && (() => {
                  const checkData = bookingId ? getChecksByBooking(bookingId) : [];
                  const securityItems = effectiveRequiredChecks.map((rc, idx) => ({ rc, idx })).filter(({ rc }) => rc.checkTypeId !== 'RENT_CHEQUE');
                  const rentItems = effectiveRequiredChecks.map((rc, idx) => ({ rc, idx })).filter(({ rc }) => rc.checkTypeId === 'RENT_CHEQUE');
                  const renderChequeRow = (rc: { checkTypeId: string; labelAr?: string; labelEn?: string }, idx: number, sameTypeCount: number, sameTypeOrder: number, dateOptional?: boolean) => {
                    const fd = checkFormData[idx] ?? { checkNumber: '', amount: '', date: '' };
                    const dupErr = chequeNumberErrors[idx];
                    const cd = checkData[idx];
                    const chequeImg = chequeImageUrls[idx] ?? cd?.imageUrl;
                    const isApproved = !!cd?.approvedAt && !cd?.rejectedAt;
                    const isRejected = !!cd?.rejectedAt;
                    const approvalNote = ar ? (cd?.approvalNoteAr || cd?.approvalNoteEn) : (cd?.approvalNoteEn || cd?.approvalNoteAr);
                    const rejectionNote = ar ? (cd?.rejectionReasonAr || cd?.rejectionReasonEn) : (cd?.rejectionReasonEn || cd?.rejectionReasonAr);
                    return (
                      <div key={`${rc.checkTypeId}-${idx}`} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                          {getCheckLabel(rc)}
                          {sameTypeCount > 1 ? ` #${sameTypeOrder}` : ''}
                          {isApproved && <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/30 text-white">✓ {ar ? 'معتمد' : 'Approved'}</span>}
                          {isRejected && <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-400 text-gray-900 border-2 border-amber-300 font-semibold">🔄 {ar ? 'طلب تحديث' : 'Update requested'}</span>}
                        </div>
                        {(approvalNote || rejectionNote) && (
                          <p className="text-xs text-white">
                            {isRejected ? (ar ? 'المطلوب تعديله: ' : 'Required change: ') : (ar ? 'ملاحظة الاعتماد: ' : 'Approval note: ')}
                            {approvalNote || rejectionNote}
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'رقم الشيك' : 'Cheque number'}</label>
                            <input
                              type="text"
                              value={fd.checkNumber}
                              onChange={(e) => handleCheckFieldChange(idx, 'checkNumber', e.target.value)}
                              placeholder={ar ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${dupErr ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : getRequiredBorderClass(fd.checkNumber)}`}
                            />
                            {dupErr && <p className="text-white text-xs mt-1">{dupErr}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={fd.amount}
                              onChange={(e) => handleCheckFieldChange(idx, 'amount', e.target.value)}
                              placeholder={ar ? '0.00' : '0.00'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(fd.amount)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">
                              {ar ? 'التاريخ' : 'Date'}
                              {dateOptional && <span className="text-white mr-1">({ar ? 'اختياري' : 'optional'})</span>}
                            </label>
                            <input
                              type="date"
                              value={fd.date}
                              onChange={(e) => handleCheckFieldChange(idx, 'date', e.target.value)}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white outline-none focus:ring-2 ${dateOptional ? 'border-white/10 focus:border-[#8B6F47] focus:ring-[#8B6F47]/30' : getRequiredBorderClass(fd.date)}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white mb-1">{ar ? 'صورة الشيك' : 'Cheque image'}</label>
                          <input
                            ref={(el) => { chequeImageInputRefs.current[idx] = el; }}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleChequeImageUpload(idx, e)}
                          />
                          <div className="flex items-center gap-3 flex-wrap">
                            {chequeImg && (
                              <a
                                href={chequeImg}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                                onClick={(ev) => { ev.preventDefault(); setZoomedImageUrl(chequeImg); }}
                              >
                                <img src={chequeImg} alt="" className="w-16 h-16 object-cover rounded border border-white/20" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => chequeImageInputRefs.current[idx]?.click()}
                              disabled={!!chequeImageUploading}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${!chequeImg ? 'bg-red-500/40 border-2 border-red-400 text-white hover:bg-red-500/50' : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'}`}
                              title={!chequeImg ? (ar ? 'مستند مطلوب — يجب رفع صورة الشيك لتمكين اعتماده' : 'Required — upload cheque image to enable approval') : undefined}
                            >
                              {chequeImageUploading === idx ? (ar ? 'جاري الرفع...' : 'Uploading...') : (chequeImg ? (ar ? 'استبدال الصورة' : 'Replace image') : (ar ? 'رفع صورة الشيك' : 'Upload cheque image'))}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  const payeeName = chequeOwnerType === 'company'
                    ? (chequeCompanyName || contract?.rentChecksCompanyName || chequeAccountName)
                    : chequeOwnerType === 'other_individual'
                      ? (chequeOwnerName || contract?.rentChecksOwnerName || chequeAccountName)
                      : (ar ? 'المستأجر' : 'Tenant');
                  const hasPayeeInfo = !!(chequeAccountNumber || chequeAccountName || chequeBankName);
                  return (
                    <div className="mb-8 space-y-6">
                      <h3 className="text-base font-bold !text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">💳</span>
                        {ar ? '٧. الشيكات' : '7. Cheques'}
                      </h3>
                      <p className="text-white text-xs mb-3">
                        {ar ? 'ستظهر كل الشيكات بتواريخها. على المستأجر تعبئة رقم الشيك ورفع صورة منه قبل التوقيع.' : 'All cheques will appear with their dates. The tenant must fill in the cheque number and upload an image before signing.'}
                      </p>
                      {hasPayeeInfo && (
                        <div className="p-4 rounded-2xl border-2 border-[#8B6F47]/40 bg-[#8B6F47]/10">
                          <h4 className="text-sm font-bold text-white mb-3">{ar ? '📋 بيانات المستفيد من الشيكات (ستُكتب الشيكات باسم)' : '📋 Cheque payee details (cheques will be written to)'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="text-white/80 text-xs">{ar ? 'الاسم:' : 'Name:'}</span>
                              <p className="text-white font-semibold">{payeeName || '—'}</p>
                            </div>
                            {chequeAccountNumber && (
                              <div>
                                <span className="text-white/80 text-xs">{ar ? 'رقم الحساب:' : 'Account no.:'}</span>
                                <p className="text-white font-semibold font-mono">{chequeAccountNumber}</p>
                              </div>
                            )}
                            {chequeBankName && (
                              <div>
                                <span className="text-white/80 text-xs">{ar ? 'اسم البنك:' : 'Bank name:'}</span>
                                <p className="text-white font-semibold">{chequeBankName}</p>
                              </div>
                            )}
                            {chequeBankBranch && (
                              <div>
                                <span className="text-white/80 text-xs">{ar ? 'الفرع:' : 'Branch:'}</span>
                                <p className="text-white font-semibold">{chequeBankBranch}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-3">{ar ? '👤 معلومات مالك الشيكات (تُطبق على جميع شيكات الإيجار)' : '👤 Cheque owner info (applies to all rent cheques)'}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'الشيكات باسم *' : 'Cheques in name of *'}</label>
                            <select
                              value={chequeOwnerType}
                              onChange={(e) => handleChequeOwnerChange('ownerType', e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 border-white/20 text-white outline-none focus:ring-2 focus:ring-[#8B6F47]"
                            >
                              <option value="tenant">{ar ? 'المستأجر' : 'Tenant'}</option>
                              <option value="other_individual">{ar ? 'فرد آخر' : 'Other individual'}</option>
                              <option value="company">{ar ? 'شركة' : 'Company'}</option>
                            </select>
                          </div>
                          {chequeOwnerType === 'other_individual' && (
                            <>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'اسم مالك الشيكات *' : 'Cheque owner name *'}</label>
                                <input
                                  type="text"
                                  value={chequeOwnerName}
                                  onChange={(e) => handleChequeOwnerExtraChange('ownerName', e.target.value)}
                                  placeholder={ar ? 'اسم مالك الشيكات' : 'Cheque owner name'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeOwnerName)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                                <input
                                  type="text"
                                  value={chequeOwnerCivilId}
                                  onChange={(e) => handleChequeOwnerExtraChange('ownerCivilId', e.target.value)}
                                  placeholder={ar ? 'الرقم المدني' : 'Civil ID'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeOwnerCivilId)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'رقم الهاتف *' : 'Phone number *'}</label>
                                <input
                                  type="text"
                                  value={chequeOwnerPhone}
                                  onChange={(e) => handleChequeOwnerExtraChange('ownerPhone', e.target.value)}
                                  placeholder={ar ? 'رقم الهاتف' : 'Phone number'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeOwnerPhone)}`}
                                />
                              </div>
                            </>
                          )}
                          {chequeOwnerType === 'company' && (
                            <>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'اسم الشركة *' : 'Company name *'}</label>
                                <input
                                  type="text"
                                  value={chequeCompanyName}
                                  onChange={(e) => handleChequeOwnerExtraChange('companyName', e.target.value)}
                                  placeholder={ar ? 'اسم الشركة' : 'Company name'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeCompanyName)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'رقم السجل *' : 'CR number *'}</label>
                                <input
                                  type="text"
                                  value={chequeCompanyRegNumber}
                                  onChange={(e) => handleChequeOwnerExtraChange('companyRegNumber', e.target.value)}
                                  placeholder={ar ? 'رقم السجل' : 'CR number'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeCompanyRegNumber)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'المفوض في السجل *' : 'Authorized rep. *'}</label>
                                <input
                                  type="text"
                                  value={chequeAuthorizedRep}
                                  onChange={(e) => handleChequeOwnerExtraChange('authorizedRep', e.target.value)}
                                  placeholder={ar ? 'المفوض في السجل' : 'Authorized representative'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeAuthorizedRep)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                                <input
                                  type="text"
                                  value={chequeOwnerCivilId}
                                  onChange={(e) => handleChequeOwnerExtraChange('ownerCivilId', e.target.value)}
                                  placeholder={ar ? 'الرقم المدني' : 'Civil ID'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeOwnerCivilId)}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-white mb-1">{ar ? 'رقم الهاتف *' : 'Phone number *'}</label>
                                <input
                                  type="text"
                                  value={chequeOwnerPhone}
                                  onChange={(e) => handleChequeOwnerExtraChange('ownerPhone', e.target.value)}
                                  placeholder={ar ? 'رقم الهاتف' : 'Phone number'}
                                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeOwnerPhone)}`}
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'اسم البنك *' : 'Bank name *'}</label>
                            <input
                              type="text"
                              value={chequeBankName}
                              onChange={(e) => handleChequeOwnerChange('bankName', e.target.value)}
                              placeholder={ar ? 'مثال: بنك مسقط' : 'e.g. Bank Muscat'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeBankName)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'الفرع *' : 'Branch *'}</label>
                            <input
                              type="text"
                              value={chequeBankBranch}
                              onChange={(e) => handleChequeOwnerChange('bankBranch', e.target.value)}
                              placeholder={ar ? 'مثال: الخوير' : 'e.g. Al Khoudh'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeBankBranch)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'رقم الحساب *' : 'Account number *'}</label>
                            <input
                              type="text"
                              value={chequeAccountNumber}
                              onChange={(e) => handleChequeAccountChange('accountNumber', e.target.value)}
                              placeholder={ar ? 'رقم الحساب' : 'Account number'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeAccountNumber)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'اسم الحساب / اسم صاحب الحساب *' : 'Account name / Holder name *'}</label>
                            <input
                              type="text"
                              value={chequeAccountName}
                              onChange={(e) => handleChequeAccountChange('accountName', e.target.value)}
                              placeholder={ar ? 'اسم صاحب الحساب' : 'Account holder name'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeAccountName)}`}
                            />
                          </div>
                        </div>
                      </div>
                      {securityItems.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                          <h4 className="text-sm font-bold !text-white mb-1">{ar ? 'شيكات الضمان' : 'Security Cheques'}</h4>
                          <p className="text-white text-xs mb-2">
                            {ar ? '💡 أدخل رقم أول شيك فتُملأ الأرقام تلقائياً. أدخل المبلغ يُنسخ لكل الشيكات. التاريخ غير إلزامي.' : '💡 Enter first cheque number for auto-sequential numbers. Enter amount to copy to all. Date is optional.'}
                          </p>
                          <p className="text-white text-xs mb-3">
                            {ar ? '⚠ يجب تسليم أصل الشيكات إلى إدارة العقار لاعتماد العقد.' : '⚠ Original cheques must be delivered to property management for contract approval.'}
                          </p>
                          <div className="space-y-4">
                            {securityItems.map(({ rc, idx }, order) => renderChequeRow(rc, idx, securityItems.length, order + 1, true))}
                          </div>
                        </div>
                      )}
                      {rentItems.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                          <h4 className="text-sm font-bold !text-white mb-1">{ar ? 'شيكات الإيجار' : 'Rent Cheques'}</h4>
                          <p className="text-white text-xs mb-3">
                            {ar ? '💡 أدخل رقم أول شيك فتُملأ الأرقام تلقائياً بالتسلسل. أدخل المبلغ يُنسخ لكل الشيكات. أدخل تاريخ الشيك الأول فتُضاف الأشهر تلقائياً.' : '💡 Enter first cheque number for auto-sequential numbers. Enter amount to copy to all. Enter first date for auto monthly dates.'}
                          </p>
                          <div className="space-y-4">
                            {rentItems.map(({ rc, idx }, order) => renderChequeRow(rc, idx, rentItems.length, order + 1, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* تنبيه: جميع الحقول والمستندات إلزامية */}
                {!isAllDataComplete && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40">
                    <p className="text-white font-semibold text-sm">
                      {ar ? '⚠ جميع الحقول إلزامية ويجب تعبئتها ورفع نسخ من المستندات بما فيها صور الشيكات قبل إتمام التوثيق.' : '⚠ All fields are required. You must fill them and upload copies of documents including cheque images before completing documentation.'}
                    </p>
                  </div>
                )}
                {/* المستندات المطلوبة - رفع الملفات */}
                <div className="mb-8">
                  <h3 className="text-base font-bold !text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                    {ar ? 'المستندات المطلوبة - يرجى إرفاقها' : 'Required Documents - Please upload'}
                  </h3>
                  <div className="space-y-3">
                    {displayDocs.length > 0 ? (
                      displayDocs.map((d) => {
                        const sl = (hasRejectedFiles(d) || d.status === 'REJECTED')
                          ? { ar: 'مطلوب التعديل - بانتظار تعديل المستأجر', en: 'Modification required - awaiting tenant update' }
                          : (STATUS_LABELS[d.status] || STATUS_LABELS.PENDING);
                        const canUpload = d.status !== 'APPROVED';
                        const files = getDocumentFiles(d);
                        const hasRejected = hasRejectedFiles(d);
                        const docIsProblem = hasRejected || d.status === 'REJECTED' || (d.isRequired && files.length === 0) || d.status === 'UPLOADED';
                        const docIsOk = d.status === 'APPROVED' && !hasRejected && files.length > 0;
                        return (
                          <div key={d.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 ${docIsOk ? 'bg-emerald-500/10 border-emerald-500/50' : docIsProblem ? 'bg-red-500/10 border-red-500/50' : 'bg-white/[0.02] border-white/10'}`}>
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                              <div>
                                <div className="font-semibold text-white">{ar ? d.labelAr : d.labelEn}</div>
                                {(d.descriptionAr || d.descriptionEn) && (
                                  <p className="text-white text-xs mt-1">
                                    {ar ? (d.descriptionAr || d.descriptionEn) : (d.descriptionEn || d.descriptionAr)}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                    hasRejectedFiles(d) ? 'bg-amber-500/30 text-white' :
                                    d.status === 'APPROVED' ? 'bg-emerald-500/20 text-white' :
                                    d.status === 'REJECTED' ? 'bg-red-500/20 text-white' :
                                    d.status === 'UPLOADED' ? 'bg-blue-500/20 text-white' :
                                    'bg-amber-500/20 text-white'
                                  }`}>
                                    {ar ? sl.ar : sl.en}
                                  </span>
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${d.isRequired ? 'bg-amber-500/20 text-white' : 'bg-white/10 text-white'}`}>
                                    {d.isRequired ? (ar ? 'مطلوب' : 'Required') : (ar ? 'اختياري' : 'Optional')}
                                  </span>
                                </div>
                                {files.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {files.map((f, i) => {
                                        const replaceKey = `replace-${d.id}-${encodeURIComponent(f.url)}`;
                                        const isRejected = !!f.rejectedAt;
                                        const isReplaced = !!f.replacedAt && (f.rejectionReasonAr || f.rejectionReasonEn);
                                        return (
                                          <div key={f.url} className={`p-2 rounded-lg ${isRejected ? 'bg-red-500/20 border border-red-500/40' : isReplaced ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
                                            <input
                                              ref={(el) => { replaceInputRefs.current[replaceKey] = el; }}
                                              type="file"
                                              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                              className="hidden"
                                              onChange={(e) => handleReplaceFileSelect(d.id, f.url, e)}
                                            />
                                            <div className="flex items-center justify-between gap-2">
                                              {(() => {
                                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || f.url);
                                                return isImage ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => setZoomedImageUrl(f.url)}
                                                    className="text-sm text-white hover:underline truncate text-right cursor-zoom-in flex items-center gap-2"
                                                    title={ar ? 'انقر لتكبير الصورة' : 'Click to zoom image'}
                                                  >
                                                    <img src={f.url} alt="" className="w-12 h-12 object-cover rounded border border-white/20 shrink-0" />
                                                    <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                                  </button>
                                                ) : (
                                                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:underline truncate flex items-center gap-2">
                                                    <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                                  </a>
                                                );
                                              })()}
                                              {isRejected && (
                                                <button
                                                  type="button"
                                                  onClick={() => triggerReplaceInput(d.id, f.url)}
                                                  disabled={!!uploadingId}
                                                  className="text-xs px-3 py-1 rounded-lg bg-[#8B6F47] text-white hover:bg-[#6B5535] font-semibold shrink-0 disabled:opacity-50"
                                                >
                                                  {ar ? 'استبدل الصورة' : 'Replace image'}
                                                </button>
                                              )}
                                            </div>
                                            {isRejected && (
                                              <div className="mt-1 text-xs text-white">
                                                <span>{ar ? 'مرفوضة - يرجى استبدالها بصفة أوضح' : 'Rejected - please replace with a clearer image'}</span>
                                                {(f.rejectionReasonAr || f.rejectionReasonEn) && (
                                                  <p className="text-white mt-0.5 font-medium">{ar ? 'سبب طلب الاستبدال:' : 'Replacement requested because:'} {(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                                )}
                                              </div>
                                            )}
                                            {isReplaced && (f.rejectionReasonAr || f.rejectionReasonEn) && (
                                              <div className="mt-1 text-xs text-white">
                                                <span>{ar ? '✓ تم الاستبدال. سبب الطلب السابق:' : '✓ Replaced. Previous request reason:'}</span>
                                                <p className="text-white mt-0.5">{(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    {hasRejected && (
                                      <p className="text-xs text-white">
                                        {ar ? '⚠ الصور المرفوضة أعلاه يجب استبدالها.' : '⚠ Rejected images above must be replaced.'}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="mt-2 space-y-1.5 text-xs">
                                  {d.uploadedAt && (
                                    <p className="text-white">
                                      {ar ? '📤 رُفع في' : '📤 Uploaded on'} <span className="text-white font-medium">{formatDocumentTimestamp(d.uploadedAt, ar)}</span>
                                      {d.uploadedBy && (ar ? ' من قبل ' : ' by ')}<span className="text-white font-semibold">{d.uploadedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'APPROVED' && d.approvedAt && (
                                    <p className="text-white">
                                      {ar ? '✓ اُعتمد في' : '✓ Approved on'} <span className="font-medium">{formatDocumentTimestamp(d.approvedAt, ar)}</span>
                                      {d.approvedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.approvedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'REJECTED' && d.rejectedAt && (
                                    <p className="text-white">
                                      {ar ? '✕ رُفض في' : '✕ Rejected on'} <span className="font-medium">{formatDocumentTimestamp(d.rejectedAt, ar)}</span>
                                      {d.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.rejectedBy}</span>
                                    </p>
                                  )}
                                  {(d.rejectionReasonAr || d.rejectionReasonEn || d.rejectionReason) && (
                                    <div className="text-sm text-white mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                      <span className="font-semibold">
                                        {d.status === 'APPROVED' ? (ar ? 'ملاحظة سابقة عند الرفض:' : 'Previous rejection note:') : (ar ? 'ملاحظة الرفض:' : 'Rejection note:')}
                                      </span>
                                      <div className="mt-0.5 space-y-0.5">
                                        {d.rejectionReasonAr && <p>{d.rejectionReasonAr}</p>}
                                        {d.rejectionReasonEn && d.rejectionReasonEn !== d.rejectionReasonAr && <p className="text-white">{d.rejectionReasonEn}</p>}
                                        {!d.rejectionReasonAr && !d.rejectionReasonEn && d.rejectionReason && <p>{d.rejectionReason}</p>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <input
                                ref={(el) => { fileInputRefs.current[d.id] = el; }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                multiple
                                onChange={(e) => handleFileSelect(d.id, e)}
                                className="hidden"
                              />
                              {canUpload && (
                                <button
                                  type="button"
                                  onClick={() => triggerFileInput(d.id)}
                                  disabled={!!uploadingId}
                                  className="px-5 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] disabled:opacity-50 transition-all"
                                >
                                  {uploadingId === d.id ? (ar ? 'جاري الرفع...' : 'Uploading...') : (files.length > 0 ? (ar ? 'إضافة صور' : 'Add more') : (ar ? 'رفع' : 'Upload'))}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      effectiveRequiredDocTypes.map((r) => (
                        <div key={r.docTypeId} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${r.isRequired ? 'bg-red-500/10 border-red-500/50' : 'bg-white/[0.03] border-white/10'}`}>
                          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                          <span className="text-white font-medium">{getDocLabel(r)}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${r.isRequired ? 'bg-amber-500/20 text-white' : 'bg-white/10 text-white'}`}>
                            {r.isRequired ? (ar ? 'مطلوب' : 'Required') : (ar ? 'اختياري' : 'Optional')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-white text-sm text-center mt-4">
                    {ar ? 'PDF أو صور فقط' : 'PDF or images only'}
                  </p>
                </div>
                {(!booking || !isCompanyContact(getContactForBooking(booking)!)) && (
                <>
                {Object.keys(profileFormErrors).length > 0 && (
                  <div id="contract-profile-errors" className="mb-6 p-4 rounded-xl bg-red-500/20 border-2 border-red-500/50">
                    <p className="font-bold text-white mb-2">{profileError || (ar ? 'يرجى تصحيح الأخطاء التالية:' : 'Please correct the following errors:')}</p>
                    <ul className="list-disc list-inside text-white text-sm space-y-1">
                      {Object.entries(profileFormErrors).map(([key, msg]) => (
                        <li key={key}>
                          {ar ? (
                            key === 'firstName' ? 'الاسم الأول: ' : key === 'secondName' ? 'الاسم الثاني: ' : key === 'familyName' ? 'اسم العائلة: ' : key === 'nameEn' ? 'الاسم (EN): ' : key === 'nationality' ? 'الجنسية: ' : key === 'phone' ? 'الهاتف: ' : key === 'phoneSecondary' ? 'رقم هاتف بديل: ' : key === 'email' ? 'البريد: ' : key === 'workplace' ? 'جهة العمل: ' : key === 'workplaceEn' ? 'جهة العمل (EN): ' : key === 'address' ? 'العنوان: ' : key === 'addressEn' ? 'العنوان (EN): ' : key === 'civilId' ? 'الرقم المدني: ' : key === 'civilIdExpiry' ? 'تاريخ انتهاء الرقم المدني: ' : key === 'passportNumber' ? 'رقم الجواز: ' : key === 'passportExpiry' ? 'تاريخ انتهاء الجواز: ' : key
                            ) : (
                            key === 'firstName' ? 'First name: ' : key === 'secondName' ? 'Second name: ' : key === 'familyName' ? 'Family name: ' : key === 'nameEn' ? 'Name (EN): ' : key === 'nationality' ? 'Nationality: ' : key === 'phone' ? 'Phone: ' : key === 'phoneSecondary' ? 'Alternative phone: ' : key === 'email' ? 'Email: ' : key === 'workplace' ? 'Workplace: ' : key === 'workplaceEn' ? 'Workplace (EN): ' : key === 'address' ? 'Address: ' : key === 'addressEn' ? 'Address (EN): ' : key === 'civilId' ? 'Civil ID: ' : key === 'civilIdExpiry' ? 'Civil ID expiry: ' : key === 'passportNumber' ? 'Passport: ' : key === 'passportExpiry' ? 'Passport expiry: ' : key
                            )}
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الاسم الأول *' : 'First name *'}</label>
                      <input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('firstName') || getRequiredBorderClass(profileForm.firstName)}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الاسم الثاني *' : 'Second name *'}</label>
                      <input type="text" value={profileForm.secondName} onChange={(e) => setProfileForm((f) => ({ ...f, secondName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('secondName') || getRequiredBorderClass(profileForm.secondName)}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الاسم الثالث' : 'Third name'}</label>
                      <input type="text" value={profileForm.thirdName} onChange={(e) => setProfileForm((f) => ({ ...f, thirdName: e.target.value }))} onBlur={savePartialProfile} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'اسم العائلة *' : 'Family name *'}</label>
                      <input type="text" value={profileForm.familyName} onChange={(e) => setProfileForm((f) => ({ ...f, familyName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('familyName') || getRequiredBorderClass(profileForm.familyName)}`} />
                    </div>
                  </div>
                  <TranslateField
                    label={ar ? 'الاسم (EN) *' : 'Name (EN) *'}
                    value={profileForm.nameEn}
                    onChange={(v) => setProfileForm((f) => ({ ...f, nameEn: v }))}
                    sourceValue={[profileForm.firstName, profileForm.secondName, profileForm.thirdName, profileForm.familyName].filter(Boolean).join(' ')}
                    onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, nameEn: v }))}
                    translateFrom="ar"
                    locale={locale}
                    variant="dark"
                    inputErrorClass={getFieldErrorClass('nameEn') || getRequiredBorderClass(profileForm.nameEn)}
                    onBlur={savePartialProfile}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                      <input list="nationalities-contract" value={profileForm.nationality} onChange={(e) => setProfileForm((f) => ({ ...f, nationality: e.target.value }))} onBlur={savePartialProfile} placeholder={ar ? 'عماني، سعودي، هندي...' : 'Omani, Saudi, Indian...'} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('nationality') || getRequiredBorderClass(profileForm.nationality)}`} />
                      <datalist id="nationalities-contract">{getAllNationalityValues(locale).map((v) => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الجنس *' : 'Gender *'}</label>
                      <select value={profileForm.gender} onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value as 'MALE' | 'FEMALE' }))} onBlur={savePartialProfile} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none">
                        <option value="MALE" className="bg-gray-900">{ar ? 'ذكر' : 'Male'}</option>
                        <option value="FEMALE" className="bg-gray-900">{ar ? 'أنثى' : 'Female'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الهاتف *' : 'Phone *'}</label>
                      <div className="flex gap-2">
                        <PhoneCountryCodeSelect value={profileForm.phoneCountryCode} onChange={(v) => setProfileForm((f) => ({ ...f, phoneCountryCode: v }))} onBlur={savePartialProfile} locale={locale as 'ar' | 'en'} variant="dark" />
                        <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))} onBlur={savePartialProfile} placeholder={ar ? '91234567' : '91234567'} className={`flex-1 px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('phone') || getRequiredBorderClass(profileForm.phone)}`} />
                      </div>
                      <p className="text-white text-xs mt-1">{ar ? 'عماني: 8 أرقام' : 'Omani: 8 digits'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{ar ? 'رقم هاتف بديل *' : 'Alternative phone *'}</label>
                      <div className="flex gap-2">
                        <PhoneCountryCodeSelect value={profileForm.phoneSecondaryCountryCode} onChange={(v) => setProfileForm((f) => ({ ...f, phoneSecondaryCountryCode: v }))} onBlur={savePartialProfile} locale={locale as 'ar' | 'en'} variant="dark" />
                        <input type="tel" value={profileForm.phoneSecondary} onChange={(e) => setProfileForm((f) => ({ ...f, phoneSecondary: e.target.value.replace(/\D/g, '').slice(0, 15) }))} onBlur={savePartialProfile} placeholder={ar ? '91234567' : '91234567'} className={`flex-1 px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('phoneSecondary') || getRequiredBorderClass(profileForm.phoneSecondary)}`} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} onBlur={savePartialProfile} placeholder="example@email.com" className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('email') || getRequiredBorderClass(profileForm.email)}`} />
                  </div>
                  {isOmaniNationality(profileForm.nationality) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                        <input type="text" value={profileForm.civilId} onChange={(e) => setProfileForm((f) => ({ ...f, civilId: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('civilId') || getRequiredBorderClass(profileForm.civilId)}`} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">{ar ? 'تاريخ انتهاء الرقم المدني *' : 'Civil ID expiry *'}</label>
                        <input type="date" value={profileForm.civilIdExpiry} onChange={(e) => setProfileForm((f) => ({ ...f, civilIdExpiry: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white focus:ring-2 outline-none ${getFieldErrorClass('civilIdExpiry') || getRequiredBorderClass(profileForm.civilIdExpiry)}`} />
                      </div>
                    </div>
                  ) : profileForm.nationality.trim() ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="col-span-2 text-sm text-white">{ar ? 'للوفد: مطلوب رقم الجواز وتاريخ الانتهاء' : 'For expatriates: Passport number and expiry required'}</p>
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">{ar ? 'رقم الجواز *' : 'Passport number *'}</label>
                        <input type="text" value={profileForm.passportNumber} onChange={(e) => setProfileForm((f) => ({ ...f, passportNumber: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white placeholder:text-white focus:ring-2 outline-none ${getFieldErrorClass('passportNumber') || getRequiredBorderClass(profileForm.passportNumber)}`} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">{ar ? 'تاريخ انتهاء الجواز *' : 'Passport expiry *'}</label>
                        <input type="date" value={profileForm.passportExpiry} onChange={(e) => setProfileForm((f) => ({ ...f, passportExpiry: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border-2 bg-white/5 text-white focus:ring-2 outline-none ${getFieldErrorClass('passportExpiry') || getRequiredBorderClass(profileForm.passportExpiry)}`} />
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'جهة العمل *' : 'Workplace *'} value={profileForm.workplace} onChange={(v) => setProfileForm((f) => ({ ...f, workplace: v }))} sourceValue={profileForm.workplaceEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, workplace: v }))} translateFrom="en" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('workplace') || getRequiredBorderClass(profileForm.workplace)} onBlur={savePartialProfile} />
                    <TranslateField label={ar ? 'جهة العمل (EN) *' : 'Workplace (EN) *'} value={profileForm.workplaceEn} onChange={(v) => setProfileForm((f) => ({ ...f, workplaceEn: v }))} sourceValue={profileForm.workplace} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, workplaceEn: v }))} translateFrom="ar" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('workplaceEn') || getRequiredBorderClass(profileForm.workplaceEn)} onBlur={savePartialProfile} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'العنوان (عربي) *' : 'Address (Arabic) *'} value={profileForm.address} onChange={(v) => setProfileForm((f) => ({ ...f, address: v }))} sourceValue={profileForm.addressEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, address: v }))} translateFrom="en" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('address') || getRequiredBorderClass(profileForm.address)} onBlur={savePartialProfile} placeholder={ar ? 'المحافظة - الولاية - المنطقة...' : 'Governorate - State - Area...'} />
                    <TranslateField label={ar ? 'العنوان (EN) *' : 'Address (EN) *'} value={profileForm.addressEn} onChange={(v) => setProfileForm((f) => ({ ...f, addressEn: v }))} sourceValue={profileForm.address} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, addressEn: v }))} translateFrom="ar" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('address') || getRequiredBorderClass(profileForm.addressEn)} onBlur={savePartialProfile} placeholder={ar ? 'Governorate - State - Area...' : 'Governorate - State - Area...'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'ملاحظات' : 'Notes'} value={profileForm.notes} onChange={(v) => setProfileForm((f) => ({ ...f, notes: v }))} sourceValue={profileForm.notesEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, notes: v }))} translateFrom="en" locale={locale} variant="dark" multiline rows={2} onBlur={savePartialProfile} />
                    <TranslateField label={ar ? 'ملاحظات (EN)' : 'Notes (EN)'} value={profileForm.notesEn} onChange={(v) => setProfileForm((f) => ({ ...f, notesEn: v }))} sourceValue={profileForm.notes} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, notesEn: v }))} translateFrom="ar" locale={locale} variant="dark" multiline rows={2} onBlur={savePartialProfile} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">{ar ? 'العلامات' : 'Tags'}</label>
                    <input type="text" value={profileForm.tags} onChange={(e) => setProfileForm((f) => ({ ...f, tags: e.target.value }))} onBlur={savePartialProfile} placeholder={ar ? 'علامات مفصولة بفاصلة' : 'Tags separated by comma'} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none" />
                  </div>
                  {profileError && <p className="text-white text-sm">{profileError}</p>}
                  <button type="button" onClick={handleCompleteProfileSubmit} className="w-full px-6 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
                    {ar ? 'حفظ والمتابعة' : 'Save and continue'}
                  </button>
                </div>
                </>
                )}
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-6">
                {/* رسالة الشكر عند اكتمال كل البيانات */}
                {isAllDataComplete && (
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
                    <p className="text-2xl font-bold text-white mb-3">
                      {ar ? 'شكراً لكم!' : 'Thank you!'}
                    </p>
                    <p className="text-white text-base leading-relaxed mb-2">
                      {ar
                        ? 'نشكركم على إكمال جميع البيانات المطلوبة لتوثيق العقد.'
                        : 'Thank you for completing all required information for contract documentation.'}
                    </p>
                    <p className="text-white text-sm">
                      {ar
                        ? 'سيتم مراجعة المستندات والبيانات المرفوعة والرجوع إليكم في أقرب فرصة.'
                        : 'Your uploaded documents and information will be reviewed, and we will get back to you as soon as possible.'}
                    </p>
                  </div>
                )}
                {/* بيانات طالب الحجز - قابلة للطي */}
                {booking && (() => {
                  const contact = getContactForBooking(booking);
                  const fullName = contact ? getContactDisplayName(contact, locale) : getBookingDisplayName(booking, locale);
                  const nameEn = contact?.nameEn || contact?.companyData?.companyNameEn || '—';
                  const isCompany = contact && isCompanyContact(contact);
                  const genderLabel = contact?.gender === 'FEMALE' ? (ar ? 'أنثى' : 'Female') : (ar ? 'ذكر' : 'Male');
                  const row = (label: string, value: string | undefined) => (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-white text-sm shrink-0">{label}</span>
                      <span className="text-white font-medium">{value || '—'}</span>
                    </div>
                  );
                  return (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDetailsExpanded((e) => !e)}
                        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors text-right"
                      >
                        <h3 className="text-base font-bold !text-white flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/30 flex items-center justify-center text-white">{isCompany ? '🏢' : '👤'}</span>
                          {ar ? 'بيانات طالب الحجز' : 'Booking Requester Details'}
                        </h3>
                        <span className="text-white text-sm">
                          {detailsExpanded ? (ar ? '▼ طي' : '▼ Collapse') : (ar ? '▶ فتح' : '▶ Expand')}
                        </span>
                      </button>
                      {detailsExpanded && (
                        <div className="px-5 pb-5 pt-0 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {row(ar ? 'الاسم:' : 'Name:', fullName)}
                            {row(ar ? 'الاسم (EN):' : 'Name (EN):', nameEn)}
                            {isCompany && contact?.companyData ? (
                              <>
                                {row(ar ? 'رقم السجل التجاري:' : 'CR Number:', contact.companyData.commercialRegistrationNumber)}
                                {row(ar ? 'انتهاء السجل:' : 'CR Expiry:', contact.companyData.commercialRegistrationExpiry)}
                                {row(ar ? 'تاريخ التأسيس:' : 'Est. Date:', contact.companyData.establishmentDate)}
                                {(contact.companyData.authorizedRepresentatives || []).map((r, i) => (
                                  <div key={r.id || i} className="sm:col-span-2 lg:col-span-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="font-semibold text-white mb-2">{ar ? `المفوض ${i + 1}` : `Rep ${i + 1}`}: {getRepDisplayName(r)}</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {row(ar ? 'المنصب:' : 'Position:', r.position)}
                                      {row(ar ? 'الهاتف:' : 'Phone:', r.phone)}
                                      {row(ar ? 'الرقم المدني:' : 'Civil ID:', r.civilId)}
                                      {row(ar ? 'انتهاء الرقم المدني:' : 'Civil ID expiry:', r.civilIdExpiry)}
                                      {r.passportNumber && row(ar ? 'رقم الجواز:' : 'Passport:', r.passportNumber)}
                                      {r.passportExpiry && row(ar ? 'انتهاء الجواز:' : 'Passport expiry:', r.passportExpiry)}
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                {row(ar ? 'الجنسية:' : 'Nationality:', contact?.nationality)}
                                {row(ar ? 'الجنس:' : 'Gender:', genderLabel)}
                                {row(ar ? 'الرقم المدني:' : 'Civil ID:', (booking as { civilId?: string }).civilId || contact?.civilId)}
                                {row(ar ? 'انتهاء الرقم المدني:' : 'Civil ID expiry:', contact?.civilIdExpiry)}
                                {row(ar ? 'رقم الجواز:' : 'Passport:', (booking as { passportNumber?: string }).passportNumber || contact?.passportNumber)}
                                {row(ar ? 'انتهاء الجواز:' : 'Passport expiry:', contact?.passportExpiry)}
                                {row(ar ? 'جهة العمل:' : 'Workplace:', contact?.workplace)}
                                {row(ar ? 'جهة العمل (EN):' : 'Workplace (EN):', contact?.workplaceEn)}
                                {row(ar ? 'العنوان:' : 'Address:', contact ? getContactLocalizedField(contact, 'address', locale) : undefined)}
                              </>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-white text-sm shrink-0">{ar ? 'الهاتف:' : 'Phone:'}</span>
                              {(contact?.phone || booking.phone) ? (
                                <a href={`tel:${contact?.phone || booking.phone}`} className="text-white hover:underline font-medium">{contact?.phone || booking.phone}</a>
                              ) : (
                                <span className="text-white font-medium">—</span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-white text-sm shrink-0">{ar ? 'رقم هاتف بديل:' : 'Alt. phone:'}</span>
                              {contact?.phoneSecondary ? (
                                <a href={`tel:${contact.phoneSecondary}`} className="text-white hover:underline font-medium">{contact.phoneSecondary}</a>
                              ) : (
                                <span className="text-white font-medium">—</span>
                              )}
                            </div>
                            {row(ar ? 'البريد:' : 'Email:', contact?.email || booking.email)}
                            {row(ar ? 'العنوان:' : 'Address:', contact ? getContactLocalizedField(contact, 'address', locale) : undefined)}
                            {row(ar ? 'ملاحظات:' : 'Notes:', contact?.notes)}
                            {row(ar ? 'ملاحظات (EN):' : 'Notes (EN):', contact?.notesEn)}
                            {row(ar ? 'العلامات:' : 'Tags:', contact?.tags?.join(', '))}
                            {booking.message && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <span className="text-white text-sm">{ar ? 'ملاحظة الحجز:' : 'Booking note:'}</span>
                                <span className="text-white mr-2">{booking.message}</span>
                              </div>
                            )}
                          </div>
                          {contact && isCompanyContact(contact) ? (
                            <Link
                              href={`/${locale}/admin/address-book`}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all"
                            >
                              <span>✏️</span>
                              {ar ? 'تعديل بيانات الشركة في دفتر العناوين' : 'Edit company data in Address Book'}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={handleEditProfile}
                              className="px-5 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all flex items-center gap-2"
                            >
                              <span>✏️</span>
                              {ar ? 'تعديل البيانات' : 'Edit data'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* شروط توثيق العقد */}
                {(contractTypeTerms.contractDocTermsAr || contractTypeTerms.contractDocTermsEn) && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                      {ar ? (contractTypeTerms.contractDocTermsAr || contractTypeTerms.contractDocTermsEn) : (contractTypeTerms.contractDocTermsEn || contractTypeTerms.contractDocTermsAr)}
                    </p>
                  </div>
                )}

                {/* بيانات الشيكات - نسخة بديلة في عرض التفاصيل */}
                {effectiveRequiredChecks.length > 0 && (() => {
                  const checkData = bookingId ? getChecksByBooking(bookingId) : [];
                  const securityItems = effectiveRequiredChecks.map((rc, idx) => ({ rc, idx })).filter(({ rc }) => rc.checkTypeId !== 'RENT_CHEQUE');
                  const rentItems = effectiveRequiredChecks.map((rc, idx) => ({ rc, idx })).filter(({ rc }) => rc.checkTypeId === 'RENT_CHEQUE');
                  const renderChequeRow = (rc: { checkTypeId: string; labelAr?: string; labelEn?: string }, idx: number, sameTypeCount: number, sameTypeOrder: number, dateOptional?: boolean) => {
                    const fd = checkFormData[idx] ?? { checkNumber: '', amount: '', date: '' };
                    const dupErr = chequeNumberErrors[idx];
                    const cd = checkData[idx];
                    const chequeImg = chequeImageUrls[idx] ?? cd?.imageUrl;
                    const isApproved = !!cd?.approvedAt && !cd?.rejectedAt;
                    const isRejected = !!cd?.rejectedAt;
                    const approvalNote = ar ? (cd?.approvalNoteAr || cd?.approvalNoteEn) : (cd?.approvalNoteEn || cd?.approvalNoteAr);
                    const rejectionNote = ar ? (cd?.rejectionReasonAr || cd?.rejectionReasonEn) : (cd?.rejectionReasonEn || cd?.rejectionReasonAr);
                    return (
                      <div key={`${rc.checkTypeId}-${idx}`} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                          {getCheckLabel(rc)}
                          {sameTypeCount > 1 ? ` #${sameTypeOrder}` : ''}
                          {isApproved && <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/30 text-white">✓ {ar ? 'معتمد' : 'Approved'}</span>}
                          {isRejected && <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-400 text-gray-900 border-2 border-amber-300 font-semibold">🔄 {ar ? 'طلب تحديث' : 'Update requested'}</span>}
                        </div>
                        {(approvalNote || rejectionNote) && (
                          <p className="text-xs text-white">
                            {isRejected ? (ar ? 'المطلوب تعديله: ' : 'Required change: ') : (ar ? 'ملاحظة الاعتماد: ' : 'Approval note: ')}
                            {approvalNote || rejectionNote}
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'رقم الشيك' : 'Cheque number'}</label>
                            <input
                              type="text"
                              value={fd.checkNumber}
                              onChange={(e) => handleCheckFieldChange(idx, 'checkNumber', e.target.value)}
                              placeholder={ar ? 'أدخل رقم الشيك' : 'Enter cheque number'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${dupErr ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : getRequiredBorderClass(fd.checkNumber)}`}
                            />
                            {dupErr && <p className="text-white text-xs mt-1">{dupErr}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={fd.amount}
                              onChange={(e) => handleCheckFieldChange(idx, 'amount', e.target.value)}
                              placeholder={ar ? '0.00' : '0.00'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(fd.amount)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">
                              {ar ? 'التاريخ' : 'Date'}
                              {dateOptional && <span className="text-white mr-1">({ar ? 'اختياري' : 'optional'})</span>}
                            </label>
                            <input
                              type="date"
                              value={fd.date}
                              onChange={(e) => handleCheckFieldChange(idx, 'date', e.target.value)}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white outline-none focus:ring-2 ${dateOptional ? 'border-white/10 focus:border-[#8B6F47] focus:ring-[#8B6F47]/30' : getRequiredBorderClass(fd.date)}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white mb-1">{ar ? 'صورة الشيك' : 'Cheque image'}</label>
                          <input
                            ref={(el) => { chequeImageInputRefs.current[idx] = el; }}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => handleChequeImageUpload(idx, e)}
                          />
                          <div className="flex items-center gap-3 flex-wrap">
                            {chequeImg && (
                              <a
                                href={chequeImg}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                                onClick={(ev) => { ev.preventDefault(); setZoomedImageUrl(chequeImg); }}
                              >
                                <img src={chequeImg} alt="" className="w-16 h-16 object-cover rounded border border-white/20" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => chequeImageInputRefs.current[idx]?.click()}
                              disabled={!!chequeImageUploading}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${!chequeImg ? 'bg-red-500/40 border-2 border-red-400 text-white hover:bg-red-500/50' : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'}`}
                              title={!chequeImg ? (ar ? 'مستند مطلوب — يجب رفع صورة الشيك لتمكين اعتماده' : 'Required — upload cheque image to enable approval') : undefined}
                            >
                              {chequeImageUploading === idx ? (ar ? 'جاري الرفع...' : 'Uploading...') : (chequeImg ? (ar ? 'استبدال الصورة' : 'Replace image') : (ar ? 'رفع صورة الشيك' : 'Upload cheque image'))}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  const payeeNameAlt = chequeOwnerType === 'company'
                    ? (chequeCompanyName || contract?.rentChecksCompanyName || chequeAccountName)
                    : chequeOwnerType === 'other_individual'
                      ? (chequeOwnerName || contract?.rentChecksOwnerName || chequeAccountName)
                      : (ar ? 'المستأجر' : 'Tenant');
                  const hasPayeeInfoAlt = !!(chequeAccountNumber || chequeAccountName || chequeBankName);
                  return (
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
                      <h3 className="text-base font-bold !text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">💳</span>
                        {ar ? 'بيانات الشيكات المطلوبة' : 'Required Cheque Details'}
                      </h3>
                      {hasPayeeInfoAlt && (
                        <div className="p-4 rounded-2xl border-2 border-[#8B6F47]/40 bg-[#8B6F47]/10">
                          <h4 className="text-sm font-bold text-white mb-3">{ar ? '📋 بيانات المستفيد من الشيكات (ستُكتب الشيكات باسم)' : '📋 Cheque payee details (cheques will be written to)'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><span className="text-white/80 text-xs">{ar ? 'الاسم:' : 'Name:'}</span><p className="text-white font-semibold">{payeeNameAlt || '—'}</p></div>
                            {chequeAccountNumber && <div><span className="text-white/80 text-xs">{ar ? 'رقم الحساب:' : 'Account no.:'}</span><p className="text-white font-semibold font-mono">{chequeAccountNumber}</p></div>}
                            {chequeBankName && <div><span className="text-white/80 text-xs">{ar ? 'اسم البنك:' : 'Bank name:'}</span><p className="text-white font-semibold">{chequeBankName}</p></div>}
                            {chequeBankBranch && <div><span className="text-white/80 text-xs">{ar ? 'الفرع:' : 'Branch:'}</span><p className="text-white font-semibold">{chequeBankBranch}</p></div>}
                          </div>
                        </div>
                      )}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-white text-xs mb-3">{ar ? 'رقم الحساب واسم الحساب يُدخَلان مرة واحدة لجميع الشيكات:' : 'Account number and name (enter once for all cheques):'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'رقم الحساب' : 'Account number'}</label>
                            <input
                              type="text"
                              value={chequeAccountNumber}
                              onChange={(e) => handleChequeAccountChange('accountNumber', e.target.value)}
                              placeholder={ar ? 'رقم الحساب البنكي' : 'Bank account number'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeAccountNumber)}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white mb-1">{ar ? 'اسم الحساب' : 'Account name'}</label>
                            <input
                              type="text"
                              value={chequeAccountName}
                              onChange={(e) => handleChequeAccountChange('accountName', e.target.value)}
                              placeholder={ar ? 'اسم صاحب الحساب' : 'Account holder name'}
                              className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border-2 text-white placeholder:text-white outline-none focus:ring-2 ${getRequiredBorderClass(chequeAccountName)}`}
                            />
                          </div>
                        </div>
                      </div>
                      {securityItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold !text-white mb-1">{ar ? 'شيكات الضمان' : 'Security Cheques'}</h4>
                          <p className="text-white text-xs mb-2">
                            {ar ? '💡 أدخل رقم أول شيك فتُملأ الأرقام تلقائياً. أدخل المبلغ يُنسخ لكل الشيكات. التاريخ غير إلزامي.' : '💡 Enter first cheque number for auto-sequential numbers. Enter amount to copy to all. Date is optional.'}
                          </p>
                          <p className="text-white text-xs mb-3">
                            {ar ? '⚠ يجب تسليم أصل الشيكات إلى إدارة العقار لاعتماد العقد.' : '⚠ Original cheques must be delivered to property management for contract approval.'}
                          </p>
                          <div className="space-y-4">
                            {securityItems.map(({ rc, idx }, order) => renderChequeRow(rc, idx, securityItems.length, order + 1, true))}
                          </div>
                        </div>
                      )}
                      {rentItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold !text-white mb-1">{ar ? 'شيكات الإيجار' : 'Rent Cheques'}</h4>
                          <p className="text-white text-xs mb-3">
                            {ar ? '💡 أدخل رقم أول شيك فتُملأ الأرقام تلقائياً بالتسلسل. أدخل المبلغ يُنسخ لكل الشيكات. أدخل تاريخ الشيك الأول فتُضاف الأشهر تلقائياً.' : '💡 Enter first cheque number for auto-sequential numbers. Enter amount to copy to all. Enter first date for auto monthly dates.'}
                          </p>
                          <div className="space-y-4">
                            {rentItems.map(({ rc, idx }, order) => renderChequeRow(rc, idx, rentItems.length, order + 1, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* تنبيه: جميع الحقول والمستندات إلزامية */}
                {!isAllDataComplete && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40">
                    <p className="text-white font-semibold text-sm">
                      {ar ? '⚠ جميع الحقول إلزامية ويجب تعبئتها ورفع نسخ من المستندات بما فيها صور الشيكات قبل إتمام التوثيق.' : '⚠ All fields are required. You must fill them and upload copies of documents including cheque images before completing documentation.'}
                    </p>
                  </div>
                )}
                {/* المستندات المطلوبة مع رفع */}
                <div>
                  <h3 className="text-base font-bold !text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                    {ar ? 'المستندات المطلوبة - يرجى إرفاقها' : 'Required Documents - Please upload'}
                  </h3>
                  <div className="space-y-3">
                    {displayDocs.length > 0 ? (
                      displayDocs.map((d) => {
                        const sl = (hasRejectedFiles(d) || d.status === 'REJECTED')
                          ? { ar: 'مطلوب التعديل - بانتظار تعديل المستأجر', en: 'Modification required - awaiting tenant update' }
                          : (STATUS_LABELS[d.status] || STATUS_LABELS.PENDING);
                        const canUpload = d.status !== 'APPROVED';
                        const files = getDocumentFiles(d);
                        const hasRejected = hasRejectedFiles(d);
                        const docIsProblem = hasRejected || d.status === 'REJECTED' || (d.isRequired && files.length === 0) || d.status === 'UPLOADED';
                        const docIsOk = d.status === 'APPROVED' && !hasRejected && files.length > 0;
                        return (
                          <div key={d.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 ${docIsOk ? 'bg-emerald-500/10 border-emerald-500/50' : docIsProblem ? 'bg-red-500/10 border-red-500/50' : 'bg-white/[0.02] border-white/10'}`}>
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                              <div>
                                <div className="font-semibold text-white">{ar ? d.labelAr : d.labelEn}</div>
                                {(d.descriptionAr || d.descriptionEn) && (
                                  <p className="text-white text-xs mt-1">
                                    {ar ? (d.descriptionAr || d.descriptionEn) : (d.descriptionEn || d.descriptionAr)}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                    hasRejectedFiles(d) ? 'bg-amber-500/30 text-white' :
                                    d.status === 'APPROVED' ? 'bg-emerald-500/20 text-white' :
                                    d.status === 'REJECTED' ? 'bg-red-500/20 text-white' :
                                    d.status === 'UPLOADED' ? 'bg-blue-500/20 text-white' :
                                    'bg-amber-500/20 text-white'
                                  }`}>
                                    {ar ? sl.ar : sl.en}
                                  </span>
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${d.isRequired ? 'bg-amber-500/20 text-white' : 'bg-white/10 text-white'}`}>
                                    {d.isRequired ? (ar ? 'مطلوب' : 'Required') : (ar ? 'اختياري' : 'Optional')}
                                  </span>
                                </div>
                                {files.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {files.map((f, i) => {
                                        const replaceKey = `replace-${d.id}-${encodeURIComponent(f.url)}`;
                                        const isRejected = !!f.rejectedAt;
                                        const isReplaced = !!f.replacedAt && (f.rejectionReasonAr || f.rejectionReasonEn);
                                        return (
                                          <div key={f.url} className={`p-2 rounded-lg ${isRejected ? 'bg-red-500/20 border border-red-500/40' : isReplaced ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
                                            <input
                                              ref={(el) => { replaceInputRefs.current[replaceKey] = el; }}
                                              type="file"
                                              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                              className="hidden"
                                              onChange={(e) => handleReplaceFileSelect(d.id, f.url, e)}
                                            />
                                            <div className="flex items-center justify-between gap-2">
                                              {(() => {
                                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || f.url);
                                                return isImage ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => setZoomedImageUrl(f.url)}
                                                    className="text-sm text-white hover:underline truncate text-right cursor-zoom-in flex items-center gap-2"
                                                    title={ar ? 'انقر لتكبير الصورة' : 'Click to zoom image'}
                                                  >
                                                    <img src={f.url} alt="" className="w-12 h-12 object-cover rounded border border-white/20 shrink-0" />
                                                    <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                                  </button>
                                                ) : (
                                                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:underline truncate flex items-center gap-2">
                                                    <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                                  </a>
                                                );
                                              })()}
                                              {isRejected && (
                                                <button
                                                  type="button"
                                                  onClick={() => triggerReplaceInput(d.id, f.url)}
                                                  disabled={!!uploadingId}
                                                  className="text-xs px-3 py-1 rounded-lg bg-[#8B6F47] text-white hover:bg-[#6B5535] font-semibold shrink-0 disabled:opacity-50"
                                                >
                                                  {ar ? 'استبدل الصورة' : 'Replace image'}
                                                </button>
                                              )}
                                            </div>
                                            {isRejected && (
                                              <div className="mt-1 text-xs text-white">
                                                <span>{ar ? 'مرفوضة - يرجى استبدالها بصفة أوضح' : 'Rejected - please replace with a clearer image'}</span>
                                                {(f.rejectionReasonAr || f.rejectionReasonEn) && (
                                                  <p className="text-white mt-0.5 font-medium">{ar ? 'سبب طلب الاستبدال:' : 'Replacement requested because:'} {(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                                )}
                                              </div>
                                            )}
                                            {isReplaced && (f.rejectionReasonAr || f.rejectionReasonEn) && (
                                              <div className="mt-1 text-xs text-white">
                                                <span>{ar ? '✓ تم الاستبدال. سبب الطلب السابق:' : '✓ Replaced. Previous request reason:'}</span>
                                                <p className="text-white mt-0.5">{(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    {hasRejected && (
                                      <p className="text-xs text-white">
                                        {ar ? '⚠ الصور المرفوضة أعلاه يجب استبدالها.' : '⚠ Rejected images above must be replaced.'}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="mt-2 space-y-1.5 text-xs">
                                  {d.uploadedAt && (
                                    <p className="text-white">
                                      {ar ? '📤 رُفع في' : '📤 Uploaded on'} <span className="text-white font-medium">{formatDocumentTimestamp(d.uploadedAt, ar)}</span>
                                      {d.uploadedBy && (ar ? ' من قبل ' : ' by ')}<span className="text-white font-semibold">{d.uploadedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'APPROVED' && d.approvedAt && (
                                    <p className="text-white">
                                      {ar ? '✓ اُعتمد في' : '✓ Approved on'} <span className="font-medium">{formatDocumentTimestamp(d.approvedAt, ar)}</span>
                                      {d.approvedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.approvedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'REJECTED' && d.rejectedAt && (
                                    <p className="text-white">
                                      {ar ? '✕ رُفض في' : '✕ Rejected on'} <span className="font-medium">{formatDocumentTimestamp(d.rejectedAt, ar)}</span>
                                      {d.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.rejectedBy}</span>
                                    </p>
                                  )}
                                  {(d.rejectionReasonAr || d.rejectionReasonEn || d.rejectionReason) && (
                                    <div className="text-sm text-white mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                      <span className="font-semibold">
                                        {d.status === 'APPROVED' ? (ar ? 'ملاحظة سابقة عند الرفض:' : 'Previous rejection note:') : (ar ? 'ملاحظة الرفض:' : 'Rejection note:')}
                                      </span>
                                      <div className="mt-0.5 space-y-0.5">
                                        {d.rejectionReasonAr && <p>{d.rejectionReasonAr}</p>}
                                        {d.rejectionReasonEn && d.rejectionReasonEn !== d.rejectionReasonAr && <p className="text-white">{d.rejectionReasonEn}</p>}
                                        {!d.rejectionReasonAr && !d.rejectionReasonEn && d.rejectionReason && <p>{d.rejectionReason}</p>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <input
                                ref={(el) => { fileInputRefs.current[d.id] = el; }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                multiple
                                onChange={(e) => handleFileSelect(d.id, e)}
                                className="hidden"
                              />
                              {canUpload && (
                                <button
                                  type="button"
                                  onClick={() => triggerFileInput(d.id)}
                                  disabled={!!uploadingId}
                                  className="px-5 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] disabled:opacity-50 transition-all"
                                >
                                  {uploadingId === d.id ? (ar ? 'جاري الرفع...' : 'Uploading...') : (files.length > 0 ? (ar ? 'إضافة صور' : 'Add more') : (ar ? 'رفع' : 'Upload'))}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      effectiveRequiredDocTypes.map((r) => (
                        <div key={r.docTypeId} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${r.isRequired ? 'bg-red-500/10 border-red-500/50' : 'bg-white/[0.03] border-white/10'}`}>
                          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-white text-sm">📎</span>
                          <span className="text-white font-medium">{getDocLabel(r)}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${r.isRequired ? 'bg-amber-500/20 text-white' : 'bg-white/10 text-white'}`}>
                            {r.isRequired ? (ar ? 'مطلوب' : 'Required') : (ar ? 'اختياري' : 'Optional')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-white text-sm text-center mt-4">
                    {ar ? 'PDF أو صور فقط' : 'PDF or images only'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {showRejectionModal && bookingId && (() => {
        const allDocs = getDocumentsByBooking(bookingId);
        const rejDocs = allDocs.filter((d) => d.status === 'REJECTED' || hasRejectedFiles(d));
        const rejCheques = effectiveRequiredChecks
          .map((_, i) => ({ i, c: getChecksByBooking(bookingId)[i] }))
          .filter(({ c }) => c?.rejectedAt);
        const hasContent = rejDocs.length > 0 || rejCheques.length > 0;
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70" onClick={() => setShowRejectionModal(false)}>
            <div className="bg-[#1a1612] border border-white/20 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 [&_p]:!text-white [&_div]:!text-white [&_span]:!text-white">
              <h3 className="text-lg font-bold !text-white mb-4 flex items-center gap-2">
                <span className="!text-white">⚠</span>
                {ar ? 'أسباب الرفض والمطلوب' : 'Rejection reasons and requirements'}
              </h3>
              {hasContent ? (
                <div className="space-y-4 text-base">
                  {rejDocs.map((d) => {
                    const reason = ar ? (d.rejectionReasonAr || d.rejectionReasonEn) : (d.rejectionReasonEn || d.rejectionReasonAr);
                    const files = getDocumentFiles(d).filter((f) => f.rejectedAt);
                    return (
                      <div key={d.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="font-semibold !text-white mb-1">{ar ? d.labelAr : d.labelEn}</div>
                        {reason && <p className="!text-white font-medium">{reason}</p>}
                        {files.map((f, i) => (f.rejectionReasonAr || f.rejectionReasonEn) && (
                          <p key={i} className="!text-white mt-1 text-sm">• {ar ? (f.rejectionReasonAr || f.rejectionReasonEn) : (f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                        ))}
                      </div>
                    );
                  })}
                  {rejCheques.map(({ i, c }) => {
                    const rc = effectiveRequiredChecks[i];
                    const label = rc ? getCheckLabel(rc) : '';
                    const reason = ar ? (c?.rejectionReasonAr || c?.rejectionReasonEn) : (c?.rejectionReasonEn || c?.rejectionReasonAr);
                    return (
                      <div key={i} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="font-semibold !text-white mb-1">💳 {label}</div>
                        {reason && <p className="!text-white font-medium">{reason}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="!text-white font-medium">{ar ? 'يوجد رفض في بعض المستندات أو الشيكات. يُرجى مراجعة التفاصيل أدناه واستكمال المطلوب.' : 'Some documents or cheques have been rejected. Please review the details below and complete what is required.'}</p>
              )}
              <button type="button" onClick={() => setShowRejectionModal(false)} className="mt-6 w-full px-6 py-3 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535]">
                {ar ? 'فهمت' : 'Got it'}
              </button>
            </div>
          </div>
        );
      })()}

      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
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
          <img
            src={zoomedImageUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
