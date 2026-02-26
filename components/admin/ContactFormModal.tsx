'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  createContact,
  updateContact,
  getContactById,
  findDuplicateContactFields,
  type Contact,
  type ContactCategory,
  type ContactAddress,
  type ContactGender,
} from '@/lib/data/addressBook';
import TranslateField from '@/components/admin/TranslateField';
import { getAllNationalityValues } from '@/lib/data/nationalities';
import { isOmaniNationality } from '@/lib/data/addressBook';
import { siteConfig } from '@/config/site';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { saveDraft, loadDraft, clearDraft } from '@/lib/utils/draftStorage';
import { normalizeDateForInput } from '@/lib/utils/dateFormat';

const CATEGORY_KEYS: Record<ContactCategory, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
  AUTHORIZED_REP: 'categoryAuthorizedRep',
  OTHER: 'categoryOther',
};

const emptyAddress: ContactAddress = {
  governorate: '',
  state: '',
  area: '',
  village: '',
  street: '',
  building: '',
  floor: '',
  fullAddress: '',
};

export interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  /** عند التحديد: فتح في وضع التعديل */
  editContactId?: string | null;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  /** التصنيف الافتراضي عند الإضافة (مثل LANDLORD لمالك جديد) */
  initialCategory?: ContactCategory;
  locale?: string;
}

export default function ContactFormModal({
  open,
  onClose,
  onSaved,
  editContactId = null,
  initialName = '',
  initialEmail = '',
  initialPhone = '',
  initialCategory = 'CLIENT',
  locale = 'ar',
}: ContactFormModalProps) {
  const t = useTranslations('addressBook');
  const [form, setForm] = useState({
    firstName: '',
    secondName: '',
    thirdName: '',
    familyName: '',
    nationality: '',
    gender: 'MALE' as ContactGender,
    email: '',
    phone: '',
    phoneSecondary: '',
    civilId: '',
    civilIdExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    workplace: '',
    workplaceEn: '',
    nameEn: '',
    company: '',
    position: '',
    category: 'CLIENT' as ContactCategory,
    address: { ...emptyAddress },
    notes: '',
    notesEn: '',
    tags: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', secondName: '', thirdName: '', familyName: '' };
    if (parts.length === 1) return { firstName: parts[0], secondName: '', thirdName: '', familyName: parts[0] };
    return {
      firstName: parts[0],
      secondName: parts.length > 2 ? parts[1] : '',
      thirdName: parts.length > 3 ? parts[2] : '',
      familyName: parts[parts.length - 1],
    };
  };

  const draftKey = editContactId ? `contact_edit_${editContactId}` : 'contact_new';

  useEffect(() => {
    if (open && editContactId) {
      const c = getContactById(editContactId);
      if (c) {
        const baseForm = {
          firstName: c.firstName || '',
          secondName: c.secondName || '',
          thirdName: c.thirdName || '',
          familyName: c.familyName || '',
          nationality: c.nationality || '',
          gender: c.gender || 'MALE',
          email: c.email || '',
          phone: c.phone || '',
          phoneSecondary: c.phoneSecondary || '',
          civilId: c.civilId || '',
          civilIdExpiry: normalizeDateForInput(c.civilIdExpiry) || '',
          passportNumber: c.passportNumber || '',
          passportExpiry: normalizeDateForInput(c.passportExpiry) || '',
          workplace: c.workplace || '',
          workplaceEn: c.workplaceEn || '',
          nameEn: c.nameEn || '',
          company: c.company || '',
          position: c.position || '',
          category: c.category || 'CLIENT',
          address: { ...emptyAddress, ...c.address },
          notes: c.notes || '',
          notesEn: c.notesEn || '',
          tags: c.tags || [],
        };
        const draft = loadDraft<typeof baseForm>(draftKey);
        setForm(draft && typeof draft === 'object' ? { ...baseForm, ...draft } : baseForm);
      }
    } else if (open && !editContactId) {
      const { firstName, secondName, thirdName, familyName } = parseName(initialName);
      const draft = loadDraft<typeof form>(draftKey);
      if (draft && typeof draft === 'object') {
        setForm(draft);
      } else {
        setForm((f) => ({
          ...f,
          firstName: firstName || f.firstName,
          secondName: secondName || f.secondName,
          thirdName: thirdName || f.thirdName,
          familyName: familyName || f.familyName,
          email: initialEmail || f.email,
          phone: initialPhone || f.phone,
          category: initialCategory || f.category,
        }));
      }
    }
  }, [open, editContactId, initialName, initialEmail, initialPhone, initialCategory, draftKey]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => saveDraft(draftKey, form), 800);
    return () => clearTimeout(t);
  }, [open, draftKey, form]);

  const requiredFieldLabels: Record<string, string> = {
    firstName: t('firstName'),
    familyName: t('familyName'),
    nationality: t('nationality'),
    phone: t('phone'),
    address: t('address'),
    civilId: t('civilId'),
    civilIdExpiry: t('civilIdExpiry'),
    passportNumber: t('passportNumber'),
    passportExpiry: t('passportExpiry'),
  };

  const getFieldErrorClass = (field: keyof typeof requiredFieldLabels) => {
    if (formErrors[field]) return 'input-required-error';
    const isEmpty =
      field === 'address' ? !form.address?.fullAddress?.trim() :
      field === 'firstName' ? !form.firstName?.trim() :
      field === 'familyName' ? !form.familyName?.trim() :
      field === 'nationality' ? !form.nationality?.trim() :
      field === 'phone' ? !form.phone?.trim() :
      field === 'civilId' ? !form.civilId?.trim() :
      field === 'civilIdExpiry' ? !form.civilIdExpiry?.trim() :
      field === 'passportNumber' ? !form.passportNumber?.trim() :
      field === 'passportExpiry' ? !form.passportExpiry?.trim() : false;
    return getRequiredFieldClass(true, isEmpty ? '' : 'x');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.firstName?.trim()) errors.firstName = t('fieldRequired');
    if (!form.familyName?.trim()) errors.familyName = t('fieldRequired');
    if (!form.nationality?.trim()) errors.nationality = t('fieldRequired');
    if (!form.phone?.trim()) errors.phone = t('fieldRequired');
    if (!form.address?.fullAddress?.trim()) errors.address = t('fieldRequired');

    const dups = findDuplicateContactFields(
      form.phone.trim(),
      form.civilId?.trim(),
      form.passportNumber?.trim(),
      editContactId || undefined
    );
    if (dups.phone) errors.phone = t('duplicatePhone');
    if (dups.civilId) errors.civilId = t('duplicateCivilId');
    if (dups.passportNumber) errors.passportNumber = t('duplicatePassportNumber');

    if (isOmaniNationality(form.nationality)) {
      if (!form.civilId?.trim()) errors.civilId = t('fieldRequired');
      if (!form.civilIdExpiry?.trim()) errors.civilIdExpiry = t('fieldRequired');
      else {
        const expiry = new Date(form.civilIdExpiry + 'T12:00:00');
        const today = new Date();
        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
        if (isNaN(expiry.getTime()) || expiry < minDate) errors.civilIdExpiry = t('civilIdExpiryMinDays');
      }
    } else {
      if (!form.passportNumber?.trim()) errors.passportNumber = t('fieldRequired');
      if (!form.passportExpiry?.trim()) errors.passportExpiry = t('fieldRequired');
      else {
        const expiry = new Date(form.passportExpiry + 'T12:00:00');
        const today = new Date();
        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
        if (isNaN(expiry.getTime()) || expiry < minDate) errors.passportExpiry = t('passportExpiryMinDays');
      }
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const missingLabels = Object.keys(errors).map((k) => requiredFieldLabels[k as keyof typeof requiredFieldLabels] || k);
      showMissingFieldsAlert(missingLabels, locale === 'ar');
      return;
    }

    const addr = form.address?.fullAddress
      ? { fullAddress: form.address.fullAddress }
      : Object.keys(form.address || {}).some((k) => (form.address as Record<string, string>)[k])
        ? form.address
        : undefined;
    const payload = {
      firstName: form.firstName.trim(),
      secondName: form.secondName?.trim() || undefined,
      thirdName: form.thirdName?.trim() || undefined,
      familyName: form.familyName.trim(),
      nationality: form.nationality.trim(),
      gender: form.gender,
      email: form.email?.trim() || undefined,
      phone: form.phone.trim(),
      phoneSecondary: form.phoneSecondary?.trim() || undefined,
      civilId: form.civilId?.trim() || undefined,
      civilIdExpiry: form.civilIdExpiry?.trim() || undefined,
      passportNumber: form.passportNumber?.trim() || undefined,
      passportExpiry: form.passportExpiry?.trim() || undefined,
      workplace: form.workplace?.trim() || undefined,
      workplaceEn: form.workplaceEn?.trim() || undefined,
      nameEn: form.nameEn?.trim() || undefined,
      company: form.company?.trim() || undefined,
      position: form.position?.trim() || undefined,
      category: (editContactId ? form.category : 'CLIENT') as ContactCategory,
      address: addr,
      notes: form.notes?.trim() || undefined,
      notesEn: form.notesEn?.trim() || undefined,
      tags: form.tags?.length ? form.tags : undefined,
    };
    try {
      const contact = editContactId
        ? (updateContact(editContactId, payload) || getContactById(editContactId)!)
        : createContact(payload);
      clearDraft(draftKey);
      onSaved(contact);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'DUPLICATE_PHONE') setFormErrors((e) => ({ ...e, phone: t('duplicatePhone') }));
      else if (msg === 'DUPLICATE_CIVIL_ID') setFormErrors((e) => ({ ...e, civilId: t('duplicateCivilId') }));
      else if (msg === 'DUPLICATE_PASSPORT') setFormErrors((e) => ({ ...e, passportNumber: t('duplicatePassportNumber') }));
      return;
    }
    setForm({
      firstName: '',
      secondName: '',
      thirdName: '',
      familyName: '',
      nationality: '',
      gender: 'MALE',
      email: '',
      phone: '',
      phoneSecondary: '',
      civilId: '',
      civilIdExpiry: '',
      passportNumber: '',
      passportExpiry: '',
      workplace: '',
      workplaceEn: '',
      nameEn: '',
      company: '',
      position: '',
      category: 'CLIENT',
      address: { ...emptyAddress },
      notes: '',
      notesEn: '',
      tags: [],
    });
    setFormErrors({});
  };

  const handlePrint = () => window.print();

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .contact-form-modal-print-only { display: none; }
        @page { size: A4; margin: 15mm; }
        @media print {
          body * { visibility: hidden; }
          .contact-form-modal-print-only,
          .contact-form-modal-print-only * { visibility: visible; }
          .contact-form-modal-print-only {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 99999 !important;
          }
          body { background: white !important; }
        }
      `}} />
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 contact-form-modal-overlay" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto contact-form-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{editContactId ? t('editContact') : t('addContactTitle')}</h3>
            <p className="text-sm text-gray-500 mt-1">{editContactId ? (locale === 'ar' ? 'تحديث بيانات البطاقة أو جواز السفر' : 'Update card or passport data') : t('addContactSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all print:hidden"
          >
            <span>🖨️</span>
            {t('printForm')}
          </button>
        </div>
        {Object.keys(formErrors).length > 0 && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="font-semibold text-red-800 mb-2">{t('pleaseCorrectErrors')}:</p>
            <ul className="list-disc list-inside text-red-700 text-sm space-y-2">
              {Object.keys(formErrors).map((key) => (
                <li key={key}>
                  <span className="font-medium">{requiredFieldLabels[key as keyof typeof requiredFieldLabels] || key}:</span>{' '}
                  {formErrors[key]}
                </li>
              ))}
            </ul>
          </div>
        )}
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('firstName')} *</label>
              <input type="text" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('firstName')}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('secondName')}</label>
              <input type="text" value={form.secondName} onChange={(e) => setForm({ ...form, secondName: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('thirdName')}</label>
              <input type="text" value={form.thirdName} onChange={(e) => setForm({ ...form, thirdName: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('familyName')} *</label>
              <input type="text" required value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('familyName')}`} />
            </div>
          </div>
          <TranslateField
            label={t('name') + ' (EN)'}
            value={form.nameEn}
            onChange={(v) => setForm({ ...form, nameEn: v })}
            sourceValue={[form.firstName, form.secondName, form.thirdName, form.familyName].filter(Boolean).join(' ')}
            onTranslateFromSource={(v) => setForm({ ...form, nameEn: v })}
            translateFrom="ar"
            locale={locale}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('nationality')} *</label>
              <input
                type="text"
                list="nationalities-contact-modal"
                required
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className={`admin-input w-full ${getFieldErrorClass('nationality')}`}
                placeholder={t('nationalityPlaceholder')}
              />
              <datalist id="nationalities-contact-modal">
                {getAllNationalityValues(locale).map((val) => (
                  <option key={val} value={val} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('gender')}</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as ContactGender })} className="admin-select w-full">
                <option value="MALE">{t('male')}</option>
                <option value="FEMALE">{t('female')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')} *</label>
              <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('phone')}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phoneAlt')}</label>
              <input type="tel" value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} className="admin-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilId')}{isOmaniNationality(form.nationality) ? ' *' : ''}</label>
              <input type="text" value={form.civilId} onChange={(e) => setForm({ ...form, civilId: e.target.value })} className={`admin-input w-full ${isOmaniNationality(form.nationality) ? getFieldErrorClass('civilId') : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilIdExpiry')}{isOmaniNationality(form.nationality) ? ' *' : ''}</label>
              <input type="date" value={form.civilIdExpiry || ''} onChange={(e) => setForm({ ...form, civilIdExpiry: e.target.value })} className={`admin-input w-full ${isOmaniNationality(form.nationality) ? getFieldErrorClass('civilIdExpiry') : ''}`} />
            </div>
          </div>
          {form.nationality && !isOmaniNationality(form.nationality) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="col-span-2 text-sm font-medium text-amber-800">{t('expatNote')}</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportNumber')} *</label>
                <input type="text" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('passportNumber')}`} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportExpiry')} *</label>
                <input type="date" value={form.passportExpiry || ''} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('passportExpiry')}`} />
              </div>
            </div>
          )}
          <div>
            <TranslateField
              label={t('workplace')}
              value={form.workplace}
              onChange={(v) => setForm({ ...form, workplace: v })}
              sourceValue={form.workplaceEn}
              onTranslateFromSource={(v) => setForm({ ...form, workplace: v })}
              translateFrom="en"
              locale={locale}
            />
            <TranslateField
              label={t('workplace') + ' (EN)'}
              value={form.workplaceEn}
              onChange={(v) => setForm({ ...form, workplaceEn: v })}
              sourceValue={form.workplace}
              onTranslateFromSource={(v) => setForm({ ...form, workplaceEn: v })}
              translateFrom="ar"
              locale={locale}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('category')} *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContactCategory })} className="admin-select w-full">
                {(Object.keys(CATEGORY_KEYS) as ContactCategory[]).map((cat) => (
                  <option key={cat} value={cat}>{t(CATEGORY_KEYS[cat] as 'categoryClient')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('address')} *</label>
              <input
                type="text"
                required
                value={form.address?.fullAddress || ''}
                onChange={(e) => setForm({ ...form, address: { ...form.address, fullAddress: e.target.value } })}
                className={`admin-input w-full ${getFieldErrorClass('address')}`}
                placeholder={t('addressPlaceholder')}
              />
            </div>
          </div>
          <div>
            <TranslateField
              label={t('notes')}
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              sourceValue={form.notesEn}
              onTranslateFromSource={(v) => setForm({ ...form, notes: v })}
              translateFrom="en"
              locale={locale}
              multiline
              rows={3}
            />
            <TranslateField
              label={t('notes') + ' (EN)'}
              value={form.notesEn}
              onChange={(v) => setForm({ ...form, notesEn: v })}
              sourceValue={form.notes}
              onTranslateFromSource={(v) => setForm({ ...form, notesEn: v })}
              translateFrom="ar"
              locale={locale}
              multiline
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tags')}</label>
            <input
              type="text"
              value={form.tags?.join(', ') || ''}
              onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
              className="admin-input w-full"
              placeholder={t('tagsPlaceholder')}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              {t('cancel')}
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
              {editContactId ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* نموذج الطباعة - يعرض البيانات المعبأة والفارغة - مستند رسمي A4 */}
      <div className="contact-form-modal-print-only w-full max-w-[210mm] mx-auto min-h-[297mm]" dir={locale === 'ar' ? 'rtl' : 'ltr'} style={{ boxSizing: 'border-box' }}>
        <div className="p-6">
          <div className="border-b-2 border-[#8B6F47] pb-5 mb-6">
            <div className="flex items-center justify-center gap-5">
              <img src="/logo-bhd.png" alt="Logo" className="w-20 h-20 object-contain" />
              <div className="text-center">
                <h2 className="text-2xl font-bold" style={{ color: '#8B6F47' }}>
                  {locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}
                </h2>
                <p className="text-sm text-gray-600 font-medium">{siteConfig.company.legalName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('printFormTitle')}</p>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-sm shadow-sm" style={{ border: '1px solid #9ca3af', borderRadius: '4px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th className="border border-gray-300 px-4 py-3 font-bold w-36" style={{ backgroundColor: '#8B6F47', color: 'white', borderColor: '#6B5535' }}>{t('printFieldLabel')}</th>
                <th className="border border-gray-300 px-4 py-3 font-bold" style={{ backgroundColor: '#8B6F47', color: 'white', borderColor: '#6B5535' }}>{t('printDataLabel')}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('name')} *</td><td className="border border-gray-300 px-4 py-2.5">{[form.firstName, form.secondName, form.thirdName, form.familyName].filter(Boolean).join(' ') || '—'}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('nationality')} *</td><td className="border border-gray-300 px-4 py-2.5">{form.nationality?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('gender')} *</td><td className="border border-gray-300 px-4 py-2.5">{form.gender === 'FEMALE' ? t('female') : t('male')}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('phone')} *</td><td className="border border-gray-300 px-4 py-2.5">{form.phone?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('phoneAlt')}</td><td className="border border-gray-300 px-4 py-2.5">{form.phoneSecondary?.trim() || '—'}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('email')}</td><td className="border border-gray-300 px-4 py-2.5">{form.email?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('address')} *</td><td className="border border-gray-300 px-4 py-2.5">{form.address?.fullAddress?.trim() || '—'}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('category')} *</td><td className="border border-gray-300 px-4 py-2.5">{t(CATEGORY_KEYS[form.category] as 'categoryClient')}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('workplace')}</td><td className="border border-gray-300 px-4 py-2.5">{form.workplace?.trim() || '—'}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('civilId')}</td><td className="border border-gray-300 px-4 py-2.5">{form.civilId?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('civilIdExpiry')}</td><td className="border border-gray-300 px-4 py-2.5">{form.civilIdExpiry?.trim() || '—'}</td></tr>
              <tr className="bg-gray-50/50"><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('passportNumber')}</td><td className="border border-gray-300 px-4 py-2.5">{form.passportNumber?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50">{t('passportExpiry')}</td><td className="border border-gray-300 px-4 py-2.5">{form.passportExpiry?.trim() || '—'}</td></tr>
              <tr><td className="border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 bg-gray-50 align-top">{t('notes')}</td><td className="border border-gray-300 px-4 py-2.5 min-h-[3em]">{form.notes?.trim() || '—'}</td></tr>
            </tbody>
          </table>

          <p className="text-xs text-gray-500 mt-4">{t('requiredFieldsNote')}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}</p>

          <div className="border-t-2 border-[#8B6F47] mt-8 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-900">{locale === 'ar' ? siteConfig.company.nameAr + ' ' + siteConfig.company.sloganAr : siteConfig.company.nameEn + ' ' + siteConfig.company.sloganEn}</p>
                <p>{locale === 'ar' ? siteConfig.company.address : siteConfig.company.addressEn}</p>
                <p>{siteConfig.company.email} | {siteConfig.company.phone}</p>
              </div>
              <p className="text-gray-500">© {new Date().getFullYear()} {locale === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
