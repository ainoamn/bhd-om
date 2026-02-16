'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const mockSubmissions = [
  { id: 1, name: 'أحمد محمد', email: 'ahmed@example.com', phone: '+96891234567', type: 'CONTACT', isRead: false, date: '2025-02-09' },
  { id: 2, name: 'سارة علي', email: 'sara@example.com', phone: '+96898765432', type: 'CALLBACK', isRead: true, date: '2025-02-08' },
  { id: 3, name: 'محمد سالم', email: 'mohammed@example.com', type: 'CONTACT', isRead: false, date: '2025-02-07' },
];

const typeLabels: Record<string, string> = {
  CONTACT: 'نموذج تواصل',
  CALLBACK: 'طلب اتصال',
};

export default function SubmissionsAdminPage() {
  const [filter, setFilter] = useState<'all' | 'contact' | 'callback'>('all');
  const [selectedItem, setSelectedItem] = useState<typeof mockSubmissions[0] | null>(null);

  return (
    <div>
      <AdminPageHeader
        title="جهات الاتصال والرسائل"
        subtitle="عرض وإدارة رسائل التواصل وطلبات الاتصال من الزوار"
      />

      <div className="mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="admin-select">
          <option value="all">الكل</option>
          <option value="contact">نموذج تواصل</option>
          <option value="callback">طلب اتصال</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card overflow-hidden">
          <div className="admin-card-header">
            <h2 className="admin-card-title">الرسائل</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {mockSubmissions.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-right p-4 hover:bg-gray-50 transition-colors ${
                  selectedItem?.id === item.id ? 'bg-[#8B6F47]/5' : ''
                } ${!item.isRead ? 'font-semibold' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{item.name}</span>
                  {!item.isRead && <span className="w-2 h-2 rounded-full bg-[#8B6F47]"></span>}
                </div>
                <div className="text-sm text-gray-500 mt-1">{item.email}</div>
                <div className="text-xs text-gray-400 mt-1">{item.date} - {typeLabels[item.type]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {selectedItem ? (
            <>
              <div className="admin-card-header">
                <h2 className="admin-card-title">تفاصيل الرسالة</h2>
              </div>
              <div className="admin-card-body space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">الاسم</label>
                  <p className="font-semibold text-gray-900">{selectedItem.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">البريد الإلكتروني</label>
                  <p className="font-semibold text-gray-900">{selectedItem.email}</p>
                </div>
                {selectedItem.phone && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">الهاتف</label>
                    <p className="font-semibold text-gray-900">{selectedItem.phone}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">النوع</label>
                  <p className="font-semibold text-gray-900">{typeLabels[selectedItem.type]}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">التاريخ</label>
                  <p className="font-semibold text-gray-900">{selectedItem.date}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-2">الرسالة</label>
                  <p className="p-4 rounded-xl bg-gray-50 text-gray-600 text-sm">محتوى الرسالة سيكون هنا عند الربط مع قاعدة البيانات</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <a href={`mailto:${selectedItem.email}`} className="admin-btn-primary text-sm py-2">رد عبر البريد</a>
                  <a href="https://wa.me/96891115341" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">واتساب</a>
                  <a href={`tel:${selectedItem.phone}`} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">اتصال</a>
                </div>
              </div>
            </>
          ) : (
            <div className="admin-card-body text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium mb-2">اختر رسالة من القائمة لعرض التفاصيل</p>
              <p className="text-sm text-gray-400">يمكنك الرد على الرسائل عبر البريد أو الواتساب أو الاتصال</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
