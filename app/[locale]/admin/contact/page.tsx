'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DraftBanner from '@/components/admin/DraftBanner';
import { getCompanyData, saveCompanyData, type CompanyData } from '@/lib/data/companyData';
import { getSiteContent, patchSiteContent, replaceSiteContent, type SiteContentStore } from '@/lib/data/siteContent';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

const DRAFT_KEY = 'admin_contact_page';

export default function ContactAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [activeTab, setActiveTab] = useState<'settings' | 'info'>('settings');
  const [contact, setContact] = useState<SiteContentStore['contact']>(() => getSiteContent().contact);
  const [company, setCompany] = useState<CompanyData>(() => getCompanyData());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const draft = loadDraft<{ contact: SiteContentStore['contact']; company: CompanyData }>(DRAFT_KEY);
    if (draft) {
      setContact(draft.contact);
      setCompany(draft.company);
    }
    fetch('/api/settings/site-content', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SiteContentStore | null) => {
        if (data) {
          if (!draft) setContact(data.contact);
          replaceSiteContent(data);
        }
      })
      .catch(() => {});
    fetch('/api/settings/company-data', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === 'object' && !draft) setCompany({ ...getCompanyData(), ...(data as CompanyData) });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(DRAFT_KEY, { contact, company }), 800);
    return () => window.clearTimeout(t);
  }, [contact, company]);

  const handleSaveSettings = async () => {
    if (!contact.titleAr.trim()) {
      showMissingFieldsAlert([ar ? 'عنوان الصفحة (عربي)' : 'Page title (Arabic)'], ar);
      return;
    }
    setSaving(true);
    try {
      const base = getSiteContent();
      const next = { ...base, contact };
      const res = await fetch('/api/settings/site-content', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('fail');
      patchSiteContent({ contact });
      clearDraft(DRAFT_KEY);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert(ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    const missing: string[] = [];
    if (!company.email?.trim()) missing.push(ar ? 'البريد' : 'Email');
    if (!company.phone?.trim()) missing.push(ar ? 'الهاتف' : 'Phone');
    if (missing.length) {
      showMissingFieldsAlert(missing, ar);
      return;
    }
    setSaving(true);
    try {
      saveCompanyData(company);
      await fetch('/api/settings/company-data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(company),
      });
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
        title={ar ? 'إدارة صفحة التواصل' : 'Contact page management'}
        subtitle={ar ? 'عناوين الصفحة ومعلومات الاتصال المعروضة للزوار' : 'Page headings and contact details shown to visitors'}
        actions={
          <Link href={`/${locale}/admin/company-data`} className="admin-btn admin-btn--secondary text-sm">
            {ar ? 'بيانات الشركة الكاملة' : 'Full company data'}
          </Link>
        }
      />

      <div className="mb-6">
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          <button type="button" onClick={() => setActiveTab('settings')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
            {ar ? 'إعدادات الصفحة' : 'Page settings'}
          </button>
          <button type="button" onClick={() => setActiveTab('info')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'info' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
            {ar ? 'معلومات الاتصال' : 'Contact info'}
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{ar ? 'عناوين صفحة التواصل' : 'Contact page headings'}</h2>
            <button type="button" className="admin-btn admin-btn--primary text-sm" onClick={() => void handleSaveSettings()} disabled={saving}>
              {saved ? (ar ? 'تم ✓' : 'Saved ✓') : ar ? 'حفظ' : 'Save'}
            </button>
          </div>
          <div className="admin-card-body max-w-2xl space-y-4">
            <div>
              <label className="admin-input-label">{ar ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
              <input type="text" className={`admin-input w-full ${getRequiredFieldClass(true, contact.titleAr)}`} value={contact.titleAr} onChange={(e) => setContact({ ...contact, titleAr: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
              <input type="text" className="admin-input w-full" value={contact.titleEn} onChange={(e) => setContact({ ...contact, titleEn: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'النص الفرعي (عربي)' : 'Subtitle (Arabic)'}</label>
              <input type="text" className="admin-input w-full" value={contact.subtitleAr} onChange={(e) => setContact({ ...contact, subtitleAr: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'النص الفرعي (إنجليزي)' : 'Subtitle (English)'}</label>
              <input type="text" className="admin-input w-full" value={contact.subtitleEn} onChange={(e) => setContact({ ...contact, subtitleEn: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{ar ? 'معلومات الاتصال' : 'Contact information'}</h2>
            <button type="button" className="admin-btn admin-btn--primary text-sm" onClick={() => void handleSaveCompany()} disabled={saving}>
              {saved ? (ar ? 'تم ✓' : 'Saved ✓') : ar ? 'حفظ' : 'Save'}
            </button>
          </div>
          <div className="admin-card-body max-w-2xl space-y-4">
            <div>
              <label className="admin-input-label">{ar ? 'العنوان' : 'Address'}</label>
              <input type="text" className="admin-input w-full" value={company.addressAr} onChange={(e) => setCompany({ ...company, addressAr: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'البريد' : 'Email'}</label>
              <input type="email" className={`admin-input w-full ${getRequiredFieldClass(true, company.email)}`} value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
              <input type="tel" className={`admin-input w-full ${getRequiredFieldClass(true, company.phone)}`} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
