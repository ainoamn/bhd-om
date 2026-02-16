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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: ربط مع API عند الإطلاق
    alert('سيتم حفظ المشروع في قاعدة البيانات عند الربط بالـ API');
    router.push(`/${locale}/admin/projects`);
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
              <button type="submit" className="admin-btn-primary">
                <Icon name="check" className="w-5 h-5" />
                حفظ المشروع
              </button>
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
