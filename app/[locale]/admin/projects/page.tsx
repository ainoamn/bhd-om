'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

import { projects } from '@/lib/data/projects';

const mockProjects = projects.map((p) => ({
  id: p.id,
  serialNumber: p.serialNumber,
  titleAr: p.titleAr,
  status: p.status,
  location: p.locationAr,
}));

const statusLabels: Record<string, string> = {
  COMPLETED: 'منجزة',
  UNDER_CONSTRUCTION: 'قيد الإنجاز',
  UNDER_DEVELOPMENT: 'قيد الإنجاز',
  PLANNING: 'قيد المناقشة',
};

export default function ProjectsAdminPage() {
  const [filter, setFilter] = useState<string>('all');
  const [searchSerial, setSearchSerial] = useState('');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  return (
    <div>
      <AdminPageHeader
        title="إدارة المشاريع"
        subtitle="إضافة، تعديل وحذف المشاريع"
        actions={
          <Link href={`/${locale}/admin/projects/new`} className="admin-btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            إضافة مشروع
          </Link>
        }
      />

      <div className="admin-card mb-6">
        <div className="admin-card-body flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">البحث بالرقم:</label>
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="PRJ-C-2025-0001"
              className="admin-input w-40"
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-select">
            <option value="all">الكل</option>
            <option value="COMPLETED">منفذ</option>
            <option value="UNDER_CONSTRUCTION">قيد البناء</option>
            <option value="UNDER_DEVELOPMENT">قيد التطوير</option>
            <option value="PLANNING">قيد التخطيط</option>
          </select>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>المشروع</th>
                <th>الموقع</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {mockProjects
                .filter((p) => (filter === 'all' || p.status === filter) && (!searchSerial || (p as { serialNumber?: string }).serialNumber?.toUpperCase().includes(searchSerial.toUpperCase())))
                .map((project) => (
                <tr key={project.id}>
                  <td className="font-mono text-sm text-primary font-semibold">{(project as { serialNumber?: string }).serialNumber || '--'}</td>
                  <td className="font-semibold text-gray-900">{project.titleAr}</td>
                  <td className="text-gray-600">{project.location}</td>
                  <td>
                    <span className="admin-badge admin-badge-info">{statusLabels[project.status] || project.status}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/${locale}/admin/projects/${project.id}`} className="text-sm font-medium text-[#8B6F47] hover:underline">تعديل</Link>
                      <button className="text-sm font-medium text-red-600 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
