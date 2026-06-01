'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DraftBanner from '@/components/admin/DraftBanner';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

const DRAFT_KEY = 'admin_maintenance_new';

type MaintenanceRow = {
  id: string;
  propertyLabelAr: string | null;
  descriptionAr: string;
  status: string;
  priority: string;
  reporterName: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  OPEN: { ar: 'مفتوح', en: 'Open' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In progress' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

export default function AdminMaintenancePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    propertyLabelAr: '',
    descriptionAr: '',
    descriptionEn: '',
    priority: 'NORMAL',
    reporterName: '',
    reporterPhone: '',
  });

  useEffect(() => {
    const draft = loadDraft<typeof form>(DRAFT_KEY);
    if (draft) setForm(draft);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(DRAFT_KEY, form), 800);
    return () => window.clearTimeout(t);
  }, [form]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance-requests?limit=100', { credentials: 'include', cache: 'no-store' });
      const data = res.ok ? await res.json() : { items: [] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/maintenance-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    void load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descriptionAr.trim()) {
      showMissingFieldsAlert([ar ? 'وصف المشكلة' : 'Issue description'], ar);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/maintenance-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('fail');
      clearDraft(DRAFT_KEY);
      setForm({ propertyLabelAr: '', descriptionAr: '', descriptionEn: '', priority: 'NORMAL', reporterName: '', reporterPhone: '' });
      setShowForm(false);
      void load();
    } catch {
      alert(ar ? 'فشل الإنشاء' : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8">
      <DraftBanner />
      <AdminPageHeader
        title={ar ? 'إدارة الصيانة' : 'Maintenance management'}
        subtitle={ar ? 'تتبع طلبات الصيانة للعقارات' : 'Track property maintenance requests'}
        actions={
          <button type="button" className="admin-btn admin-btn--primary text-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? (ar ? 'إلغاء' : 'Cancel') : ar ? 'طلب جديد' : 'New request'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{ar ? 'طلب صيانة جديد' : 'New maintenance request'}</h2>
          </div>
          <div className="admin-card-body grid gap-4 md:grid-cols-2">
            <div>
              <label className="admin-input-label">{ar ? 'العقار / الوحدة' : 'Property / unit'}</label>
              <input type="text" className="admin-input w-full" value={form.propertyLabelAr} onChange={(e) => setForm({ ...form, propertyLabelAr: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'الأولوية' : 'Priority'}</label>
              <select className="admin-select w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">{ar ? 'منخفضة' : 'Low'}</option>
                <option value="NORMAL">{ar ? 'عادية' : 'Normal'}</option>
                <option value="HIGH">{ar ? 'عالية' : 'High'}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="admin-input-label">{ar ? 'الوصف (عربي) *' : 'Description (Arabic) *'}</label>
              <textarea rows={3} className={`admin-input w-full ${getRequiredFieldClass(true, form.descriptionAr)}`} value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'المبلّغ' : 'Reporter'}</label>
              <input type="text" className="admin-input w-full" value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'هاتف المبلّغ' : 'Reporter phone'}</label>
              <input type="tel" className="admin-input w-full" value={form.reporterPhone} onChange={(e) => setForm({ ...form, reporterPhone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? (ar ? 'جاري الحفظ…' : 'Saving…') : ar ? 'حفظ الطلب' : 'Save request'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">{ar ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'العقار' : 'Property'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{r.propertyLabelAr || '—'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm">{r.descriptionAr}</td>
                    <td className="px-4 py-3">
                      <select className="admin-select text-sm" value={r.status} onChange={(e) => void updateStatus(r.id, e.target.value)}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {ar ? v.ar : v.en}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
