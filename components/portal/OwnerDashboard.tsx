'use client';

import { useState } from 'react';

interface Property {
  id: string;
  titleAr: string | null;
  titleEn: string | null;
  governorateAr: string | null;
  price: number | null;
  status: string;
  type: string;
  createdAt: Date;
}

interface Contract {
  id: string;
  data: string;
  propertyId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  properties: Property[];
  contracts: Contract[];
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
}

const tabs = [
  { key: 'overview', label: 'نظرة عامة', icon: '📊' },
  { key: 'properties', label: 'عقاراتي', icon: '🏠' },
  { key: 'tenants', label: 'مستأجري', icon: '👥' },
  { key: 'revenue', label: 'الإيرادات', icon: '💰' },
];

export default function OwnerDashboard({ properties, contracts, user }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  // إحصائيات
  const totalProperties = properties.length;
  const activeContracts = contracts.filter(c => {
    try { const d = JSON.parse(c.data); return d.contractStatus === 'Active'; } catch { return false; }
  }).length;
  const totalRevenue = contracts.reduce((sum, c) => {
    try { const d = JSON.parse(c.data); return sum + (d.rentAmount || d.monthlyRent || 0); } catch { return sum; }
  }, 0);
  const occupancyRate = totalProperties > 0 ? Math.round((activeContracts / totalProperties) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="العقارات" value={totalProperties} icon="🏠" color="blue" />
        <StatCard title="عقود نشطة" value={activeContracts} icon="✅" color="green" />
        <StatCard title="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString()} ر.ع`} icon="💰" color="red" />
        <StatCard title="نسبة الإشغال" value={`${occupancyRate}%`} icon="📈" color="yellow" />
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-xl shadow-sm border mb-4">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-[#C8102E] text-[#C8102E] bg-red-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab properties={properties} contracts={contracts} />}
          {activeTab === 'properties' && <PropertiesTab properties={properties} contracts={contracts} />}
          {activeTab === 'tenants' && <TenantsTab contracts={contracts} />}
          {activeTab === 'revenue' && <RevenueTab contracts={contracts} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

/** نظرة عامة */
function OverviewTab({ properties, contracts }: { properties: Property[]; contracts: Contract[] }) {
  const recentContracts = contracts.slice(0, 5);
  return (
    <div className="space-y-6">
      {/* آخر العقود */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">آخر العقود</h3>
        {recentContracts.length === 0 ? (
          <p className="text-gray-400 text-center py-6">لا توجد عقود</p>
        ) : (
          <div className="space-y-2">
            {recentContracts.map(c => {
              let d: any = {};
              try { d = JSON.parse(c.data); } catch { }
              return (
                <div key={c.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{d.unitName || d.propertyName || '—'}</p>
                    <p className="text-sm text-gray-500">{d.tenantName || '—'} — {d.monthlyRent || 0} ر.ع/شهر</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${d.contractStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                    {d.contractStatus === 'Active' ? 'نشط' : d.contractStatus}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* توزيع العقارات */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">عقاراتي ({properties.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.slice(0, 6).map(p => (
            <div key={p.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <h4 className="font-bold">{p.titleAr || p.titleEn || '—'}</h4>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{p.type}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{p.governorateAr || '—'}</p>
              <p className="text-[#C8102E] font-bold mt-2">{p.price?.toLocaleString() || 0} ر.ع</p>
              <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${
                p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {p.status === 'ACTIVE' ? 'نشط' : p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** عقاراتي */
function PropertiesTab({ properties, contracts }: { properties: Property[]; contracts: Contract[] }) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-5xl block mb-4">🏠</span>
        <p className="text-lg">لا توجد عقارات مسجلة</p>
        <p className="text-sm mt-2">سيتم عرض عقاراتك هنا عند إضافتها</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map(p => {
        const propertyContracts = contracts.filter(c => c.propertyId === p.id);
        const activeTenant = propertyContracts.find(c => {
          try { return JSON.parse(c.data).contractStatus === 'Active'; } catch { return false; }
        });
        let tenantName = 'شاغر';
        if (activeTenant) {
          try { tenantName = JSON.parse(activeTenant.data).tenantName || 'مستأجر'; } catch { }
        }

        return (
          <div key={p.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{p.titleAr || p.titleEn || '—'}</h3>
                <p className="text-gray-500 text-sm">{p.governorateAr || '—'}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>💰 {p.price?.toLocaleString() || 0} ر.ع</span>
                  <span>👤 {tenantName}</span>
                  <span>📋 {propertyContracts.length} عقد</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {p.status === 'ACTIVE' ? 'نشط' : p.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** مستأجري */
function TenantsTab({ contracts }: { contracts: Contract[] }) {
  const tenants = contracts
    .map(c => {
      try {
        const d = JSON.parse(c.data);
        return { name: d.tenantName || '—', unit: d.unitName || '—', phone: d.tenantPhone || '—', status: d.contractStatus || '—' };
      } catch { return null; }
    })
    .filter(Boolean);

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-5xl block mb-4">👥</span>
        <p>لا يوجد مستأجرين</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold text-gray-600">المستأجر</th>
            <th className="px-4 py-3 text-sm font-semibold text-gray-600">الوحدة</th>
            <th className="px-4 py-3 text-sm font-semibold text-gray-600">الهاتف</th>
            <th className="px-4 py-3 text-sm font-semibold text-gray-600">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tenants.map((t: any, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{t.name}</td>
              <td className="px-4 py-3 text-gray-600">{t.unit}</td>
              <td className="px-4 py-3 text-gray-600">{t.phone}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                  {t.status === 'Active' ? 'نشط' : t.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** الإيرادات */
function RevenueTab({ contracts }: { contracts: Contract[] }) {
  const monthlyRevenue = contracts.reduce((sum, c) => {
    try { return sum + (JSON.parse(c.data).monthlyRent || 0); } catch { return sum; }
  }, 0);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-l from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">الإيراد الشهري</p>
          <p className="text-3xl font-bold mt-1">{monthlyRevenue.toLocaleString()} ر.ع</p>
        </div>
        <div className="bg-gradient-to-l from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">الإيراد السنوي المتوقع</p>
          <p className="text-3xl font-bold mt-1">{(monthlyRevenue * 12).toLocaleString()} ر.ع</p>
        </div>
        <div className="bg-gradient-to-l from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">عدد العقود</p>
          <p className="text-3xl font-bold mt-1">{contracts.length}</p>
        </div>
      </div>

      <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
        <span className="text-4xl block mb-3">📊</span>
        <p>سيتم إضافة رسوم بيانية للإيرادات قريباً</p>
      </div>
    </div>
  );
}
