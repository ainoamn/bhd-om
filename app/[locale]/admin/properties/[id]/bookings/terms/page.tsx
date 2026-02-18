'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import {
  getPropertyBookingTerms,
  savePropertyBookingTerms,
  CONTRACT_DOC_TYPES,
  CONTRACT_TYPES,
  DEFAULT_CONTRACT_DOC_REQUIREMENTS,
  type PropertyBookingTerms,
  type ContractDocRequirement,
  type ContractType,
} from '@/lib/data/bookingTerms';

type TabId = 'booking' | 'contract';

export default function BookingTermsPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyType, setPropertyType] = useState<'SALE' | 'RENT' | 'INVESTMENT'>('RENT');
  const [activeTab, setActiveTab] = useState<TabId>('booking');
  const [activeContractType, setActiveContractType] = useState<ContractType>('RENT');
  const [terms, setTerms] = useState<PropertyBookingTerms>({ bookingTermsAr: '', bookingTermsEn: '', bookingDepositNoteAr: '', bookingDepositNoteEn: '', bookingDepositAmount: undefined });
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsSaved, setTermsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabelAr, setCustomLabelAr] = useState('');
  const [customLabelEn, setCustomLabelEn] = useState('');
  const [customIsRequired, setCustomIsRequired] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dataOverrides = getPropertyDataOverrides();
    const prop = getPropertyById(id, dataOverrides);
    if (prop) {
      setPropertyTitle(ar ? prop.titleAr : prop.titleEn);
      const pt = (prop as { type?: 'SALE' | 'RENT' | 'INVESTMENT' }).type;
      if (pt) setPropertyType(pt);
      if (pt && activeContractType !== pt) setActiveContractType(pt);
    }
    setTerms(getPropertyBookingTerms(id));
  }, [id, locale, ar]);

  const handleSaveTerms = () => {
    setTermsSaving(true);
    savePropertyBookingTerms(id, terms);
    setTermsSaving(false);
    setTermsSaved(true);
    setTimeout(() => setTermsSaved(false), 3000);
  };

  /** المستندات المطلوبة لنوع العقد الحالي */
  const getCurrentRequiredDocTypes = (): ContractDocRequirement[] => {
    const byType = terms.contractTermsByType?.[activeContractType];
    if (byType?.requiredDocTypes?.length) return byType.requiredDocTypes;
    if (terms.requiredDocTypes?.length) return terms.requiredDocTypes;
    return DEFAULT_CONTRACT_DOC_REQUIREMENTS;
  };

  const setDocRequirement = (docTypeId: string, isRequired: boolean | null) => {
    const current = getCurrentRequiredDocTypes();
    const doc = CONTRACT_DOC_TYPES.find((d) => d.id === docTypeId);
    const isCustom = docTypeId.startsWith('CUSTOM_');
    if (!doc && !isCustom) return;
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    if (isRequired === null) {
      const next = current.filter((r) => r.docTypeId !== docTypeId);
      setTerms({
        ...terms,
        contractTermsByType: {
          ...byType,
          [activeContractType]: { ...existingForType, requiredDocTypes: next.length ? next : undefined },
        },
      });
      return;
    }
    const existing = current.find((r) => r.docTypeId === docTypeId);
    const labelAr = doc ? doc.labelAr : (existing?.labelAr || '');
    const labelEn = doc ? doc.labelEn : (existing?.labelEn || '');
    const next = existing
      ? current.map((r) => (r.docTypeId === docTypeId ? { ...r, labelAr, labelEn, isRequired } : r))
      : [...current, { docTypeId, labelAr, labelEn, isRequired }];
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...existingForType, requiredDocTypes: next },
      },
    });
  };

  const isDocRequired = (docTypeId: string) => {
    return getCurrentRequiredDocTypes().some((r) => r.docTypeId === docTypeId && r.isRequired);
  };

  const isDocOptional = (docTypeId: string) => {
    return getCurrentRequiredDocTypes().some((r) => r.docTypeId === docTypeId && !r.isRequired);
  };

  const isCustomDoc = (docTypeId: string) => docTypeId.startsWith('CUSTOM_');

  const addCustomDocument = (labelAr: string, labelEn: string, isRequired: boolean) => {
    const customId = `CUSTOM_${Date.now()}`;
    const current = getCurrentRequiredDocTypes();
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: {
          ...existingForType,
          requiredDocTypes: [...current, { docTypeId: customId, labelAr, labelEn, isRequired }],
        },
      },
    });
  };

  const removeDocRequirement = (docTypeId: string) => {
    const current = getCurrentRequiredDocTypes().filter((r) => r.docTypeId !== docTypeId);
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...existingForType, requiredDocTypes: current.length ? current : undefined },
      },
    });
  };

  const getContractTypeTermsAr = () =>
    terms.contractTermsByType?.[activeContractType]?.contractDocTermsAr ?? terms.contractDocTermsAr ?? '';
  const getContractTypeTermsEn = () =>
    terms.contractTermsByType?.[activeContractType]?.contractDocTermsEn ?? terms.contractDocTermsEn ?? '';
  const setContractTypeTermsAr = (v: string) => {
    const byType = terms.contractTermsByType ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...(byType[activeContractType] ?? {}), contractDocTermsAr: v },
      },
    });
  };
  const setContractTypeTermsEn = (v: string) => {
    const byType = terms.contractTermsByType ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...(byType[activeContractType] ?? {}), contractDocTermsEn: v },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <Link
          href={`/${locale}/admin/properties/${id}/bookings`}
          className="inline-flex items-center gap-2 text-[#8B6F47] hover:text-[#6B5535] font-semibold mb-4 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center">←</span>
          {ar ? 'العودة للحجوزات' : 'Back to Bookings'}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {ar ? 'الشروط' : 'Terms'}
            </h1>
            <p className="text-gray-500 mt-1 font-medium">{propertyTitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/properties/${id}/contract-terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all"
            >
              <span>🔗</span>
              {ar ? 'عرض شروط توثيق العقد للمستأجر' : 'View Contract Terms (Tenant)'}
            </Link>
            <Link
              href={`/${locale}/properties/${id}/book`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
            >
              <span>🔗</span>
              {ar ? 'عرض صفحة الحجز' : 'View Booking Page'}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'booking' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {ar ? 'شروط الحجز' : 'Booking Terms'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contract')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'contract' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {ar ? 'شروط توثيق العقد' : 'Contract Documentation Terms'}
        </button>
      </div>

      {/* Tab: شروط الحجز */}
      {activeTab === 'booking' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/5 via-amber-50/50 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#8B6F47]/10 flex items-center justify-center text-2xl flex-shrink-0">📋</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{ar ? 'شروط الحجز' : 'Booking Terms'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{ar ? 'ستظهر هذه الشروط للمستأجر في صفحة الحجز.' : 'These terms will be shown to the tenant on the booking page.'}</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'شروط الحجز (عربي)' : 'Booking Terms (Arabic)'}</label>
                <textarea value={terms.bookingTermsAr} onChange={(e) => setTerms({ ...terms, bookingTermsAr: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none" placeholder={ar ? 'مثال: مبلغ الحجز لا يقل عن إيجار شهر واحد...' : 'e.g. Booking deposit is at least one month\'s rent...'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'شروط الحجز (إنجليزي)' : 'Booking Terms (English)'}</label>
                <textarea value={terms.bookingTermsEn} onChange={(e) => setTerms({ ...terms, bookingTermsEn: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none" placeholder="e.g. Booking deposit is at least one month's rent..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (عربي)' : 'Deposit Note (Arabic)'}</label>
                <input type="text" value={terms.bookingDepositNoteAr} onChange={(e) => setTerms({ ...terms, bookingDepositNoteAr: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900" placeholder={ar ? 'مثال: مبلغ لا يقل عن إيجار شهر واحد' : 'e.g. At least one month\'s rent'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (إنجليزي)' : 'Deposit Note (English)'}</label>
                <input type="text" value={terms.bookingDepositNoteEn} onChange={(e) => setTerms({ ...terms, bookingDepositNoteEn: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900" placeholder="e.g. At least one month's rent" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#8B6F47]/5 to-amber-50/30 border border-[#8B6F47]/20">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'قيمة الحجز (ر.ع)' : 'Booking Deposit Amount (OMR)'}</label>
                <input type="number" min={0} step={0.01} value={terms.bookingDepositAmount ?? ''} onChange={(e) => { const v = e.target.value; setTerms({ ...terms, bookingDepositAmount: v === '' ? undefined : parseFloat(v) || 0 }); }} className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900" placeholder={ar ? 'مثال: 150' : 'e.g. 150'} />
                <p className="text-sm text-gray-500 mt-1.5">{ar ? 'عند استيفاء هذا المبلغ من العميل، يتم حجز المبلغ تلقائياً.' : 'When the client pays this amount, the deposit is automatically reserved.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: شروط توثيق العقد */}
      {activeTab === 'contract' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/5 via-amber-50/50 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#8B6F47]/10 flex items-center justify-center text-2xl flex-shrink-0">📄</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{ar ? 'شروط توثيق العقد' : 'Contract Documentation Terms'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{ar ? 'حدد الشروط والمستندات المطلوبة حسب نوع العقد (بيع، إيجار، استثمار).' : 'Specify terms and documents required per contract type (sale, rent, investment).'}</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            {/* تبويبات نوع العقد */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ar ? 'نوع العقد' : 'Contract type'}</label>
              <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                {CONTRACT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setActiveContractType(ct.id)}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${activeContractType === ct.id ? 'bg-[#8B6F47] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {ar ? ct.labelAr : ct.labelEn}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {ar ? `عقارك من نوع "${propertyType === 'SALE' ? 'بيع' : propertyType === 'RENT' ? 'إيجار' : 'استثمار'}" - الشروط المعروضة للمستأجر/المشتري تعتمد على نوع العقار.` : `Your property is "${propertyType}" - Terms shown to tenant/buyer depend on property type.`}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? `شروط توثيق العقد - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelAr} (عربي)` : `Contract Doc Terms - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelEn} (Arabic)`}</label>
                <textarea value={getContractTypeTermsAr()} onChange={(e) => setContractTypeTermsAr(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none" placeholder={ar ? 'مثال: يُطلب من المستأجر إرفاق المستندات التالية...' : 'e.g. Tenant must provide the following documents...'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? `شروط توثيق العقد - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelAr} (إنجليزي)` : `Contract Doc Terms - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelEn} (English)`}</label>
                <textarea value={getContractTypeTermsEn()} onChange={(e) => setContractTypeTermsEn(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none transition-all text-gray-900 resize-none" placeholder="e.g. Tenant must provide the following documents..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ar ? `المستندات المطلوبة - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelAr}` : `Documents required - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelEn}`}</label>
              <p className="text-sm text-gray-500 mb-4">{ar ? 'حدد المستندات التي يجب إرفاقها. (مطلوب = إلزامي، اختياري = يمكن إرفاقه)' : 'Select documents to upload. (Required = mandatory, Optional = can be uploaded)'}</p>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">{ar ? 'ملاحظة: جواز السفر لا يُطلب تلقائياً من العمانيين (حسب بيانات دفتر العناوين). الوافدون يُطلب منهم صورة الجواز.' : 'Note: Passport is automatically excluded for Omani nationals (per address book). Expatriates are required to upload passport.'}</p>
              <div className="flex flex-wrap gap-3">
                {CONTRACT_DOC_TYPES.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                    <span className="text-sm font-medium text-gray-900">{ar ? doc.labelAr : doc.labelEn}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDocRequirement(doc.id, true)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          isDocRequired(doc.id) ? 'bg-[#8B6F47] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {ar ? 'مطلوب' : 'Required'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocRequirement(doc.id, false)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          isDocOptional(doc.id) ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {ar ? 'اختياري' : 'Optional'}
                      </button>
                      {(isDocRequired(doc.id) || isDocOptional(doc.id)) && (
                        <button type="button" onClick={() => setDocRequirement(doc.id, null)} className="text-xs text-red-600 hover:underline">
                          {ar ? 'إزالة' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {getCurrentRequiredDocTypes().filter((r) => isCustomDoc(r.docTypeId)).map((r) => (
                  <div key={r.docTypeId} className="flex items-center gap-2 p-3 rounded-xl border border-[#8B6F47]/30 bg-amber-50/50">
                    <span className="text-sm font-medium text-gray-900">{ar ? (r.labelAr || r.labelEn) : (r.labelEn || r.labelAr)}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDocRequirement(r.docTypeId, true)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          r.isRequired ? 'bg-[#8B6F47] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {ar ? 'مطلوب' : 'Required'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocRequirement(r.docTypeId, false)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          !r.isRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {ar ? 'اختياري' : 'Optional'}
                      </button>
                      <button type="button" onClick={() => removeDocRequirement(r.docTypeId)} className="text-xs text-red-600 hover:underline">
                        {ar ? 'إزالة' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                {showAddCustom ? (
                  <div className="p-4 rounded-2xl border border-[#8B6F47]/30 bg-amber-50/30 space-y-4">
                    <h4 className="font-semibold text-gray-900">{ar ? 'إضافة مستند آخر' : 'Add custom document'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={customLabelAr}
                        onChange={(e) => setCustomLabelAr(e.target.value)}
                        placeholder={ar ? 'اسم المستند (عربي)' : 'Document name (Arabic)'}
                        className="px-4 py-2 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none"
                      />
                      <input
                        type="text"
                        value={customLabelEn}
                        onChange={(e) => setCustomLabelEn(e.target.value)}
                        placeholder={ar ? 'اسم المستند (إنجليزي)' : 'Document name (English)'}
                        className="px-4 py-2 rounded-xl border border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">{ar ? 'النوع:' : 'Type:'}</span>
                      <button
                        type="button"
                        onClick={() => setCustomIsRequired(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${customIsRequired ? 'bg-[#8B6F47] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                      >
                        {ar ? 'مطلوب' : 'Required'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomIsRequired(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!customIsRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                      >
                        {ar ? 'اختياري' : 'Optional'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (customLabelAr.trim() || customLabelEn.trim()) {
                            addCustomDocument(customLabelAr.trim() || customLabelEn.trim(), customLabelEn.trim() || customLabelAr.trim(), customIsRequired);
                            setCustomLabelAr('');
                            setCustomLabelEn('');
                            setShowAddCustom(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535]"
                      >
                        {ar ? 'إضافة' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddCustom(false); setCustomLabelAr(''); setCustomLabelEn(''); }}
                        className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500"
                      >
                        {ar ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all"
                  >
                    <span>+</span>
                    {ar ? 'إضافة مستند آخر' : 'Add custom document'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSaveTerms}
          disabled={termsSaving}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-[#8B6F47] hover:bg-[#6B5535] disabled:opacity-70 transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
        >
          {termsSaving ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {ar ? 'جاري الحفظ...' : 'Saving...'}
            </>
          ) : (
            <>
              <span>💾</span>
              {ar ? 'حفظ الشروط' : 'Save Terms'}
            </>
          )}
        </button>
        {termsSaved && (
          <span className="flex items-center gap-2 text-emerald-600 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>
            {ar ? 'تم الحفظ' : 'Saved'}
          </span>
        )}
      </div>
    </div>
  );
}
