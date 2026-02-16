'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { searchSerialHistory } from '@/lib/data/serialHistory';

const typeLabels: Record<string, string> = {
  RENT: 'إيجار',
  SALE: 'بيع',
  INVESTMENT: 'استثمار',
  PLANNING: 'قيد المناقشة',
  UNDER_DEVELOPMENT: 'قيد الإنجاز',
  UNDER_CONSTRUCTION: 'قيد الإنجاز',
  COMPLETED: 'منجزة',
};

export default function SerialHistoryAdminPage() {
  const [query, setQuery] = useState('');
  const results = searchSerialHistory(query);

  return (
    <div>
      <AdminPageHeader
        title="أرشيف الأرقام المتسلسلة"
        subtitle="البحث عن الأرقام السابقة عند تغيير حالة المشاريع أو نوع العقارات"
      />

      <div className="admin-card mb-6">
        <div className="admin-card-body">
          <label className="block text-sm font-medium text-gray-600 mb-2">البحث بالرقم المتسلسل أو العنوان</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="PRJ-D-2024 أو PRP-R-2024 أو عنوان المشروع..."
            className="admin-input w-full max-w-md"
          />
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الرقم السابق</th>
                <th>الرقم الحالي</th>
                <th>العنوان</th>
                <th>النوع/الحالة السابقة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {results.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-mono text-sm text-primary font-semibold">{entry.serialNumber}</td>
                  <td className="font-mono text-sm text-gray-700">{entry.currentSerial || '--'}</td>
                  <td className="font-semibold text-gray-900">{entry.entityTitleAr}</td>
                  <td>
                    <span className="admin-badge admin-badge-info">{typeLabels[entry.typeOrStatus] || entry.typeOrStatus}</span>
                  </td>
                  <td className="text-gray-600">{new Date(entry.changedAt).toLocaleDateString('ar-OM')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {results.length === 0 && (
        <div className="admin-card">
          <div className="admin-card-body text-center py-16">
            <p className="text-gray-500">لا توجد نتائج للبحث</p>
          </div>
        </div>
      )}
    </div>
  );
}
