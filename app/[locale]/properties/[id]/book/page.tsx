'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { createBooking } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides, getPropertyOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';

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

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
  const canSubmit = formData.name && formData.email && formData.phone && isCardValid && termsAccepted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !canSubmit) return;
    setIsSubmitting(true);
    setIsProcessingPayment(true);
    setSubmitStatus('idle');
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setIsProcessingPayment(false);
      createBooking({
        propertyId: property.id,
        unitKey,
        propertyTitleAr,
        propertyTitleEn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message || undefined,
        type: 'BOOKING',
        paymentConfirmed: true,
        priceAtBooking: depositAmount,
      });
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => router.push(`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`), 3000);
    } catch {
      setSubmitStatus('error');
      setIsProcessingPayment(false);
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
              {isReserved && (
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
                        <p className="font-bold text-emerald-400 text-lg">{ar ? 'تم إرسال طلب الحجز بنجاح!' : 'Booking submitted successfully!'}</p>
                        <p className="text-white/70 text-sm mt-1">{ar ? 'سيتم تأكيد الحجز من قبل مدير العقار. سنتواصل معك قريباً.' : 'The property manager will confirm. We will contact you soon.'}</p>
                      </div>
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="mb-8 rounded-2xl bg-red-500/20 border border-red-400/30 p-4 text-red-300">
                      {ar ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.'}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">{ar ? 'الاسم الكامل *' : 'Full Name *'}</label>
                        <input
                          type="text"
                          required
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
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all"
                        placeholder="+968 XXXX XXXX"
                      />
                    </div>
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
