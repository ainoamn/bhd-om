'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { createBooking, getUserActiveBookingForProperty, type BookingContactType } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getPropertyOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import { isOmaniNationality, validatePhoneWithCountryCode, findContactForBookingSearch, getContactById, getContactDisplayName } from '@/lib/data/addressBook';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';

export default function PropertyBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const unitKey = searchParams?.get('unit') ?? undefined;
  const locale = (params?.locale as string) || 'ar';

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
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [clientSearchStatus, setClientSearchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [userHasExistingBooking, setUserHasExistingBooking] = useState<boolean | null>(null);
  const [existingBookingForLink, setExistingBookingForLink] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => setMounted(true), []);

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

  const handleClientSearch = () => {
    const q = clientSearchValue.replace(/\D/g, '').trim();
    if (q.length < 4) {
      setClientSearchStatus('idle');
      return;
    }
    // البحث بالهاتف (الرئيسي أو المفوض) أو الرقم المدني أو رقم السجل التجاري
    const result = findContactForBookingSearch(clientSearchValue);
    if (result) {
      const c = result.contact;
      const { code, number } = parsePhoneToCountryAndNumber(c.phone || '');
      if (c.contactType === 'COMPANY') {
        const cd = c.companyData;
        const rep = cd?.authorizedRepresentatives?.[0];
        const repContactId = rep && (rep as { contactId?: string }).contactId;
        const linkedRep = repContactId ? getContactById(repContactId) : undefined;
        const repName = (rep?.name || (linkedRep ? getContactDisplayName(linkedRep) : '')).trim() || '';
        const repNameEn = (rep?.nameEn || (linkedRep ? getContactDisplayName(linkedRep, 'en') : '')).trim() || '';
        const repPhone = rep?.phone || linkedRep?.phone;
        const parsedRepPhone = repPhone ? parsePhoneToCountryAndNumber(repPhone) : { code: '968', number: '' };
        setContactType('COMPANY');
        setFormData({
          ...formData,
          email: c.email || '',
          phone: number || '',
          phoneCountryCode: code || '968',
        });
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
        setFormData({
          name: [c.firstName, c.secondName, c.thirdName, c.familyName].filter(Boolean).join(' ') || c.name || '',
          email: c.email || '',
          phone: number || '',
          phoneCountryCode: code || '968',
          civilId: c.civilId || '',
          passportNumber: c.passportNumber || '',
          message: formData.message,
        });
      }
      setClientSearchStatus('found');
    } else {
      setClientSearchStatus('not_found');
    }
  };

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
        message: formData.message || undefined,
        type: 'BOOKING',
        paymentConfirmed: true,
        priceAtBooking: depositAmount,
        cardLast4: cardData.number.replace(/\s/g, '').slice(-4),
        cardExpiry: cardData.expiry,
        cardholderName: cardData.name.trim(),
      });
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', phoneCountryCode: '968', civilId: '', passportNumber: '', message: '' });
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

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const displayCardNumber = cardData.number || '•••• •••• •••• ••••';
  const displayCardName = cardData.name || (ar ? 'اسم حامل البطاقة' : 'CARDHOLDER NAME');
  const displayCardExpiry = cardData.expiry || 'MM/YY';

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">🔍</div>
          <p className="text-white/80 mb-6 text-lg">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all shadow-lg hover:shadow-[#8B6F47]/30">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  return (
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
                <span className="ml-2 text-sm font-medium text-white/90 hidden sm:inline">{ar ? 'البيانات' : 'Details'}</span>
              </div>
              <div className="w-8 md:w-16 h-0.5 bg-gradient-to-r from-[#8B6F47] to-[#C9A961]" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#8B6F47] text-white font-bold flex items-center justify-center shadow-lg shadow-[#8B6F47]/30">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-white/90 hidden sm:inline">{ar ? 'الدفع' : 'Payment'}</span>
              </div>
              <div className="w-8 md:w-16 h-0.5 bg-white/20" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white/60 font-bold flex items-center justify-center">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-white/50 hidden sm:inline">{ar ? 'التأكيد' : 'Confirm'}</span>
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
                    <p className="text-white/80 text-sm mt-1">
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
                    <span className="text-white/60 text-sm font-medium">{ar ? 'الإيجار الشهري' : 'Monthly Rent'}</span>
                    <span className="text-2xl font-bold text-[#C9A961] tracking-tight">
                      {unitPrice.toLocaleString('en-US')} <span className="text-base font-medium text-white/70">ر.ع</span>
                    </span>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#8B6F47]/20 to-[#C9A961]/10 border border-[#8B6F47]/30 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💎</span>
                      <h4 className="font-bold text-white">{ar ? 'مبلغ الحجز' : 'Booking Deposit'}</h4>
                    </div>
                    <p className="text-2xl font-bold text-[#C9A961] mb-1">
                      {depositAmount.toLocaleString('en-US')} <span className="text-sm font-medium text-white/70">ر.ع</span>
                    </p>
                    <p className="text-white/60 text-xs leading-relaxed">{ar ? terms.bookingDepositNoteAr : terms.bookingDepositNoteEn}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="xl:col-span-8 order-1 xl:order-2 space-y-6">
              {userHasExistingBooking && (
                <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-500/20 p-6">
                  <h3 className="font-bold text-emerald-300 flex items-center gap-2 mb-3">
                    <span className="text-xl">✓</span>
                    {ar ? 'هذا العقار محجوز لك' : 'This property is already booked by you'}
                  </h3>
                  <p className="text-emerald-100/90 text-sm leading-relaxed">
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
                  <h3 className="font-bold text-amber-200 flex items-center gap-2 mb-3">
                    <span className="text-xl">⚠️</span>
                    {ar ? 'تنبيه: هذا العقار محجوز حالياً' : 'Notice: This property is currently reserved'}
                  </h3>
                  <p className="text-amber-100/90 text-sm leading-relaxed">
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
                  <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/30 flex items-center justify-center text-xl">📋</span>
                    {ar ? 'شروط الحجز' : 'Booking Terms'}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
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
                  <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/30 flex items-center justify-center text-xl">✍️</span>
                    {ar ? 'بيانات الحجز والدفع' : 'Booking & Payment Details'}
                  </h2>
                </div>
                <div className="p-6 md:p-8">
                  {submitStatus === 'success' && (
                    <div className="mb-8 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 p-6 flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/30 flex items-center justify-center text-3xl flex-shrink-0">✓</div>
                      <div>
                        <p className="font-bold text-emerald-400 text-lg">{ar ? 'تم إتمام الدفع بنجاح!' : 'Payment completed successfully!'}</p>
                        <p className="text-white/70 text-sm mt-1">{ar ? 'سيتم تحويلك لصفحة إيصال الاستلام لطباعته أو تنزيله.' : 'You will be redirected to the receipt page to print or download it.'}</p>
                      </div>
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="mb-8 rounded-2xl bg-red-500/20 border border-red-400/30 p-4 text-red-300">
                      {submitError === 'ALREADY_BOOKED'
                        ? (ar ? 'هذا العقار محجوز لك بالفعل. لا يمكن إنشاء حجز مكرر.' : 'This property is already booked by you. Duplicate booking not allowed.')
                        : submitError === 'MAX_REACHED'
                          ? (ar ? 'تم الوصول للحد الأقصى من الحجوزات لهذا العقار.' : 'Maximum bookings reached for this property.')
                          : (ar ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.')}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* بحث عن عميل مسجل */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        {ar ? 'عميل مسجل؟ أدخل رقم الهاتف أو الرقم المدني أو رقم السجل التجاري' : 'Registered client? Enter phone, Civil ID or Commercial Registration No.'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={clientSearchValue}
                          onChange={(e) => { setClientSearchValue(e.target.value); setClientSearchStatus('idle'); }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleClientSearch())}
                          className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                          placeholder={ar ? 'الهاتف أو الرقم المدني أو رقم السجل' : 'Phone, Civil ID or CR number'}
                        />
                        <button
                          type="button"
                          onClick={handleClientSearch}
                          className="px-6 py-3 rounded-xl bg-[#8B6F47] hover:bg-[#6B5535] text-white font-semibold transition-all"
                        >
                          {ar ? 'بحث' : 'Search'}
                        </button>
                      </div>
                      {clientSearchStatus === 'found' && (
                        <p className="text-emerald-400 text-sm mt-2 flex items-center gap-2">
                          <span>✓</span> {ar ? 'تم العثور على البيانات وتعبئتها' : 'Data found and filled'}
                        </p>
                      )}
                      {clientSearchStatus === 'not_found' && (
                        <p className="text-amber-400 text-sm mt-2 flex items-center gap-2">
                          <span>!</span> {ar ? 'لم يتم العثور على عميل بهذا الرقم' : 'No client found with this number'}
                        </p>
                      )}
                    </div>

                    {/* نوع الحاجز */}
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-3">{ar ? 'نوع الحاجز *' : 'Applicant Type *'}</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="contactType"
                            checked={contactType === 'PERSONAL'}
                            onChange={() => setContactType('PERSONAL')}
                            className="w-4 h-4 text-[#8B6F47] focus:ring-[#8B6F47]"
                          />
                          <span className="text-white/90">{ar ? 'شخصي' : 'Personal'}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="contactType"
                            checked={contactType === 'COMPANY'}
                            onChange={() => setContactType('COMPANY')}
                            className="w-4 h-4 text-[#8B6F47] focus:ring-[#8B6F47]"
                          />
                          <span className="text-white/90">{ar ? 'شركة' : 'Company'}</span>
                        </label>
                      </div>
                    </div>

                    {contactType === 'PERSONAL' ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الاسم الكامل *' : 'Full Name *'}</label>
                            <input
                              type="text"
                              required={contactType === 'PERSONAL'}
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder={ar ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder="example@email.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم الهاتف *' : 'Phone *'}</label>
                          <div className="flex gap-2">
                            <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => { setFormData({ ...formData, phoneCountryCode: v }); setPhoneError(null); }} locale={locale as 'ar' | 'en'} variant="dark" />
                            <input
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setPhoneError(null); }}
                              className={`flex-1 px-5 py-4 rounded-xl bg-white/5 border text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all ${phoneError ? 'border-red-400' : 'border-white/10'}`}
                              placeholder={ar ? '91234567' : '91234567'}
                            />
                          </div>
                          {phoneError && <p className="text-red-400 text-xs mt-1">{ar ? (phoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (phoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                            <input
                              type="text"
                              value={formData.civilId}
                              onChange={(e) => setFormData({ ...formData, civilId: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder={ar ? 'أدخل الرقم المدني' : 'Enter civil ID'}
                            />
                            <p className="text-white/50 text-xs mt-1">{ar ? 'أو رقم الجواز أدناه' : 'Or passport number below'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم الجواز (اختياري)' : 'Passport (optional)'}</label>
                            <input
                              type="text"
                              value={formData.passportNumber}
                              onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder={ar ? 'للمقيمين بدون رقم مدني' : 'For residents without civil ID'}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'اسم الشركة (عربي) *' : 'Company Name (Ar) *'}</label>
                            <input
                              type="text"
                              value={companyForm.companyNameAr}
                              onChange={(e) => setCompanyForm({ ...companyForm, companyNameAr: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder={ar ? 'اسم الشركة' : 'Company name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'اسم الشركة (إنجليزي)' : 'Company Name (En)'}</label>
                            <input
                              type="text"
                              value={companyForm.companyNameEn}
                              onChange={(e) => setCompanyForm({ ...companyForm, companyNameEn: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder="Company name"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم السجل التجاري *' : 'Commercial Registration No. *'}</label>
                          <input
                            type="text"
                            value={companyForm.commercialRegistrationNumber}
                            onChange={(e) => setCompanyForm({ ...companyForm, commercialRegistrationNumber: e.target.value })}
                            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                            placeholder={ar ? 'رقم السجل' : 'CR number'}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              placeholder="example@email.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم هاتف الشركة *' : 'Company Phone *'}</label>
                            <div className="flex gap-2">
                              <PhoneCountryCodeSelect value={formData.phoneCountryCode} onChange={(v) => { setFormData({ ...formData, phoneCountryCode: v }); setPhoneError(null); }} locale={locale as 'ar' | 'en'} variant="dark" />
                              <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setPhoneError(null); }}
                                className={`flex-1 px-5 py-4 rounded-xl bg-white/5 border text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all ${phoneError ? 'border-red-400' : 'border-white/10'}`}
                                placeholder={ar ? '91234567' : '91234567'}
                              />
                            </div>
                            {phoneError && <p className="text-red-400 text-xs mt-1">{ar ? (phoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (phoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <h4 className="text-sm font-bold text-[#C9A961] mb-4">{ar ? 'المفوض بالتوقيع *' : 'Authorized Representative *'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'اسم المفوض (عربي) *' : 'Rep Name (Arabic) *'}</label>
                              <input type="text" value={companyForm.repName} onChange={(e) => setCompanyForm({ ...companyForm, repName: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'الاسم الكامل' : 'Full name'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'اسم المفوض (إنجليزي) *' : 'Rep Name (English) *'}</label>
                              <input type="text" value={companyForm.repNameEn} onChange={(e) => setCompanyForm({ ...companyForm, repNameEn: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'الترجمة الإنجليزية' : 'English translation'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'المنصب *' : 'Position *'}</label>
                              <input type="text" value={companyForm.repPosition} onChange={(e) => setCompanyForm({ ...companyForm, repPosition: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'مدير، مفوض...' : 'Manager, Authorized...'} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'هاتف المفوض *' : 'Rep Phone *'}</label>
                              <div className="flex gap-2">
                                <PhoneCountryCodeSelect value={companyForm.repPhoneCountryCode} onChange={(v) => { setCompanyForm({ ...companyForm, repPhoneCountryCode: v }); setRepPhoneError(null); }} locale={locale as 'ar' | 'en'} variant="dark" size="sm" />
                                <input type="tel" value={companyForm.repPhone} onChange={(e) => { setCompanyForm({ ...companyForm, repPhone: e.target.value }); setRepPhoneError(null); }} className={`flex-1 px-4 py-3 rounded-lg bg-white/5 border text-white text-sm ${repPhoneError ? 'border-red-400' : 'border-white/10'}`} placeholder={ar ? '91234567' : '91234567'} />
                              </div>
                              {repPhoneError && <p className="text-red-400 text-xs mt-1">{ar ? (repPhoneError === 'invalidPhoneOmanMin8' ? 'رقم عمان يجب أن يكون 8 أرقام على الأقل' : 'رقم الهاتف قصير جداً') : (repPhoneError === 'invalidPhoneOmanMin8' ? 'Oman number must be at least 8 digits' : 'Phone number is too short')}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'الجنسية *' : 'Nationality *'}</label>
                              <input type="text" value={companyForm.repNationality} onChange={(e) => setCompanyForm({ ...companyForm, repNationality: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'عماني، سعودي...' : 'Omani, Saudi...'} />
                            </div>
                            {repOmani ? (
                              <div>
                                <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'الرقم المدني *' : 'Civil ID *'}</label>
                                <input type="text" value={companyForm.repCivilId} onChange={(e) => setCompanyForm({ ...companyForm, repCivilId: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'الرقم المدني' : 'Civil ID'} />
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                                  <input type="text" value={companyForm.repCivilId} onChange={(e) => setCompanyForm({ ...companyForm, repCivilId: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'إن وجد' : 'If any'} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1">{ar ? 'رقم الجواز *' : 'Passport No. *'}</label>
                                  <input type="text" value={companyForm.repPassportNumber} onChange={(e) => setCompanyForm({ ...companyForm, repPassportNumber: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm" placeholder={ar ? 'للوفد' : 'For expats'} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'ملاحظات' : 'Notes'}</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all resize-none"
                        placeholder={ar ? 'أي ملاحظات أو استفسارات...' : 'Any notes or inquiries...'}
                      />
                    </div>

                    {/* 3D Visa Card + Form */}
                    <div className="relative">
                      <div className="absolute top-3 end-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/30">
                          {ar ? 'محاكاة' : 'Simulation'}
                        </span>
                      </div>
                      <div className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-6 md:p-8">
                        <div className="flex flex-col lg:flex-row gap-8">
                          {/* 3D Card Preview */}
                          <div className="lg:w-80 flex-shrink-0">
                            <div
                              className="relative aspect-[1.586/1] rounded-2xl overflow-hidden transform transition-transform duration-300 hover:scale-[1.02]"
                              style={{
                                background: 'linear-gradient(135deg, #1a1f36 0%, #2d3548 50%, #1a1f36 100%)',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                              }}
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,169,97,0.15)_0%,_transparent_50%)]" />
                              <div className="absolute top-6 start-6 end-6 flex justify-between">
                                <div className="w-12 h-8 rounded bg-white/20" />
                                <span className="text-white/90 font-mono text-sm tracking-widest">VISA</span>
                              </div>
                              <div className="absolute bottom-6 start-6 end-6">
                                <p className="font-mono text-white text-lg tracking-[0.2em] mb-2">
                                  {displayCardNumber}
                                </p>
                                <div className="flex justify-between items-end">
                                  <div>
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">{ar ? 'الاسم' : 'NAME'}</p>
                                    <p className="text-white/90 text-sm font-medium uppercase truncate max-w-[140px]">{displayCardName}</p>
                                  </div>
                                  <div className="text-end">
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">{ar ? 'انتهاء' : 'EXPIRES'}</p>
                                    <p className="text-white/90 text-sm font-mono">{displayCardExpiry}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Inputs */}
                          <div className="flex-1 space-y-5">
                            <div>
                              <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'رقم البطاقة' : 'Card Number'}</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={19}
                                value={cardData.number}
                                onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                                placeholder="1234 5678 9012 3456"
                                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono placeholder-white/30 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'انتهاء (شهر/سنة)' : 'Expiry (MM/YY)'}</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={5}
                                  value={cardData.expiry}
                                  onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                                  placeholder="MM/YY"
                                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono placeholder-white/30 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-white/90 mb-2">CVV</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={cardData.cvv}
                                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                  placeholder="123"
                                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono placeholder-white/30 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'اسم حامل البطاقة' : 'Cardholder Name'}</label>
                              <input
                                type="text"
                                value={cardData.name}
                                onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                                placeholder={ar ? 'الاسم كما يظهر على البطاقة' : 'Name as on card'}
                                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <span className="text-2xl font-bold text-[#C9A961]">
                                {depositAmount.toLocaleString('en-US')} <span className="text-sm font-medium text-white/60">ر.ع</span>
                              </span>
                              <span className="text-white/50 text-sm">—</span>
                              <span className="text-white/60 text-sm">{ar ? 'مبلغ الدفع' : 'Payment amount'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trust + Terms */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <label className="flex items-start gap-4 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-white/30 bg-white/5 text-[#8B6F47] focus:ring-[#8B6F47] focus:ring-offset-0 focus:ring-offset-transparent"
                        />
                        <span className="text-white/80 group-hover:text-white text-sm">
                          {ar ? 'أوافق على شروط الحجز المذكورة أعلاه.' : 'I agree to the booking terms stated above.'}
                        </span>
                      </label>
                      <div className="flex items-center gap-4 text-white/50 text-xs">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a3 3 0 013 3v1a3 3 0 01-6 0v-1a3 3 0 013-3z" clipRule="evenodd" /></svg>
                          {ar ? 'اتصال آمن' : 'Secure'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          SSL
                        </span>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
                      <Link
                        href={`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`}
                        className="px-8 py-4 rounded-xl font-bold text-white/80 hover:text-white border border-white/20 hover:border-white/40 hover:bg-white/5 text-center transition-all"
                      >
                        {ar ? 'إلغاء' : 'Cancel'}
                      </Link>
                      <button
                        type="submit"
                        disabled={!canSubmit || isSubmitting || isProcessingPayment}
                        className="flex-1 relative px-8 py-5 rounded-xl font-bold text-lg bg-gradient-to-r from-[#8B6F47] to-[#A6895F] text-white hover:from-[#6B5535] hover:to-[#8B6F47] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30 overflow-hidden group"
                      >
                        {isProcessingPayment && (
                          <span className="absolute inset-0 bg-white/10 flex items-center justify-center">
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </span>
                        )}
                        <span className={isProcessingPayment ? 'invisible' : ''}>
                          {isProcessingPayment
                            ? (ar ? 'جاري معالجة الدفع...' : 'Processing payment...')
                            : isSubmitting
                              ? (ar ? 'جاري الإرسال...' : 'Submitting...')
                              : (ar ? 'دفع وطلب الحجز' : 'Pay & Submit Booking')}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
