'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DraftBanner from '@/components/admin/DraftBanner';
import { getSiteContent, patchSiteContent, replaceSiteContent, type SiteContentStore } from '@/lib/data/siteContent';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

const DRAFT_KEY = 'admin_services_content';

type ServiceItem = SiteContentStore['services']['items'][number];

export default function ServicesAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleAr, setSubtitleAr] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const applyServices = useCallback((services: SiteContentStore['services']) => {
    setTitleAr(services.titleAr);
    setTitleEn(services.titleEn);
    setSubtitleAr(services.subtitleAr);
    setSubtitleEn(services.subtitleEn);
    setItems(services.items.map((i) => ({ ...i })));
  }, []);

  useEffect(() => {
    let alive = true;
    const draft = loadDraft<{ titleAr: string; titleEn: string; subtitleAr: string; subtitleEn: string; items: ServiceItem[] }>(DRAFT_KEY);
    if (draft) {
      setTitleAr(draft.titleAr);
      setTitleEn(draft.titleEn);
      setSubtitleAr(draft.subtitleAr);
      setSubtitleEn(draft.subtitleEn);
      setItems(draft.items);
      setLoading(false);
    }
    fetch('/api/settings/site-content', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SiteContentStore | null) => {
        if (!alive || !data?.services) return;
        if (!draft) applyServices(data.services);
        replaceSiteContent(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [applyServices]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft(DRAFT_KEY, { titleAr, titleEn, subtitleAr, subtitleEn, items });
    }, 800);
    return () => window.clearTimeout(t);
  }, [titleAr, titleEn, subtitleAr, subtitleEn, items]);

  const selected = selectedIdx != null ? items[selectedIdx] : null;

  const updateSelected = (patch: Partial<ServiceItem>) => {
    if (selectedIdx == null) return;
    setItems((prev) => prev.map((it, i) => (i === selectedIdx ? { ...it, ...patch } : it)));
  };

  const handleSave = async () => {
    const missing: string[] = [];
    if (!titleAr.trim()) missing.push(ar ? 'عنوان القسم (عربي)' : 'Section title (Arabic)');
    if (items.length === 0) missing.push(ar ? 'خدمة واحدة على الأقل' : 'At least one service');
    if (missing.length) {
      showMissingFieldsAlert(missing, ar);
      return;
    }
    setSaving(true);
    try {
      const base = getSiteContent();
      const next: SiteContentStore = {
        ...base,
        services: { titleAr, titleEn, subtitleAr, subtitleEn, items },
      };
      const res = await fetch('/api/settings/site-content', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('save failed');
      patchSiteContent({ services: next.services });
      clearDraft(DRAFT_KEY);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert(ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <DraftBanner />
      <AdminPageHeader
        title={ar ? 'إدارة صفحة الخدمات' : 'Services page management'}
        subtitle={ar ? 'تعديل الخدمات المعروضة في الصفحة الرئيسية وصفحة الخدمات' : 'Edit services shown on the homepage and services page'}
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? (ar ? 'جاري الحفظ…' : 'Saving…') : saved ? (ar ? 'تم الحفظ ✓' : 'Saved ✓') : ar ? 'حفظ' : 'Save'}
          </button>
        }
      />

      {loading ? (
        <div className="admin-card p-12 text-center text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">{ar ? 'عناوين القسم' : 'Section headings'}</h2>
              </div>
              <div className="admin-card-body space-y-4">
                <div>
                  <label className="admin-input-label">{ar ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                  <input type="text" className={`admin-input w-full ${getRequiredFieldClass(true, titleAr)}`} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
                </div>
                <div>
                  <label className="admin-input-label">{ar ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                  <input type="text" className="admin-input w-full" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
                </div>
                <div>
                  <label className="admin-input-label">{ar ? 'الوصف (عربي)' : 'Subtitle (Arabic)'}</label>
                  <textarea rows={3} className="admin-input w-full" value={subtitleAr} onChange={(e) => setSubtitleAr(e.target.value)} />
                </div>
                <div>
                  <label className="admin-input-label">{ar ? 'الوصف (إنجليزي)' : 'Subtitle (English)'}</label>
                  <textarea rows={3} className="admin-input w-full" value={subtitleEn} onChange={(e) => setSubtitleEn(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="admin-card overflow-hidden">
              <div className="admin-card-header">
                <h2 className="admin-card-title">{ar ? 'الخدمات' : 'Services'}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((service, idx) => (
                  <button
                    key={`${service.number}-${idx}`}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full p-4 text-right transition-colors hover:bg-gray-50 ${selectedIdx === idx ? 'border-r-4 admin-accent-border admin-accent-bg-soft' : ''}`}
                  >
                    <div className="font-medium text-gray-900">{service.titleAr}</div>
                    <div className="mt-1 text-xs text-gray-500">{service.number}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-card">
            {selected ? (
              <>
                <div className="admin-card-header">
                  <h2 className="admin-card-title">{ar ? 'تعديل الخدمة' : 'Edit service'}</h2>
                </div>
                <div className="admin-card-body space-y-4">
                  <div>
                    <label className="admin-input-label">{ar ? 'الرقم' : 'Number'}</label>
                    <input type="text" className="admin-input w-full" value={selected.number} onChange={(e) => updateSelected({ number: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                    <input type="text" className={`admin-input w-full ${getRequiredFieldClass(true, selected.titleAr)}`} value={selected.titleAr} onChange={(e) => updateSelected({ titleAr: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                    <input type="text" className="admin-input w-full" value={selected.titleEn} onChange={(e) => updateSelected({ titleEn: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'الوصف (عربي)' : 'Description (Arabic)'}</label>
                    <textarea rows={4} className="admin-input w-full" value={selected.descAr} onChange={(e) => updateSelected({ descAr: e.target.value })} />
                  </div>
                  <div>
                    <label className="admin-input-label">{ar ? 'الوصف (إنجليزي)' : 'Description (English)'}</label>
                    <textarea rows={4} className="admin-input w-full" value={selected.descEn} onChange={(e) => updateSelected({ descEn: e.target.value })} />
                  </div>
                </div>
              </>
            ) : (
              <div className="admin-card-body py-20 text-center text-gray-500">{ar ? 'اختر خدمة من القائمة' : 'Select a service from the list'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
