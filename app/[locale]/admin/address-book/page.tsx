'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getAllContacts,
  searchContacts,
  createContact,
  updateContact,
  deleteContact,
  exportContactsToCsv,
  importContactsFromCsv,
  getContactDisplayName,
  getContactLocalizedField,
  isOmaniNationality,
  type Contact,
  type ContactCategory,
  type ContactAddress,
  type ContactGender,
} from '@/lib/data/addressBook';
import TranslateField from '@/components/admin/TranslateField';
import { getAllNationalityValues } from '@/lib/data/nationalities';
import { siteConfig } from '@/config/site';

const CATEGORY_KEYS: Record<ContactCategory, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
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

const emptyForm = {
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
  category: 'OTHER' as ContactCategory,
  address: { ...emptyAddress },
  notes: '',
  notesEn: '',
  tags: [] as string[],
};

export default function AdminAddressBookPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('addressBook');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'ALL'>('ALL');
  const [filterTag, setFilterTag] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mounted, setMounted] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);

  const loadData = () => setContacts(getAllContacts());

  useEffect(() => {
    loadData();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_address_book') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const filteredContacts = searchContacts(search).filter((c) => {
    if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
    if (filterTag.trim()) {
      const tag = filterTag.trim().toLowerCase();
      return (c.tags || []).some((t) => t.toLowerCase().includes(tag));
    }
    return true;
  });

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || []))).sort();

  const stats = {
    total: contacts.length,
    clients: contacts.filter((c) => c.category === 'CLIENT').length,
    tenants: contacts.filter((c) => c.category === 'TENANT').length,
    landlords: contacts.filter((c) => c.category === 'LANDLORD').length,
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id);
    setForm({
      firstName: c.firstName || '',
      secondName: c.secondName || '',
      thirdName: c.thirdName || '',
      familyName: c.familyName || '',
      nationality: c.nationality || '',
      gender: c.gender || 'MALE',
      email: c.email || '',
      phone: c.phone,
      phoneSecondary: c.phoneSecondary || '',
      civilId: c.civilId || '',
      civilIdExpiry: c.civilIdExpiry || '',
      passportNumber: c.passportNumber || '',
      passportExpiry: c.passportExpiry || '',
      workplace: c.workplace || '',
      workplaceEn: c.workplaceEn || '',
      nameEn: c.nameEn || '',
      company: c.company || '',
      position: c.position || '',
      category: c.category,
      address: { ...emptyAddress, ...c.address },
      notes: c.notes || '',
      notesEn: c.notesEn || '',
      tags: c.tags || [],
    });
    setFormErrors({});
    setShowModal(true);
  };

  const requiredFieldLabels: Record<string, string> = {
    firstName: t('firstName'),
    familyName: t('familyName'),
    nationality: t('nationality'),
    phone: t('phone'),
    address: t('address'),
  };

  const getRequiredFieldClass = (field: keyof typeof requiredFieldLabels) => {
    const isEmpty =
      field === 'address' ? !form.address?.fullAddress?.trim() :
      field === 'firstName' ? !form.firstName?.trim() :
      field === 'familyName' ? !form.familyName?.trim() :
      field === 'nationality' ? !form.nationality?.trim() :
      field === 'phone' ? !form.phone?.trim() : false;
    if (isEmpty) return 'border-2 border-red-400 ring-2 ring-red-200';
    return 'border-2 border-emerald-400';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.firstName?.trim()) errors.firstName = t('fieldRequired');
    if (!form.familyName?.trim()) errors.familyName = t('fieldRequired');
    if (!form.nationality?.trim()) errors.nationality = t('fieldRequired');
    if (!form.phone?.trim()) errors.phone = t('fieldRequired');
    if (!form.address?.fullAddress?.trim()) errors.address = t('fieldRequired');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
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
      category: form.category,
      address: addr,
      notes: form.notes?.trim() || undefined,
      notesEn: form.notesEn?.trim() || undefined,
      tags: form.tags?.length ? form.tags : undefined,
    };
    if (editingId) {
      updateContact(editingId, payload);
    } else {
      createContact(payload);
    }
    setShowModal(false);
    setFormErrors({});
    loadData();
  };

  const handlePrint = () => window.print();

  const handlePrintContact = (c: Contact) => {
    setForm({
      firstName: c.firstName || '',
      secondName: c.secondName || '',
      thirdName: c.thirdName || '',
      familyName: c.familyName || '',
      nationality: c.nationality || '',
      gender: c.gender || 'MALE',
      email: c.email || '',
      phone: c.phone,
      phoneSecondary: c.phoneSecondary || '',
      civilId: c.civilId || '',
      civilIdExpiry: c.civilIdExpiry || '',
      passportNumber: c.passportNumber || '',
      passportExpiry: c.passportExpiry || '',
      workplace: c.workplace || '',
      workplaceEn: c.workplaceEn || '',
      nameEn: c.nameEn || '',
      company: c.company || '',
      position: c.position || '',
      category: c.category,
      address: { ...emptyAddress, ...c.address },
      notes: c.notes || '',
      notesEn: c.notesEn || '',
      tags: c.tags || [],
    });
    setTimeout(() => window.print(), 150);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteContact(deleteId);
      setDeleteId(null);
      loadData();
    }
  };

  const formatAddress = (a?: ContactAddress) => {
    if (!a) return '—';
    if (a.fullAddress) return a.fullAddress;
    const parts = [a.governorate, a.state, a.area, a.village, a.street, a.building, a.floor].filter(Boolean);
    return parts.length ? parts.join(' - ') : '—';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 15mm; }
        @media print {
          .no-print, nav, aside, header, .admin-mobile-header, .admin-sidebar, [role="navigation"], .admin-sidebar-overlay { display: none !important; }
          .admin-main, .admin-main-inner { padding: 0 !important; max-width: 100% !important; }
          .print-only { display: block !important; }
          .address-book-main { display: none !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}} />
    <div className="space-y-8 address-book-main">
      {importResult !== null && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-medium">
          {t('importSuccess', { count: importResult })}
        </div>
      )}
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer">
              <span>📤</span>
              {t('importCsv')}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    const text = r.result as string;
                    const n = importContactsFromCsv(text);
                    setImportResult(n);
                    loadData();
                    setTimeout(() => setImportResult(null), 3000);
                  };
                  r.readAsText(f, 'UTF-8');
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const csv = exportContactsToCsv(filteredContacts);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <span>📥</span>
              {t('exportCsv')}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-sm no-print"
            >
              <span>➕</span>
              {t('addContact')}
            </button>
          </div>
        }
      />

      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('total')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="admin-card p-5 border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">{t('clients')}</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.clients}</p>
        </div>
        <div className="admin-card p-5 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{t('tenants')}</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.tenants}</p>
        </div>
        <div className="admin-card p-5 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase">{t('landlords')}</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.landlords}</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{t('contacts')}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="admin-input w-64"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ContactCategory | 'ALL')}
              className="admin-select text-sm py-2"
            >
              <option value="ALL">{t('allCategories')}</option>
              {(Object.keys(CATEGORY_KEYS) as ContactCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {t(CATEGORY_KEYS[cat] as 'categoryClient')}
                </option>
              ))}
            </select>
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="admin-select text-sm py-2"
              >
                <option value="">{t('allTags')}</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📇</div>
            <p className="text-gray-500 font-medium text-lg">{t('noContacts')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('noContactsHint')}</p>
            <button type="button" onClick={openAdd} className="mt-4 text-[#8B6F47] font-semibold hover:underline">
              {t('addContact')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="min-w-[140px]">{t('serialNo')}</th>
                  <th>{t('name')}</th>
                  <th>{t('nationality')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('civilId')}</th>
                  <th>{t('email')}</th>
                  <th>{t('workplace')}</th>
                  <th>{t('category')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-sm text-[#8B6F47] font-semibold">{c.serialNumber || '—'}</td>
                    <td>
                      <div className="font-semibold text-gray-900">{getContactDisplayName(c, locale)}</div>
                      {c.position && <div className="text-xs text-gray-500">{c.position}</div>}
                    </td>
                    <td>
                      <span className="text-gray-700">{c.nationality || '—'}</span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <a href={`tel:${c.phone}`} className="text-[#8B6F47] hover:underline font-medium">
                          {c.phone}
                        </a>
                        {c.phoneSecondary && (
                          <a href={`tel:${c.phoneSecondary}`} className="text-sm text-gray-500 hover:underline">
                            {c.phoneSecondary}
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-gray-700 font-mono text-sm">{c.civilId || '—'}</span>
                    </td>
                    <td>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-[#8B6F47] hover:underline">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-gray-700">{getContactLocalizedField(c, 'workplace', locale) === '—' ? (c.company || '—') : getContactLocalizedField(c, 'workplace', locale)}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <span className="admin-badge admin-badge-info text-xs">
                          {t(CATEGORY_KEYS[c.category] as 'categoryClient')}
                        </span>
                        {(c.tags || []).slice(0, 2).map((t) => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
                        ))}
                        {(c.tags || []).length > 2 && (
                          <span className="text-xs text-gray-400">+{(c.tags || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`tel:${c.phone}`}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                          title={t('call')}
                        >
                          📞
                        </a>
                        <a
                          href={`https://wa.me/${(() => {
                            const d = c.phone.replace(/\D/g, '');
                            return d.startsWith('968') ? d : '968' + d.replace(/^0/, '');
                          })()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-emerald-600 hover:underline"
                          title="WhatsApp"
                        >
                          💬
                        </a>
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="text-sm font-medium text-blue-600 hover:underline" title={t('email')}>
                            ✉️
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintContact(c)}
                          className="text-sm font-medium text-gray-600 hover:underline"
                          title={t('printForm')}
                        >
                          🖨️
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="text-sm font-medium text-[#8B6F47] hover:underline"
                        >
                          {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: إضافة / تعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? t('editContact') : t('addContactTitle')}
              </h3>
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
              <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="font-semibold text-red-800 mb-2">{t('pleaseFillRequired')}:</p>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {Object.keys(formErrors).map((key) => (
                    <li key={key}>{requiredFieldLabels[key as keyof typeof requiredFieldLabels] || key}</li>
                  ))}
                </ul>
              </div>
            )}
            <form id="contact-form-print" className="p-6 space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('firstName')} *</label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={`admin-input w-full ${getRequiredFieldClass('firstName')}`} />
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
                  <input type="text" required value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className={`admin-input w-full ${getRequiredFieldClass('familyName')}`} />
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
                    list="nationalities"
                    required
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className={`admin-input w-full ${getRequiredFieldClass('nationality')}`}
                    placeholder={t('nationalityPlaceholder')}
                  />
                  <datalist id="nationalities">
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
                  <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`admin-input w-full ${getRequiredFieldClass('phone')}`} />
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilId')}</label>
                  <input type="text" value={form.civilId} onChange={(e) => setForm({ ...form, civilId: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilIdExpiry')}</label>
                  <input type="date" value={form.civilIdExpiry} onChange={(e) => setForm({ ...form, civilIdExpiry: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              {!isOmaniNationality(form.nationality) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="col-span-2 text-sm font-medium text-amber-800">{t('expatNote')}</p>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportNumber')}</label>
                    <input type="text" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="admin-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportExpiry')}</label>
                    <input type="date" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="admin-input w-full" />
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
                    className={`admin-input w-full ${getRequiredFieldClass('address')}`}
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
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
                  {editingId ? t('save') : t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: تأكيد الحذف */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">{t('confirmDeleteMsg')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700">
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* نموذج الطباعة - يعرض البيانات المعبأة والفارغة - مستند رسمي */}
      <div id="printable-form" className="print-only w-full max-w-[210mm] mx-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6">
          {/* رأس الصفحة - الشعار */}
          <div className="border-b-2 border-[#8B6F47] pb-5 mb-6">
            <div className="flex items-center justify-center gap-5">
              <img src="/logo-bhd.png" alt="Logo" className="w-20 h-20 object-contain" />
              <div className="text-center">
                <h2 className="text-2xl font-bold" style={{ color: '#8B6F47' }}>
                  {locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}
                </h2>
                <p className="text-sm text-gray-600 font-medium">{siteConfig.company.legalName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{locale === 'ar' ? 'نموذج بيانات جهة الاتصال' : 'Contact Information Form'}</p>
              </div>
            </div>
          </div>

          {/* جدول البيانات الرسمي */}
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

          {/* تذييل الصفحة */}
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
