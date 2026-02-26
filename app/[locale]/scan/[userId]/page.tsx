'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ScanUser {
  id: string;
  serialNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  dashboardType: string | null;
  createdAt: string;
}

export default function ScanUserPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [user, setUser] = useState<ScanUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(ar ? 'معرف غير صالح' : 'Invalid ID');
      return;
    }
    fetch(`/api/scan/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch(() => {
        setError(ar ? 'المستخدم غير موجود' : 'User not found');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [userId, ar]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl mx-auto mb-4">⚠</div>
          <p className="text-gray-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, { ar: string; en: string }> = {
    ADMIN: { ar: 'مدير', en: 'Admin' },
    CLIENT: { ar: 'عميل', en: 'Client' },
    OWNER: { ar: 'مالك', en: 'Owner' },
  };
  const dashboardLabels: Record<string, { ar: string; en: string }> = {
    CLIENT: { ar: 'عميل', en: 'Client' },
    TENANT: { ar: 'مستأجر', en: 'Tenant' },
    LANDLORD: { ar: 'مالك', en: 'Landlord' },
    SUPPLIER: { ar: 'مورد', en: 'Supplier' },
    PARTNER: { ar: 'شريك', en: 'Partner' },
    GOVERNMENT: { ar: 'حكومة', en: 'Government' },
    AUTHORIZED_REP: { ar: 'مفوض بالتوقيع', en: 'Authorized Rep' },
    COMPANY: { ar: 'شركة', en: 'Company' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  };
  /** ملخص بصيغة دفتر العناوين: الاسم | الهاتف | الرقم المتسلسل */
  const displaySummary = [user.name, user.phone, user.serialNumber].filter(Boolean).join(' | ') || '—';
  const roleLabel = roleLabels[user.role] || { ar: user.role, en: user.role };
  const dashLabel = user.dashboardType && dashboardLabels[user.dashboardType]
    ? dashboardLabels[user.dashboardType]
    : null;
  const createdAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* رأس البطاقة مثل دفتر العناوين */}
          <div className="bg-[#8B6F47] px-6 py-5 text-white">
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
              {ar ? 'بطاقة المستخدم — بيانات كاملة كما في دفتر العناوين' : 'User Card — Full Details (as in Address Book)'}
            </p>
            <h1 className="text-xl font-bold mt-1">{user.name}</h1>
            <p className="font-mono text-sm opacity-90 mt-1">{user.serialNumber}</p>
            <p className="text-sm opacity-85 mt-2 border-t border-white/20 pt-2">{displaySummary}</p>
          </div>
          {/* البيانات الأساسية — كما في دفتر العناوين */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
              {ar ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                  {ar ? 'الرقم المتسلسل / اسم الدخول' : 'Serial / Username'}
                </p>
                <p className="font-mono text-[#8B6F47] font-medium">{user.serialNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                  {ar ? 'الدور' : 'Role'}
                </p>
                <p className="font-medium">{ar ? roleLabel.ar : roleLabel.en}</p>
              </div>
              {dashLabel && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                    {ar ? 'تصنيف لوحة التحكم' : 'Dashboard Type'}
                  </p>
                  <p className="font-medium">{ar ? dashLabel.ar : dashLabel.en}</p>
                </div>
              )}
            </div>
          </div>
          {/* معلومات الاتصال */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
              {ar ? 'معلومات الاتصال' : 'Contact Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                  {ar ? 'الهاتف' : 'Phone'}
                </p>
                {user.phone ? (
                  <a href={`tel:${user.phone}`} className="text-[#8B6F47] font-medium hover:underline">
                    {user.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                  {ar ? 'البريد الإلكتروني' : 'Email'}
                </p>
                {user.email ? (
                  <a href={`mailto:${user.email}`} className="text-[#8B6F47] font-medium hover:underline break-all">
                    {user.email}
                  </a>
                ) : (
                  <span className="text-gray-400">
                    {ar ? 'دخول بالرقم المتسلسل فقط' : 'Login by serial number only'}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* سجل النظام */}
          <div className="p-6">
            <h2 className="text-sm font-bold text-[#8B6F47] mb-4 uppercase tracking-wide">
              {ar ? 'سجل النظام' : 'System Record'}
            </h2>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">
                {ar ? 'تاريخ الإنشاء' : 'Created'}
              </p>
              <p className="text-gray-700 text-sm">{createdAt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
