'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Submission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  CONTACT: { ar: 'نموذج تواصل', en: 'Contact form' },
  CALLBACK: { ar: 'طلب اتصال', en: 'Callback request' },
};

export default function SubmissionsAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [filter, setFilter] = useState<'all' | 'CONTACT' | 'CALLBACK'>('all');
  const [items, setItems] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') qs.set('type', filter);
      const res = await fetch(`/api/admin/contact-submissions?${qs}`, { credentials: 'include', cache: 'no-store' });
      const data = res.ok ? await res.json() : { items: [], unreadCount: 0 };
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string, isRead: boolean) => {
    await fetch(`/api/admin/contact-submissions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isRead }),
    });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isRead } : x)));
    if (selected?.id === id) setSelected({ ...selected, isRead });
    void load();
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(ar ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <AdminPageHeader
        title={ar ? 'جهات الاتصال والرسائل' : 'Contact messages'}
        subtitle={ar ? `رسائل الزوار — ${unreadCount} غير مقروء` : `Visitor messages — ${unreadCount} unread`}
      />

      <div className="mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="admin-select">
          <option value="all">{ar ? 'الكل' : 'All'}</option>
          <option value="CONTACT">{ar ? 'نموذج تواصل' : 'Contact form'}</option>
          <option value="CALLBACK">{ar ? 'طلب اتصال' : 'Callback'}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="admin-card overflow-hidden">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{ar ? 'الرسائل' : 'Messages'}</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{ar ? 'لا توجد رسائل' : 'No messages'}</div>
          ) : (
            <div className="max-h-[500px] divide-y divide-gray-100 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    if (!item.isRead) void markRead(item.id, true);
                  }}
                  className={`w-full p-4 text-right transition-colors hover:bg-gray-50 ${selected?.id === item.id ? 'admin-accent-bg-soft' : ''} ${!item.isRead ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-900">{item.name}</span>
                    {!item.isRead && <span className="h-2 w-2 rounded-full admin-btn-primary" />}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{item.email}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {fmtDate(item.createdAt)} — {ar ? typeLabels[item.type]?.ar : typeLabels[item.type]?.en || item.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card">
          {selected ? (
            <>
              <div className="admin-card-header flex flex-wrap items-center justify-between gap-2">
                <h2 className="admin-card-title">{ar ? 'تفاصيل الرسالة' : 'Message details'}</h2>
                {!selected.isRead ? null : (
                  <button type="button" className="text-xs text-gray-500 hover:underline" onClick={() => void markRead(selected.id, false)}>
                    {ar ? 'تعليم كغير مقروء' : 'Mark unread'}
                  </button>
                )}
              </div>
              <div className="admin-card-body space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-500">{ar ? 'الاسم' : 'Name'}</label>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-500">{ar ? 'البريد' : 'Email'}</label>
                  <p className="font-semibold text-gray-900">{selected.email}</p>
                </div>
                {selected.phone && (
                  <div>
                    <label className="mb-1 block text-sm text-gray-500">{ar ? 'الهاتف' : 'Phone'}</label>
                    <p className="font-semibold text-gray-900">{selected.phone}</p>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm text-gray-500">{ar ? 'الرسالة' : 'Message'}</label>
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{selected.message || '—'}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href={`mailto:${selected.email}`} className="admin-btn admin-btn--primary text-sm">
                    {ar ? 'رد بالبريد' : 'Reply by email'}
                  </a>
                  {selected.phone && (
                    <>
                      <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                        WhatsApp
                      </a>
                      <a href={`tel:${selected.phone}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        {ar ? 'اتصال' : 'Call'}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="admin-card-body py-20 text-center text-gray-500">{ar ? 'اختر رسالة من القائمة' : 'Select a message from the list'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
