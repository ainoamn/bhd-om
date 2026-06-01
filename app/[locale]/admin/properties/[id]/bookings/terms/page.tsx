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
  const [showAddCustomFor, setShowAddCustomFor] = useState<'individuals' | 'companies' | null>(null);
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

  /** المستندات المطلوبة للأفراد لنوع العقد الحالي */
  const getCurrentRequiredDocTypesForIndividuals = (): ContractDocRequirement[] => {
    const byType = terms.contractTermsByType?.[activeContractType];
    if (byType?.requiredDocTypesForIndividuals?.length) return byType.requiredDocTypesForIndividuals;
    if (byType?.requiredDocTypes?.length) return byType.requiredDocTypes;
    if (terms.requiredDocTypes?.length) return terms.requiredDocTypes;
    return DEFAULT_CONTRACT_DOC_REQUIREMENTS;
  };

  /** المستندات المطلوبة للشركات لنوع العقد الحالي */
  const getCurrentRequiredDocTypesForCompanies = (): ContractDocRequirement[] => {
    const byType = terms.contractTermsByType?.[activeContractType];
    return byType?.requiredDocTypesForCompanies ?? [];
  };

  const setDocRequirementForIndividuals = (docTypeId: string, isRequired: boolean | null) => {
    const current = getCurrentRequiredDocTypesForIndividuals();
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
          [activeContractType]: { ...existingForType, requiredDocTypesForIndividuals: next.length ? next : undefined },
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
        [activeContractType]: { ...existingForType, requiredDocTypesForIndividuals: next },
      },
    });
  };

  const setDocRequirementForCompanies = (docTypeId: string, isRequired: boolean | null) => {
    const current = getCurrentRequiredDocTypesForCompanies();
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
          [activeContractType]: { ...existingForType, requiredDocTypesForCompanies: next.length ? next : undefined },
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
        [activeContractType]: { ...existingForType, requiredDocTypesForCompanies: next },
      },
    });
  };

  const isDocRequiredForIndividuals = (docTypeId: string) =>
    getCurrentRequiredDocTypesForIndividuals().some((r) => r.docTypeId === docTypeId && r.isRequired);
  const isDocOptionalForIndividuals = (docTypeId: string) =>
    getCurrentRequiredDocTypesForIndividuals().some((r) => r.docTypeId === docTypeId && !r.isRequired);
  const isDocRequiredForCompanies = (docTypeId: string) =>
    getCurrentRequiredDocTypesForCompanies().some((r) => r.docTypeId === docTypeId && r.isRequired);
  const isDocOptionalForCompanies = (docTypeId: string) =>
    getCurrentRequiredDocTypesForCompanies().some((r) => r.docTypeId === docTypeId && !r.isRequired);

  const isCustomDoc = (docTypeId: string) => docTypeId.startsWith('CUSTOM_');

  const addCustomDocumentForIndividuals = (labelAr: string, labelEn: string, isRequired: boolean) => {
    const customId = `CUSTOM_${Date.now()}`;
    const current = getCurrentRequiredDocTypesForIndividuals();
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: {
          ...existingForType,
          requiredDocTypesForIndividuals: [...current, { docTypeId: customId, labelAr, labelEn, isRequired }],
        },
      },
    });
  };

  const addCustomDocumentForCompanies = (labelAr: string, labelEn: string, isRequired: boolean) => {
    const customId = `CUSTOM_${Date.now()}`;
    const current = getCurrentRequiredDocTypesForCompanies();
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: {
          ...existingForType,
          requiredDocTypesForCompanies: [...current, { docTypeId: customId, labelAr, labelEn, isRequired }],
        },
      },
    });
  };

  const removeDocRequirementForIndividuals = (docTypeId: string) => {
    const current = getCurrentRequiredDocTypesForIndividuals().filter((r) => r.docTypeId !== docTypeId);
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...existingForType, requiredDocTypesForIndividuals: current.length ? current : undefined },
      },
    });
  };

  const removeDocRequirementForCompanies = (docTypeId: string) => {
    const current = getCurrentRequiredDocTypesForCompanies().filter((r) => r.docTypeId !== docTypeId);
    const byType = terms.contractTermsByType ?? {};
    const existingForType = byType[activeContractType] ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...existingForType, requiredDocTypesForCompanies: current.length ? current : undefined },
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
  const getEntryNoticeAr = () => terms.contractTermsByType?.[activeContractType]?.entryNoticeAr ?? '';
  const getEntryNoticeEn = () => terms.contractTermsByType?.[activeContractType]?.entryNoticeEn ?? '';
  const setEntryNotice = (ar: string, en: string) => {
    const byType = terms.contractTermsByType ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...(byType[activeContractType] ?? {}), entryNoticeAr: ar || undefined, entryNoticeEn: en || undefined },
      },
    });
  };
  const getCompletionNoteAr = () => terms.contractTermsByType?.[activeContractType]?.completionNoteAr ?? '';
  const getCompletionNoteEn = () => terms.contractTermsByType?.[activeContractType]?.completionNoteEn ?? '';
  const setCompletionNote = (ar: string, en: string) => {
    const byType = terms.contractTermsByType ?? {};
    setTerms({
      ...terms,
      contractTermsByType: {
        ...byType,
        [activeContractType]: { ...(byType[activeContractType] ?? {}), completionNoteAr: ar || undefined, completionNoteEn: en || undefined },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <Link
          href={`/${locale}/admin/properties/${id}/bookings`}
          className="inline-flex items-center gap-2 admin-accent-text hover:admin-accent-text font-semibold mb-4 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg admin-accent-bg-soft flex items-center justify-center">←</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold admin-accent-text admin-accent-bg-soft hover:admin-btn-primary/20 border admin-accent-border/30 transition-all"
            >
              <span>🔗</span>
              {ar ? 'عرض شروط توثيق العقد للمستأجر' : 'View Contract Terms (Tenant)'}
            </Link>
            <Link
              href={`/${locale}/properties/${id}/book`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white admin-btn-primary hover:opacity-90 transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
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
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[color:var(--admin-primary)]/5 via-amber-50/50 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl admin-accent-bg-soft flex items-center justify-center text-2xl flex-shrink-0">📋</div>
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
                <textarea value={terms.bookingTermsAr} onChange={(e) => setTerms({ ...terms, bookingTermsAr: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900 resize-none" placeholder={ar ? 'مثال: مبلغ الحجز لا يقل عن إيجار شهر واحد...' : 'e.g. Booking deposit is at least one month\'s rent...'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'شروط الحجز (إنجليزي)' : 'Booking Terms (English)'}</label>
                <textarea value={terms.bookingTermsEn} onChange={(e) => setTerms({ ...terms, bookingTermsEn: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900 resize-none" placeholder="e.g. Booking deposit is at least one month's rent..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (عربي)' : 'Deposit Note (Arabic)'}</label>
                <input type="text" value={terms.bookingDepositNoteAr} onChange={(e) => setTerms({ ...terms, bookingDepositNoteAr: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900" placeholder={ar ? 'مثال: مبلغ لا يقل عن إيجار شهر واحد' : 'e.g. At least one month\'s rent'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'ملاحظة مبلغ العربون (إنجليزي)' : 'Deposit Note (English)'}</label>
                <input type="text" value={terms.bookingDepositNoteEn} onChange={(e) => setTerms({ ...terms, bookingDepositNoteEn: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900" placeholder="e.g. At least one month's rent" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 rounded-2xl bg-gradient-to-r from-[color:var(--admin-primary)]/5 to-amber-50/30 border admin-accent-border/20">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'قيمة الحجز (ر.ع)' : 'Booking Deposit Amount (OMR)'}</label>
                <input type="number" min={0} step={0.01} value={terms.bookingDepositAmount ?? ''} onChange={(e) => { const v = e.target.value; setTerms({ ...terms, bookingDepositAmount: v === '' ? undefined : parseFloat(v) || 0 }); }} className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900" placeholder={ar ? 'مثال: 150' : 'e.g. 150'} />
                <p className="text-sm text-gray-500 mt-1.5">{ar ? 'عند استيفاء هذا المبلغ من العميل، يتم حجز المبلغ تلقائياً.' : 'When the client pays this amount, the deposit is automatically reserved.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: شروط توثيق العقد */}
      {activeTab === 'contract' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden transition-all">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[color:var(--admin-primary)]/5 via-amber-50/50 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl admin-accent-bg-soft flex items-center justify-center text-2xl flex-shrink-0">📄</div>
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
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all ${activeContractType === ct.id ? 'admin-btn-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
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
                <textarea value={getContractTypeTermsAr()} onChange={(e) => setContractTypeTermsAr(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900 resize-none" placeholder={ar ? 'مثال: يُطلب من المستأجر إرفاق المستندات التالية...' : 'e.g. Tenant must provide the following documents...'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? `شروط توثيق العقد - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelAr} (إنجليزي)` : `Contract Doc Terms - ${CONTRACT_TYPES.find((c) => c.id === activeContractType)?.labelEn} (English)`}</label>
                <textarea value={getContractTypeTermsEn()} onChange={(e) => setContractTypeTermsEn(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none transition-all text-gray-900 resize-none" placeholder="e.g. Tenant must provide the following documents..." />
              </div>
            </div>
            <div className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/30">
              <h3 className="text-base font-bold text-gray-900 mb-2">📢 {ar ? 'ملاحظة عند الدخول للصفحة' : 'Entry notice'}</h3>
              <p className="text-sm text-gray-600 mb-4">{ar ? 'تظهر عند دخول المستأجر لصفحة شروط العقد (استرجاع للطلب، مطلوب تحديث، طلب جديد...)' : 'Shown when tenant enters contract-terms page (e.g. request retrieval, update required, new request)'}</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ملاحظة الدخول (عربي)' : 'Entry notice (Arabic)'}</label>
                  <textarea value={getEntryNoticeAr()} onChange={(e) => setEntryNotice(e.target.value, getEntryNoticeEn())} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none text-gray-900 resize-none" placeholder={ar ? 'مثال: مطلوب تحديث البيانات' : 'e.g. Update required'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ملاحظة الدخول (إنجليزي)' : 'Entry notice (English)'}</label>
                  <textarea value={getEntryNoticeEn()} onChange={(e) => setEntryNotice(getEntryNoticeAr(), e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none text-gray-900 resize-none" placeholder="e.g. Update required" />
                </div>
              </div>
            </div>
            <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30">
              <h3 className="text-base font-bold text-gray-900 mb-2">✅ {ar ? 'ملاحظة عند اكتمال البيانات' : 'Completion note'}</h3>
              <p className="text-sm text-gray-600 mb-4">{ar ? 'تظهر عند اكتمال المستأجر تعبئة كل البيانات والمستندات' : 'Shown when tenant completes all required data and documents'}</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ملاحظة الاكتمال (عربي)' : 'Completion note (Arabic)'}</label>
                  <textarea value={getCompletionNoteAr()} onChange={(e) => setCompletionNote(e.target.value, getCompletionNoteEn())} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none text-gray-900 resize-none" placeholder={ar ? 'مثال: سنتواصل معكم قريباً' : 'e.g. We will contact you soon'} />
            </div>
            <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ملاحظة الاكتمال (إنجليزي)' : 'Completion note (English)'}</label>
                  <textarea value={getCompletionNoteEn()} onChange={(e) => setCompletionNote(getCompletionNoteAr(), e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none text-gray-900 resize-none" placeholder="e.g. We will contact you soon" />
                </div>
              </div>
            </div>
            <div className="space-y-8">
              {/* مستندات الأفراد */}
              <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30">
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-600">👤</span>
                  {ar ? 'مستندات الأفراد' : 'Individual Documents'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{ar ? 'المستندات المطلوبة من المستأجر الفردي (شخصية). جواز السفر يُستبعد تلقائياً للعمانيين.' : 'Documents required from individual tenants. Passport is auto-excluded for Omani nationals.'}</p>
              <div className="flex flex-wrap gap-3">
                  {CONTRACT_DOC_TYPES.filter((d) => !['COMMERCIAL_REGISTRATION', 'AUTHORIZED_REP_CARD'].includes(d.id)).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white">
                    <span className="text-sm font-medium text-gray-900">{ar ? doc.labelAr : doc.labelEn}</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setDocRequirementForIndividuals(doc.id, true)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${isDocRequiredForIndividuals(doc.id) ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                        {ar ? 'مطلوب' : 'Required'}
                      </button>
                        <button type="button" onClick={() => setDocRequirementForIndividuals(doc.id, false)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${isDocOptionalForIndividuals(doc.id) ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                        {ar ? 'اختياري' : 'Optional'}
                        </button>
                        {(isDocRequiredForIndividuals(doc.id) || isDocOptionalForIndividuals(doc.id)) && (
                          <button type="button" onClick={() => setDocRequirementForIndividuals(doc.id, null)} className="text-xs text-red-600 hover:underline">{ar ? 'إزالة' : 'Remove'}</button>
                      )}
                    </div>
                  </div>
                ))}
                  {getCurrentRequiredDocTypesForIndividuals().filter((r) => isCustomDoc(r.docTypeId)).map((r) => (
                  <div key={r.docTypeId} className="flex items-center gap-2 p-3 rounded-xl border admin-accent-border/30 bg-amber-50/50">
                    <span className="text-sm font-medium text-gray-900">{ar ? (r.labelAr || r.labelEn) : (r.labelEn || r.labelAr)}</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setDocRequirementForIndividuals(r.docTypeId, true)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${r.isRequired ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'مطلوب' : 'Required'}</button>
                        <button type="button" onClick={() => setDocRequirementForIndividuals(r.docTypeId, false)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${!r.isRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'اختياري' : 'Optional'}</button>
                        <button type="button" onClick={() => removeDocRequirementForIndividuals(r.docTypeId)} className="text-xs text-red-600 hover:underline">{ar ? 'إزالة' : 'Remove'}</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  {showAddCustomFor === 'individuals' ? (
                    <div className="p-4 rounded-2xl border admin-accent-border/30 bg-white space-y-4">
                      <h4 className="font-semibold text-gray-900">{ar ? 'إضافة مستند آخر (أفراد)' : 'Add custom document (Individuals)'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" value={customLabelAr} onChange={(e) => setCustomLabelAr(e.target.value)} placeholder={ar ? 'اسم المستند (عربي)' : 'Document name (Arabic)'} className="px-4 py-2 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none" />
                        <input type="text" value={customLabelEn} onChange={(e) => setCustomLabelEn(e.target.value)} placeholder={ar ? 'اسم المستند (إنجليزي)' : 'Document name (English)'} className="px-4 py-2 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none" />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => setCustomIsRequired(true)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${customIsRequired ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'مطلوب' : 'Required'}</button>
                        <button type="button" onClick={() => setCustomIsRequired(false)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!customIsRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'اختياري' : 'Optional'}</button>
                        <button type="button" onClick={() => { if (customLabelAr.trim() || customLabelEn.trim()) { addCustomDocumentForIndividuals(customLabelAr.trim() || customLabelEn.trim(), customLabelEn.trim() || customLabelAr.trim(), customIsRequired); setCustomLabelAr(''); setCustomLabelEn(''); setShowAddCustomFor(null); } }} className="px-4 py-2 rounded-xl font-semibold admin-btn-primary text-white hover:opacity-90">{ar ? 'إضافة' : 'Add'}</button>
                        <button type="button" onClick={() => { setShowAddCustomFor(null); setCustomLabelAr(''); setCustomLabelEn(''); }} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500">{ar ? 'إلغاء' : 'Cancel'}</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowAddCustomFor('individuals')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold admin-accent-text admin-accent-bg-soft hover:admin-btn-primary/20 border admin-accent-border/30 transition-all">
                      <span>+</span> {ar ? 'إضافة مستند آخر' : 'Add custom document'}
                    </button>
                  )}
                </div>
              </div>

              {/* مستندات الشركات */}
              <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30">
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600">🏢</span>
                  {ar ? 'مستندات الشركات' : 'Company Documents'}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{ar ? 'المستندات الإضافية المطلوبة من الشركات. السجل التجاري وبطاقات المفوضين تُضاف تلقائياً من بيانات دفتر العناوين.' : 'Additional documents required from companies. Commercial Registration and rep cards are auto-added from address book.'}</p>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
                  {ar ? 'ملاحظة: جواز السفر إلزامي للمفوضين بالتوقيع غير العمانيين - يُضاف تلقائياً لكل مفوض وافد.' : 'Note: Passport is mandatory for non-Omani authorized representatives - auto-added for each expat rep.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {CONTRACT_DOC_TYPES.filter((d) => ['COMMERCIAL_REGISTRATION', 'AUTHORIZED_REP_CARD', 'PASSPORT', 'EMPLOYMENT', 'BANK_STATEMENT', 'PREVIOUS_RENT', 'FAMILY_CARD', 'OTHER'].includes(d.id)).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white">
                      <span className="text-sm font-medium text-gray-900">{ar ? doc.labelAr : doc.labelEn}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDocRequirementForCompanies(doc.id, true)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${isDocRequiredForCompanies(doc.id) ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                        {ar ? 'مطلوب' : 'Required'}
                      </button>
                        <button type="button" onClick={() => setDocRequirementForCompanies(doc.id, false)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${isDocOptionalForCompanies(doc.id) ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                        {ar ? 'اختياري' : 'Optional'}
                      </button>
                        {(isDocRequiredForCompanies(doc.id) || isDocOptionalForCompanies(doc.id)) && (
                          <button type="button" onClick={() => setDocRequirementForCompanies(doc.id, null)} className="text-xs text-red-600 hover:underline">{ar ? 'إزالة' : 'Remove'}</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {getCurrentRequiredDocTypesForCompanies().filter((r) => isCustomDoc(r.docTypeId)).map((r) => (
                    <div key={r.docTypeId} className="flex items-center gap-2 p-3 rounded-xl border admin-accent-border/30 bg-amber-50/50">
                      <span className="text-sm font-medium text-gray-900">{ar ? (r.labelAr || r.labelEn) : (r.labelEn || r.labelAr)}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDocRequirementForCompanies(r.docTypeId, true)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${r.isRequired ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'مطلوب' : 'Required'}</button>
                        <button type="button" onClick={() => setDocRequirementForCompanies(r.docTypeId, false)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${!r.isRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'اختياري' : 'Optional'}</button>
                        <button type="button" onClick={() => removeDocRequirementForCompanies(r.docTypeId)} className="text-xs text-red-600 hover:underline">{ar ? 'إزالة' : 'Remove'}</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                  {showAddCustomFor === 'companies' ? (
                    <div className="p-4 rounded-2xl border admin-accent-border/30 bg-white space-y-4">
                      <h4 className="font-semibold text-gray-900">{ar ? 'إضافة مستند آخر (شركات)' : 'Add custom document (Companies)'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" value={customLabelAr} onChange={(e) => setCustomLabelAr(e.target.value)} placeholder={ar ? 'اسم المستند (عربي)' : 'Document name (Arabic)'} className="px-4 py-2 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none" />
                        <input type="text" value={customLabelEn} onChange={(e) => setCustomLabelEn(e.target.value)} placeholder={ar ? 'اسم المستند (إنجليزي)' : 'Document name (English)'} className="px-4 py-2 rounded-xl border border-gray-200 focus:admin-accent-border focus:ring-2 focus:ring-[color:var(--admin-focus-ring)] outline-none" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => setCustomIsRequired(true)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${customIsRequired ? 'admin-btn-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'مطلوب' : 'Required'}</button>
                        <button type="button" onClick={() => setCustomIsRequired(false)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!customIsRequired ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{ar ? 'اختياري' : 'Optional'}</button>
                        <button type="button" onClick={() => { if (customLabelAr.trim() || customLabelEn.trim()) { addCustomDocumentForCompanies(customLabelAr.trim() || customLabelEn.trim(), customLabelEn.trim() || customLabelAr.trim(), customIsRequired); setCustomLabelAr(''); setCustomLabelEn(''); setShowAddCustomFor(null); } }} className="px-4 py-2 rounded-xl font-semibold admin-btn-primary text-white hover:opacity-90">{ar ? 'إضافة' : 'Add'}</button>
                        <button type="button" onClick={() => { setShowAddCustomFor(null); setCustomLabelAr(''); setCustomLabelEn(''); }} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500">{ar ? 'إلغاء' : 'Cancel'}</button>
                      </div>
                  </div>
                ) : (
                    <button type="button" onClick={() => setShowAddCustomFor('companies')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold admin-accent-text admin-accent-bg-soft hover:admin-btn-primary/20 border admin-accent-border/30 transition-all">
                      <span>+</span> {ar ? 'إضافة مستند آخر' : 'Add custom document'}
                  </button>
                )}
                </div>
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
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white admin-btn-primary hover:opacity-90 disabled:opacity-70 transition-all shadow-lg shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30"
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
