'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { getPropertyById, updateProperty, type Property } from '@/lib/data/properties';
import { getPropertyLandlordContactId, setPropertyLandlord } from '@/lib/data/propertyLandlords';
import { getAllContacts, getContactById, getContactDisplayFull, searchContacts, type Contact } from '@/lib/data/addressBook';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { saveDraft, loadDraft, clearDraft } from '@/lib/utils/draftStorage';
import { omanLocations } from '@/lib/data/omanLocations';
import ContactFormModal from '@/components/admin/ContactFormModal';

const LAND_USE_TYPES = [
  { ar: 'سكني', en: 'Residential' },
  { ar: 'تجاري', en: 'Commercial' },
  { ar: 'صناعي', en: 'Industrial' },
  { ar: 'زراعي', en: 'Agricultural' },
  { ar: 'سكني تجاري', en: 'Residential-Commercial' },
  { ar: 'سياحي', en: 'Tourism' },
];

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  accent = 'primary',
  allowOverflow,
  compact,
}: {
  title: string;
  subtitle?: string;
  icon: 'users' | 'home' | 'building' | 'information' | 'archive' | 'wrench' | 'pencil' | 'check';
  children: React.ReactNode;
  accent?: 'primary' | 'amber' | 'emerald' | 'blue';
  allowOverflow?: boolean;
  compact?: boolean;
}) {
  const accents = {
    primary: 'border-[#8B6F47]/20 bg-[#8B6F47]/5',
    amber: 'border-amber-200/80 bg-amber-50/50',
    emerald: 'border-emerald-200/80 bg-emerald-50/30',
    blue: 'border-blue-200/80 bg-blue-50/30',
  };
  return (
    <div className={`admin-card ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${accents[accent]} ${compact ? 'p-4' : ''}`}>
      <div className={`admin-card-header flex items-start gap-3 ${compact ? 'pb-2' : ''}`}>
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl bg-[#8B6F47]/10 flex items-center justify-center flex-shrink-0`}>
          <Icon name={icon} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
        <div>
          <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'admin-card-title'}`}>{title}</h2>
          {subtitle && !compact && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className={`admin-card-body pt-0 ${compact ? 'space-y-3' : ''}`}>{children}</div>
    </div>
  );
}

export interface PropertyExtraDataFormProps {
  propertyId: string;
  locale: string;
  onSaved?: () => void;
  embedded?: boolean;
}

export default function PropertyExtraDataForm({
  propertyId,
  locale,
  onSaved,
  embedded = false,
}: PropertyExtraDataFormProps) {
  const ar = locale === 'ar';
  const draftKey = `extra-data_${propertyId}`;

  const [property, setProperty] = useState<ReturnType<typeof getPropertyById>>(undefined);
  const [form, setForm] = useState({
    governorateAr: '',
    stateAr: '',
    areaAr: '',
    villageAr: '',
    landParcelNumber: '',
    propertyNumber: '',
    complexNumber: '',
    landUseType: '',
    streetAlleyNumber: '',
    electricityMeterNumber: '',
    waterMeterNumber: '',
    surveyMapNumber: '',
    buildingManagementNumber: '',
    responsiblePersonName: '',
    buildingGuardNumber: '',
    guardName: '',
    maintenanceNumber: '',
    maintenanceResponsibleName: '',
    fireExtinguisherInfo: '',
    buildingPhoneNumber: '',
    internetNumber: '',
  });
  const [landlordContactId, setLandlordContactId] = useState<string | null>(null);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [landlordCategoryFilter, setLandlordCategoryFilter] = useState<'all' | 'LANDLORD' | 'CLIENT'>('all');
  const [landlordDropdownOpen, setLandlordDropdownOpen] = useState(false);
  const [showAddLandlordModal, setShowAddLandlordModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const landlordComboboxRef = useRef<HTMLDivElement>(null);
  const landlordTriggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateDropdownPosition = useCallback(() => {
    if (landlordTriggerRef.current) {
      const rect = landlordTriggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (landlordDropdownOpen) {
      updateDropdownPosition();
      const onScroll = () => updateDropdownPosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [landlordDropdownOpen, updateDropdownPosition]);

  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(draftKey, { form, landlordContactId });
    }, 800);
    return () => clearTimeout(t);
  }, [draftKey, form, landlordContactId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!landlordDropdownOpen) return;
      const inCombobox = landlordComboboxRef.current?.contains(target);
      const inDropdown = document.querySelector('[data-landlord-dropdown]')?.contains(target);
      if (!inCombobox && !inDropdown) setLandlordDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [landlordDropdownOpen]);

  useEffect(() => {
    const prop = getPropertyById(propertyId);
    setProperty(prop);
    if (prop) {
      const p = prop as Property & {
        governorateAr?: string;
        stateAr?: string;
        areaAr?: string;
        villageAr?: string;
        landParcelNumber?: string;
        propertyNumber?: string;
        surveyMapNumber?: string;
        complexNumber?: string;
        landUseType?: string;
        streetAlleyNumber?: string;
        electricityMeterNumber?: string;
        waterMeterNumber?: string;
        buildingManagementNumber?: string;
        responsiblePersonName?: string;
        buildingGuardNumber?: string;
        guardName?: string;
        maintenanceNumber?: string;
        maintenanceResponsibleName?: string;
        fireExtinguisherInfo?: string;
        buildingPhoneNumber?: string;
        internetNumber?: string;
      };
      const baseForm = {
        governorateAr: p.governorateAr || '',
        stateAr: p.stateAr || '',
        areaAr: p.areaAr || '',
        villageAr: p.villageAr || '',
        landParcelNumber: p.landParcelNumber || '',
        propertyNumber: p.propertyNumber || '',
        complexNumber: p.complexNumber || '',
        landUseType: p.landUseType || '',
        streetAlleyNumber: p.streetAlleyNumber || '',
        electricityMeterNumber: p.electricityMeterNumber || '',
        waterMeterNumber: p.waterMeterNumber || '',
        surveyMapNumber: p.surveyMapNumber || '',
        buildingManagementNumber: p.buildingManagementNumber || '',
        responsiblePersonName: p.responsiblePersonName || '',
        buildingGuardNumber: p.buildingGuardNumber || '',
        guardName: p.guardName || '',
        maintenanceNumber: p.maintenanceNumber || '',
        maintenanceResponsibleName: p.maintenanceResponsibleName || '',
        fireExtinguisherInfo: p.fireExtinguisherInfo || '',
        buildingPhoneNumber: p.buildingPhoneNumber || '',
        internetNumber: p.internetNumber || '',
      };
      const draft = loadDraft<{ form: typeof baseForm; landlordContactId: string | null }>(draftKey);
      setForm(draft?.form && typeof draft.form === 'object' ? { ...baseForm, ...draft.form } : baseForm);
      setLandlordContactId(draft?.landlordContactId != null ? draft.landlordContactId : (getPropertyLandlordContactId(prop.id) || null));
    }
  }, [propertyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    const labels: Record<string, string> = ar
      ? { landlord: 'بيانات المالك', governorateAr: 'المحافظة', stateAr: 'الولاية', areaAr: 'المنطقة', villageAr: 'الحي', landParcelNumber: 'رقم القطعة', propertyNumber: 'رقم المبنى', complexNumber: 'رقم المجمع', landUseType: 'نوع استعمال الأرض', streetAlleyNumber: 'رقم السكة/الزقاق', electricityMeterNumber: 'رقم عداد الكهرباء', waterMeterNumber: 'رقم عداد الماء', surveyMapNumber: 'رقم الرسم المساحي', buildingManagementNumber: 'رقم إدارة المبنى', responsiblePersonName: 'أسم الشخص المسؤول', buildingGuardNumber: 'رقم حارس المبنى', guardName: 'أسم الحارس', maintenanceNumber: 'رقم الصيانة', maintenanceResponsibleName: 'أسم المسؤول عن الصيانة', fireExtinguisherInfo: 'عداد الحريق', buildingPhoneNumber: 'رقم الهاتف', internetNumber: 'رقم الانترنت' }
      : { landlord: 'Landlord', governorateAr: 'Governorate', stateAr: 'State', areaAr: 'Area', villageAr: 'Neighborhood', landParcelNumber: 'Land Parcel No.', propertyNumber: 'Building No.', complexNumber: 'Complex No.', landUseType: 'Land Use Type', streetAlleyNumber: 'Street/Alley No.', electricityMeterNumber: 'Electricity Meter', waterMeterNumber: 'Water Meter', surveyMapNumber: 'Survey Map No.', buildingManagementNumber: 'Management No.', responsiblePersonName: 'Responsible Person', buildingGuardNumber: 'Guard Phone', guardName: 'Guard Name', maintenanceNumber: 'Maintenance No.', maintenanceResponsibleName: 'Maintenance Responsible', fireExtinguisherInfo: 'Fire Extinguisher', buildingPhoneNumber: 'Phone No.', internetNumber: 'Internet No.' };
    const missing: string[] = [];
    if (!landlordContactId) missing.push(labels.landlord);
    const formFields = ['governorateAr', 'stateAr', 'areaAr', 'villageAr', 'landParcelNumber', 'propertyNumber', 'complexNumber', 'landUseType', 'streetAlleyNumber', 'electricityMeterNumber', 'waterMeterNumber', 'surveyMapNumber', 'buildingManagementNumber', 'responsiblePersonName', 'buildingGuardNumber', 'guardName', 'maintenanceNumber', 'maintenanceResponsibleName', 'fireExtinguisherInfo', 'buildingPhoneNumber', 'internetNumber'] as const;
    for (const k of formFields) {
      const v = form[k];
      if (!v || String(v).trim() === '') missing.push(labels[k]);
    }
    if (missing.length > 0) {
      showMissingFieldsAlert(missing, ar);
      return;
    }
    updateProperty(propertyId, {
      governorateAr: form.governorateAr.trim() || undefined,
      stateAr: form.stateAr.trim() || undefined,
      areaAr: form.areaAr.trim() || undefined,
      villageAr: form.villageAr.trim() || undefined,
      landParcelNumber: form.landParcelNumber.trim() || undefined,
      propertyNumber: form.propertyNumber.trim() || undefined,
      complexNumber: form.complexNumber.trim() || undefined,
      landUseType: form.landUseType.trim() || undefined,
      streetAlleyNumber: form.streetAlleyNumber.trim() || undefined,
      electricityMeterNumber: form.electricityMeterNumber.trim() || undefined,
      waterMeterNumber: form.waterMeterNumber.trim() || undefined,
      surveyMapNumber: form.surveyMapNumber.trim() || undefined,
      buildingManagementNumber: form.buildingManagementNumber.trim() || undefined,
      responsiblePersonName: form.responsiblePersonName.trim() || undefined,
      buildingGuardNumber: form.buildingGuardNumber.trim() || undefined,
      guardName: form.guardName.trim() || undefined,
      maintenanceNumber: form.maintenanceNumber.trim() || undefined,
      maintenanceResponsibleName: form.maintenanceResponsibleName.trim() || undefined,
      fireExtinguisherInfo: form.fireExtinguisherInfo.trim() || undefined,
      buildingPhoneNumber: form.buildingPhoneNumber.trim() || undefined,
      internetNumber: form.internetNumber.trim() || undefined,
    } as Partial<Property>);
    if (landlordContactId) setPropertyLandlord(property.id, landlordContactId);
    clearDraft(draftKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const landlordOptions = useMemo(() => {
    let list: Contact[] = landlordSearch.trim()
      ? searchContacts(landlordSearch)
      : getAllContacts();
    if (landlordCategoryFilter !== 'all') {
      list = list.filter((c) => c.category === landlordCategoryFilter);
    }
    if (!landlordSearch.trim()) {
      list = [...list].sort((a, b) => {
        const order = { LANDLORD: 0, CLIENT: 1 } as const;
        const aOrd = order[a.category as keyof typeof order] ?? 2;
        const bOrd = order[b.category as keyof typeof order] ?? 2;
        return aOrd - bOrd;
      });
    }
    return list;
  }, [landlordSearch, landlordCategoryFilter]);
  const selectedContact = landlordContactId ? getContactById(landlordContactId) : null;

  const handleLandlordSaved = (contact: Contact) => {
    setLandlordContactId(contact.id);
    setShowAddLandlordModal(false);
    setLandlordDropdownOpen(false);
  };

  if (!property) {
    return (
      <div className="admin-card">
        <div className="admin-card-body text-center py-16">
          <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const prop = property as Property & { serialNumber?: string; propertyTypeAr?: string; propertySubTypeAr?: string };
  const gov = omanLocations.find((g) => g.ar === form.governorateAr);
  const state = gov?.states.find((s) => s.ar === form.stateAr);
  const villages = state?.villages || [];
  const gridCols = embedded ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <>
      <form onSubmit={handleSubmit} className={embedded ? 'space-y-4' : 'space-y-6'}>
        {/* بيانات المالك */}
        <SectionCard
          title={ar ? 'بيانات المالك' : 'Landlord'}
          subtitle={embedded ? undefined : (ar ? 'من دفتر العناوين — مطلوب لإنشاء العقد' : 'From Address Book — required for contract creation')}
          icon="users"
          accent="primary"
          allowOverflow
          compact={embedded}
        >
          <div className={`flex flex-col ${embedded ? 'gap-2' : 'sm:flex-row gap-3'} items-stretch sm:items-start`}>
            <div ref={landlordComboboxRef} className="flex-1 min-w-0 max-w-md relative">
              <label className="admin-input-label">{ar ? 'اختر المالك' : 'Select landlord'}</label>
              <div ref={landlordTriggerRef} className="relative">
                <input
                  type="text"
                  value={landlordDropdownOpen ? landlordSearch : (selectedContact ? getContactDisplayFull(selectedContact, locale) : '')}
                  onChange={(e) => {
                    setLandlordSearch(e.target.value);
                    setLandlordDropdownOpen(true);
                  }}
                  onFocus={() => setLandlordDropdownOpen(true)}
                  placeholder={ar ? 'ابحث بالاسم أو الهاتف أو البريد...' : 'Search by name, phone or email...'}
                  className={`admin-input w-full pl-10 pr-10 ${getRequiredFieldClass(true, landlordContactId ? 'x' : '')}`}
                />
                {selectedContact && !landlordDropdownOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLandlordContactId(null);
                      setLandlordSearch('');
                      setLandlordDropdownOpen(true);
                    }}
                    className="absolute inset-y-0 end-3 flex items-center text-gray-400 hover:text-red-500"
                    aria-label={ar ? 'إلغاء التحديد' : 'Clear'}
                  >
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                ) : (
                  <span className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-gray-400">
                    <Icon name="magnifyingGlass" className="w-5 h-5" />
                  </span>
                )}
              </div>
              {landlordDropdownOpen &&
                dropdownPosition &&
                createPortal(
                  <div className="fixed inset-0 z-[99998]" style={{ isolation: 'isolate' }}>
                    <div
                      className="absolute inset-0 bg-black/20"
                      aria-hidden
                      onClick={() => setLandlordDropdownOpen(false)}
                    />
                    <div
                      data-landlord-dropdown
                      className="fixed z-[99999] rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[min(24rem,80vh)]"
                      style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        minWidth: 280,
                        minHeight: 120,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                    <div className="border-b border-gray-100 px-3 py-2 bg-gray-50/80 flex flex-wrap items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium text-gray-500">
                        {ar ? 'تصفية:' : 'Filter:'}
                      </span>
                      {(['all', 'LANDLORD', 'CLIENT'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setLandlordCategoryFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            landlordCategoryFilter === f
                              ? 'bg-[#8B6F47] text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#8B6F47]/50'
                          }`}
                        >
                          {f === 'all' ? (ar ? 'الكل' : 'All') : f === 'LANDLORD' ? (ar ? 'مالك' : 'Landlord') : (ar ? 'عميل' : 'Client')}
                        </button>
                      ))}
                      <span className="text-xs text-gray-500 ms-auto">
                        {ar
                          ? (landlordOptions.length === 1 ? 'جهة اتصال واحدة' : `${landlordOptions.length} جهة اتصال`)
                          : `${landlordOptions.length} contact${landlordOptions.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <ul className="flex-1 min-h-0 overflow-y-auto py-1 overscroll-contain" role="listbox">
                      {landlordOptions.length === 0 ? (
                        <li className="px-4 py-6 text-center">
                          <p className="text-gray-500 text-sm mb-3">
                            {ar ? 'لا توجد نتائج. جرب تصفية أخرى أو أضف جهة اتصال.' : 'No results. Try a different filter or add a contact.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddLandlordModal(true);
                              setLandlordDropdownOpen(false);
                            }}
                            className="admin-btn-primary inline-flex items-center gap-2"
                          >
                            <Icon name="plus" className="w-5 h-5" />
                            {ar ? 'إضافة جهة اتصال جديدة' : 'Add New Contact'}
                          </button>
                        </li>
                      ) : (
                        landlordOptions.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              role="option"
                              onClick={() => {
                                setLandlordContactId(c.id);
                                setLandlordSearch('');
                                setLandlordDropdownOpen(false);
                              }}
                              className={`w-full text-right px-4 py-2.5 hover:bg-[#8B6F47]/10 transition-colors flex items-center gap-2 ${landlordContactId === c.id ? 'bg-[#8B6F47]/15 text-[#8B6F47] font-semibold' : ''}`}
                            >
                              <span className="flex-1 min-w-0 text-right">
                                <span className="block font-medium truncate">{getContactDisplayFull(c, locale)}</span>
                                {(c.phone || c.email) && (
                                  <span className="block text-xs text-gray-500 mt-0.5 truncate">
                                    {[c.phone, c.email].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </span>
                              {c.category === 'LANDLORD' && (
                                <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-[#8B6F47]/15 text-[#8B6F47]">
                                  {ar ? 'مالك' : 'Landlord'}
                                </span>
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                    <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/80 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddLandlordModal(true);
                          setLandlordDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#8B6F47] hover:bg-[#8B6F47]/10 rounded-lg transition-colors"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                        {ar ? 'إضافة جهة اتصال جديدة' : 'Add New Contact'}
                      </button>
                    </div>
                    </div>
                  </div>,
                  document.body
                )}
            </div>
            {!embedded && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowAddLandlordModal(true)}
                  className="admin-btn-primary inline-flex items-center gap-2"
                >
                  <Icon name="plus" className="w-5 h-5" />
                  {ar ? 'إضافة بيانات المالك' : 'Add Landlord'}
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        <ContactFormModal
          open={showAddLandlordModal}
          onClose={() => setShowAddLandlordModal(false)}
          onSaved={handleLandlordSaved}
          initialCategory="LANDLORD"
          initialName={landlordSearch.trim()}
          locale={locale}
        />

        {/* البيانات المرتبطة */}
        <SectionCard
          title={ar ? 'البيانات الأساسية المرتبطة' : 'Linked Core Data'}
          subtitle={embedded ? undefined : (ar ? 'تحدّث مع صفحة تعديل العقار — تجنب التكرار' : 'Synced with property edit page')}
          icon="home"
          accent="amber"
          compact={embedded}
        >
          <div className={embedded ? 'space-y-3' : 'space-y-6'}>
            <div>
              <h3 className={`font-semibold text-gray-700 mb-3 ${embedded ? 'text-xs' : 'text-sm'}`}>{ar ? 'الموقع' : 'Location'}</h3>
              <div className={`grid ${gridCols} gap-3 ${embedded ? 'sm:grid-cols-2 lg:grid-cols-4' : ''}`}>
                <div>
                  <label className="admin-input-label">{ar ? 'المحافظة' : 'Governorate'}</label>
                <select
                  value={form.governorateAr}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      governorateAr: e.target.value,
                      stateAr: '',
                      areaAr: '',
                      villageAr: '',
                    });
                  }}
                  className={`admin-select w-full ${getRequiredFieldClass(true, form.governorateAr)}`}
                >
                  <option value="">{ar ? 'اختر المحافظة' : 'Select Governorate'}</option>
                  {omanLocations.map((g) => (
                    <option key={g.ar} value={g.ar}>{g.ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الولاية' : 'State'}</label>
                <select
                  value={form.stateAr}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      stateAr: e.target.value,
                      areaAr: '',
                      villageAr: '',
                    });
                  }}
                  className={`admin-select w-full ${getRequiredFieldClass(true, form.stateAr)}`}
                  disabled={!form.governorateAr}
                >
                  <option value="">{ar ? 'اختر الولاية' : 'Select State'}</option>
                  {omanLocations
                    .find((x) => x.ar === form.governorateAr)
                    ?.states.map((s) => (
                      <option key={s.ar} value={s.ar}>{s.ar}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'المنطقة' : 'Area'}</label>
                <select
                  value={form.areaAr}
                  onChange={(e) => setForm({ ...form, areaAr: e.target.value })}
                  className={`admin-select w-full ${getRequiredFieldClass(true, form.areaAr)}`}
                  disabled={!form.stateAr}
                >
                  <option value="">{ar ? 'اختر المنطقة' : 'Select Area'}</option>
                  {villages.map((v) => (
                    <option key={v.ar} value={v.ar}>{v.ar}</option>
                  ))}
                  {form.areaAr && !villages.some((v) => v.ar === form.areaAr) && (
                    <option value={form.areaAr}>{form.areaAr}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الحي' : 'Neighborhood'}</label>
                <input
                  type="text"
                  value={form.villageAr}
                  onChange={(e) => setForm({ ...form, villageAr: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.villageAr)}`}
                  placeholder={ar ? 'مثال: حي النهضة، شارع السلطان' : 'e.g. Al Nahda, Sultan St'}
                />
              </div>
              </div>
            </div>
            <div>
              <h3 className={`font-semibold text-gray-700 mb-3 ${embedded ? 'text-xs' : 'text-sm'}`}>{ar ? 'الأرقام المرجعية' : 'Reference Numbers'}</h3>
              <div className={`grid ${gridCols} gap-3 ${embedded ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
              <div>
                <label className="admin-input-label">{ar ? 'رقم القطعة' : 'Land Parcel No.'}</label>
                <input
                  type="text"
                  value={form.landParcelNumber}
                  onChange={(e) => setForm({ ...form, landParcelNumber: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.landParcelNumber)}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رقم المبنى' : 'Building No.'}</label>
                <input
                  type="text"
                  value={form.propertyNumber}
                  onChange={(e) => setForm({ ...form, propertyNumber: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.propertyNumber)}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رقم الرسم المساحي (الكروكي)' : 'Survey Map No.'}</label>
                <input
                  type="text"
                  value={form.surveyMapNumber}
                  onChange={(e) => setForm({ ...form, surveyMapNumber: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.surveyMapNumber)}`}
                />
              </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* الموقع والعدادات */}
        <SectionCard
          title={ar ? 'الموقع والعدادات' : 'Location & Meters'}
          subtitle={embedded ? undefined : (ar ? 'رقم المجمع، السكة، عدادات الكهرباء والماء' : 'Complex, street, utility meters')}
          icon="information"
          accent="blue"
          compact={embedded}
        >
          <div className={`grid ${gridCols} gap-3`}>
            <div>
              <label className="admin-input-label">{ar ? 'رقم المجمع' : 'Complex No.'}</label>
              <input
                type="text"
                value={form.complexNumber}
                onChange={(e) => setForm({ ...form, complexNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.complexNumber)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'نوع استعمال الأرض' : 'Land Use Type'}</label>
              <select
                value={form.landUseType}
                onChange={(e) => setForm({ ...form, landUseType: e.target.value })}
                className={`admin-select w-full ${getRequiredFieldClass(true, form.landUseType)}`}
              >
                <option value="">{ar ? 'اختر' : 'Select'}</option>
                {LAND_USE_TYPES.map((t) => (
                  <option key={t.ar} value={t.ar}>{ar ? t.ar : t.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم السكة/الزقاق' : 'Street/Alley No.'}</label>
              <input
                type="text"
                value={form.streetAlleyNumber}
                onChange={(e) => setForm({ ...form, streetAlleyNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.streetAlleyNumber)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم عداد الكهرباء' : 'Electricity Meter'}</label>
              <input
                type="text"
                value={form.electricityMeterNumber}
                onChange={(e) => setForm({ ...form, electricityMeterNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.electricityMeterNumber)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم عداد الماء' : 'Water Meter'}</label>
              <input
                type="text"
                value={form.waterMeterNumber}
                onChange={(e) => setForm({ ...form, waterMeterNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.waterMeterNumber)}`}
              />
            </div>
          </div>
        </SectionCard>

        {/* إدارة المبنى */}
        <SectionCard
          title={ar ? 'إدارة المبنى' : 'Building Management'}
          subtitle={embedded ? undefined : (ar ? 'رقم الإدارة والشخص المسؤول' : 'Management number and responsible person')}
          icon="building"
          accent="emerald"
          compact={embedded}
        >
          <div className={`grid ${gridCols} gap-3`}>
            <div>
              <label className="admin-input-label">{ar ? 'رقم إدارة المبنى' : 'Management No.'}</label>
              <input
                type="text"
                value={form.buildingManagementNumber}
                onChange={(e) => setForm({ ...form, buildingManagementNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.buildingManagementNumber)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'أسم الشخص المسؤول' : 'Responsible Person'}</label>
              <input
                type="text"
                value={form.responsiblePersonName}
                onChange={(e) => setForm({ ...form, responsiblePersonName: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.responsiblePersonName)}`}
              />
            </div>
          </div>
        </SectionCard>

        {/* الحارس والصيانة */}
        <div className={embedded ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
          <SectionCard
            title={ar ? 'حارس المبنى' : 'Building Guard'}
            icon="users"
            compact={embedded}
          >
            <div className={`grid ${embedded ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              <div>
                <label className="admin-input-label">{ar ? 'رقم حارس المبنى' : 'Guard Phone'}</label>
                <input
                  type="text"
                  value={form.buildingGuardNumber}
                  onChange={(e) => setForm({ ...form, buildingGuardNumber: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.buildingGuardNumber)}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'أسم الحارس' : 'Guard Name'}</label>
                <input
                  type="text"
                  value={form.guardName}
                  onChange={(e) => setForm({ ...form, guardName: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.guardName)}`}
                />
              </div>
            </div>
          </SectionCard>
          <SectionCard
            title={ar ? 'الصيانة' : 'Maintenance'}
            icon="wrench"
            compact={embedded}
          >
            <div className={`grid ${embedded ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              <div>
                <label className="admin-input-label">{ar ? 'رقم الصيانة' : 'Maintenance No.'}</label>
                <input
                  type="text"
                  value={form.maintenanceNumber}
                  onChange={(e) => setForm({ ...form, maintenanceNumber: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.maintenanceNumber)}`}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'أسم المسؤول عن الصيانة' : 'Maintenance Responsible'}</label>
                <input
                  type="text"
                  value={form.maintenanceResponsibleName}
                  onChange={(e) => setForm({ ...form, maintenanceResponsibleName: e.target.value })}
                  className={`admin-input w-full ${getRequiredFieldClass(true, form.maintenanceResponsibleName)}`}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* الخدمات والاتصالات */}
        <SectionCard
          title={ar ? 'الخدمات والاتصالات' : 'Services & Contact'}
          subtitle={embedded ? undefined : (ar ? 'عداد الحريق، الهاتف، الإنترنت' : 'Fire extinguisher, phone, internet')}
          icon="archive"
          compact={embedded}
        >
          <div className={`grid ${embedded ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3`}>
            <div>
              <label className="admin-input-label">{ar ? 'عداد الحريق' : 'Fire Extinguisher'}</label>
              <input
                type="text"
                value={form.fireExtinguisherInfo}
                onChange={(e) => setForm({ ...form, fireExtinguisherInfo: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.fireExtinguisherInfo)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم الهاتف' : 'Phone No.'}</label>
              <input
                type="text"
                value={form.buildingPhoneNumber}
                onChange={(e) => setForm({ ...form, buildingPhoneNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.buildingPhoneNumber)}`}
              />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم الانترنت' : 'Internet No.'}</label>
              <input
                type="text"
                value={form.internetNumber}
                onChange={(e) => setForm({ ...form, internetNumber: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.internetNumber)}`}
              />
            </div>
          </div>
        </SectionCard>

        {/* Footer - حفظ */}
        <div className={`admin-card shadow-md ${embedded ? 'p-4' : ''}`}>
          <div className={`admin-card-body flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${embedded ? 'py-2' : 'py-4'}`}>
            <div className="flex items-center gap-3">
              <button type="submit" className="admin-btn-primary inline-flex items-center gap-2">
                <Icon name="check" className="w-5 h-5" />
                {embedded ? (ar ? 'حفظ وإغلاق' : 'Save & Close') : (ar ? 'حفظ البيانات' : 'Save Data')}
              </button>
              {saved && (
                <span className="flex items-center gap-2 text-emerald-600 font-semibold animate-pulse">
                  <Icon name="check" className="w-5 h-5" />
                  {ar ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                </span>
              )}
            </div>
            {!embedded && (
              <div className="flex gap-2">
                <Link href={`/${locale}/admin/properties/${propertyId}`} className="admin-btn-secondary text-sm">
                  {ar ? 'تعديل العقار' : 'Edit Property'}
                </Link>
                <Link href={`/${locale}/admin/properties`} className="admin-btn-secondary text-sm">
                  {ar ? 'العودة للقائمة' : 'Back to List'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
