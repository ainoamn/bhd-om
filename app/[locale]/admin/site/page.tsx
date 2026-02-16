'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SectionPreviews from '@/components/admin/SectionPreviews';
import {
  sitePagesForAdmin,
  getSectionValue,
  updateSiteSection,
  getSiteContent,
  type SiteContentStore,
  type SiteSectionItem,
} from '@/lib/data/siteContent';
import {
  getPagesVisibility,
  setPageEnabled,
  PAGE_LABELS,
  PAGES_VISIBILITY_EVENT,
  type PageId,
} from '@/lib/data/siteSettings';
import {
  getAds,
  addAd,
  updateAd,
  deleteAd,
  toggleAdEnabled,
  AD_TYPE_LABELS,
  AD_POSITION_LABELS,
  AD_IMAGE_SIZES,
  FLOATING_POSITION_LABELS,
  PAGE_IDS,
  type Ad,
  type AdType,
  type AdPosition,
  type FloatingPosition,
} from '@/lib/data/ads';

type TabId = 'content' | 'visibility' | 'ads';

export default function SiteContentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const [content, setContent] = useState<SiteContentStore>(() => JSON.parse(JSON.stringify(getSiteContent())));
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SiteSectionItem | null>(null);
  const [contentAr, setContentAr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [visibility, setVisibility] = useState<Record<PageId, boolean>>(() => getPagesVisibility());
  const [ads, setAds] = useState<Ad[]>(() => getAds());
  const [adForm, setAdForm] = useState<Partial<Ad> | null>(null);

  const selectedPage = selectedPageId ? sitePagesForAdmin.find((p) => p.id === selectedPageId) : null;

  useEffect(() => {
    if (!selectedSection) return;
    setContentAr(getSectionValue(selectedSection.pathAr));
    setContentEn(selectedSection.pathEn ? getSectionValue(selectedSection.pathEn) : getSectionValue(selectedSection.pathAr));
  }, [selectedSection]);

  useEffect(() => {
    setContent(JSON.parse(JSON.stringify(getSiteContent())));
  }, []);

  useEffect(() => {
    setVisibility(getPagesVisibility());
  }, [activeTab]);

  useEffect(() => {
    const handler = () => setVisibility(getPagesVisibility());
    window.addEventListener(PAGES_VISIBILITY_EVENT, handler);
    return () => window.removeEventListener(PAGES_VISIBILITY_EVENT, handler);
  }, []);

  useEffect(() => {
    setAds(getAds());
  }, [activeTab]);

  useEffect(() => {
    const handler = () => setAds(getAds());
    window.addEventListener('bhd-ads-changed', handler);
    return () => window.removeEventListener('bhd-ads-changed', handler);
  }, []);

  const handleVisibilityToggle = (pageId: PageId) => {
    setPageEnabled(pageId, !visibility[pageId]);
    setVisibility(getPagesVisibility());
  };

  const handleAdToggle = (id: string) => {
    toggleAdEnabled(id);
    setAds(getAds());
  };

  const handleAdDelete = (id: string) => {
    deleteAd(id);
    setAds(getAds());
    setAdForm(null);
  };

  const handleAdSave = () => {
    if (!adForm) return;
    const { type, titleAr, titleEn, imageUrl, link, descriptionAr, descriptionEn, enabled, order, showOnPages, position, floatingPosition } = adForm;
    if (!type || !titleAr || !titleEn || !imageUrl) return;
    const isFloating = type === 'floating';
    const pos = (isFloating ? 'floating' : (position ?? 'below_header')) as AdPosition;
    const floatPos = (floatingPosition ?? 'right') as FloatingPosition;
    const updates = {
      type: type as AdType,
      titleAr,
      titleEn,
      imageUrl,
      link,
      descriptionAr,
      descriptionEn,
      enabled: enabled ?? true,
      order: order ?? 0,
      showOnPages: showOnPages ?? 'all',
      position: pos,
      ...(isFloating && { floatingPosition: floatPos }),
    };
    if (adForm.id) {
      updateAd(adForm.id, updates);
    } else {
      addAd({ ...updates, order: order ?? ads.length });
    }
    setAds(getAds());
    setAdForm(null);
  };

  const applyEdit = useCallback((pathAr: string, valueAr: string, pathEn?: string, valueEn?: string) => {
    updateSiteSection(pathAr, valueAr);
    if (pathEn && valueEn !== undefined) updateSiteSection(pathEn, valueEn);
    setContent(JSON.parse(JSON.stringify(getSiteContent())));
  }, []);

  const handleArChange = (value: string) => {
    setContentAr(value);
    if (!selectedSection) return;
    applyEdit(selectedSection.pathAr, value, selectedSection.pathEn, contentEn);
  };

  const handleEnChange = (value: string) => {
    setContentEn(value);
    if (!selectedSection) return;
    applyEdit(selectedSection.pathAr, contentAr, selectedSection.pathEn, value);
  };

  const handleSave = () => {
    if (!selectedSection) return;
    applyEdit(selectedSection.pathAr, contentAr, selectedSection.pathEn, contentEn);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePageClick = (pageId: string) => {
    setSelectedPageId(selectedPageId === pageId ? null : pageId);
    setSelectedSection(null);
  };

  return (
    <div>
      <AdminPageHeader
        title={locale === 'ar' ? 'إدارة الموقع والأقسام' : 'Site & Sections Management'}
        subtitle={locale === 'ar' ? 'إدارة المحتوى والإعلانات وظهور الصفحات' : 'Manage content, ads and page visibility'}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: 'content' as TabId, ar: 'محتوى الصفحات', en: 'Page Content' },
          { id: 'visibility' as TabId, ar: 'إظهار الصفحات', en: 'Page Visibility' },
          { id: 'ads' as TabId, ar: 'الإعلانات', en: 'Ads' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'ar' ? tab.ar : tab.en}
          </button>
        ))}
      </div>

      {/* Tab: Page Visibility */}
      {activeTab === 'visibility' && (
        <div className="admin-card max-w-2xl">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              {locale === 'ar' ? 'تفعيل / تعطيل الصفحات' : 'Enable / Disable Pages'}
            </h2>
          </div>
          <div className="admin-card-body">
            <p className="text-gray-600 mb-6">
              {locale === 'ar'
                ? 'الصفحات المعطلة تختفي تلقائياً من قائمة التنقل في الهيدر.'
                : 'Disabled pages are automatically hidden from the header navigation.'}
            </p>
            <div className="space-y-3">
              {(PAGE_IDS as readonly PageId[]).map((pageId) => (
                <div
                  key={pageId}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <span className="font-medium text-gray-900">
                    {locale === 'ar' ? PAGE_LABELS[pageId].ar : PAGE_LABELS[pageId].en}
                  </span>
                  <button
                    onClick={() => handleVisibilityToggle(pageId)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      visibility[pageId]
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {visibility[pageId]
                      ? locale === 'ar'
                        ? 'مفعّل'
                        : 'Enabled'
                      : locale === 'ar'
                        ? 'معطّل'
                        : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ads */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="admin-card">
            <div className="admin-card-header flex items-center justify-between">
              <h2 className="admin-card-title">
                {locale === 'ar' ? 'قائمة الإعلانات' : 'Ads List'}
              </h2>
              <button
                onClick={() => setAdForm({ type: 'banner', titleAr: '', titleEn: '', imageUrl: '', enabled: true, order: ads.length, showOnPages: 'all', position: 'below_header', floatingPosition: 'right' })}
                className="admin-btn-primary"
              >
                {locale === 'ar' ? '+ إضافة إعلان' : '+ Add Ad'}
              </button>
            </div>
            <div className="admin-card-body">
              {ads.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">
                  {locale === 'ar' ? 'لا توجد إعلانات. اضغط "إضافة إعلان" للبدء.' : 'No ads yet. Click "Add Ad" to start.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50"
                    >
                      <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          {locale === 'ar' ? ad.titleAr : ad.titleEn}
                        </div>
                        <div className="text-sm text-gray-500">
                          {locale === 'ar' ? AD_TYPE_LABELS[ad.type].ar : AD_TYPE_LABELS[ad.type].en}
                          {' • '}
                          {ad.type === 'floating'
                            ? (locale === 'ar' ? FLOATING_POSITION_LABELS[ad.floatingPosition ?? 'right'].ar : FLOATING_POSITION_LABELS[ad.floatingPosition ?? 'right'].en)
                            : (locale === 'ar' ? AD_POSITION_LABELS[ad.position].ar : AD_POSITION_LABELS[ad.position].en)}
                          {' • '}
                          {ad.showOnPages === 'all'
                            ? (locale === 'ar' ? 'كل الصفحات' : 'All pages')
                            : ad.showOnPages.length > 0
                              ? ad.showOnPages.map((p) => (locale === 'ar' ? PAGE_LABELS[p as PageId].ar : PAGE_LABELS[p as PageId].en)).join('، ')
                              : (locale === 'ar' ? 'لم يتم الاختيار' : 'None selected')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAdToggle(ad.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            ad.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {ad.enabled ? (locale === 'ar' ? 'مفعّل' : 'On') : (locale === 'ar' ? 'معطّل' : 'Off')}
                        </button>
                        <button
                          onClick={() => setAdForm({ ...ad })}
                          className="px-3 py-1.5 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleAdDelete(ad.id)}
                          className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50"
                        >
                          {locale === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ad Form Modal */}
          {adForm && (
            <div className="admin-card">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="admin-card-title">
                  {adForm.id ? (locale === 'ar' ? 'تعديل الإعلان' : 'Edit Ad') : (locale === 'ar' ? 'إضافة إعلان' : 'Add Ad')}
                </h2>
                <button onClick={() => setAdForm(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <div className="admin-card-body space-y-4">
                <div>
                  <label className="admin-input-label">{locale === 'ar' ? 'نوع الإعلان' : 'Ad Type'}</label>
                  <select
                    value={adForm.type ?? 'banner'}
                    onChange={(e) => setAdForm({ ...adForm, type: e.target.value as AdType })}
                    className="admin-input"
                  >
                    {(Object.keys(AD_TYPE_LABELS) as AdType[]).map((t) => (
                      <option key={t} value={t}>
                        {locale === 'ar' ? AD_TYPE_LABELS[t].ar : AD_TYPE_LABELS[t].en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-input-label">{locale === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                    <input
                      type="text"
                      value={adForm.titleAr ?? ''}
                      onChange={(e) => setAdForm({ ...adForm, titleAr: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="admin-input-label">{locale === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                    <input
                      type="text"
                      value={adForm.titleEn ?? ''}
                      onChange={(e) => setAdForm({ ...adForm, titleEn: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="admin-input-label">{locale === 'ar' ? 'رابط الصورة' : 'Image URL'}</label>
                  <p className="text-sm text-gray-500 mb-1">
                    {adForm.type ? (locale === 'ar' ? AD_IMAGE_SIZES[adForm.type as AdType].ar : AD_IMAGE_SIZES[adForm.type as AdType].en) : ''}
                  </p>
                  <input
                    type="url"
                    value={adForm.imageUrl ?? ''}
                    onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                    className="admin-input"
                    placeholder="https://..."
                  />
                  {adForm.imageUrl && (
                    <div className="mt-2 w-48 h-24 rounded-lg overflow-hidden border">
                      <img src={adForm.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="admin-input-label">{locale === 'ar' ? 'الرابط (اختياري)' : 'Link (optional)'}</label>
                  <input
                    type="url"
                    value={adForm.link ?? ''}
                    onChange={(e) => setAdForm({ ...adForm, link: e.target.value || undefined })}
                    className="admin-input"
                    placeholder="https://..."
                  />
                </div>
                {adForm.type === 'floating' ? (
                  <div>
                    <label className="admin-input-label">{locale === 'ar' ? 'موضع الإعلان على الشاشة' : 'Ad position on screen'}</label>
                    <select
                      value={adForm.floatingPosition ?? 'right'}
                      onChange={(e) => setAdForm({ ...adForm, floatingPosition: e.target.value as FloatingPosition })}
                      className="admin-input"
                    >
                      {(Object.keys(FLOATING_POSITION_LABELS) as FloatingPosition[]).map((p) => (
                        <option key={p} value={p}>
                          {locale === 'ar' ? FLOATING_POSITION_LABELS[p].ar : FLOATING_POSITION_LABELS[p].en}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="admin-input-label">{locale === 'ar' ? 'مكان ظهور الإعلان' : 'Ad position'}</label>
                    <select
                      value={adForm.position ?? 'below_header'}
                      onChange={(e) => setAdForm({ ...adForm, position: e.target.value as AdPosition })}
                      className="admin-input"
                    >
                      {(Object.keys(AD_POSITION_LABELS) as AdPosition[]).filter((p) => p !== 'floating').map((p) => (
                        <option key={p} value={p}>
                          {locale === 'ar' ? AD_POSITION_LABELS[p].ar : AD_POSITION_LABELS[p].en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="admin-input-label">{locale === 'ar' ? 'الصفحات التي يظهر فيها' : 'Show on pages'}</label>
                  <p className="text-sm text-gray-500 mb-2">
                    {locale === 'ar' ? 'حدد الصفحات التي تريد ظهور الإعلان فيها' : 'Select the pages where the ad should appear'}
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={adForm.showOnPages === 'all' || !adForm.showOnPages}
                        onChange={(e) =>
                          setAdForm({ ...adForm, showOnPages: e.target.checked ? 'all' : [] })
                        }
                        className="rounded"
                      />
                      <span className="font-medium">{locale === 'ar' ? 'كل الصفحات' : 'All pages'}</span>
                    </label>
                    {adForm.showOnPages !== 'all' && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-gray-50/50">
                        {PAGE_IDS.map((pid) => {
                          const selected = Array.isArray(adForm.showOnPages) && adForm.showOnPages.includes(pid);
                          return (
                            <label
                              key={pid}
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  const current = Array.isArray(adForm.showOnPages) ? adForm.showOnPages : [];
                                  const next = e.target.checked
                                    ? [...current, pid]
                                    : current.filter((p) => p !== pid);
                                  setAdForm({ ...adForm, showOnPages: next });
                                }}
                                className="rounded"
                              />
                              <span>{locale === 'ar' ? PAGE_LABELS[pid as PageId].ar : PAGE_LABELS[pid as PageId].en}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adForm.enabled ?? true}
                      onChange={(e) => setAdForm({ ...adForm, enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span>{locale === 'ar' ? 'مفعّل' : 'Enabled'}</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAdSave} className="admin-btn-primary">
                    {locale === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button onClick={() => setAdForm(null)} className="admin-btn-secondary">
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Content */}
      {activeTab === 'content' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* قائمة الصفحات */}
        <div className="admin-card lg:col-span-1 overflow-hidden">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{locale === 'ar' ? 'صفحات الموقع' : 'Site Pages'}</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
            {sitePagesForAdmin.map((page) => (
              <div key={page.id}>
                <button
                  onClick={() => handlePageClick(page.id)}
                  className={`w-full text-right p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${locale === 'ar' ? '' : 'text-left flex-row-reverse'}`}
                  style={{
                    ...(selectedPageId === page.id
                      ? { backgroundColor: 'rgb(139 111 71 / 0.12)', borderRight: locale === 'ar' ? '4px solid #8B6F47' : undefined, borderLeft: locale === 'en' ? '4px solid #8B6F47' : undefined }
                      : {}),
                  }}
                >
                  <span className="font-semibold text-gray-900">{locale === 'ar' ? page.labelAr : page.labelEn}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${selectedPageId === page.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {selectedPageId === page.id && (
                  <div className="bg-gray-50/80 border-t border-gray-100">
                    {page.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section)}
                        className={`w-full text-right py-3 px-6 hover:bg-gray-100 transition-colors text-sm ${locale === 'ar' ? '' : 'text-left'}`}
                        style={{
                          ...(selectedSection?.id === section.id ? { backgroundColor: 'rgb(139 111 71 / 0.08)', fontWeight: 600 } : {}),
                        }}
                      >
                        <div className="text-gray-800">{locale === 'ar' ? section.labelAr : section.labelEn}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{section.pathAr}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* المعاينة والتعديل */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSection ? (
            <>
              <div className="admin-card overflow-hidden p-0">
                <div className="admin-card-header bg-gray-50 border-b">
                  <h2 className="admin-card-title text-base">
                    {locale === 'ar' ? 'معاينة القسم في الموقع' : 'Section Preview'}
                  </h2>
                </div>
                <div className="p-4 bg-gray-50/50">
                  <SectionPreviews
                    blockKey={selectedSection.blockKey}
                    content={content}
                    locale={locale}
                  />
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header flex items-center justify-between">
                  <h2 className="admin-card-title">{locale === 'ar' ? selectedSection.labelAr : selectedSection.labelEn}</h2>
                  {saved && (
                    <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      {locale === 'ar' ? 'تم الحفظ' : 'Saved'}
                    </span>
                  )}
                </div>
                <div className="admin-card-body space-y-6">
                  {selectedSection.pathEn ? (
                    <>
                      <div>
                        <label className="admin-input-label">{locale === 'ar' ? 'المحتوى بالعربية' : 'Content (Arabic)'}</label>
                        {selectedSection.type === 'textarea' ? (
                          <textarea
                            value={contentAr}
                            onChange={(e) => handleArChange(e.target.value)}
                            rows={5}
                            className="admin-input"
                          />
                        ) : (
                          <input
                            type="text"
                            value={contentAr}
                            onChange={(e) => handleArChange(e.target.value)}
                            className="admin-input"
                          />
                        )}
                      </div>
                      <div>
                        <label className="admin-input-label">{locale === 'ar' ? 'المحتوى بالإنجليزية' : 'Content (English)'}</label>
                        {selectedSection.type === 'textarea' ? (
                          <textarea
                            value={contentEn}
                            onChange={(e) => handleEnChange(e.target.value)}
                            rows={5}
                            className="admin-input"
                          />
                        ) : (
                          <input
                            type="text"
                            value={contentEn}
                            onChange={(e) => handleEnChange(e.target.value)}
                            className="admin-input"
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="admin-input-label">{locale === 'ar' ? 'المحتوى' : 'Content'}</label>
                      {selectedSection.type === 'textarea' ? (
                        <textarea value={contentAr} onChange={(e) => handleArChange(e.target.value)} rows={5} className="admin-input" />
                      ) : (
                        <input
                          type={selectedSection.type === 'image' ? 'url' : 'text'}
                          value={contentAr}
                          onChange={(e) => handleArChange(e.target.value)}
                          className="admin-input"
                          placeholder={selectedSection.type === 'image' ? 'https://...' : ''}
                        />
                      )}
                      {selectedSection.type === 'image' && contentAr && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 max-w-md">
                          <img src={contentAr} alt="Preview" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} className="admin-btn-primary">
                      {locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                    </button>
                    <button onClick={() => setSelectedSection(null)} className="admin-btn-secondary">
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="admin-card">
              <div className="admin-card-body text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium mb-2">
                  {locale === 'ar' ? 'اضغط على صفحة لعرض أقسامها' : 'Click on a page to view its sections'}
                </p>
                <p className="text-sm text-gray-400">
                  {locale === 'ar' ? 'ثم اختر القسم للتعديل والمعاينة' : 'Then select a section to edit and preview'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
