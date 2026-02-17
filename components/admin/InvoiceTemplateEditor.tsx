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
import { siteConfig } from '@/config/site';

interface InvoiceTemplateEditorProps {
  templateType: TemplateType;
  locale: string;
}

export default function InvoiceTemplateEditor({ templateType, locale }: InvoiceTemplateEditorProps) {
  const t = useTranslations('documentTemplates');
  const ar = locale === 'ar';

  const templates = getTemplates(templateType);
  const defaultT = getDefaultTemplate(templateType);
  const company = getCompanyData();
  const [selectedId, setSelectedId] = useState<string>(defaultT?.id || templates[0]?.id || '');
  const [form, setForm] = useState<DocumentTemplateSettings | null>(null);

  useEffect(() => {
    const tpl = templates.find((x) => x.id === selectedId) || templates[0];
    setForm(tpl ? { ...tpl } : null);
  }, [selectedId, templates]);

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
        </style>
      </head>
      <body>
        <div class="container" style="margin: ${form.marginTop}px ${form.marginRight}px ${form.marginBottom}px ${form.marginLeft}px;">
          ${previewEl.innerHTML}
        </div>
        <div style="position:fixed;top:12px;right:12px;display:flex;gap:8px;">
          <button onclick="window.print()" style="padding:8px 16px;background:#8B6F47;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🖨️ ${ar ? 'طباعة' : 'Print'}</button>
          <button onclick="window.close()" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:8px;cursor:pointer;">${ar ? 'إغلاق' : 'Close'}</button>
        </div>
      </body>
      </html>
    `);
    win.document.close();
  };

  if (!form) return null;

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
            className="bg-white p-6"
            dir={ar ? 'rtl' : 'ltr'}
            style={{
              marginTop: form.marginTop,
              marginBottom: form.marginBottom,
              marginLeft: form.marginLeft,
              marginRight: form.marginRight,
              color: form.textColor,
              fontSize: `${form.textFontSize}pt`,
            }}
          >
            {/* رأس الفاتورة - شعار + ثنائي اللغة */}
            <div className="border-b-2 pb-4 mb-6" style={{ borderColor: form.titleColor }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4">
                  {company.logoUrl && (
                    <div className="shrink-0">
                      <img src={company.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                    </div>
                  )}
                  <div>
                    <div className="flex gap-4 mb-2">
                      <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 4}pt` }}>
                        {company.nameEn || siteConfig.company.nameEn}
                      </h1>
                      <h1 className="font-bold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 4}pt` }}>
                        {company.nameAr || siteConfig.company.nameAr}
                      </h1>
                    </div>
                    <p className="text-sm" style={{ fontSize: `${form.textFontSize}pt` }}>
                      {company.addressEn || 'Muscat - South Mabelah - Street: 8401 - Complex: 384 - Building: 75'}
                    </p>
                    <p className="text-sm" style={{ fontSize: `${form.textFontSize}pt` }}>
                      GSM: {company.phone || siteConfig.company.phone}، {ar ? 'السيب، عُمان' : 'Al Seeb, Oman'}
                    </p>
                    <p className="text-sm mt-1" style={{ fontSize: `${form.textFontSize}pt` }}>
                      {company.addressAr || 'مسقط - المعبيلة الجنوبية - رقم الشارع: 8401 - رقم المجمع: 384 - رقم المبنى: 75'}
                    </p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <h2 style={{ color: form.titleColor, fontSize: `${form.titleFontSize + 2}pt` }}>
                    Tax Invoice فاتورة ضريبية
                  </h2>
                </div>
              </div>
            </div>

            {/* بيانات العميل والفاتورة - ثنائي اللغة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Customer العميل</p>
                <p>Abdullah M.</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Address العنوان</p>
                <p className="text-sm">1234، Office 205, Building 1, King Faisal Street، Al Olaya، Riyadh، 12345، المملكة العربية السعودية</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Email البريد الإلكتروني</p>
                <p>abdullah.m@example.com</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Phone الهاتف</p>
                <p>+971551234123</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>VAT number رقم التسجيل الضريبي</p>
                <p>52402393094</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>CR Number رقم السجل التجاري</p>
                <p>1010123456</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Invoice number رقم الفاتورة</p>
                <p>INV-001</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Date التاريخ</p>
                <p>2026-01-10</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Due date تاريخ الاستحقاق</p>
                <p>2026-02-10</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Reference رقم المرجع</p>
                <p>ABC101</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: form.titleColor, fontSize: `${form.titleFontSize - 1}pt` }}>Purchase order رقم الأمر</p>
                <p>PO-001</p>
              </div>
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
            </div>

            {/* توقيع وختم */}
            <div className="mt-8 pt-6 flex flex-wrap justify-between items-end gap-6">
              {(company.signatorySignatureUrl || company.signatoryName) && (
                <div className="text-center">
                  {company.signatorySignatureUrl && (
                    <img src={company.signatorySignatureUrl} alt="Signature" className="h-14 object-contain mx-auto mb-1" />
                  )}
                  <p className="text-xs font-medium" style={{ color: form.titleColor }}>
                    {company.signatoryName || company.signatoryNameEn || (ar ? 'المفوض بالتوقيع' : 'Authorized signatory')}
                  </p>
                </div>
              )}
              {company.companyStampUrl && (
                <img src={company.companyStampUrl} alt="Stamp" className="w-20 h-20 object-contain" />
              )}
              {!company.signatorySignatureUrl && !company.signatoryName && !company.companyStampUrl && (
                <span className="text-gray-400 text-sm">stamp</span>
              )}
            </div>

            {/* تذييل */}
            <div className="mt-6 pt-4 text-center text-sm" style={{ color: form.textColor, opacity: 0.8 }}>
              {company.nameAr} {company.nameEn} - Page 1 of 1 - INV-001
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
