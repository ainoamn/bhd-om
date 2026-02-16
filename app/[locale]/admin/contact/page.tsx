'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function ContactAdminPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'info'>('settings');

  return (
    <div>
      <AdminPageHeader
        title="إدارة صفحة التواصل"
        subtitle="تعديل إعدادات صفحة التواصل ومعلومات الاتصال"
      />

      <div className="mb-6">
        <div className="inline-flex p-1 rounded-xl bg-gray-100">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            إعدادات الصفحة
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'info' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            معلومات الاتصال
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">إعدادات صفحة التواصل</h2>
          </div>
          <div className="admin-card-body space-y-4 max-w-2xl">
            <div>
              <label className="admin-input-label">عنوان الصفحة (عربي)</label>
              <input type="text" className="admin-input" defaultValue="اتصل بنا" />
            </div>
            <div>
              <label className="admin-input-label">عنوان الصفحة (إنجليزي)</label>
              <input type="text" className="admin-input" defaultValue="Contact Us" />
            </div>
            <div>
              <label className="admin-input-label">النص الفرعي (عربي)</label>
              <input type="text" className="admin-input" defaultValue="نحن هنا لمساعدتك في جميع احتياجاتك العقارية" />
            </div>
            <button className="admin-btn-primary">حفظ الإعدادات</button>
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">معلومات الاتصال المعروضة</h2>
          </div>
          <div className="admin-card-body space-y-4 max-w-2xl">
            <div>
              <label className="admin-input-label">العنوان</label>
              <input type="text" className="admin-input" defaultValue="سلطنة عمان" />
            </div>
            <div>
              <label className="admin-input-label">البريد الإلكتروني</label>
              <input type="email" className="admin-input" defaultValue="info@bhd-om.com" />
            </div>
            <div>
              <label className="admin-input-label">رقم الهاتف</label>
              <input type="tel" className="admin-input" defaultValue="+96891115341" />
            </div>
            <div>
              <label className="admin-input-label">رقم الواتساب</label>
              <input type="tel" className="admin-input" defaultValue="+96891115341" />
            </div>
            <button className="admin-btn-primary">حفظ المعلومات</button>
          </div>
        </div>
      )}
    </div>
  );
}
