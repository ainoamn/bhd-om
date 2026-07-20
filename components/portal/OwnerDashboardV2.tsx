'use client';

import { useState } from 'react';

interface Property { id: string; titleAr: string | null; titleEn: string | null; governorateAr: string | null; price: number | null; status: string; type: string; createdAt: Date; }
interface Contract { id: string; data: string; propertyId: string | null; status: string; createdAt: Date; updatedAt: Date; }
interface DueAmount { id: string; type: string; amount: number; status: string; dueDate: Date; propertyId: string | null; description: string | null; }
interface Score { id: string; tenantUserId: string; category: string; score: number; level: string; notes: string | null; }

interface Props {
  user: any;
  properties: Property[];
  contracts: Contract[];
  expenses: DueAmount[];
  stats: { totalProperties: number; activeContracts: number; totalRevenue: number; totalExpenses: number; netIncome: number; occupancyRate: number; };
  tenantPerformance: any[];
}

const tabs = [
  { key: 'overview', label: 'نظرة عامة', icon: '📊' },
  { key: 'buildings', label: 'مباني', icon: '🏢' },
  { key: 'tenants', label: 'مستأجرين', icon: '👥' },
  { key: 'revenue', label: 'إيرادات', icon: '💰' },
  { key: 'expenses', label: 'مصاريف', icon: '📉' },
];

function parseContract(data: string) { try { const d = JSON.parse(data); return { unit: d.unitName || '—', tenant: d.tenantName || '—', rent: d.monthlyRent || 0, status: d.contractStatus || '—' }; } catch { return { unit: '—', tenant: '—', rent: 0, status: '—' }; } }
function scoreColor(level: string) { const m: Record<string, string> = { EXCELLENT: 'bg-green-500', GOOD: 'bg-green-400', AVERAGE: 'bg-yellow-400', POOR: 'bg-orange-400', CRITICAL: 'bg-red-500' }; return m[level] || 'bg-gray-400'; }
function scoreLabel(level: string) { const m: Record<string, string> = { EXCELLENT: 'ممتاز', GOOD: 'جيد', AVERAGE: 'متوسط', POOR: 'ضعيف', CRITICAL: 'حرج' }; return m[level] || level; }

export default function OwnerDashboardV2({ user, properties, contracts, expenses, stats, tenantPerformance }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto">
      <header className="bg-gradient-to-l from-[#1A1A2E] via-[#2d2d44] to-[#1A1A2E] text-white px-6 py-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">🏠 بوابة المالك</h1>
            <p className="text-white/60 text-sm mt-1">{user?.name} — {user?.email}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="bg-[#D4AF37] text-[#1A1A2E] px-3 py-1 rounded-full font-bold">{stats.totalProperties} مبنى</span>
            <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">{stats.occupancyRate}% إشغال</span>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="flex overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? 'border-[#C8102E] text-[#C8102E] bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && <OverviewV2 stats={stats} tenantPerformance={tenantPerformance} />}
        {activeTab === 'buildings' && <BuildingsTab properties={properties} contracts={contracts} />}
        {activeTab === 'tenants' && <TenantsV2Tab tenantPerformance={tenantPerformance} />}
        {activeTab === 'revenue' && <RevenueV2Tab stats={stats} contracts={contracts} />}
        {activeTab === 'expenses' && <ExpensesTab expenses={expenses} />}
      </div>
    </div>
  );
}

// ========== نظرة عامة ==========
function OverviewV2({ stats, tenantPerformance }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: '🏢', title: 'المباني', value: stats.totalProperties, color: 'bg-blue-50 text-blue-700' },
          { icon: '✅', title: 'عقود نشطة', value: stats.activeContracts, color: 'bg-green-50 text-green-700' },
          { icon: '💰', title: 'إيرادات', value: `${stats.totalRevenue.toLocaleString()} ر.ع`, color: 'bg-emerald-50 text-emerald-700' },
          { icon: '📉', title: 'مصاريف', value: `${stats.totalExpenses.toLocaleString()} ر.ع`, color: 'bg-red-50 text-red-700' },
          { icon: '💵', title: 'صافي', value: `${stats.netIncome.toLocaleString()} ر.ع`, color: stats.netIncome >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' },
        ].map((c, i) => (
          <div key={i} className={`border rounded-xl p-4 ${c.color}`}>
            <p className="text-xs opacity-80">{c.title}</p>
            <p className="text-xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {tenantPerformance.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">👥 أداء المستأجرين</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-sm">المستأجر</th><th className="px-4 py-3 text-sm">الوحدة</th>
                <th className="px-4 py-3 text-sm">الإيجار</th><th className="px-4 py-3 text-sm">التقييم</th><th className="px-4 py-3 text-sm">الحالة</th>
              </tr></thead>
              <tbody className="divide-y">
                {tenantPerformance.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.tenantName}</td>
                    <td className="px-4 py-3 text-gray-600">{t.unitName}</td>
                    <td className="px-4 py-3">{t.monthlyRent.toLocaleString()} ر.ع</td>
                    <td className="px-4 py-3">
                      {t.score ? <span className={`text-white text-xs px-2 py-1 rounded-full ${scoreColor(t.level)}`}>{t.score} — {scoreLabel(t.level)}</span> : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{t.status === 'Active' ? 'نشط' : t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== المباني ==========
function BuildingsTab({ properties, contracts }: { properties: Property[]; contracts: Contract[] }) {
  if (properties.length === 0) return <Empty icon="🏢" title="لا توجد مباني" />;
  return (
    <div className="space-y-4">
      {properties.map(p => {
        const propertyContracts = contracts.filter(c => c.propertyId === p.id);
        const activeContract = propertyContracts.find(c => { try { return JSON.parse(c.data).contractStatus === 'Active'; } catch { return false; } });
        let tenant = 'شاغر'; try { tenant = JSON.parse(activeContract?.data || '{}').tenantName || 'شاغر'; } catch { }
        return (
          <div key={p.id} className="border rounded-xl p-5 bg-white hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{p.titleAr || p.titleEn || '—'}</h3>
                <p className="text-gray-500 text-sm">{p.governorateAr || '—'} • {p.type}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>💰 {p.price?.toLocaleString() || 0} ر.ع</span>
                  <span>👤 {tenant}</span>
                  <span>📋 {propertyContracts.length} عقد</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'RENTED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {p.status === 'ACTIVE' ? 'نشط' : p.status === 'RENTED' ? 'مؤجر' : p.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== المستأجرين ==========
function TenantsV2Tab({ tenantPerformance }: { tenantPerformance: any[] }) {
  if (tenantPerformance.length === 0) return <Empty icon="👥" title="لا يوجد مستأجرين" />;
  return (
    <div className="space-y-4">
      {tenantPerformance.map((t: any, i: number) => (
        <div key={i} className="border rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">👤</div>
              <div>
                <h4 className="font-bold">{t.tenantName}</h4>
                <p className="text-sm text-gray-500">{t.unitName} • {t.tenantPhone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#C8102E] font-bold">{t.monthlyRent.toLocaleString()} ر.ع/شهر</p>
              {t.score && (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-8 h-8 rounded-full ${scoreColor(t.level)} flex items-center justify-center text-white text-xs font-bold`}>{t.score}</div>
                  <span className="text-sm">{scoreLabel(t.level)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== الإيرادات ==========
function RevenueV2Tab({ stats, contracts }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">إجمالي الإيرادات الشهرية</p>
          <p className="text-4xl font-bold mt-2">{stats.totalRevenue.toLocaleString()} <span className="text-lg">ر.ع</span></p>
        </div>
        <div className="bg-gradient-to-l from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">الإيراد السنوي المتوقع</p>
          <p className="text-4xl font-bold mt-2">{(stats.totalRevenue * 12).toLocaleString()} <span className="text-lg">ر.ع</span></p>
        </div>
        <div className="bg-gradient-to-l from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">نسبة الإشغال</p>
          <p className="text-4xl font-bold mt-2">{stats.occupancyRate}%</p>
        </div>
      </div>
      <h3 className="font-bold text-gray-800">📋 تفاصيل العقود</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-right"><thead className="bg-gray-50 border-b"><tr>
          <th className="px-4 py-3 text-sm">الوحدة</th><th className="px-4 py-3 text-sm">المستأجر</th>
          <th className="px-4 py-3 text-sm">الإيجار</th><th className="px-4 py-3 text-sm">الحالة</th>
        </tr></thead><tbody className="divide-y">
          {contracts.slice(0, 20).map((c: Contract) => {
            const d = parseContract(c.data);
            return <tr key={c.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{d.unit}</td><td className="px-4 py-3">{d.tenant}</td><td className="px-4 py-3">{d.rent.toLocaleString()} ر.ع</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{d.status === 'Active' ? 'نشط' : d.status}</span></td></tr>;
          })}
        </tbody></table>
      </div>
    </div>
  );
}

// ========== المصاريف ==========
function ExpensesTab({ expenses }: { expenses: DueAmount[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-red-500 to-red-600 rounded-xl p-6 text-white">
        <p className="text-sm opacity-90">إجمالي المصاريف</p>
        <p className="text-4xl font-bold mt-2">{total.toLocaleString()} <span className="text-lg">ر.ع</span></p>
      </div>
      {expenses.length === 0 ? <Empty icon="📉" title="لا توجد مصاريف" /> : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-medium">{e.description || (e.type === 'MAINTENANCE' ? 'صيانة' : 'مصروف')}</p>
                <p className="text-sm text-gray-500">{new Date(e.dueDate).toLocaleDateString('ar-OM')}</p>
              </div>
              <span className="text-red-600 font-bold">{e.amount.toLocaleString()} ر.ع</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ icon, title }: { icon: string; title: string }) {
  return <div className="text-center py-16 text-gray-400"><span className="text-5xl block mb-4">{icon}</span><p className="text-lg">{title}</p></div>;
}
