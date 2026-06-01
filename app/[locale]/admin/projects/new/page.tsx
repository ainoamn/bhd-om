'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';

const statusOptions = [
  { value: 'PLANNING', labelAr: 'قيد التخطيط', labelEn: 'Planning' },
  { value: 'UNDER_DEVELOPMENT', labelAr: 'قيد التطوير', labelEn: 'Under Development' },
  { value: 'UNDER_CONSTRUCTION', labelAr: 'قيد البناء', labelEn: 'Under Construction' },
  { value: 'COMPLETED', labelAr: 'منفذ', labelEn: 'Completed' },
];

export default function AddProjectPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  const [form, setForm] = useState({
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    status: 'UNDER_CONSTRUCTION' as string,
    locationAr: '',
    locationEn: '',
    area: '',
    units: '',
    startDate: '',
    completionDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          area: form.area ? Number(form.area) : undefined,
          units: form.units ? Number(form.units) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data.error || (locale === 'ar' ? 'فشل الحفظ' : 'Save failed')));
        return;
      }
      router.push(`/${locale}/admin/projects`);
    } catch {
      setError(locale === 'ar' ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="إضافة مشروع جديد"
        subtitle="إدراج مشروع في القائمة"
        actions={
          <Link href={`/${locale}/admin/projects`} className="admin-btn-secondary">
            <Icon name="chevronLeft" className="w-5 h-5" />
            رجوع
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">المعلومات الأساسية</h2>
          </div>
          <div className="admin-card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="admin-input-label">اسم المشروع بالعربية *</label>
                <input
                  type="text"
                  value={form.titleAr}
                  onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  className="admin-input"
                  placeholder="مثال: مجمع الأعمال التجاري"
                  required
                />
              </div>
              <div>
                <label className="admin-input-label">اسم المشروع بالإنجليزية</label>
                <input
                  type="text"
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  className="admin-input"
                  placeholder="Business Complex"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="admin-input-label">الموقع بالعربية</label>
                <input
                  type="text"
                  value={form.locationAr}
                  onChange={(e) => setForm({ ...form, locationAr: e.target.value, locationEn: e.target.value })}
                  className="admin-input"
                  placeholder="مثال: مسقط، الخوض"
                />
              </div>
              <div>
                <label className="admin-input-label">حالة المشروع</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="admin-select w-full"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="admin-input-label">الوصف بالعربية</label>
              <textarea
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                rows={4}
                className="admin-input"
                placeholder="وصف تفصيلي للمشروع"
              />
            </div>
            <div>
              <label className="admin-input-label">الوصف بالإنجليزية</label>
              <textarea
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                rows={4}
                className="admin-input"
                placeholder="Detailed project description"
              />
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">تفاصيل إضافية</h2>
          </div>
          <div className="admin-card-body space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="admin-input-label">المساحة الإجمالية (م²)</label>
                <input
                  type="number"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="admin-input"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="admin-input-label">عدد الوحدات</label>
                <input
                  type="number"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  className="admin-input"
                  placeholder="24"
                />
              </div>
              <div>
                <label className="admin-input-label">تاريخ البدء</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div>
                <label className="admin-input-label">تاريخ الانتهاء المتوقع</label>
                <input
                  type="date"
                  value={form.completionDate}
                  onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
                  className="admin-input"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              رفع الصور سيتم إضافته عند ربط النموذج بقاعدة البيانات
            </p>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-body">
            <div className="flex gap-4">
              <button type="submit" className="admin-btn-primary" disabled={saving}>
                <Icon name="check" className="w-5 h-5" />
                {saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : locale === 'ar' ? 'حفظ المشروع' : 'Save project'}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Link href={`/${locale}/admin/projects`} className="admin-btn-secondary">
                إلغاء
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
