'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DraftBanner from '@/components/admin/DraftBanner';
import Icon from '@/components/icons/Icon';
import { getRequiredFieldClass, showMissingFieldsAlert } from '@/lib/utils/requiredFields';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

const DRAFT_KEY = 'portal_maintenance_new';

type MaintenanceRow = {
  id: string;
  propertyLabelAr: string | null;
  propertyLabelEn: string | null;
  descriptionAr: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  OPEN: { ar: 'مفتوح', en: 'Open' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In progress' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
  LOW: { ar: 'منخفض', en: 'Low' },
  NORMAL: { ar: 'عادي', en: 'Normal' },
  HIGH: { ar: 'عالي', en: 'High' },
  URGENT: { ar: 'عاجل', en: 'Urgent' },
};

export default function MyMaintenancePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const role = (session?.user as { role?: string } | undefined)?.role;
  const title = role === 'OWNER' ? tOwner('myMaintenance') : tClient('myMaintenance');

  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    propertyLabelAr: '',
    descriptionAr: '',
    descriptionEn: '',
    priority: 'NORMAL',
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
      const res = await fetch('/api/me/maintenance-requests?limit=100', {
        credentials: 'include',
        cache: 'no-store',
      });
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descriptionAr.trim()) {
      showMissingFieldsAlert([ar ? 'وصف المشكلة' : 'Issue description'], ar);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/me/maintenance-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('fail');
      clearDraft(DRAFT_KEY);
      setForm({ propertyLabelAr: '', descriptionAr: '', descriptionEn: '', priority: 'NORMAL' });
      setShowForm(false);
      void load();
    } catch {
      showMissingFieldsAlert([ar ? 'فشل الحفظ — حاول مجدداً' : 'Save failed — try again'], ar);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        subtitle={
          ar
            ? 'اطلب صيانة لممتلكاتك أو تابع طلباتك السابقة'
            : 'Request maintenance or track your previous requests'
        }
      />

      <DraftBanner />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="admin-btn admin-btn-primary inline-flex items-center gap-2"
        >
          <Icon name="plus" className="w-4 h-4" />
          {ar ? (showForm ? 'إخفاء النموذج' : 'طلب صيانة جديد') : showForm ? 'Hide form' : 'New request'}
        </button>
        <Link href={`/${locale}/admin/notifications`} prefetch className="admin-btn admin-btn-secondary inline-flex items-center gap-2">
          <Icon name="inbox" className="w-4 h-4" />
          {ar ? 'الإشعارات' : 'Notifications'}
        </Link>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{ar ? 'طلب صيانة' : 'Maintenance request'}</h2>
          </div>
          <div className="admin-card-body space-y-4">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {ar
                ? 'البيانات المدخلة لن تُرسل للإدارة إلا بعد النقر على «إرسال الطلب».'
                : 'Your input is not sent to admin until you click «Submit request».'}
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {ar ? 'العقار / الموقع (اختياري)' : 'Property / location (optional)'}
              </label>
              <input
                type="text"
                value={form.propertyLabelAr}
                onChange={(e) => setForm({ ...form, propertyLabelAr: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(false, form.propertyLabelAr)}`}
                placeholder={ar ? 'مثال: شقة 12 — برج السلام' : 'e.g. Apt 12 — Al Salam Tower'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {ar ? 'وصف المشكلة *' : 'Issue description *'}
              </label>
              <textarea
                rows={4}
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                className={`admin-input w-full ${getRequiredFieldClass(true, form.descriptionAr)}`}
                placeholder={ar ? 'صف المشكلة بالتفصيل...' : 'Describe the issue...'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {ar ? 'الأولوية' : 'Priority'}
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="admin-input w-full max-w-xs"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {ar ? lbl.ar : lbl.en}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
              {saving ? (ar ? 'جاري الإرسال...' : 'Submitting...') : ar ? 'إرسال الطلب' : 'Submit request'}
            </button>
          </div>
        </form>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{ar ? 'طلباتي' : 'My requests'}</h2>
        </div>
        <div className="admin-card-body">
          {loading ? (
            <p className="text-gray-500 py-8 text-center">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Icon name="wrench" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{ar ? 'لا توجد طلبات صيانة بعد' : 'No maintenance requests yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'العقار' : 'Property'}</th>
                    <th>{ar ? 'الوصف' : 'Description'}</th>
                    <th>{ar ? 'الأولوية' : 'Priority'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const st = STATUS_LABELS[row.status] || { ar: row.status, en: row.status };
                    const pr = PRIORITY_LABELS[row.priority] || { ar: row.priority, en: row.priority };
                    return (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-sm">
                          {new Date(row.createdAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}
                        </td>
                        <td>{row.propertyLabelAr || '—'}</td>
                        <td className="max-w-xs truncate">{row.descriptionAr}</td>
                        <td>{ar ? pr.ar : pr.en}</td>
                        <td>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              row.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : row.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : row.status === 'CANCELLED'
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ar ? st.ar : st.en}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
