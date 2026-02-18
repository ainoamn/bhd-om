'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms, getContractTypeTerms, CONTRACT_DOC_TYPES, type ContractType } from '@/lib/data/bookingTerms';
import { getBookingsByProperty, getAllBookings, getUnitDisplayFromProperty } from '@/lib/data/bookings';
import {
  getDocumentsByBooking,
  uploadDocument,
  createDocumentRequests,
  removeDocumentRequest,
  replaceFileInDocument,
  getDocumentFiles,
  hasRejectedFiles,
  formatDocumentTimestamp,
  type BookingDocument,
} from '@/lib/data/bookingDocuments';
import { updateBooking, getBookingDisplayName, type PropertyBooking } from '@/lib/data/bookings';
import { findContactByPhoneOrEmail, updateContact, ensureContactFromBooking, isOmaniNationality, isCompanyContact, getContactDisplayName, getContactLocalizedField } from '@/lib/data/addressBook';
import { getAllNationalityValues } from '@/lib/data/nationalities';
import TranslateField from '@/components/admin/TranslateField';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'بانتظار الرفع', en: 'Pending upload' },
  UPLOADED: { ar: 'مرفوع - بانتظار الاعتماد', en: 'Uploaded - Pending approval' },
  APPROVED: { ar: 'معتمد', en: 'Approved' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
};

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

/** بناء قائمة المستندات المطلوبة للشركة: السجل التجاري + بطاقة كل مفوض (عماني: بطاقة فقط، وافد: بطاقة + جواز) */
function buildCompanyDocRequirements(
  contact: { companyData?: { authorizedRepresentatives?: Array<{ name: string; nationality?: string }> } }
): { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] {
  const reps = contact.companyData?.authorizedRepresentatives || [];
  const result: { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] = [
    { docTypeId: 'COMMERCIAL_REGISTRATION', labelAr: 'السجل التجاري', labelEn: 'Commercial Registration', isRequired: true },
  ];
  reps.forEach((r, i) => {
    const omani = isOmaniNationality(r.nationality || '');
    const namePart = r.name ? ` - ${r.name}` : ` ${i + 1}`;
    const idCardSuffix = ' (نسخة من الأمام ونسخة من الخلف)';
    const idCardSuffixEn = ' (front and back copy)';
    if (omani) {
      result.push({ docTypeId: 'AUTHORIZED_REP_CARD', labelAr: `بطاقة المفوض بالتوقيع${namePart}${idCardSuffix}`, labelEn: `Authorized Rep Card${namePart}${idCardSuffixEn}`, isRequired: true });
    } else {
      result.push({ docTypeId: 'ID_CARD', labelAr: `بطاقة المفوض${namePart}${idCardSuffix}`, labelEn: `Rep ID${namePart}${idCardSuffixEn}`, isRequired: true });
      result.push({ docTypeId: 'PASSPORT', labelAr: `جواز المفوض${namePart}`, labelEn: `Rep Passport${namePart}`, isRequired: true });
    }
  });
  return result;
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
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const dataOverrides = getPropertyDataOverrides();
  const property = getPropertyById(id, dataOverrides);
  const contractType: ContractType = (property as { type?: ContractType })?.type ?? 'RENT';
  const contractTypeTerms = getContractTypeTerms(id, contractType);
  const currentContact = booking ? findContactByPhoneOrEmail(booking.phone, booking.email) : null;
  const isOmani = (currentContact && !isCompanyContact(currentContact) && isOmaniNationality(currentContact.nationality || '')) || (profileForm.nationality && isOmaniNationality(profileForm.nationality));
  const displayDocs = isOmani ? docs.filter((d) => d.docTypeId !== 'PASSPORT') : docs;
  const requiredDocTypes = currentContact && isCompanyContact(currentContact)
    ? buildCompanyDocRequirements(currentContact)
    : contractTypeTerms.requiredDocTypes;

  const getDocLabel = (r: { docTypeId: string; labelAr?: string; labelEn?: string }) => {
    if (r.docTypeId.startsWith('CUSTOM_')) {
      return ar ? (r.labelAr || r.labelEn || '') : (r.labelEn || r.labelAr || '');
    }
    const doc = CONTRACT_DOC_TYPES.find((d) => d.id === r.docTypeId);
    return doc ? (ar ? doc.labelAr : doc.labelEn) : r.docTypeId;
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
    const contact = findContactByPhoneOrEmail(b.phone, b.email);
    if (civilIdVal && contact?.companyData?.commercialRegistrationNumber && normalizeCivilId(contact.companyData.commercialRegistrationNumber) === normalizeCivilId(civilIdVal)) return true;
    return false;
  };

  /** التحقق من اكتمال جميع البيانات الإلزامية لتوثيق العقد - شخصي أو شركة */
  const hasRequiredContactData = (b: PropertyBooking) => {
    const contact = findContactByPhoneOrEmail(b.phone, b.email);
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
    const contact = findContactByPhoneOrEmail(match.phone, match.email);
    let reqTypes = contact && isCompanyContact(contact)
      ? buildCompanyDocRequirements(contact)
      : getContractTypeTerms(String(propId), matchContractType).requiredDocTypes;
    if (!contact || !isCompanyContact(contact)) reqTypes = filterDocTypesByNationality(reqTypes, contact ?? null);
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

  /** بناء رقم الهاتف الكامل مع كود الدولة */
  const getFullPhone = (countryCode: string, local: string) => {
    const digits = (countryCode + local).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
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
    const existingContact = findContactByPhoneOrEmail(booking.phone, booking.email) || findContactByPhoneOrEmail(fullPhone, f.email?.trim());
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
    const contact = findContactByPhoneOrEmail(booking.phone, booking.email);
    const parsePhone = (p: string) => {
      const digits = (p || '').replace(/\D/g, '');
      for (const cc of COUNTRY_CODES) {
        if (digits.startsWith(cc.code)) {
          const local = digits.slice(cc.code.length).replace(/^0+/, '');
          return { countryCode: cc.code, local: local || '' };
        }
      }
      return { countryCode: '968', local: digits.slice(-8) || digits || '' };
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
    const existingContact = findContactByPhoneOrEmail(booking.phone, booking.email) || findContactByPhoneOrEmail(phoneVal, emailVal);

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
        (b) => b.id === bookingIdParam && b.type === 'BOOKING' && (b.status === 'PENDING' || b.status === 'CONFIRMED') && b.propertyId === parseInt(id, 10)
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

  useEffect(() => {
    if (bookingId && docs.length === 0 && requiredDocTypes.length > 0) {
      const allBookings = getAllBookings();
      const b = allBookings.find((x) => x.id === bookingId);
      const contact = b ? findContactByPhoneOrEmail(b.phone, b.email) : null;
      let reqTypes = contact && isCompanyContact(contact)
        ? buildCompanyDocRequirements(contact)
        : getContractTypeTerms(id, contractType).requiredDocTypes;
      if (!contact || !isCompanyContact(contact)) reqTypes = filterDocTypesByNationality(reqTypes, contact ?? null);
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
    }
  }, [bookingId, id]);

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
          <p className="text-white/80 mb-6 text-lg">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
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

      <section className="relative -mt-16 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <div
            className={`rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {matchedBookings.length > 0 ? (
              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'اختر العقد للمتابعة' : 'Select contract to continue'}
                </h2>
                <p className="text-white/70 text-sm mb-6">
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
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBooking(b)}
                        className="w-full text-right p-5 rounded-2xl border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] hover:border-[#8B6F47]/50 transition-all group"
                      >
                        <div className="font-bold text-white group-hover:text-[#C9A961]">{displayTitle}</div>
                        <div className="text-sm text-white/60 mt-1">
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
                  className="mt-6 text-white/60 hover:text-white text-sm"
                >
                  {ar ? '← تغيير بيانات التحقق' : '← Change verification data'}
                </button>
              </div>
            ) : !bookingId ? (
              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'تأكيد هويتك' : 'Verify your identity'}
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  {ar ? 'أدخل الرقم المدني أو رقم الجواز أو رقم السجل التجاري أو رقم الهاتف أو البريد الإلكتروني الذي استخدمته عند طلب الحجز.' : 'Enter civil ID, passport, commercial registration number, phone, or email you used when booking.'}
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={civilId}
                    onChange={(e) => setCivilId(e.target.value)}
                    placeholder={ar ? 'الرقم المدني أو رقم الجواز أو رقم السجل التجاري' : 'Civil ID, passport or commercial registration number'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={ar ? 'رقم الهاتف' : 'Phone number'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={ar ? 'البريد الإلكتروني' : 'Email address'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  <p className="text-white/50 text-xs">
                    {ar ? 'أدخل أحد الخيارات على الأقل' : 'Enter at least one'}
                  </p>
                  {verifyError && <p className="text-red-400 text-sm">{verifyError}</p>}
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
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'إكمال البيانات الإلزامية لتوثيق العقد' : 'Complete required information for contract'}
                </h2>
                {booking && (() => {
                  const c = findContactByPhoneOrEmail(booking.phone, booking.email);
                  if (c && isCompanyContact(c)) {
                    return (
                      <p className="text-white/70 text-sm mb-6">
                        {ar ? 'جهة الاتصال شركة. يرجى إكمال بيانات الشركة (تاريخ انتهاء السجل، تاريخ التأسيس، هاتف بديل، بريد، المفوضون بالتوقيع) في دفتر العناوين.' : 'Contact is a company. Please complete company data (CR expiry, establishment date, alt phone, email, authorized representatives) in the address book.'}
                        <Link href={`/${locale}/admin/address-book`} className="block mt-3 text-[#C9A961] hover:underline font-semibold">
                          {ar ? '→ الذهاب لدفتر العناوين' : '→ Go to Address Book'}
                        </Link>
                      </p>
                    );
                  }
                  return null;
                })()}
                {!booking || !isCompanyContact(findContactByPhoneOrEmail(booking.phone, booking.email)!) ? (
                <p className="text-white/70 text-sm mb-6">
                  {ar ? 'يرجى تعبئة جميع الحقول المميزة بـ * قبل المتابعة إلى رفع المستندات وتوثيق عقد الإيجار.' : 'Please fill in all fields marked with * before proceeding to upload documents and finalize the rental contract.'}
                </p>
                ) : null}
                {(!booking || !isCompanyContact(findContactByPhoneOrEmail(booking.phone, booking.email)!)) && (
                <>
                {Object.keys(profileFormErrors).length > 0 && (
                  <div id="contract-profile-errors" className="mb-6 p-4 rounded-xl bg-red-500/20 border-2 border-red-500/50">
                    <p className="font-bold text-red-300 mb-2">{profileError || (ar ? 'يرجى تصحيح الأخطاء التالية:' : 'Please correct the following errors:')}</p>
                    <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
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
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الاسم الأول *' : 'First name *'}</label>
                      <input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('firstName')}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الاسم الثاني *' : 'Second name *'}</label>
                      <input type="text" value={profileForm.secondName} onChange={(e) => setProfileForm((f) => ({ ...f, secondName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('secondName')}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الاسم الثالث' : 'Third name'}</label>
                      <input type="text" value={profileForm.thirdName} onChange={(e) => setProfileForm((f) => ({ ...f, thirdName: e.target.value }))} onBlur={savePartialProfile} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'اسم العائلة *' : 'Family name *'}</label>
                      <input type="text" value={profileForm.familyName} onChange={(e) => setProfileForm((f) => ({ ...f, familyName: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('familyName')}`} />
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
                    inputErrorClass={getFieldErrorClass('nameEn')}
                    onBlur={savePartialProfile}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                      <input list="nationalities-contract" value={profileForm.nationality} onChange={(e) => setProfileForm((f) => ({ ...f, nationality: e.target.value }))} onBlur={savePartialProfile} placeholder={ar ? 'عماني، سعودي، هندي...' : 'Omani, Saudi, Indian...'} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('nationality')}`} />
                      <datalist id="nationalities-contract">{getAllNationalityValues(locale).map((v) => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الجنس *' : 'Gender *'}</label>
                      <select value={profileForm.gender} onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value as 'MALE' | 'FEMALE' }))} onBlur={savePartialProfile} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none">
                        <option value="MALE" className="bg-gray-900">{ar ? 'ذكر' : 'Male'}</option>
                        <option value="FEMALE" className="bg-gray-900">{ar ? 'أنثى' : 'Female'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الهاتف *' : 'Phone *'}</label>
                      <div className="flex gap-2">
                        <PhoneCountryCodeSelect value={profileForm.phoneCountryCode} onChange={(v) => setProfileForm((f) => ({ ...f, phoneCountryCode: v }))} onBlur={savePartialProfile} locale={locale as 'ar' | 'en'} variant="dark" />
                        <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))} onBlur={savePartialProfile} placeholder={ar ? '91234567' : '91234567'} className={`flex-1 px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('phone')}`} />
                      </div>
                      <p className="text-white/50 text-xs mt-1">{ar ? 'عماني: 8 أرقام' : 'Omani: 8 digits'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم هاتف بديل *' : 'Alternative phone *'}</label>
                      <div className="flex gap-2">
                        <PhoneCountryCodeSelect value={profileForm.phoneSecondaryCountryCode} onChange={(v) => setProfileForm((f) => ({ ...f, phoneSecondaryCountryCode: v }))} onBlur={savePartialProfile} locale={locale as 'ar' | 'en'} variant="dark" />
                        <input type="tel" value={profileForm.phoneSecondary} onChange={(e) => setProfileForm((f) => ({ ...f, phoneSecondary: e.target.value.replace(/\D/g, '').slice(0, 15) }))} onBlur={savePartialProfile} placeholder={ar ? '91234567' : '91234567'} className={`flex-1 px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('phoneSecondary')}`} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} onBlur={savePartialProfile} placeholder="example@email.com" className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('email')}`} />
                  </div>
                  {isOmaniNationality(profileForm.nationality) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                        <input type="text" value={profileForm.civilId} onChange={(e) => setProfileForm((f) => ({ ...f, civilId: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('civilId')}`} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'تاريخ انتهاء الرقم المدني *' : 'Civil ID expiry *'}</label>
                        <input type="date" value={profileForm.civilIdExpiry} onChange={(e) => setProfileForm((f) => ({ ...f, civilIdExpiry: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('civilIdExpiry')}`} />
                      </div>
                    </div>
                  ) : profileForm.nationality.trim() ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="col-span-2 text-sm text-amber-200">{ar ? 'للوفد: مطلوب رقم الجواز وتاريخ الانتهاء' : 'For expatriates: Passport number and expiry required'}</p>
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم الجواز *' : 'Passport number *'}</label>
                        <input type="text" value={profileForm.passportNumber} onChange={(e) => setProfileForm((f) => ({ ...f, passportNumber: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('passportNumber')}`} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'تاريخ انتهاء الجواز *' : 'Passport expiry *'}</label>
                        <input type="date" value={profileForm.passportExpiry} onChange={(e) => setProfileForm((f) => ({ ...f, passportExpiry: e.target.value }))} onBlur={savePartialProfile} className={`w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none ${getFieldErrorClass('passportExpiry')}`} />
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'جهة العمل *' : 'Workplace *'} value={profileForm.workplace} onChange={(v) => setProfileForm((f) => ({ ...f, workplace: v }))} sourceValue={profileForm.workplaceEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, workplace: v }))} translateFrom="en" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('workplace')} onBlur={savePartialProfile} />
                    <TranslateField label={ar ? 'جهة العمل (EN) *' : 'Workplace (EN) *'} value={profileForm.workplaceEn} onChange={(v) => setProfileForm((f) => ({ ...f, workplaceEn: v }))} sourceValue={profileForm.workplace} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, workplaceEn: v }))} translateFrom="ar" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('workplaceEn')} onBlur={savePartialProfile} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'العنوان (عربي) *' : 'Address (Arabic) *'} value={profileForm.address} onChange={(v) => setProfileForm((f) => ({ ...f, address: v }))} sourceValue={profileForm.addressEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, address: v }))} translateFrom="en" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('address')} onBlur={savePartialProfile} placeholder={ar ? 'المحافظة - الولاية - المنطقة...' : 'Governorate - State - Area...'} />
                    <TranslateField label={ar ? 'العنوان (EN) *' : 'Address (EN) *'} value={profileForm.addressEn} onChange={(v) => setProfileForm((f) => ({ ...f, addressEn: v }))} sourceValue={profileForm.address} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, addressEn: v }))} translateFrom="ar" locale={locale} variant="dark" inputErrorClass={getFieldErrorClass('address')} onBlur={savePartialProfile} placeholder={ar ? 'Governorate - State - Area...' : 'Governorate - State - Area...'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TranslateField label={ar ? 'ملاحظات' : 'Notes'} value={profileForm.notes} onChange={(v) => setProfileForm((f) => ({ ...f, notes: v }))} sourceValue={profileForm.notesEn} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, notes: v }))} translateFrom="en" locale={locale} variant="dark" multiline rows={2} onBlur={savePartialProfile} />
                    <TranslateField label={ar ? 'ملاحظات (EN)' : 'Notes (EN)'} value={profileForm.notesEn} onChange={(v) => setProfileForm((f) => ({ ...f, notesEn: v }))} sourceValue={profileForm.notes} onTranslateFromSource={(v) => setProfileForm((f) => ({ ...f, notesEn: v }))} translateFrom="ar" locale={locale} variant="dark" multiline rows={2} onBlur={savePartialProfile} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'العلامات' : 'Tags'}</label>
                    <input type="text" value={profileForm.tags} onChange={(e) => setProfileForm((f) => ({ ...f, tags: e.target.value }))} onBlur={savePartialProfile} placeholder={ar ? 'علامات مفصولة بفاصلة' : 'Tags separated by comma'} className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none" />
                  </div>
                  {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
                  <button type="button" onClick={handleCompleteProfileSubmit} className="w-full px-6 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
                    {ar ? 'حفظ والمتابعة' : 'Save and continue'}
                  </button>
                </div>
                </>
                )}
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-6">
                {/* بيانات طالب الحجز - قابلة للطي */}
                {booking && (() => {
                  const contact = findContactByPhoneOrEmail(booking.phone, booking.email);
                  const fullName = contact ? getContactDisplayName(contact, locale) : getBookingDisplayName(booking, locale);
                  const nameEn = contact?.nameEn || contact?.companyData?.companyNameEn || '—';
                  const isCompany = contact && isCompanyContact(contact);
                  const genderLabel = contact?.gender === 'FEMALE' ? (ar ? 'أنثى' : 'Female') : (ar ? 'ذكر' : 'Male');
                  const row = (label: string, value: string | undefined) => (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-white/50 text-sm shrink-0">{label}</span>
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
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/30 flex items-center justify-center text-[#C9A961]">{isCompany ? '🏢' : '👤'}</span>
                          {ar ? 'بيانات طالب الحجز' : 'Booking Requester Details'}
                        </h3>
                        <span className="text-white/60 text-sm">
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
                                    <div className="font-semibold text-[#C9A961] mb-2">{ar ? `المفوض ${i + 1}` : `Rep ${i + 1}`}: {r.name}</div>
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
                              <span className="text-white/50 text-sm shrink-0">{ar ? 'الهاتف:' : 'Phone:'}</span>
                              {(contact?.phone || booking.phone) ? (
                                <a href={`tel:${contact?.phone || booking.phone}`} className="text-[#C9A961] hover:underline font-medium">{contact?.phone || booking.phone}</a>
                              ) : (
                                <span className="text-white font-medium">—</span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-white/50 text-sm shrink-0">{ar ? 'رقم هاتف بديل:' : 'Alt. phone:'}</span>
                              {contact?.phoneSecondary ? (
                                <a href={`tel:${contact.phoneSecondary}`} className="text-[#C9A961] hover:underline font-medium">{contact.phoneSecondary}</a>
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
                                <span className="text-white/50 text-sm">{ar ? 'ملاحظة الحجز:' : 'Booking note:'}</span>
                                <span className="text-white/80 mr-2">{booking.message}</span>
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
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                      {ar ? (contractTypeTerms.contractDocTermsAr || contractTypeTerms.contractDocTermsEn) : (contractTypeTerms.contractDocTermsEn || contractTypeTerms.contractDocTermsAr)}
                    </p>
                  </div>
                )}

                {/* المستندات المطلوبة مع رفع */}
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-[#C9A961] text-sm">📎</span>
                    {ar ? 'المستندات المطلوبة - يرجى إرفاقها' : 'Required Documents - Please upload'}
                  </h3>
                  <div className="space-y-3">
                    {displayDocs.length > 0 ? (
                      displayDocs.map((d) => {
                        const sl = hasRejectedFiles(d)
                          ? { ar: 'صور مرفوضة - يُرجى الاستبدال', en: 'Rejected images - please replace' }
                          : (STATUS_LABELS[d.status] || STATUS_LABELS.PENDING);
                        const canUpload = d.status !== 'APPROVED';
                        const files = getDocumentFiles(d);
                        const hasRejected = hasRejectedFiles(d);
                        return (
                          <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-[#C9A961] text-sm">📎</span>
                              <div>
                                <div className="font-semibold text-white">{ar ? d.labelAr : d.labelEn}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                    hasRejectedFiles(d) ? 'bg-amber-500/30 text-amber-300' :
                                    d.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                    d.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                    d.status === 'UPLOADED' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {ar ? sl.ar : sl.en}
                                  </span>
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${d.isRequired ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/60'}`}>
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
                                                    className="text-sm text-[#C9A961] hover:underline truncate text-right cursor-zoom-in flex items-center gap-2"
                                                    title={ar ? 'انقر لتكبير الصورة' : 'Click to zoom image'}
                                                  >
                                                    <img src={f.url} alt="" className="w-12 h-12 object-cover rounded border border-white/20 shrink-0" />
                                                    <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                                  </button>
                                                ) : (
                                                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#C9A961] hover:underline truncate flex items-center gap-2">
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
                                              <div className="mt-1 text-xs text-red-400">
                                                <span>{ar ? 'مرفوضة - يرجى استبدالها بصفة أوضح' : 'Rejected - please replace with a clearer image'}</span>
                                                {(f.rejectionReasonAr || f.rejectionReasonEn) && (
                                                  <p className="text-red-300 mt-0.5 font-medium">{ar ? 'سبب طلب الاستبدال:' : 'Replacement requested because:'} {(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                                )}
                                              </div>
                                            )}
                                            {isReplaced && (f.rejectionReasonAr || f.rejectionReasonEn) && (
                                              <div className="mt-1 text-xs text-amber-400/90">
                                                <span>{ar ? '✓ تم الاستبدال. سبب الطلب السابق:' : '✓ Replaced. Previous request reason:'}</span>
                                                <p className="text-amber-300/90 mt-0.5">{(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    {hasRejected && (
                                      <p className="text-xs text-amber-400">
                                        {ar ? '⚠ الصور المرفوضة أعلاه يجب استبدالها.' : '⚠ Rejected images above must be replaced.'}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="mt-2 space-y-1.5 text-xs">
                                  {d.uploadedAt && (
                                    <p className="text-white/60">
                                      {ar ? '📤 رُفع في' : '📤 Uploaded on'} <span className="text-white/80 font-medium">{formatDocumentTimestamp(d.uploadedAt, ar)}</span>
                                      {d.uploadedBy && (ar ? ' من قبل ' : ' by ')}<span className="text-[#C9A961] font-semibold">{d.uploadedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'APPROVED' && d.approvedAt && (
                                    <p className="text-emerald-400">
                                      {ar ? '✓ اُعتمد في' : '✓ Approved on'} <span className="font-medium">{formatDocumentTimestamp(d.approvedAt, ar)}</span>
                                      {d.approvedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.approvedBy}</span>
                                    </p>
                                  )}
                                  {d.status === 'REJECTED' && d.rejectedAt && (
                                    <p className="text-red-400">
                                      {ar ? '✕ رُفض في' : '✕ Rejected on'} <span className="font-medium">{formatDocumentTimestamp(d.rejectedAt, ar)}</span>
                                      {d.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.rejectedBy}</span>
                                    </p>
                                  )}
                                  {(d.rejectionReasonAr || d.rejectionReasonEn || d.rejectionReason) && (
                                    <div className="text-sm text-red-400/90 mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                      <span className="font-semibold">
                                        {d.status === 'APPROVED' ? (ar ? 'ملاحظة سابقة عند الرفض:' : 'Previous rejection note:') : (ar ? 'ملاحظة الرفض:' : 'Rejection note:')}
                                      </span>
                                      <div className="mt-0.5 space-y-0.5">
                                        {d.rejectionReasonAr && <p>{d.rejectionReasonAr}</p>}
                                        {d.rejectionReasonEn && d.rejectionReasonEn !== d.rejectionReasonAr && <p className="text-red-400/80">{d.rejectionReasonEn}</p>}
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
                      requiredDocTypes.map((r) => (
                        <div key={r.docTypeId} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/20 flex items-center justify-center text-[#C9A961] text-sm">📎</span>
                          <span className="text-white font-medium">{getDocLabel(r)}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${r.isRequired ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/60'}`}>
                            {r.isRequired ? (ar ? 'مطلوب' : 'Required') : (ar ? 'اختياري' : 'Optional')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-white/50 text-sm text-center mt-4">
                    {ar ? 'PDF أو صور فقط' : 'PDF or images only'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
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
