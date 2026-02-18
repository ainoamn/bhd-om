'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Icon from '@/components/icons/Icon';
import { getCompanyData, saveCompanyData, type CompanyData } from '@/lib/data/companyData';

const emptyForm: CompanyData = {
  logoUrl: '/logo-bhd.png',
  nameAr: '',
  nameEn: '',
  addressAr: '',
  addressEn: '',
  crNumber: '',
  vatNumber: '',
  phone: '',
  email: '',
  signatoryName: '',
  signatoryNameEn: '',
  signatoryPosition: '',
  signatoryPositionEn: '',
  signatureType: 'image',
  signatorySignatureUrl: '',
  companyStampUrl: '',
  updatedAt: '',
};

export default function AdminCompanyDataPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('companyData');
  const ar = locale === 'ar';

  const [form, setForm] = useState<CompanyData>(emptyForm);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(getCompanyData());
  }, []);

  const handleUpload = async (field: 'logoUrl' | 'signatorySignatureUrl' | 'companyStampUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/company', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setForm((f) => ({ ...f, [field]: data.url }));
      }
    } catch {
      alert(ar ? 'فشل الرفع' : 'Upload failed');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    saveCompanyData(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('title')}</h1>
        <p className="admin-page-subtitle">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* شعار الشركة */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('companyLogo')}</h2>
          </div>
          <div className="admin-card-body">
            <div className="flex flex-wrap items-center gap-6">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                {form.logoUrl ? (
                  <Image src={form.logoUrl} alt="Logo" width={120} height={120} className="object-contain" />
                ) : (
                  <Icon name="building" className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer">
                  <Icon name="archive" className="w-5 h-5" />
                  {uploading === 'logoUrl' ? (ar ? 'جاري الرفع...' : 'Uploading...') : (ar ? 'رفع شعار' : 'Upload logo')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload('logoUrl', e)}
                    disabled={!!uploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* بيانات الشركة */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('companyDetails')}</h2>
          </div>
          <div className="admin-card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('nameAr')}</label>
                <input
                  type="text"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="admin-input w-full"
                  placeholder="بن حمود للتطوير"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('nameEn')}</label>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  className="admin-input w-full"
                  placeholder="Bin Hamood Development"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('addressAr')}</label>
                <textarea
                  value={form.addressAr}
                  onChange={(e) => setForm({ ...form, addressAr: e.target.value })}
                  className="admin-input w-full min-h-[80px]"
                  placeholder="مسقط - المعبيلة الجنوبية..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('addressEn')}</label>
                <textarea
                  value={form.addressEn}
                  onChange={(e) => setForm({ ...form, addressEn: e.target.value })}
                  className="admin-input w-full min-h-[80px]"
                  placeholder="Muscat - South Mabelah..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('crNumber')}</label>
                <input
                  type="text"
                  value={form.crNumber}
                  onChange={(e) => setForm({ ...form, crNumber: e.target.value })}
                  className="admin-input w-full"
                  placeholder="1010123456"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('vatNumber')}</label>
                <input
                  type="text"
                  value={form.vatNumber}
                  onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                  className="admin-input w-full"
                  placeholder="52402393094"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')}</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="admin-input w-full"
                  placeholder="+96891115341"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="admin-input w-full"
                  placeholder="info@bhd-om.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* توقيع المفوض بالتوقيع */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('signatory')}</h2>
          </div>
          <div className="admin-card-body space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('signatureType')}</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="signatureType"
                    checked={form.signatureType === 'image'}
                    onChange={() => setForm({ ...form, signatureType: 'image' })}
                    className="rounded-full"
                  />
                  <span>{t('signatureTypeImage')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="signatureType"
                    checked={form.signatureType === 'electronic'}
                    onChange={() => setForm({ ...form, signatureType: 'electronic' })}
                    className="rounded-full"
                  />
                  <span>{t('signatureTypeElectronic')}</span>
                </label>
              </div>
              {form.signatureType === 'electronic' && (
                <p className="text-sm text-gray-600 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  {t('signatureTypeElectronicNote')}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('signatoryName')}</label>
                <input
                  type="text"
                  value={form.signatoryName}
                  onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                  className="admin-input w-full"
                  placeholder={ar ? 'اسم المفوض بالتوقيع' : 'Authorized signatory name'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('signatoryNameEn')}</label>
                <input
                  type="text"
                  value={form.signatoryNameEn}
                  onChange={(e) => setForm({ ...form, signatoryNameEn: e.target.value })}
                  className="admin-input w-full"
                  placeholder="Authorized signatory name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('signatoryPosition')}</label>
                <input
                  type="text"
                  value={form.signatoryPosition}
                  onChange={(e) => setForm({ ...form, signatoryPosition: e.target.value })}
                  className="admin-input w-full"
                  placeholder={ar ? 'المدير العام' : 'General Manager'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('signatoryPositionEn')}</label>
                <input
                  type="text"
                  value={form.signatoryPositionEn}
                  onChange={(e) => setForm({ ...form, signatoryPositionEn: e.target.value })}
                  className="admin-input w-full"
                  placeholder="General Manager"
                />
              </div>
            </div>
            {form.signatureType === 'image' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('signatorySignature')}</label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-48 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {form.signatorySignatureUrl ? (
                      <img src={form.signatorySignatureUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-gray-400 text-sm">{ar ? 'لا يوجد توقيع' : 'No signature'}</span>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer">
                    <Icon name="archive" className="w-5 h-5" />
                    {uploading === 'signatorySignatureUrl' ? (ar ? 'جاري الرفع...' : 'Uploading...') : (ar ? 'رفع التوقيع' : 'Upload signature')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload('signatorySignatureUrl', e)}
                      disabled={!!uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ختم الشركة */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('companyStamp')}</h2>
          </div>
          <div className="admin-card-body">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                {form.companyStampUrl ? (
                  <img src={form.companyStampUrl} alt="Stamp" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-sm">{ar ? 'لا يوجد ختم' : 'No stamp'}</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer">
                <Icon name="archive" className="w-5 h-5" />
                {uploading === 'companyStampUrl' ? (ar ? 'جاري الرفع...' : 'Uploading...') : (ar ? 'رفع الختم' : 'Upload stamp')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload('companyStampUrl', e)}
                  disabled={!!uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* زر الحفظ */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
          >
            {saved ? (ar ? '✓ تم الحفظ' : '✓ Saved') : (ar ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
