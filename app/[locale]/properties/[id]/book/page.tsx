'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PageHero from '@/components/shared/PageHero';
import UnifiedPaymentForm from '@/components/shared/UnifiedPaymentForm';
import { createBooking, getUserActiveBookingForProperty, type BookingContactType } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getPropertyOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import { isOmaniNationality, validatePhoneWithCountryCode, getContactById, getContactDisplayName, getContactForUser, updateContact, createContact, type Contact } from '@/lib/data/addressBook';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';

export default function PropertyBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const unitKey = searchParams?.get('unit') ?? undefined;
  const locale = (params?.locale as string) || 'ar';
  const { data: session, status: sessionStatus } = useSession();
  const filledFromSession = useRef(false);
  const [dataLoadedFromAccount, setDataLoadedFromAccount] = useState(false);
  const [contactIdForUpdate, setContactIdForUpdate] = useState<string | null>(null);
  const [showCompleteDataModal, setShowCompleteDataModal] = useState(false);
  const [modalDocuments, setModalDocuments] = useState<File[]>([]);
  const [completeModalError, setCompleteModalError] = useState<string | null>(null);

  const dataOverrides = getPropertyDataOverrides();
  const overrides = getPropertyOverrides();
  const property = getPropertyById(id, dataOverrides);
  const terms = getPropertyBookingTerms(id);
  const isUnit = !!unitKey;
  const o = overrides[String(id)];
  const businessStatus = unitKey
    ? (o?.units?.[unitKey]?.businessStatus ?? 'AVAILABLE')
    : (o?.businessStatus ?? 'AVAILABLE');
  const isReserved = businessStatus === 'RESERVED';

  const [contactType, setContactType] = useState<BookingContactType>('PERSONAL');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', phoneCountryCode: '968', civilId: '', passportNumber: '', message: '' });
  const [alternativePhone, setAlternativePhone] = useState({ number: '', countryCode: '968' });
  const [companyForm, setCompanyForm] = useState({
    companyNameAr: '',
    companyNameEn: '',
    commercialRegistrationNumber: '',
    repName: '',
    repNameEn: '',
    repPosition: '',
    repPhone: '',
    repPhoneCountryCode: '968',
    repNationality: '',
    repCivilId: '',
    repPassportNumber: '',
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [repPhoneError, setRepPhoneError] = useState<string | null>(null);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<'ALREADY_BOOKED' | 'MAX_REACHED' | 'OTHER' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userHasExistingBooking, setUserHasExistingBooking] = useState<boolean | null>(null);
  const [existingBookingForLink, setExistingBookingForLink] = useState<{ id: string; email?: string } | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  /** تعبئة بيانات الحجز من حساب المستخدم المسجّل: جهة الاتصال إن وُجدت، وإلا من بيانات الجلسة (الاسم، البريد، الهاتف) */
  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user || filledFromSession.current) return;
    filledFromSession.current = true;
    const user = session.user as { id?: string; name?: string; email?: string; phone?: string };
    const contact = getContactForUser({ id: user.id || '', email: user.email, phone: user.phone });
    const hasFullContact = contact && 'contactType' in contact && contact.id;

    if (hasFullContact) {
      const c = contact as Contact;
      setContactIdForUpdate(c.id);
      const { code, number } = parsePhoneToCountryAndNumber(c.phone || '');
      if (c.contactType === 'COMPANY' && c.companyData) {
        const cd = c.companyData;
        const rep = cd?.authorizedRepresentatives?.[0];
        const repContactId = rep && (rep as { contactId?: string }).contactId;
        const linkedRep = repContactId ? getContactById(repContactId) : undefined;
        const repName = (rep?.name || (linkedRep ? getContactDisplayName(linkedRep) : '')).trim() || '';
        const repNameEn = (rep?.nameEn || (linkedRep ? getContactDisplayName(linkedRep, 'en') : '')).trim() || '';
        const repPhone = rep?.phone || linkedRep?.phone;
        const parsedRepPhone = repPhone ? parsePhoneToCountryAndNumber(repPhone) : { code: '968', number: '' };
        setContactType('COMPANY');
        setFormData((prev) => ({
          ...prev,
          email: c.email || '',
          phone: number || '',
          phoneCountryCode: code || '968',
        }));
        setCompanyForm({
          companyNameAr: cd?.companyNameAr || '',
          companyNameEn: cd?.companyNameEn || '',
          commercialRegistrationNumber: cd?.commercialRegistrationNumber || '',
          repName: repName || '',
          repNameEn: repNameEn || '',
          repPosition: rep?.position || '',
          repPhone: parsedRepPhone.number || '',
          repPhoneCountryCode: parsedRepPhone.code || '968',
          repNationality: rep?.nationality || linkedRep?.nationality || '',
          repCivilId: rep?.civilId || linkedRep?.civilId || '',
          repPassportNumber: rep?.passportNumber || linkedRep?.passportNumber || '',
        });
      } else {
        setContactType('PERSONAL');
        setFormData((prev) => ({
          name: [c.firstName, c.secondName, c.thirdName, c.familyName].filter(Boolean).join(' ') || (c as { name?: string }).name || '',
          email: c.email || prev.email,
          phone: number || '',
          phoneCountryCode: code || '968',
          civilId: c.civilId || '',
          passportNumber: c.passportNumber || '',
          message: prev.message,
        }));
      }
    } else {
      /** لا توجد جهة اتصال كاملة في دفتر العناوين: تعبئة من بيانات الجلسة (الاسم، البريد، الهاتف) */
      setContactType('PERSONAL');
      const phoneStr = (contact as { phone?: string } | undefined)?.phone || user.phone || '';
      const { code, number } = parsePhoneToCountryAndNumber(phoneStr);
      const emailStr = (contact as { email?: string } | undefined)?.email || user.email || '';
      setFormData((prev) => ({
        name: (user.name || '').trim() || prev.name,
        email: emailStr || prev.email,
        phone: number || prev.phone,
        phoneCountryCode: code || '968',
        civilId: prev.civilId,
        passportNumber: prev.passportNumber,
        message: prev.message,
      }));
    }
    setDataLoadedFromAccount(true);
  }, [session?.user]);

  /** عند وجود بيانات ناقصة بعد التحميل من الحساب، إظهار نافذة إكمال البيانات */
  useEffect(() => {
    if (!dataLoadedFromAccount || !session?.user) return;
    const hasCivilOrPassport = !!(formData.civilId.trim() || formData.passportNumber.trim());
    const repOmaniCheck = isOmaniNationality(companyForm.repNationality || '');
    const repHasId = !!(companyForm.repCivilId?.trim() || (companyForm.repNationality?.trim() && !repOmaniCheck && companyForm.repPassportNumber?.trim()));
    const personalMissing = contactType === 'PERSONAL' && (
      !formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !hasCivilOrPassport
    );
    const companyMissing = contactType === 'COMPANY' && (
      !companyForm.companyNameAr?.trim() || !companyForm.commercialRegistrationNumber?.trim()
      || !formData.email.trim() || !formData.phone.trim()
      || !companyForm.repName?.trim() || !companyForm.repNameEn?.trim() || !companyForm.repPosition?.trim()
      || !companyForm.repPhone?.trim() || !companyForm.repNationality?.trim() || !repHasId
    );
    if (personalMissing || companyMissing) setShowCompleteDataModal(true);
  }, [dataLoadedFromAccount, contactType, formData.name, formData.email, formData.phone, formData.civilId, formData.passportNumber, companyForm.companyNameAr, companyForm.commercialRegistrationNumber, companyForm.repName, companyForm.repNameEn, companyForm.repPosition, companyForm.repPhone, companyForm.repNationality, companyForm.repCivilId, companyForm.repPassportNumber, session?.user]);

  /** التحقق من وجود حجز سابق للمستخدم لهذا العقار (عند تغيير البريد أو الهاتف) */
  useEffect(() => {
    if (!property) return;
    const email = formData.email?.trim() || '';
    const digits = (formData.phone || '').replace(/\D/g, '').replace(/^0+/, '');
    const code = formData.phoneCountryCode || '968';
    const phone = digits ? `+${digits.startsWith(code) ? digits : code + digits}` : '';
    if (email.length < 3 && digits.length < 8) {
      setUserHasExistingBooking(null);
      setExistingBookingForLink(null);
      return;
    }
    const existing = getUserActiveBookingForProperty(property.id, unitKey, email, phone);
    setUserHasExistingBooking(!!existing);
    setExistingBookingForLink(existing);
  }, [formData.email, formData.phone, formData.phoneCountryCode, property?.id, unitKey]);

  const ar = locale === 'ar';

  let displayTitle = '';
  let unitPrice = 0;
  let propertyTitleAr = '';
  let propertyTitleEn = '';

  if (property) {
    if (isUnit && unitKey) {
      const [unitType, idx] = unitKey.split('-');
      const i = parseInt(idx, 10);
      const labels: Record<string, [string, string]> = { shop: ['محل', 'Shop'], showroom: ['معرض', 'Showroom'], apartment: ['شقة', 'Apartment'] };
      const [arL, enL] = labels[unitType] || ['', ''];
      displayTitle = ar ? `${property.titleAr} - ${arL} ${i + 1}` : `${property.titleEn} - ${enL} ${i + 1}`;
      propertyTitleAr = `${property.titleAr} - ${labels[unitType]?.[0] || ''} ${i + 1}`;
      propertyTitleEn = `${property.titleEn} - ${labels[unitType]?.[1] || ''} ${i + 1}`;
      const shops = (property as { multiUnitShops?: { price: number }[] }).multiUnitShops || [];
      const showrooms = (property as { multiUnitShowrooms?: { price: number }[] }).multiUnitShowrooms || [];
      const apartments = (property as { multiUnitApartments?: { price: number }[] }).multiUnitApartments || [];
      const u = unitType === 'shop' ? shops[i] : unitType === 'showroom' ? showrooms[i] : apartments[i];
      unitPrice = u?.price ?? property.price;
    } else {
      displayTitle = ar ? property.titleAr : property.titleEn;
      propertyTitleAr = property.titleAr;
      propertyTitleEn = property.titleEn;
      unitPrice = property.price;
    }
  }

  const depositAmount = (terms.bookingDepositAmount != null && terms.bookingDepositAmount > 0)
    ? terms.bookingDepositAmount
    : unitPrice;
  const isCardValid = cardData.number.replace(/\s/g, '').length === 16
    && /^\d{2}\/\d{2}$/.test(cardData.expiry)
    && cardData.cvv.length >= 3
    && cardData.name.trim().length > 0;
  const hasCivilOrPassport = !!(formData.civilId.trim() || formData.passportNumber.trim());
  const repOmani = isOmaniNationality(companyForm.repNationality || '');
  const repHasId = !!(companyForm.repCivilId.trim() || (companyForm.repNationality?.trim() && !repOmani && companyForm.repPassportNumber.trim()));
  const companyValid = contactType === 'COMPANY'
    ? companyForm.companyNameAr.trim() && companyForm.commercialRegistrationNumber.trim()
      && companyForm.repName.trim() && companyForm.repNameEn.trim() && companyForm.repPosition.trim() && companyForm.repPhone.trim()
      && companyForm.repNationality.trim() && repHasId
    : true;
  const personalValid = contactType === 'PERSONAL'
    ? formData.name && formData.email && formData.phone && hasCivilOrPassport
    : companyForm.companyNameAr && formData.email && formData.phone;
  const getFullPhone = (countryCode: string, num: string) => {
    const digits = (num || '').replace(/\D/g, '').replace(/^0+/, '');
    if (!digits) return '';
    return digits.startsWith(countryCode) ? `+${digits}` : `+${countryCode}${digits}`;
  };

  const canSubmit = !userHasExistingBooking && personalValid && companyValid && isCardValid && termsAccepted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !canSubmit) return;
    setPhoneError(null);
    setRepPhoneError(null);
    const mainPhoneVal = validatePhoneWithCountryCode(formData.phone?.trim() || '', formData.phoneCountryCode || '968');
    if (!mainPhoneVal.valid) {
      setPhoneError(mainPhoneVal.message || 'invalidPhoneShort');
      return;
    }
    if (contactType === 'COMPANY') {
      const repPhoneVal = validatePhoneWithCountryCode(companyForm.repPhone?.trim() || '', companyForm.repPhoneCountryCode || '968');
      if (!repPhoneVal.valid) {
        setRepPhoneError(repPhoneVal.message || 'invalidPhoneShort');
        return;
      }
    }
    setIsSubmitting(true);
    setIsProcessingPayment(true);
    setSubmitStatus('idle');
    setSubmitError(null);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setIsProcessingPayment(false);
      const isCompany = contactType === 'COMPANY';
      const repId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const mainPhone = getFullPhone(formData.phoneCountryCode || '968', formData.phone);
      const repPhone = isCompany ? getFullPhone(companyForm.repPhoneCountryCode || '968', companyForm.repPhone) : '';
      const booking = createBooking({
        propertyId: property.id,
        unitKey,
        propertyTitleAr,
        propertyTitleEn,
        contactType,
        name: isCompany ? companyForm.companyNameAr : formData.name,
        email: formData.email,
        phone: mainPhone,
        civilId: isCompany ? undefined : formData.civilId.trim() || undefined,
        passportNumber: isCompany ? undefined : formData.passportNumber.trim() || undefined,
        contactId: contactIdForUpdate || undefined,
        companyData: isCompany ? {
          companyNameAr: companyForm.companyNameAr.trim(),
          companyNameEn: companyForm.companyNameEn?.trim() || undefined,
          commercialRegistrationNumber: companyForm.commercialRegistrationNumber.trim(),
          authorizedRepresentatives: [{
            id: repId,
            name: companyForm.repName.trim(),
            nameEn: companyForm.repNameEn.trim(),
            position: companyForm.repPosition.trim(),
            phone: repPhone,
            nationality: companyForm.repNationality.trim(),
            civilId: companyForm.repCivilId?.trim() || undefined,
            passportNumber: repOmani ? undefined : companyForm.repPassportNumber?.trim() || undefined,
          }],
        } : undefined,
        message: [formData.message, alternativePhone.number.trim() ? (ar ? `رقم بديل للتواصل: ${getFullPhone(alternativePhone.countryCode, alternativePhone.number)}` : `Alternative contact: ${getFullPhone(alternativePhone.countryCode, alternativePhone.number)}`) : ''].filter(Boolean).join('\n') || undefined,
        type: 'BOOKING',
        paymentConfirmed: true,
        priceAtBooking: depositAmount,
        cardLast4: cardData.number.replace(/\s/g, '').slice(-4),
        cardExpiry: cardData.expiry,
        cardholderName: cardData.name.trim(),
      });
      try {
        await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) });
      } catch {
        // الحجز محفوظ محلياً؛ المزامنة مع الخادم فشلت
      }
      setSubmitStatus('success');
      setCreatedBookingId(booking.id);
      setFormData({ name: '', email: '', phone: '', phoneCountryCode: '968', civilId: '', passportNumber: '', message: '' });
      setAlternativePhone({ number: '', countryCode: '968' });
      setCompanyForm({ companyNameAr: '', companyNameEn: '', commercialRegistrationNumber: '', repName: '', repNameEn: '', repPosition: '', repPhone: '', repPhoneCountryCode: '968', repNationality: '', repCivilId: '', repPassportNumber: '' });
      setTimeout(() => router.push(`/${locale}/properties/${id}/receipt?booking=${booking.id}`), 2500);
    } catch (err) {
      setSubmitStatus('error');
      setIsProcessingPayment(false);
      const msg = err instanceof Error ? err.message : '';
      setSubmitError(msg === 'ALREADY_BOOKED' ? 'ALREADY_BOOKED' : msg === 'MAX_REACHED' ? 'MAX_REACHED' : 'OTHER');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteDataModalSave = () => {
    setCompleteModalError(null);
    const mainPhone = getFullPhone(formData.phoneCountryCode || '968', formData.phone);
    const phoneForStorage = mainPhone.replace(/^\+/, '');
    const hasCivilOrPassport = !!(formData.civilId.trim() || formData.passportNumber.trim());
    const repOmaniCheck = isOmaniNationality(companyForm.repNationality || '');
    const repHasId = !!(companyForm.repCivilId?.trim() || (companyForm.repNationality?.trim() && !repOmaniCheck && companyForm.repPassportNumber?.trim()));

    if (contactType === 'PERSONAL') {
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !hasCivilOrPassport) {
        setCompleteModalError(ar ? 'يرجى تعبئة الاسم، البريد، الهاتف والرقم المدني أو رقم الجواز.' : 'Please fill name, email, phone and civil ID or passport.');
        return;
      }
      const phoneVal = validatePhoneWithCountryCode(formData.phone.trim(), formData.phoneCountryCode || '968');
      if (!phoneVal.valid) {
        setCompleteModalError(ar ? 'رقم الهاتف غير صالح.' : 'Invalid phone number.');
        return;
      }
      const parts = formData.name.trim().split(/\s+/).filter(Boolean);
      const firstName = parts[0] || '—';
      const familyName = parts.length > 1 ? parts[parts.length - 1]! : '';
      const secondName = parts.length > 3 ? parts[1] : undefined;
      const thirdName = parts.length > 4 ? parts[2] : undefined;
      try {
        if (contactIdForUpdate) {
          updateContact(contactIdForUpdate, {
            firstName,
            secondName,
            thirdName,
            familyName,
            email: formData.email.trim(),
            phone: phoneForStorage,
            civilId: formData.civilId.trim() || undefined,
            passportNumber: formData.passportNumber.trim() || undefined,
          });
        } else {
          const user = session?.user as { id?: string };
          const created = createContact({
            contactType: 'PERSONAL',
            firstName,
            secondName,
            thirdName,
            familyName,
            nationality: 'عماني',
            gender: 'MALE',
            phone: phoneForStorage,
            email: formData.email.trim() || undefined,
            category: 'CLIENT',
            civilId: formData.civilId.trim() || undefined,
            passportNumber: formData.passportNumber.trim() || undefined,
            userId: user?.id,
            address: { fullAddress: '—', fullAddressEn: '—' },
          });
          setContactIdForUpdate(created.id);
        }
        setShowCompleteDataModal(false);
        setModalDocuments([]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setCompleteModalError(ar ? `تعذر الحفظ: ${msg || 'خطأ غير متوقع'}` : `Save failed: ${msg || 'Unexpected error'}`);
      }
      return;
    }

    if (contactType === 'COMPANY') {
      if (!companyForm.companyNameAr?.trim() || !companyForm.commercialRegistrationNumber?.trim()
        || !formData.email.trim() || !formData.phone.trim()
        || !companyForm.repName?.trim() || !companyForm.repNameEn?.trim() || !companyForm.repPosition?.trim()
        || !companyForm.repPhone?.trim() || !companyForm.repNationality?.trim() || !repHasId) {
        setCompleteModalError(ar ? 'يرجى تعبئة جميع حقول الشركة والمفوض.' : 'Please fill all company and representative fields.');
        return;
      }
      const phoneVal = validatePhoneWithCountryCode(formData.phone.trim(), formData.phoneCountryCode || '968');
      const repPhoneVal = validatePhoneWithCountryCode(companyForm.repPhone.trim(), companyForm.repPhoneCountryCode || '968');
      if (!phoneVal.valid || !repPhoneVal.valid) {
        setCompleteModalError(ar ? 'رقم الهاتف أو هاتف المفوض غير صالح.' : 'Invalid company or rep phone.');
        return;
      }
      const existingCompany = contactIdForUpdate ? getContactById(contactIdForUpdate) : null;
      const existingRep = existingCompany?.companyData?.authorizedRepresentatives?.[0] as { id?: string; contactId?: string } | undefined;
      const repId = existingRep?.id || `rep-${Date.now()}`;
      const repPhoneFull = getFullPhone(companyForm.repPhoneCountryCode || '968', companyForm.repPhone).replace(/^\+/, '');
      const repData = {
        id: repId,
        contactId: existingRep?.contactId,
        name: companyForm.repName.trim(),
        nameEn: companyForm.repNameEn.trim(),
        position: companyForm.repPosition.trim(),
        phone: repPhoneFull,
        nationality: companyForm.repNationality.trim(),
        civilId: companyForm.repCivilId?.trim() || undefined,
        passportNumber: repOmaniCheck ? undefined : companyForm.repPassportNumber?.trim() || undefined,
      };
      try {
        if (contactIdForUpdate) {
          const existing = getContactById(contactIdForUpdate);
          updateContact(contactIdForUpdate, {
            email: formData.email.trim(),
            phone: phoneForStorage,
            companyData: {
              ...existing?.companyData,
              companyNameAr: companyForm.companyNameAr.trim(),
              companyNameEn: companyForm.companyNameEn?.trim() || undefined,
              commercialRegistrationNumber: companyForm.commercialRegistrationNumber.trim(),
              authorizedRepresentatives: [repData as import('@/lib/data/addressBook').AuthorizedRepresentative],
            },
          });
        } else {
          const created = createContact({
            contactType: 'COMPANY',
            firstName: companyForm.companyNameAr.trim(),
            familyName: '',
            nationality: '',
            gender: 'MALE',
            phone: phoneForStorage,
            email: formData.email.trim() || undefined,
            category: 'CLIENT',
            companyData: {
              companyNameAr: companyForm.companyNameAr.trim(),
              companyNameEn: companyForm.companyNameEn?.trim() || undefined,
              commercialRegistrationNumber: companyForm.commercialRegistrationNumber.trim(),
              authorizedRepresentatives: [repData as import('@/lib/data/addressBook').AuthorizedRepresentative],
            },
            address: { fullAddress: '—', fullAddressEn: '—' },
          });
          setContactIdForUpdate(created.id);
        }
        setShowCompleteDataModal(false);
        setModalDocuments([]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setCompleteModalError(ar ? `تعذر الحفظ: ${msg || 'خطأ غير متوقع'}` : `Save failed: ${msg || 'Unexpected error'}`);
      }
    }
  };

  if (submitStatus === 'success' && createdBookingId) {
    const receiptUrl = `/${locale}/properties/${id}/receipt?booking=${createdBookingId}`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/30 flex items-center justify-center text-6xl mx-auto mb-8 animate-pulse">✓</div>
          <h2 className="text-3xl font-bold text-emerald-400 mb-4">{ar ? 'شكراً لحجزك!' : 'Thank you for your booking!'}</h2>
          <p className="text-white text-lg mb-2">{ar ? 'تم إتمام الدفع بنجاح.' : 'Payment completed successfully.'}</p>
          <p className="text-white text-sm mb-10">{ar ? 'سيتم تحويلك للإيصال لطباعته أو تحميله...' : 'Redirecting you to the receipt to print or download...'}</p>
          <Link
            href={receiptUrl}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-2xl shadow-emerald-500/30"
          >
            <span>📄</span>
            {ar ? 'عرض الإيصال والطباعة' : 'View Receipt & Print'}
          </Link>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">🔍</div>
          <p className="text-white mb-6 text-lg">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all shadow-lg hover:shadow-[#8B6F47]/30">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  const bookPath = `/${locale}/properties/${id}/book${unitKey ? `?unit=${unitKey}` : ''}`;
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B6F47] border-t-transparent mx-auto mb-4" />
          <p className="text-white">{ar ? 'جاري التحقق من الجلسة...' : 'Checking session...'}</p>
        </div>
      </div>
    );
  }

  if (sessionStatus !== 'authenticated' || !session?.user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 md:p-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-6">🔐</div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            {ar ? 'تسجيل الدخول مطلوب للحجز' : 'Login required to book'}
          </h1>
          <p className="text-white text-sm md:text-base mb-8">
            {ar
              ? 'يجب أن يكون لديك حساب مستخدم وتسجيل الدخول لحجز وحدة. بعد تسجيل الدخول ستُعبّأ بياناتك تلقائياً من حسابك.'
              : 'You must have a user account and be logged in to book a unit. After logging in, your details will be filled automatically from your account.'}
          </p>
          <Link
            href={`/${locale}/login?callbackUrl=${encodeURIComponent(bookPath)}`}
            className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all shadow-lg"
          >
            {ar ? 'تسجيل الدخول' : 'Log in'}
          </Link>
          <Link
            href={`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`}
            className="block mt-4 text-white hover:text-white text-sm"
          >
            {ar ? 'العودة لصفحة العقار' : 'Back to property'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-book-page] h2, [data-book-page] h3, [data-book-page] label { color: #ffffff !important; opacity: 1 !important; }
        [data-book-page] h4 { opacity: 1 !important; }
      ` }} />
      <div data-book-page>
      {/* نافذة إكمال البيانات الشخصية عند وجود حقول ناقصة */}
      {showCompleteDataModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1612] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#ffffff', opacity: 1 }}>
                <span className="w-10 h-10 rounded-xl bg-amber-500/30 flex items-center justify-center text-lg">📋</span>
                {ar ? 'إكمال البيانات الشخصية المطلوبة للحجز' : 'Complete required personal data for booking'}
              </h2>
              <p className="text-sm mt-2" style={{ color: '#ffffff', opacity: 1 }}>
                {ar ? 'بعض البيانات ناقصة. يرجى تعبئة الحقول أدناه (يمكنك أيضاً تحديثها لاحقاً من لوحة التحكم). بعد الإكمال يمكنك الاستمرار في الحجز.' : 'Some data is missing. Please fill the fields below (you can also update them later from your dashboard). After completing you can continue with the booking.'}
              </p>
            </div>
            <div className="p-6 space-y-5">
              {completeModalError && (
                <div className="rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-red-300 text-sm">{completeModalError}</div>
              )}
              {contactType === 'PERSONAL' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'الاسم الكامل *' : 'Full Name *'}</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" placeholder={ar ? 'الاسم الكامل' : 'Full name'} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                    <div className="flex gap-2">
                      <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => setFormData({ ...formData, phoneCountryCode: v })} locale={locale as 'ar' | 'en'} variant="dark" />
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" placeholder="91234567" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                      <input type="text" value={formData.civilId} onChange={(e) => setFormData({ ...formData, civilId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" placeholder={ar ? 'الرقم المدني' : 'Civil ID'} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'رقم الجواز (اختياري)' : 'Passport (optional)'}</label>
                      <input type="text" value={formData.passportNumber} onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" placeholder={ar ? 'للوفد' : 'For expats'} />
                    </div>
                  </div>
                </>
              )}
              {contactType === 'COMPANY' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'اسم الشركة (عربي) *' : 'Company Name (Ar) *'}</label>
                      <input type="text" value={companyForm.companyNameAr} onChange={(e) => setCompanyForm({ ...companyForm, companyNameAr: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'رقم السجل التجاري *' : 'Commercial Reg. No. *'}</label>
                      <input type="text" value={companyForm.commercialRegistrationNumber} onChange={(e) => setCompanyForm({ ...companyForm, commercialRegistrationNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'هاتف الشركة *' : 'Company Phone *'}</label>
                    <div className="flex gap-2">
                      <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => setFormData({ ...formData, phoneCountryCode: v })} locale={locale as 'ar' | 'en'} variant="dark" />
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#8B6F47]" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h4 className="text-sm font-bold text-[#C9A961] opacity-100">{ar ? 'المفوض بالتوقيع *' : 'Authorized Representative *'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الاسم (عربي) *' : 'Name (Ar) *'}</label>
                        <input type="text" value={companyForm.repName} onChange={(e) => setCompanyForm({ ...companyForm, repName: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الاسم (إنجليزي) *' : 'Name (En) *'}</label>
                        <input type="text" value={companyForm.repNameEn} onChange={(e) => setCompanyForm({ ...companyForm, repNameEn: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'المنصب *' : 'Position *'}</label>
                        <input type="text" value={companyForm.repPosition} onChange={(e) => setCompanyForm({ ...companyForm, repPosition: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'هاتف المفوض *' : 'Rep Phone *'}</label>
                        <div className="flex gap-2">
                          <PhoneCountryCodeSelect value={companyForm.repPhoneCountryCode} onChange={(v) => setCompanyForm({ ...companyForm, repPhoneCountryCode: v })} locale={locale as 'ar' | 'en'} variant="dark" size="sm" />
                          <input type="tel" value={companyForm.repPhone} onChange={(e) => setCompanyForm({ ...companyForm, repPhone: e.target.value })} className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                        <input type="text" value={companyForm.repNationality} onChange={(e) => setCompanyForm({ ...companyForm, repNationality: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" placeholder={ar ? 'عماني، سعودي...' : 'Omani, Saudi...'} />
                      </div>
                      {isOmaniNationality(companyForm.repNationality || '') ? (
                        <div>
                          <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                          <input type="text" value={companyForm.repCivilId} onChange={(e) => setCompanyForm({ ...companyForm, repCivilId: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'رقم الجواز *' : 'Passport No. *'}</label>
                          <input type="text" value={companyForm.repPassportNumber} onChange={(e) => setCompanyForm({ ...companyForm, repPassportNumber: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-[#8B6F47]" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold text-white opacity-100 mb-1">{ar ? 'إرفاق المستندات المطلوبة (إن وجدت)' : 'Attach required documents (if any)'}</label>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setModalDocuments(e.target.files ? Array.from(e.target.files) : [])} className="w-full text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#8B6F47] file:text-white" />
                {modalDocuments.length > 0 && <p className="text-white opacity-100 text-xs mt-1">{ar ? `تم اختيار ${modalDocuments.length} ملف/ملفات` : `${modalDocuments.length} file(s) selected`}</p>}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button type="button" onClick={handleCompleteDataModalSave} className="px-6 py-3 rounded-xl font-bold bg-[#8B6F47] hover:bg-[#6B5535] text-white transition-all">
                {ar ? 'حفظ ومتابعة' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#0a0a0a]">
      {/* Premium Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1612] via-[#0f0d0b] to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B6F47]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#C9A961]/10 rounded-full blur-3xl" />
        </div>
        <PageHero
          title={ar ? 'طلب الحجز ودفع الرسوم' : 'Booking & Payment'}
          subtitle={displayTitle}
          compact
          backgroundImage={property.image}
        />
      </div>

      <section className="relative -mt-16 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Stepper */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#8B6F47] text-white font-bold flex items-center justify-center shadow-lg shadow-[#8B6F47]/30">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-white hidden sm:inline">{ar ? 'البيانات' : 'Details'}</span>
              </div>
              <div className="w-8 md:w-16 h-0.5 bg-gradient-to-r from-[#8B6F47] to-[#C9A961]" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#8B6F47] text-white font-bold flex items-center justify-center shadow-lg shadow-[#8B6F47]/30">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-white hidden sm:inline">{ar ? 'الدفع' : 'Payment'}</span>
              </div>
              <div className="w-8 md:w-16 h-0.5 bg-white/20" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-white hidden sm:inline">{ar ? 'التأكيد' : 'Confirm'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12">
            {/* Property Summary - Premium Card */}
            <div className="xl:col-span-4 order-2 xl:order-1">
              <div
                className={`sticky top-28 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <div className="relative h-56 md:h-64">
                  <Image
                    src={property.image}
                    alt={displayTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-2xl">{displayTitle}</h3>
                    <p className="text-white text-sm mt-1">
                      {(property as { areaAr?: string }).areaAr || property.villageAr} — {property.governorateAr}
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    {isReserved && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-lg">
                        {ar ? 'محجوز' : 'Reserved'}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#8B6F47] text-white shadow-lg">
                      {ar ? 'عرض حصري' : 'Exclusive'}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-white text-sm font-medium">{ar ? 'الإيجار الشهري' : 'Monthly Rent'}</span>
                    <span className="text-2xl font-bold text-[#C9A961] tracking-tight">
                      {unitPrice.toLocaleString('en-US')} <span className="text-base font-medium text-white">ر.ع</span>
                    </span>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#8B6F47]/20 to-[#C9A961]/10 border border-[#8B6F47]/30 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💎</span>
                      <h4 className="font-bold text-white">{ar ? 'مبلغ الحجز' : 'Booking Deposit'}</h4>
                    </div>
                    <p className="text-2xl font-bold text-[#C9A961] mb-1">
                      {depositAmount.toLocaleString('en-US')} <span className="text-sm font-medium text-white">ر.ع</span>
                    </p>
                    <p className="text-white text-xs leading-relaxed">{ar ? terms.bookingDepositNoteAr : terms.bookingDepositNoteEn}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="xl:col-span-8 order-1 xl:order-2 space-y-6">
              {userHasExistingBooking && (
                <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-500/20 p-6">
                  <h3 className="font-bold text-emerald-300 opacity-100 flex items-center gap-2 mb-3">
                    <span className="text-xl">✓</span>
                    {ar ? 'هذا العقار محجوز لك' : 'This property is already booked by you'}
                  </h3>
                  <p className="text-emerald-100 opacity-100 text-sm leading-relaxed">
                    {ar
                      ? 'لديك حجز نشط لهذا العقار. لا يمكنك تقديم حجز جديد. يمكنك متابعة إجراءات الحجز الحالي من صفحة الشروط والمستندات.'
                      : 'You have an active booking for this property. You cannot submit a new booking. You can follow up on your current booking from the terms and documents page.'}
                  </p>
                  {existingBookingForLink && (
                    <Link
                      href={`/${locale}/properties/${id}/contract-terms?bookingId=${existingBookingForLink.id}&email=${encodeURIComponent(existingBookingForLink.email || formData.email || '')}`}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 font-semibold transition-colors"
                    >
                      {ar ? 'صفحة الشروط والمستندات' : 'Terms & Documents'}
                    </Link>
                  )}
                </div>
              )}
              {isReserved && !userHasExistingBooking && (
                <div className="rounded-2xl border border-amber-400/50 bg-amber-500/20 p-6">
                  <h3 className="font-bold text-amber-200 opacity-100 flex items-center gap-2 mb-3">
                    <span className="text-xl">⚠️</span>
                    {ar ? 'تنبيه: هذا العقار محجوز حالياً' : 'Notice: This property is currently reserved'}
                  </h3>
                  <p className="text-amber-100 opacity-100 text-sm leading-relaxed">
                    {ar
                      ? 'يُسمح لك بتقديم طلب حجز. في حال لم يتم تأكيد الحجز السابق من قبل الإدارة، سيُسنَد العقار لك بعد استكمال الإجراءات. وفي حال تم تأكيد الحجز السابق، سيعاد المبلغ وفق الإجراءات والاشتراطات.'
                      : 'You may submit a booking request. If the previous booking is not confirmed by management, the property will be assigned to you after completing procedures. If the previous booking is confirmed, the amount will be refunded according to procedures and terms.'}
                  </p>
                </div>
              )}
              {/* Terms - Collapsible Style */}
              <div
                className={`rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ animationDelay: '100ms' }}
              >
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#8B6F47]/10 to-transparent">
                  <h2 className="text-lg font-bold flex items-center gap-3" style={{ color: '#ffffff', opacity: 1 }}>
                    <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/30 flex items-center justify-center text-xl">📋</span>
                    {ar ? 'شروط الحجز' : 'Booking Terms'}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="text-white opacity-100 text-sm leading-relaxed whitespace-pre-line">
                    {ar ? terms.bookingTermsAr : terms.bookingTermsEn}
                  </div>
                </div>
              </div>

              {/* Main Form */}
              <div
                className={`rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ animationDelay: '200ms' }}
              >
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#8B6F47]/10 to-transparent">
                  <h2 className="text-lg font-bold flex items-center gap-3" style={{ color: '#ffffff', opacity: 1 }}>
                    <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/30 flex items-center justify-center text-xl">✍️</span>
                    {ar ? 'بيانات الحجز والدفع' : 'Booking & Payment Details'}
                  </h2>
                </div>
                <div className="p-6 md:p-8">
                  {submitStatus === 'error' && (
                    <div className="mb-8 rounded-2xl bg-red-500/20 border border-red-400/30 p-4 text-red-300">
                      {submitError === 'ALREADY_BOOKED'
                        ? (ar ? 'هذا العقار محجوز لك بالفعل. لا يمكن إنشاء حجز مكرر.' : 'This property is already booked by you. Duplicate booking not allowed.')
                        : submitError === 'MAX_REACHED'
                          ? (ar ? 'تم الوصول للحد الأقصى من الحجوزات لهذا العقار.' : 'Maximum bookings reached for this property.')
                          : (ar ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.')}
                    </div>
                  )}
                  <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
                    {dataLoadedFromAccount && (
                      <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-4 flex items-center gap-3">
                        <span className="text-2xl">✓</span>
                        <p className="text-sm" style={{ color: '#ffffff', opacity: 1 }}>
                          {ar ? 'تم تحميل بياناتك من حسابك. لا يمكن تغييرها هنا — التعديل من لوحة التحكم فقط. يمكنك إضافة رقم بديل للتواصل أدناه.' : 'Your details have been loaded from your account. They cannot be changed here — edit only from your dashboard. You can add an alternative contact number below.'}
                        </p>
                      </div>
                    )}

                    {/* نوع الحاجز — مخفي عند تحميل البيانات من الحساب */}
                    {!dataLoadedFromAccount && (
                      <div>
                        <label className="block text-sm font-semibold text-white opacity-100 mb-3">{ar ? 'نوع الحاجز *' : 'Applicant Type *'}</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="contactType"
                              checked={contactType === 'PERSONAL'}
                              onChange={() => setContactType('PERSONAL')}
                              className="w-4 h-4 text-[#8B6F47] focus:ring-[#8B6F47]"
                            />
                            <span className="text-white">{ar ? 'شخصي' : 'Personal'}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="contactType"
                              checked={contactType === 'COMPANY'}
                              onChange={() => setContactType('COMPANY')}
                              className="w-4 h-4 text-[#8B6F47] focus:ring-[#8B6F47]"
                            />
                            <span className="text-white">{ar ? 'شركة' : 'Company'}</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {contactType === 'PERSONAL' ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'الاسم الكامل *' : 'Full Name *'}</label>
                            <input
                              type="text"
                              required={contactType === 'PERSONAL'}
                              value={formData.name}
                              onChange={(e) => !dataLoadedFromAccount && setFormData({ ...formData, name: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder={ar ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => !dataLoadedFromAccount && setFormData({ ...formData, email: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder="example@email.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                          <div className="flex gap-2">
                            <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => { if (!dataLoadedFromAccount) { setFormData({ ...formData, phoneCountryCode: v }); setPhoneError(null); } }} locale={locale as 'ar' | 'en'} variant="dark" disabled={dataLoadedFromAccount} />
                            <input
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={(e) => { if (!dataLoadedFromAccount) { setFormData({ ...formData, phone: e.target.value }); setPhoneError(null); } }}
                              readOnly={dataLoadedFromAccount}
                              className={`flex-1 px-5 py-4 rounded-xl border text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'} ${phoneError ? 'border-red-400' : 'border-white/10'}`}
                              placeholder={ar ? '91234567' : '91234567'}
                            />
                          </div>
                          {phoneError && <p className="text-red-400 text-xs mt-1">{ar ? (phoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (phoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                            <input
                              type="text"
                              value={formData.civilId}
                              onChange={(e) => !dataLoadedFromAccount && setFormData({ ...formData, civilId: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder={ar ? 'أدخل الرقم المدني' : 'Enter civil ID'}
                            />
                            <p className="text-white opacity-100 text-xs mt-1">{ar ? 'أو رقم الجواز أدناه' : 'Or passport number below'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'رقم الجواز (اختياري)' : 'Passport (optional)'}</label>
                            <input
                              type="text"
                              value={formData.passportNumber}
                              onChange={(e) => !dataLoadedFromAccount && setFormData({ ...formData, passportNumber: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder={ar ? 'للمقيمين بدون رقم مدني' : 'For residents without civil ID'}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'اسم الشركة (عربي) *' : 'Company Name (Ar) *'}</label>
                            <input
                              type="text"
                              value={companyForm.companyNameAr}
                              onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, companyNameAr: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder={ar ? 'اسم الشركة' : 'Company name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'اسم الشركة (إنجليزي)' : 'Company Name (En)'}</label>
                            <input
                              type="text"
                              value={companyForm.companyNameEn}
                              onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, companyNameEn: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder="Company name"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'رقم السجل التجاري *' : 'Commercial Registration No. *'}</label>
                          <input
                            type="text"
                            value={companyForm.commercialRegistrationNumber}
                            onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, commercialRegistrationNumber: e.target.value })}
                            readOnly={dataLoadedFromAccount}
                            className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                            placeholder={ar ? 'رقم السجل' : 'CR number'}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => !dataLoadedFromAccount && setFormData({ ...formData, email: e.target.value })}
                              readOnly={dataLoadedFromAccount}
                              className={`w-full px-5 py-4 rounded-xl border border-white/10 text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'}`}
                              placeholder="example@email.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'رقم هاتف الشركة *' : 'Company Phone *'}</label>
                            <div className="flex gap-2">
                              <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => { if (!dataLoadedFromAccount) { setFormData({ ...formData, phoneCountryCode: v }); setPhoneError(null); } }} locale={locale as 'ar' | 'en'} variant="dark" disabled={dataLoadedFromAccount} />
                              <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => { if (!dataLoadedFromAccount) { setFormData({ ...formData, phone: e.target.value }); setPhoneError(null); } }}
                                readOnly={dataLoadedFromAccount}
                                className={`flex-1 px-5 py-4 rounded-xl border text-white placeholder-white transition-all ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47]'} ${phoneError ? 'border-red-400' : 'border-white/10'}`}
                                placeholder={ar ? '91234567' : '91234567'}
                              />
                            </div>
                            {phoneError && <p className="text-red-400 text-xs mt-1">{ar ? (phoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (phoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <h4 className="text-sm font-bold text-[#C9A961] opacity-100 mb-4">{ar ? 'المفوض بالتوقيع *' : 'Authorized Representative *'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'اسم المفوض (عربي) *' : 'Rep Name (Arabic) *'}</label>
                              <input type="text" value={companyForm.repName} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repName: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'الاسم الكامل' : 'Full name'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'اسم المفوض (إنجليزي) *' : 'Rep Name (English) *'}</label>
                              <input type="text" value={companyForm.repNameEn} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repNameEn: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'الترجمة الإنجليزية' : 'English translation'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'المنصب *' : 'Position *'}</label>
                              <input type="text" value={companyForm.repPosition} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repPosition: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'مدير، مفوض...' : 'Manager, Authorized...'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'هاتف المفوض *' : 'Rep Phone *'}</label>
                              <div className="flex gap-2">
                                <PhoneCountryCodeSelect value={companyForm.repPhoneCountryCode} onChange={(v) => { if (!dataLoadedFromAccount) { setCompanyForm({ ...companyForm, repPhoneCountryCode: v }); setRepPhoneError(null); } }} locale={locale as 'ar' | 'en'} variant="dark" size="sm" disabled={dataLoadedFromAccount} />
                                <input type="tel" value={companyForm.repPhone} onChange={(e) => { if (!dataLoadedFromAccount) { setCompanyForm({ ...companyForm, repPhone: e.target.value }); setRepPhoneError(null); } }} readOnly={dataLoadedFromAccount} className={`flex-1 px-4 py-3 rounded-lg border text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'} ${repPhoneError ? 'border-red-400' : 'border-white/10'}`} placeholder={ar ? '91234567' : '91234567'} />
                              </div>
                              {repPhoneError && <p className="text-red-400 text-xs mt-1">{ar ? (repPhoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (repPhoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                              <input type="text" value={companyForm.repNationality} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repNationality: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'عماني، سعودي...' : 'Omani, Saudi...'} />
                            </div>
                            {repOmani ? (
                              <div>
                                <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                                <input type="text" value={companyForm.repCivilId} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repCivilId: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'الرقم المدني' : 'Civil ID'} />
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                                  <input type="text" value={companyForm.repCivilId} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repCivilId: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'إن وجد' : 'If any'} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-white opacity-100 mb-1">{ar ? 'رقم الجواز *' : 'Passport No. *'}</label>
                                  <input type="text" value={companyForm.repPassportNumber} onChange={(e) => !dataLoadedFromAccount && setCompanyForm({ ...companyForm, repPassportNumber: e.target.value })} readOnly={dataLoadedFromAccount} className={`w-full px-4 py-3 rounded-lg border border-white/10 text-white text-sm ${dataLoadedFromAccount ? 'bg-white/[0.03] cursor-not-allowed opacity-90' : 'bg-white/5'}`} placeholder={ar ? 'للوفد' : 'For expats'} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* رقم بديل للتواصل — اختياري، دائماً قابل للتعديل */}
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'رقم بديل أو رقم آخر للتواصل (اختياري)' : 'Alternative or other contact number (optional)'}</label>
                      <div className="flex gap-2">
                        <PhoneCountryCodeSelect value={alternativePhone.countryCode} onChange={(v) => setAlternativePhone((p) => ({ ...p, countryCode: v }))} locale={locale as 'ar' | 'en'} variant="dark" />
                        <input
                          type="tel"
                          value={alternativePhone.number}
                          onChange={(e) => setAlternativePhone((p) => ({ ...p, number: e.target.value }))}
                          className="flex-1 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                          placeholder={ar ? 'مثال: 91234567' : 'e.g. 91234567'}
                        />
                      </div>
                      <p className="text-white opacity-100 text-xs mt-1">{ar ? 'للاستخدام عند الحاجة للتواصل معك على رقم آخر' : 'For use when we need to reach you on another number'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white opacity-100 mb-2">{ar ? 'ملاحظات' : 'Notes'}</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all resize-none"
                        placeholder={ar ? 'أي ملاحظات أو استفسارات...' : 'Any notes or inquiries...'}
                      />
                    </div>

                    <UnifiedPaymentForm
                      locale={locale}
                      amount={depositAmount}
                      currency="OMR"
                      cardData={cardData}
                      onCardDataChange={setCardData}
                      formId="booking-form"
                      onCancel={() => router.push(`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`)}
                      submitLabel={isProcessingPayment ? (ar ? 'جاري معالجة الدفع...' : 'Processing payment...') : isSubmitting ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'دفع وطلب الحجز' : 'Pay & Submit Booking')}
                      loading={isProcessingPayment}
                      disabled={!canSubmit || isSubmitting}
                      showTerms
                      termsAccepted={termsAccepted}
                      onTermsChange={setTermsAccepted}
                      termsLabel={ar ? 'أوافق على شروط الحجز المذكورة أعلاه.' : 'I agree to the booking terms stated above.'}
                      showSimulationBadge
                    />
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    </div>
    </>
  );
}
