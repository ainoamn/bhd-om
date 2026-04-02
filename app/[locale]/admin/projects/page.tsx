'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { shortenProjectSerial } from '@/lib/utils/serialNumber';

type ProjectRow = {
  id: string;
  serialNumber: string;
  titleAr: string;
  titleEn?: string;
  status: string;
  locationAr?: string | null;
  locationEn?: string | null;
  createdAt?: string;
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'منجزة',
  UNDER_CONSTRUCTION: 'قيد الإنجاز',
  UNDER_DEVELOPMENT: 'قيد الإنجاز',
  PLANNING: 'قيد المناقشة',
};

export default function ProjectsAdminPage() {
  const [filter, setFilter] = useState<string>('all');
  const [searchSerial, setSearchSerial] = useState('');
  const [list, setList] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/projects?limit=500&offset=0', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data?.error === 'string' ? data.error : 'Failed to load');
        setList([]);
        return;
      }
      const rows = Array.isArray(data?.list) ? data.list : [];
      setList(rows as ProjectRow[]);
    } catch {
      setLoadError('Network error');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => void loadProjects();
    window.addEventListener('focus', handleFocus);
    void loadProjects();
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadProjects]);

  const filtered = list.filter((p) => {
    const statusOk = filter === 'all' || p.status === filter;
    const q = searchSerial.trim();
    if (!q) return statusOk;
    const serial = (p.serialNumber || '').toUpperCase();
    const short = shortenProjectSerial(p.serialNumber).toUpperCase();
    const matchSerial = serial.includes(q.toUpperCase()) || short.includes(q.toUpperCase());
    return statusOk && matchSerial;
  });

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

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
          <button type="button" className="mr-2 font-semibold text-[#8B6F47] underline" onClick={() => void loadProjects()}>
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="admin-card mb-6">
        <div className="admin-card-body flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">البحث بالرقم:</label>
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="BHD-2026-PRJ-…"
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
          {loading ? (
            <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
          ) : (
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      لا توجد مشاريع مطابقة أو لم يُحمّل أي مشروع.
                    </td>
                  </tr>
                ) : (
                  filtered.map((project) => (
                    <tr key={project.id}>
                      <td className="font-mono text-sm max-w-[14rem]">
                        <span className="block break-all text-[#8B6F47] font-semibold" title={shortenProjectSerial(project.serialNumber)}>
                          {project.serialNumber || '—'}
                        </span>
                      </td>
                      <td className="font-semibold text-gray-900">{project.titleAr}</td>
                      <td className="text-gray-600">{project.locationAr || '—'}</td>
                      <td>
                        <span className="admin-badge admin-badge-info">{statusLabels[project.status] || project.status}</span>
                      </td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          <Link
                            href={`/${locale}/admin/accounting?tab=cheques&action=add&projectId=${encodeURIComponent(project.id)}`}
                            className="text-sm font-medium text-amber-600 hover:underline"
                          >
                            إضافة شيك
                          </Link>
                          <Link href={`/${locale}/admin/projects/${project.id}`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                            تعديل
                          </Link>
                          <button type="button" className="text-sm font-medium text-red-600 hover:underline">
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
