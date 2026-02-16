'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const mockServices = [
  { id: 1, titleAr: 'التطوير العقاري', order: 1 },
  { id: 2, titleAr: 'إدارة العقارات', order: 2 },
  { id: 3, titleAr: 'الاستشارات الاستثمارية', order: 3 },
  { id: 4, titleAr: 'البناء والتشييد', order: 4 },
];

export default function ServicesAdminPage() {
  const [selectedService, setSelectedService] = useState<number | null>(null);

  return (
    <div>
      <AdminPageHeader
        title="إدارة صفحة الخدمات"
        subtitle="تعديل الخدمات المعروضة في صفحة الخدمات"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card overflow-hidden">
          <div className="admin-card-header">
            <h2 className="admin-card-title">الخدمات</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {mockServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`w-full text-right p-4 hover:bg-gray-50 transition-colors ${
                  selectedService === service.id ? 'bg-[#8B6F47]/5 border-r-4 border-[#8B6F47]' : ''
                }`}
              >
                <div className="font-medium text-gray-900">{service.titleAr}</div>
                <div className="text-xs text-gray-500 mt-1">ترتيب: {service.order}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {selectedService ? (
            <>
              <div className="admin-card-header">
                <h2 className="admin-card-title">تعديل الخدمة</h2>
              </div>
              <div className="admin-card-body space-y-4">
                <div>
                  <label className="admin-input-label">العنوان بالعربية</label>
                  <input type="text" className="admin-input" defaultValue="التطوير العقاري" />
                </div>
                <div>
                  <label className="admin-input-label">العنوان بالإنجليزية</label>
                  <input type="text" className="admin-input" defaultValue="Real Estate Development" />
                </div>
                <div>
                  <label className="admin-input-label">الوصف بالعربية</label>
                  <textarea rows={4} className="admin-input" defaultValue="نقدم خدمات تطوير عقاري متكاملة..." />
                </div>
                <div>
                  <label className="admin-input-label">الوصف بالإنجليزية</label>
                  <textarea rows={4} className="admin-input" defaultValue="We provide integrated real estate development services..." />
                </div>
                <button className="admin-btn-primary">حفظ التعديلات</button>
              </div>
            </>
          ) : (
            <div className="admin-card-body text-center py-20">
              <p className="text-gray-500 font-medium">اختر خدمة من القائمة لبدء التعديل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
