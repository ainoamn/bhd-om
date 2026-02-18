'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  getTemplates,
  getDefaultTemplate,
  updateTemplate,
  type DocumentTemplateSettings,
  type TemplateType,
} from '@/lib/data/documentTemplates';
import { getCompanyData } from '@/lib/data/companyData';
import { SIGNATURE_SIZE, STAMP_SIZE, TEMPLATE_VARIANT_LABELS, LOGO_SIZE_OPTIONS, LOGO_SIZE_DEFAULT, type TemplateVariant } from '@/lib/data/documentTemplateConstants';
import { siteConfig } from '@/config/site';

interface InvoiceTemplateEditorProps {
  templateType: TemplateType;
  locale: string;
}

export default function InvoiceTemplateEditor({ templateType, locale }: InvoiceTemplateEditorProps) {
  const t = useTranslations('documentTemplates');
  const tc = useTranslations('companyData');
  const ar = locale === 'ar';

  const templates = getTemplates(templateType);
  const defaultT = getDefaultTemplate(templateType);
  const [company, setCompany] = useState<ReturnType<typeof getCompanyData> | null>(null);
  const [selectedId, setSelectedId] = useState<string>(defaultT?.id || templates[0]?.id || '');
  const [form, setForm] = useState<DocumentTemplateSettings | null>(null);

  useEffect(() => {
    const list = getTemplates(templateType);
    const tpl = list.find((x) => x.id === selectedId) || list[0];
    setForm(tpl ? { ...tpl } : null);
  }, [selectedId, templateType]);

  useEffect(() => {
    setCompany(getCompanyData());
    const refresh = () => setCompany(getCompanyData());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_company_data') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('bhd_company_data_updated', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bhd_company_data_updated', refresh);
    };
  }, []);

  const companyData = company || (typeof window !== 'undefined' ? getCompanyData() : null);

  const handleSave = () => {
    if (!form) return;
    updateTemplate(templateType, form.id, form);
    if (typeof window !== 'undefined') {
      const msg = ar ? 'تم حفظ النموذج بنجاح' : 'Template saved successfully';
      alert(msg);
    }
  };

  const handlePreview = () => {
    const previewEl = document.getElementById('invoice-template-preview');
    if (!previewEl || !form) return;
    const win = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (!win) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const variant = form.variant || 'classic';
    const sigW = SIGNATURE_SIZE.width;
    const sigH = SIGNATURE_SIZE.height;
    const stampW = STAMP_SIZE.width;
    const stampH = STAMP_SIZE.height;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${ar ? 'rtl' : 'ltr'}" lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}/">
        <title>${ar ? 'معاينة القالب' : 'Template Preview'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: ${form.textColor}; font-size: ${form.textFontSize}pt; }
          .container { max-width: 700px; margin: 0 auto; }
          img { max-width: 100%; height: auto; }
          .doc-signature-box { width: ${sigW}px; height: ${sigH}px; overflow: hidden; }
          .doc-signature-box img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
          .doc-stamp-box { width: ${stampW}px; height: ${stampH}px; overflow: hidden; }
          .doc-stamp-box img { width: 100%; height: 100%; object-fit: contain; object-position: center; }
          .document-template--professional table { border-collapse: separate; border-spacing: 0; }
          .document-template--professional thead th { background: #f8fafc; font-weight: 600; }
          .document-template--modern { letter-spacing: 0.02em; }
          .document-template--modern thead th { font-weight: 600; text-transform: uppercase; font-size: 0.75em; }
          .document-template--compact table { font-size: 0.9em; }
          .document-template--compact th, .document-template--compact td { padding: 0.25rem 0.5rem !important; }
          @media print { body { padding: 0; } .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="container" style="margin: ${form.marginTop}px ${form.marginRight}px ${form.marginBottom}px ${form.marginLeft}px;">
          ${previewEl.innerHTML}
        </div>
        <div class="no-print" style="position:fixed;top:12px;right:12px;display:flex;gap:8px;">
          <button onclick="window.print()" style="padding:8px 16px;background:#8B6F47;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🖨️ ${ar ? 'طباعة' : 'Print'}</button>
          <button onclick="window.close()" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:8px;cursor:pointer;">${ar ? 'إغلاق' : 'Close'}</button>
        </div>
      </body>
      </html>
    `);
    win.document.close();
  };

  if (!form) return null;

  const logoSize = form.logoSize ?? LOGO_SIZE_DEFAULT;

  return (
    <div className="space-y-6">
      {/* اختيار النموذج */}
      {templates.length > 1 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{ar ? 'اختر النموذج' : 'Select template'}</h2>
          </div>
          <div className="admin-card-body">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="admin-select w-full max-w-md"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {ar ? t.name : t.nameEn || t.name} {t.isDefault && `(${ar ? 'افتراضي' : 'Default'})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* إعدادات النموذج */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{ar ? 'إعدادات النموذج' : 'Template settings'}</h2>
        </div>
        <div className="admin-card-body space-y-6">
          {/* اسم النموذج */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('templateName')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="admin-input w-full max-w-md"
              placeholder="Invoice template 1"
            />
          </div>

          {/* افتراضي */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="mt-1 rounded"
            />
            <div>
              <label htmlFor="isDefault" className="font-medium text-gray-800 cursor-pointer">{t('default')}</label>
              <p className="text-sm text-gray-500 mt-0.5">{t('defaultNote')}</p>
            </div>
          </div>

          {/* نمط القالب */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'نمط القالب' : 'Template variant'}</label>
            <div className="flex flex-wrap gap-3">
              {(['classic', 'professional', 'modern', 'compact', 'bilingual'] as TemplateVariant[]).map((v) => (
                <label key={v} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${form.variant === v ? 'border-[#8B6F47] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="variant"
                    checked={(form.variant || 'classic') === v}
                    onChange={() => setForm({ ...form, variant: v })}
                    className="rounded-full"
                  />
                  <span>{ar ? TEMPLATE_VARIANT_LABELS[v].ar : TEMPLATE_VARIANT_LABELS[v].en}</span>
                </label>
              ))}
            </div>
          </div>

          {/* تخطيط الرأس */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('headerLayout')}</label>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${(form.headerLayout || 'left') === 'left' ? 'border-[#8B6F47] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="headerLayout"
                  checked={(form.headerLayout || 'left') === 'left'}
                  onChange={() => setForm({ ...form, headerLayout: 'left' })}
                  className="rounded-full"
                />
                <span>{t('headerLayoutLeft')}</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${(form.headerLayout || 'left') === 'centered' ? 'border-[#8B6F47] bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="radio"
                  name="headerLayout"
                  checked={(form.headerLayout || 'left') === 'centered'}
                  onChange={() => setForm({ ...form, headerLayout: 'centered' })}
                  className="rounded-full"
                />
                <span>{t('headerLayoutCentered')}</span>
              </label>
            </div>
          </div>

          {/* حجم الشعار */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('logoSize')}</label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={form.logoSize ?? LOGO_SIZE_DEFAULT}
                onChange={(e) => setForm({ ...form, logoSize: parseInt(e.target.value, 10) })}
                className="admin-select w-32"
              >
                {LOGO_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} px
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">{t('logoSizeNote')}</span>
            </div>
          </div>

          {/* ثنائي اللغة */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="bilingual"
              checked={!!form.bilingual}
              onChange={(e) => setForm({ ...form, bilingual: e.target.checked })}
              className="mt-1 rounded"
            />
            <div>
              <label htmlFor="bilingual" className="font-medium text-gray-800 cursor-pointer">{t('bilingual')}</label>
              <p className="text-sm text-gray-500 mt-0.5">{t('bilingualNote')}</p>
            </div>
          </div>

          {/* الشكل العام */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('templateStyle')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="style"
                  checked={form.style === 'standard'}
                  onChange={() => setForm({ ...form, style: 'standard' })}
                  className="rounded-full"
                />
                <span>{t('styleStandard')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="style"
                  checked={form.style === 'bordered'}
                  onChange={() => setForm({ ...form, style: 'bordered' })}
                  className="rounded-full"
                />
                <span>{t('styleBordered')}</span>
              </label>
            </div>
          </div>

          {/* اتجاه الصفحة */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('pageOrientation')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  checked={form.orientation === 'portrait'}
                  onChange={() => setForm({ ...form, orientation: 'portrait' })}
                  className="rounded-full"
                />
                <span>{t('orientationPortrait')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  checked={form.orientation === 'landscape'}
                  onChange={() => setForm({ ...form, orientation: 'landscape' })}
                  className="rounded-full"
                />
                <span>{t('orientationLandscape')}</span>
              </label>
            </div>
          </div>

          {/* ألوان وأحجام الخط */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('titleColor')}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.titleColor}
                  onChange={(e) => setForm({ ...form, titleColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.titleColor}
                  onChange={(e) => setForm({ ...form, titleColor: e.target.value })}
                  className="admin-input flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('titleFontSize')}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={6}
                  max={24}
                  value={form.titleFontSize}
                  onChange={(e) => setForm({ ...form, titleFontSize: parseInt(e.target.value, 10) || 9 })}
                  className="admin-input w-20"
                />
                <span className="text-gray-500">{t('pt')}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('textColor')}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.textColor}
                  onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  className="admin-input flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('textFontSize')}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={6}
                  max={24}
                  value={form.textFontSize}
                  onChange={(e) => setForm({ ...form, textFontSize: parseInt(e.target.value, 10) || 9 })}
                  className="admin-input w-20"
                />
                <span className="text-gray-500">{t('pt')}</span>
              </div>
            </div>
          </div>

          {/* الهوامش */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('margins')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('marginTop')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.marginTop}
                  onChange={(e) => setForm({ ...form, marginTop: parseInt(e.target.value, 10) || 0 })}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('marginBottom')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.marginBottom}
                  onChange={(e) => setForm({ ...form, marginBottom: parseInt(e.target.value, 10) || 0 })}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('marginLeft')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.marginLeft}
                  onChange={(e) => setForm({ ...form, marginLeft: parseInt(e.target.value, 10) || 0 })}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('marginRight')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.marginRight}
                  onChange={(e) => setForm({ ...form, marginRight: parseInt(e.target.value, 10) || 0 })}
                  className="admin-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSave} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
              {t('save')}
            </button>
            <button type="button" onClick={handlePreview} className="px-6 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200">
              👁 {t('preview')}
            </button>
          </div>
        </div>
      </div>

      {/* معاينة */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <h2 className="admin-card-title">{t('preview')}</h2>
          <button type="button" onClick={handlePreview} className="text-sm px-4 py-2 rounded-lg font-medium text-[#8B6F47] bg-amber-50 hover:bg-amber-100">
            👁 {t('preview')}
          </button>
        </div>
        <div className="admin-card-body p-0 overflow-hidden">
          <div
            id="invoice-template-preview"
            className={`bg-white p-6 document-template document-template--${form.variant || 'classic'}`}
            dir={ar ? 'rtl' : 'ltr'}
            data-variant={form.variant || 'classic'}
            style={{
              marginTop: form.marginTop,
              marginBottom: form.marginBottom,
              marginLeft: form.marginLeft,
              marginRight: form.marginRight,
              color: form.textColor,
              fontSize: `${form.textFontSize}pt`,
            }}
          >
            {/* رأس الفاتورة */}
            <div className="border-b-2 pb-2 mb-3" style={{ borderColor: form.titleColor }}>
              {(form.headerLayout || 'left') === 'centered' ? (
                /* تخطيط: شعار في المنتصف، عربي يمين، إنجليزي يسار (يعمل مع RTL و LTR) */
                <div className="flex justify-between items-start gap-4">
                  {ar ? (
                    <>
                      <div className="flex-1 text-right min-w-0 order-1" dir="rtl">
                        <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameAr || siteConfig.company.nameAr}
                        </h1>
                        <p className="text-[0.7rem] leading-tight mt-0.5" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                          {companyData?.addressAr || 'مسقط - المعبيلة الجنوبية - شارع 8401 - مجمع 384 - مبنى 75'}
                        </p>
                        <p className="text-[0.65rem] leading-tight" style={{ fontSize: `${form.textFontSize - 2}pt` }}>
                          نقال: {companyData?.phone || '91115341'} · {companyData?.email || 'info@bhd-om.com'}
                          {companyData?.crNumber && ` · سجل: ${companyData.crNumber}`}
                          {companyData?.vatNumber && ` · ضريبة: ${companyData.vatNumber}`}
                        </p>
                      </div>
                      {companyData?.logoUrl && (
                        <div className="shrink-0 overflow-hidden flex items-center justify-center mx-2 order-2" style={{ width: logoSize, height: logoSize }}>
                          <img src={companyData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0 order-3">
                        <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameEn || siteConfig.company.nameEn}
                        </h1>
                        <p className="text-[0.7rem] leading-tight mt-0.5" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                          {companyData?.addressEn || 'Muscat - South Mabelah - St: 8401 - Complex: 384 - Bldg: 75'}
                        </p>
                        <p className="text-[0.65rem] leading-tight" style={{ fontSize: `${form.textFontSize - 2}pt` }}>
                          GSM: {companyData?.phone || siteConfig.company.phone} · {companyData?.email || 'info@bhd-om.com'}
                          {companyData?.crNumber && ` · CR: ${companyData.crNumber}`}
                          {companyData?.vatNumber && ` · VAT: ${companyData.vatNumber}`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameEn || siteConfig.company.nameEn}
                        </h1>
                        <p className="text-[0.7rem] leading-tight mt-0.5" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                          {companyData?.addressEn || 'Muscat - South Mabelah - St: 8401 - Complex: 384 - Bldg: 75'}
                        </p>
                        <p className="text-[0.65rem] leading-tight" style={{ fontSize: `${form.textFontSize - 2}pt` }}>
                          GSM: {companyData?.phone || siteConfig.company.phone} · {companyData?.email || 'info@bhd-om.com'}
                          {companyData?.crNumber && ` · CR: ${companyData.crNumber}`}
                          {companyData?.vatNumber && ` · VAT: ${companyData.vatNumber}`}
                        </p>
                      </div>
                      {companyData?.logoUrl && (
                        <div className="shrink-0 overflow-hidden flex items-center justify-center mx-2" style={{ width: logoSize, height: logoSize }}>
                          <img src={companyData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 text-right min-w-0" dir="rtl">
                        <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameAr || siteConfig.company.nameAr}
                        </h1>
                        <p className="text-[0.7rem] leading-tight mt-0.5" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                          {companyData?.addressAr || 'مسقط - المعبيلة الجنوبية - شارع 8401 - مجمع 384 - مبنى 75'}
                        </p>
                        <p className="text-[0.65rem] leading-tight" style={{ fontSize: `${form.textFontSize - 2}pt` }}>
                          نقال: {companyData?.phone || '91115341'} · {companyData?.email || 'info@bhd-om.com'}
                          {companyData?.crNumber && ` · سجل: ${companyData.crNumber}`}
                          {companyData?.vatNumber && ` · ضريبة: ${companyData.vatNumber}`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-start gap-3">
                  <div className="flex gap-3 min-w-0">
                    {companyData?.logoUrl && (
                      <div className="shrink-0 overflow-hidden flex items-center justify-center" style={{ width: logoSize, height: logoSize }}>
                        <img src={companyData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-x-3 gap-y-0 mb-0.5">
                        <h1 className="font-bold shrink-0" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameEn || siteConfig.company.nameEn}
                        </h1>
                        <h1 className="font-bold shrink-0" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                          {companyData?.nameAr || siteConfig.company.nameAr}
                        </h1>
                      </div>
                      <p className="text-[0.7rem] leading-tight" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                        {companyData?.addressEn || 'Muscat - South Mabelah - St: 8401 - Complex: 384 - Bldg: 75'}
                        {' · '}
                        GSM: {companyData?.phone || siteConfig.company.phone}
                        {' · '}
                        {ar ? 'السيب، عُمان' : 'Al Seeb, Oman'}
                      </p>
                      <p className="text-[0.7rem] leading-tight" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                        {companyData?.addressAr || 'مسقط - المعبيلة الجنوبية - شارع 8401 - مجمع 384 - مبنى 75'}
                        {' · '}
                        {companyData?.phone || '91115341'}
                        {' · '}
                        {ar ? 'السيب، عُمان' : 'Al Seeb, Oman'}
                      </p>
                      {(companyData?.crNumber || companyData?.vatNumber || companyData?.email) && (
                        <p className="text-[0.65rem] leading-tight mt-0.5 opacity-90" style={{ fontSize: `${form.textFontSize - 2}pt` }}>
                          {companyData?.crNumber && (ar ? `سجل: ${companyData.crNumber}` : `CR: ${companyData.crNumber}`)}
                          {companyData?.crNumber && companyData?.vatNumber && ' · '}
                          {companyData?.vatNumber && (ar ? `ضريبة: ${companyData.vatNumber}` : `VAT: ${companyData.vatNumber}`)}
                          {(companyData?.crNumber || companyData?.vatNumber) && companyData?.email && ' · '}
                          {companyData?.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <h2 style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 1}pt` }}>
                      Tax Invoice فاتورة ضريبية
                    </h2>
                  </div>
                </div>
              )}
              {(form.headerLayout || 'left') === 'centered' && (
                <h2 className="text-center mt-2" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 1}pt` }}>
                  Tax Invoice فاتورة ضريبية
                </h2>
              )}
            </div>

            {/* بيانات العميل والفاتورة - جدول مدمج (ثنائي اللغة عند الطلب) */}
            <div className="mb-4">
              <table className="w-full text-[0.75rem]" style={{ fontSize: `${form.textFontSize - 1}pt` }}>
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-4 align-top w-1/2" style={{ color: form.titleColor }}>
                      <span className="font-semibold">{form.bilingual ? 'العميل Customer' : (ar ? 'العميل' : 'Customer')}</span> Abdullah M.
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'العنوان Address' : (ar ? 'العنوان' : 'Address')}</span> 1234، Office 205, King Faisal St، Al Olaya، Riyadh
                    </td>
                    <td className="py-0.5 pl-4 align-top w-1/2" style={{ color: form.titleColor }}>
                      <span className="font-semibold">{form.bilingual ? 'رقم الفاتورة Invoice' : (ar ? 'رقم الفاتورة' : 'Invoice')}</span> INV-001
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'التاريخ Date' : (ar ? 'التاريخ' : 'Date')}</span> 2026-01-10
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'الاستحقاق Due' : (ar ? 'الاستحقاق' : 'Due')}</span> 2026-02-10
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 align-top">
                      <span className="font-semibold">{form.bilingual ? 'البريد Email' : (ar ? 'البريد' : 'Email')}</span> abdullah.m@example.com
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'الهاتف Phone' : (ar ? 'الهاتف' : 'Phone')}</span> +971551234123
                    </td>
                    <td className="py-0.5 pl-4 align-top">
                      <span className="font-semibold">{form.bilingual ? 'المرجع Ref' : (ar ? 'المرجع' : 'Ref')}</span> ABC101
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'أمر الشراء PO' : (ar ? 'أمر الشراء' : 'PO')}</span> PO-001
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 align-top">
                      <span className="font-semibold">{form.bilingual ? 'الضريبة VAT' : (ar ? 'الضريبة' : 'VAT')}</span> 52402393094
                      <span className="mx-2">|</span>
                      <span className="font-semibold">{form.bilingual ? 'السجل CR' : (ar ? 'السجل' : 'CR')}</span> 1010123456
                    </td>
                    <td className="py-0.5 pl-4 align-top"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* جدول البنود */}
            <table
              className={`w-full ${form.style === 'bordered' ? 'border border-gray-300' : ''}`}
              style={{ fontSize: `${form.textFontSize}pt` }}
            >
              <thead>
                <tr className={form.style === 'bordered' ? 'border-b border-gray-300' : 'border-b-2 border-gray-200'}>
                  <th className={`py-2 px-3 text-start ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>#</th>
                  <th className={`py-2 px-3 text-start ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>{ar ? 'الوصف' : 'Description'}</th>
                  <th className={`py-2 px-3 text-start ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>{ar ? 'الكمية' : 'Qty'}</th>
                  <th className={`py-2 px-3 text-start ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>{ar ? 'الوحدة' : 'Unit'}</th>
                  <th className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>{ar ? 'السعر' : 'Price'}</th>
                  <th className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-300' : ''}`} style={{ color: form.titleColor }}>{ar ? 'المبلغ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className={form.style === 'bordered' ? 'border-b border-gray-200' : ''}>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>1</td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>iPhone 13 Pro 128GB<br /><span className="text-xs opacity-80">جرافيت | نسخة الشرق الأوسط</span></td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>1</td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>{ar ? 'قطعة' : 'pc'}</td>
                  <td className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>4,199.00</td>
                  <td className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>4,116.98</td>
                </tr>
                <tr className={form.style === 'bordered' ? 'border-b border-gray-200' : ''}>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>2</td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>{ar ? 'حافظة سيليكون لآيفون 13 برو مع ماج سيف - أسود' : 'Silicone case for iPhone 13 Pro with MagSafe - Black'}</td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>2</td>
                  <td className={`py-2 px-3 ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>{ar ? 'قطعة' : 'pc'}</td>
                  <td className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>219.00</td>
                  <td className={`py-2 px-3 text-end ${form.style === 'bordered' ? 'border border-gray-200' : ''}`}>503.70</td>
                </tr>
              </tbody>
            </table>

            {/* المجاميع */}
            <div className="mt-6 flex flex-col items-end gap-2">
              <div className="flex gap-8">
                <span>{ar ? 'المجموع الفرعي Subtotal' : 'Subtotal المجموع الفرعي'}</span>
                <span>ر.ع. 4,018.11</span>
              </div>
              <div className="flex gap-8">
                <span>{ar ? 'إجمالي ضريبة القيمة المضافة Total VAT' : 'Total VAT إجمالي ضريبة القيمة المضافة'}</span>
                <span>ر.ع. 602.57</span>
              </div>
              <div className="flex gap-8 font-bold text-lg pt-2 border-t-2" style={{ borderColor: form.titleColor }}>
                <span>{ar ? 'المجموع شامل القيمة المضافة Total' : 'Total المجموع شامل القيمة المضافة'}</span>
                <span>ر.ع. 4,620.68</span>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold mb-2" style={{ color: form.titleColor }}>Notes ملاحظات</p>
              <p className="text-sm">
                {ar
                  ? 'هذا نص تجريبي لحقل الملاحظات، ويتضمن تفاصيل التحويل البنكي التالية: تفاصيل البنك للتحويل: البنك الأهلي السعودي - رقم الحساب: 1234567890123456 - الآيبان: SA0380000000608010167519 - رمز السويفت: NCBKSARI'
                  : 'This is sample text for the notes field, including bank transfer details: Bank: Al Ahli Saudi Bank - Account: 1234567890123456 - IBAN: SA0380000000608010167519 - SWIFT: NCBKSARI'}
              </p>
              {companyData?.signatureType === 'electronic' && (companyData?.signatoryName || companyData?.signatoryNameEn) && (
                <p className="text-xs font-medium mt-3 pt-3 border-t border-gray-200 italic" style={{ color: form.titleColor }}>
                  {form.bilingual ? (
                    <>
                      <span className="block" dir="rtl">هذا المستند تم توقيعه إلكترونياً من قبل {companyData.signatoryName || companyData.signatoryNameEn} ({companyData.signatoryPosition || companyData.signatoryPositionEn || 'المفوض بالتوقيع'}) عن الشركة {companyData.nameAr || companyData.nameEn}</span>
                      <span className="block mt-1" dir="ltr">This document was electronically signed by {companyData.signatoryNameEn || companyData.signatoryName} ({companyData.signatoryPositionEn || companyData.signatoryPosition || 'Authorized signatory'}) on behalf of {companyData.nameEn || companyData.nameAr}</span>
                    </>
                  ) : (
                    tc('electronicSignatureNotice', {
                      name: ar ? (companyData.signatoryName || companyData.signatoryNameEn) : (companyData.signatoryNameEn || companyData.signatoryName),
                      position: ar ? (companyData.signatoryPosition || companyData.signatoryPositionEn || 'المفوض بالتوقيع') : (companyData.signatoryPositionEn || companyData.signatoryPosition || 'Authorized signatory'),
                      company: ar ? (companyData.nameAr || companyData.nameEn) : (companyData.nameEn || companyData.nameAr),
                    })
                  )}
                </p>
              )}
            </div>

            {/* توقيع وختم - تقليدي أو إلكتروني */}
            <div className="mt-8 pt-6 flex flex-wrap justify-between items-end gap-6">
              {companyData?.signatureType === 'image' && (companyData?.signatorySignatureUrl || companyData?.signatoryName) && (
                <div className="text-center shrink-0">
                  {companyData?.signatorySignatureUrl && (
                    <div className="doc-signature-box mx-auto mb-1 bg-white" style={{ width: SIGNATURE_SIZE.width, height: SIGNATURE_SIZE.height }}>
                      <img src={companyData.signatorySignatureUrl} alt="Signature" />
                    </div>
                  )}
                  <p className="text-xs font-medium" style={{ color: form.titleColor }}>
                    {companyData?.signatoryName || companyData?.signatoryNameEn || (ar ? 'المفوض بالتوقيع' : 'Authorized signatory')}
                  </p>
                </div>
              )}
              {companyData?.signatureType === 'image' && companyData?.companyStampUrl && (
                <div className="doc-stamp-box shrink-0 bg-white" style={{ width: STAMP_SIZE.width, height: STAMP_SIZE.height }}>
                  <img src={companyData.companyStampUrl} alt="Stamp" />
                </div>
              )}
              {companyData?.signatureType === 'electronic' && !(companyData?.signatoryName || companyData?.signatoryNameEn) && (
                <span className="text-gray-400 text-sm">{ar ? 'أضف اسم المفوض في بيانات الشركة' : 'Add signatory name in company data'}</span>
              )}
              {(!companyData?.signatureType || companyData?.signatureType === 'image') && !companyData?.signatorySignatureUrl && !companyData?.signatoryName && !companyData?.companyStampUrl && (
                <span className="text-gray-400 text-sm">stamp</span>
              )}
            </div>

            {/* تذييل */}
            <div className="mt-6 pt-4 text-center text-sm" style={{ color: form.textColor, opacity: 0.8 }}>
              {companyData?.nameAr} {companyData?.nameEn} - Page 1 of 1 - INV-001
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
