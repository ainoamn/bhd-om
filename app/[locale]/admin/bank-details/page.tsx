'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import TranslateField from '@/components/admin/TranslateField';
import AccountingSection from '@/components/admin/AccountingSection';
import {
  getAllBankAccounts,
  searchBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  formatIbanForDisplay,
  isValidOmaniIban,
  type BankAccount,
  type BankAccountPurpose,
} from '@/lib/data/bankAccounts';
import { OMANI_BANKS } from '@/lib/data/omaniBanks';

const PURPOSE_KEYS: Record<BankAccountPurpose, string> = {
  RENT: 'purposeRent',
  SALES: 'purposeSales',
  DEPOSITS: 'purposeDeposits',
  MAINTENANCE: 'purposeMaintenance',
  GENERAL: 'purposeGeneral',
  OTHER: 'purposeOther',
};

const CURRENCIES = [
  { value: 'OMR', labelAr: 'ر.ع', labelEn: 'OMR' },
  { value: 'USD', labelAr: 'دولار', labelEn: 'USD' },
  { value: 'EUR', labelAr: 'يورو', labelEn: 'EUR' },
];

const emptyForm = {
  nameAr: '',
  nameEn: '',
  bankNameAr: '',
  bankNameEn: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  currency: 'OMR',
  branch: '',
  purpose: 'GENERAL' as BankAccountPurpose,
  isDefault: false,
  isActive: true,
  notes: '',
};

export default function AdminBankDetailsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const t = useTranslations('bankDetails');

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mounted, setMounted] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bank' | 'accounting'>('bank');

  useEffect(() => setMounted(true), []);

  const loadData = () => setAccounts(getAllBankAccounts());

  useEffect(() => {
    loadData();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_bank_accounts') loadData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const filteredAccounts = searchBankAccounts(search);

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    default: accounts.find((a) => a.isDefault) || null,
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (a: BankAccount) => {
    setEditingId(a.id);
    setForm({
      nameAr: a.nameAr || '',
      nameEn: a.nameEn || '',
      bankNameAr: a.bankNameAr || '',
      bankNameEn: a.bankNameEn || '',
      accountNumber: a.accountNumber || '',
      iban: a.iban || '',
      swiftCode: a.swiftCode || '',
      currency: a.currency || 'OMR',
      branch: a.branch || '',
      purpose: (a.purpose || 'GENERAL') as BankAccountPurpose,
      isDefault: a.isDefault ?? false,
      isActive: a.isActive ?? true,
      notes: a.notes || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.nameAr?.trim()) errors.nameAr = t('fieldRequired');
    if (!form.bankNameAr?.trim()) errors.bankNameAr = t('fieldRequired');
    if (!form.accountNumber?.trim()) errors.accountNumber = t('fieldRequired');
    if (form.iban?.trim() && !isValidOmaniIban(form.iban.replace(/\s/g, ''))) {
      errors.iban = ar ? 'رقم الآيبان العماني يجب أن يبدأ بـ OM ويتكون من 24 حرفاً' : 'Omani IBAN must start with OM and be 24 characters';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn?.trim() || undefined,
      bankNameAr: form.bankNameAr.trim(),
      bankNameEn: form.bankNameEn?.trim() || undefined,
      accountNumber: form.accountNumber.trim(),
      iban: form.iban?.trim() ? form.iban.replace(/\s/g, '').toUpperCase() : undefined,
      swiftCode: form.swiftCode?.trim() || undefined,
      currency: form.currency,
      branch: form.branch?.trim() || undefined,
      purpose: form.purpose,
      isDefault: form.isDefault,
      isActive: form.isActive,
      notes: form.notes?.trim() || undefined,
      sortOrder: editingId ? (accounts.find((x) => x.id === editingId)?.sortOrder ?? 0) : accounts.length,
    };

    if (editingId) {
      updateBankAccount(editingId, payload);
    } else {
      createBankAccount(payload);
    }
    setShowModal(false);
    setFormErrors({});
    loadData();
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBankAccount(deleteId);
      setDeleteId(null);
      loadData();
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultBankAccount(id);
    loadData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          activeTab === 'bank' ? (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-sm"
            >
              <span>➕</span>
              {t('addAccount')}
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'bank' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {ar ? 'الحسابات البنكية' : 'Bank Accounts'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'accounting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {ar ? 'المحاسبة' : 'Accounting'}
        </button>
      </div>

      {activeTab === 'accounting' ? (
        <AccountingSection />
      ) : (
        <>
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('total')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="admin-card p-5 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{t('active')}</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</p>
        </div>
        <div className="admin-card p-5 border-[#8B6F47]/30 col-span-2">
          <p className="text-xs font-semibold text-[#8B6F47] uppercase">{t('default')}</p>
          <p className="text-lg font-bold text-[#8B6F47] mt-1">
            {stats.default ? (ar ? stats.default.nameAr : stats.default.nameEn || stats.default.nameAr) : '—'}
          </p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{t('accounts')}</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="admin-input w-64"
          />
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">🏦</div>
            <p className="text-gray-500 font-medium text-lg">{t('noAccounts')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('noAccountsHint')}</p>
            <button type="button" onClick={openAdd} className="mt-4 text-[#8B6F47] font-semibold hover:underline">
              {t('addAccount')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[700px]">
              <thead>
                <tr>
                  <th>{ar ? 'اسم الحساب' : 'Account'}</th>
                  <th>{ar ? 'البنك' : 'Bank'}</th>
                  <th>{ar ? 'رقم الحساب' : 'Account No.'}</th>
                  <th>{ar ? 'الآيبان' : 'IBAN'}</th>
                  <th>{ar ? 'الغرض' : 'Purpose'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="font-semibold text-gray-900">{ar ? a.nameAr : a.nameEn || a.nameAr}</div>
                      {a.isDefault && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#8B6F47]/20 text-[#8B6F47]">
                          {t('default')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-gray-700">{ar ? a.bankNameAr : a.bankNameEn || a.bankNameAr}</span>
                      {a.branch && <div className="text-xs text-gray-500">{a.branch}</div>}
                    </td>
                    <td>
                      <span className="font-mono text-sm text-gray-800">{a.accountNumber}</span>
                    </td>
                    <td>
                      {a.iban ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-700">{formatIbanForDisplay(a.iban)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(a.iban!.replace(/\s/g, ''), a.id)}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title={t('copyIban')}
                          >
                            {copiedId === a.id ? t('copied') : '📋'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info text-xs">
                        {t(PURPOSE_KEYS[a.purpose || 'GENERAL'] as 'purposeRent')}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge text-xs ${a.isActive ? 'admin-badge-success' : 'bg-gray-100 text-gray-600'}`}>
                        {a.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {!a.isDefault && a.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(a.id)}
                            className="text-sm font-medium text-[#8B6F47] hover:underline"
                          >
                            {t('setAsDefault')}
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(a)} className="text-sm font-medium text-[#8B6F47] hover:underline">
                          {t('edit')}
                        </button>
                        <button type="button" onClick={() => setDeleteId(a.id)} className="text-sm font-medium text-red-600 hover:underline">
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
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? t('edit') : t('addAccount')}</h3>
            </div>
            {Object.keys(formErrors).length > 0 && (
              <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {Object.keys(formErrors).map((key) => (
                    <li key={key}>{formErrors[key]}</li>
                  ))}
                </ul>
              </div>
            )}
            <form className="p-6 space-y-4" onSubmit={handleSave}>
              <TranslateField
                label={t('nameAr')}
                value={form.nameAr}
                onChange={(v) => setForm({ ...form, nameAr: v })}
                sourceValue={form.nameEn}
                onTranslateFromSource={(v) => setForm({ ...form, nameAr: v })}
                translateFrom="en"
                locale={locale}
                required
              />
              <TranslateField
                label={t('nameEn')}
                value={form.nameEn}
                onChange={(v) => setForm({ ...form, nameEn: v })}
                sourceValue={form.nameAr}
                onTranslateFromSource={(v) => setForm({ ...form, nameEn: v })}
                translateFrom="ar"
                locale={locale}
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('selectBankFromList')}</label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const bank = OMANI_BANKS.find((b) => b.nameAr === val || b.nameEn === val);
                    if (bank) {
                      setForm({
                        ...form,
                        bankNameAr: bank.nameAr,
                        bankNameEn: bank.nameEn,
                        swiftCode: bank.swiftCode || form.swiftCode,
                      });
                    }
                    e.target.value = '';
                  }}
                  className="admin-select w-full"
                >
                  <option value="">{t('selectBankPlaceholder')}</option>
                  {OMANI_BANKS.map((b) => (
                    <option key={`${b.nameAr}-${b.swiftCode}`} value={b.nameAr}>
                      {ar ? `${b.nameAr}${b.swiftCode ? ` (${b.swiftCode})` : ''}` : `${b.nameEn}${b.swiftCode ? ` (${b.swiftCode})` : ''}`}
                    </option>
                  ))}
                </select>
              </div>
              <TranslateField
                label={t('bankNameAr')}
                value={form.bankNameAr}
                onChange={(v) => setForm({ ...form, bankNameAr: v })}
                sourceValue={form.bankNameEn}
                onTranslateFromSource={(v) => setForm({ ...form, bankNameAr: v })}
                translateFrom="en"
                locale={locale}
                required
              />
              <TranslateField
                label={t('bankNameEn')}
                value={form.bankNameEn}
                onChange={(v) => setForm({ ...form, bankNameEn: v })}
                sourceValue={form.bankNameAr}
                onTranslateFromSource={(v) => setForm({ ...form, bankNameEn: v })}
                translateFrom="ar"
                locale={locale}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('accountNumber')}</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className={`admin-input w-full font-mono ${formErrors.accountNumber ? 'border-red-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('iban')}</label>
                  <input
                    type="text"
                    value={form.iban}
                    onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    className={`admin-input w-full font-mono ${formErrors.iban ? 'border-red-500' : ''}`}
                    placeholder="OM1234567890123456789012"
                    maxLength={24}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('swiftCode')}</label>
                  <input
                    type="text"
                    value={form.swiftCode}
                    onChange={(e) => setForm({ ...form, swiftCode: e.target.value.toUpperCase() })}
                    className="admin-input w-full font-mono"
                    placeholder="MBOSOMRX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('currency')}</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="admin-select w-full">
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{ar ? c.labelAr : c.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('branch')}</label>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('purpose')}</label>
                <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as BankAccountPurpose })} className="admin-select w-full">
                  {(Object.keys(PURPOSE_KEYS) as BankAccountPurpose[]).map((p) => (
                    <option key={p} value={p}>{t(PURPOSE_KEYS[p] as 'purposeRent')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('isDefault')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('isActive')}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="admin-input w-full resize-none"
                  rows={2}
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
        </>
      )}
    </div>
  );
}
