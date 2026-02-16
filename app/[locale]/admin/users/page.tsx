'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

import { users } from '@/lib/data/users';

const mockUsers = users;

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير',
  CLIENT: 'عميل',
};

export default function UsersAdminPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchSerial, setSearchSerial] = useState('');

  return (
    <div>
      <AdminPageHeader
        title="إدارة المستخدمين"
        subtitle="إضافة، تعديل وحذف حسابات المستخدمين"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="admin-btn-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            إضافة مستخدم
          </button>
        }
      />

      <div className="admin-card mb-6">
        <div className="admin-card-body">
          <label className="text-sm font-medium text-gray-600">البحث بالرقم:</label>
          <input
            type="text"
            value={searchSerial}
            onChange={(e) => setSearchSerial(e.target.value)}
            placeholder="USR-0001"
            className="admin-input w-40 mt-2"
          />
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers
                .filter((u) => !searchSerial || (u as { serialNumber?: string }).serialNumber?.toUpperCase().includes(searchSerial.toUpperCase()))
                .map((user) => (
                <tr key={user.id}>
                  <td className="font-mono text-sm text-primary font-semibold">{(user as { serialNumber?: string }).serialNumber || '--'}</td>
                  <td className="font-semibold text-gray-900">{user.name}</td>
                  <td className="text-gray-600">{user.email}</td>
                  <td>
                    <span className={`admin-badge ${user.role === 'ADMIN' ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-success">نشط</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="text-sm font-medium text-[#8B6F47] hover:underline">تعديل</button>
                      <button className="text-sm font-medium text-amber-600 hover:underline">تعطيل</button>
                      <button className="text-sm font-medium text-red-600 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="admin-card max-w-md w-full">
            <div className="admin-card-header">
              <h2 className="admin-card-title">إضافة مستخدم جديد</h2>
            </div>
            <div className="admin-card-body space-y-4">
              <div>
                <label className="admin-input-label">الاسم</label>
                <input type="text" className="admin-input" placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className="admin-input-label">البريد الإلكتروني</label>
                <input type="email" className="admin-input" placeholder="email@example.com" />
              </div>
              <div>
                <label className="admin-input-label">كلمة المرور</label>
                <input type="password" className="admin-input" placeholder="••••••••" />
              </div>
              <div>
                <label className="admin-input-label">الدور</label>
                <select className="admin-input">
                  <option value="CLIENT">عميل</option>
                  <option value="ADMIN">مدير</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="admin-btn-primary flex-1">إضافة</button>
                <button onClick={() => setShowAddModal(false)} className="admin-btn-secondary flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
