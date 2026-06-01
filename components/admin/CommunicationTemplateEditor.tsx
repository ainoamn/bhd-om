'use client';

import { useEffect, useState } from 'react';
import DraftBanner from '@/components/admin/DraftBanner';
import {
  getCommunicationTemplates,
  getDefaultCommunicationTemplate,
  updateCommunicationTemplate,
  type CommunicationTemplate,
  type CommunicationTemplateCategory,
} from '@/lib/data/communicationTemplates';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

type Props = {
  category: CommunicationTemplateCategory;
  locale: string;
};

export default function CommunicationTemplateEditor({ category, locale }: Props) {
  const ar = locale === 'ar';
  const draftKey = `communication_template_${category}`;
  const templates = getCommunicationTemplates(category);
  const defaultTpl = getDefaultCommunicationTemplate(category);
  const [selectedId, setSelectedId] = useState(defaultTpl?.id || templates[0]?.id || '');
  const [form, setForm] = useState<CommunicationTemplate | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const list = getCommunicationTemplates(category);
    const tpl = list.find((x) => x.id === selectedId) || list[0];
    const draft = loadDraft<CommunicationTemplate>(`${draftKey}_${selectedId}`);
    setForm(draft || (tpl ? { ...tpl } : null));
  }, [category, selectedId, draftKey]);

  useEffect(() => {
    if (!form) return;
    const t = window.setTimeout(() => saveDraft(`${draftKey}_${selectedId}`, form), 800);
    return () => window.clearTimeout(t);
  }, [form, draftKey, selectedId]);

  const handleSave = () => {
    if (!form) return;
    const missing: string[] = [];
    if (!form.nameAr.trim()) missing.push(ar ? 'الاسم (عربي)' : 'Name (Arabic)');
    if (!form.subjectAr.trim()) missing.push(ar ? 'الموضوع (عربي)' : 'Subject (Arabic)');
    if (!form.bodyAr.trim()) missing.push(ar ? 'المحتوى (عربي)' : 'Body (Arabic)');
    if (missing.length) {
      showMissingFieldsAlert(missing, ar);
      return;
    }
    updateCommunicationTemplate(category, form);
    clearDraft(`${draftKey}_${selectedId}`);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  if (!form) return null;

  return (
    <div className="admin-card">
      <DraftBanner />
      <div className="admin-card-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="admin-card-title">{ar ? 'محرر القوالب' : 'Template editor'}</h2>
        {saved && <span className="text-sm text-green-600">{ar ? 'تم الحفظ' : 'Saved'}</span>}
      </div>
      <div className="admin-card-body space-y-4">
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {ar
            ? 'التعديلات تُحفظ في النظام بعد النقر على «حفظ».'
            : 'Changes are committed only after clicking «Save».'}
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'القالب' : 'Template'}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="admin-input w-full max-w-md"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {ar ? t.nameAr : t.nameEn || t.nameAr}
                {t.isDefault ? (ar ? ' (افتراضي)' : ' (default)') : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</label>
            <input
              type="text"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(true, form.nameAr)}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'Name (English)' : 'Name (English)'}</label>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(false, form.nameEn)}`}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الموضوع (عربي) *' : 'Subject (Arabic) *'}</label>
            <input
              type="text"
              value={form.subjectAr}
              onChange={(e) => setForm({ ...form, subjectAr: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(true, form.subjectAr)}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'Subject (English)' : 'Subject (English)'}</label>
            <input
              type="text"
              value={form.subjectEn}
              onChange={(e) => setForm({ ...form, subjectEn: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(false, form.subjectEn)}`}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المحتوى (عربي) *' : 'Body (Arabic) *'}</label>
            <textarea
              rows={6}
              value={form.bodyAr}
              onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(true, form.bodyAr)}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'Body (English)' : 'Body (English)'}</label>
            <textarea
              rows={6}
              value={form.bodyEn}
              onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
              className={`admin-input w-full ${getRequiredFieldClass(false, form.bodyEn)}`}
            />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          {ar ? 'قالب افتراضي لهذا القسم' : 'Default template for this section'}
        </label>
        <button type="button" onClick={handleSave} className="admin-btn admin-btn-primary">
          {ar ? 'حفظ' : 'Save'}
        </button>
      </div>
    </div>
  );
}
