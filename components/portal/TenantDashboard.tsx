'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Contract {
  id: string;
  data: string;
  propertyId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  contracts: Contract[];
  user: { id: string; name: string | null; email: string | null; phone: string | null; image: string | null } | null;
}

/** تحليل بيانات العقد من JSON */
function parseContractData(data: string) {
  try {
    const d = JSON.parse(data);
    return {
      unitName: d.unitName || d.propertyName || '—',
      ownerName: d.ownerName || d.landlordName || '—',
      rentAmount: d.rentAmount || d.monthlyRent || 0,
      contractStatus: d.contractStatus || d.status || '—',
      startDate: d.startDate || d.contractStart || '—',
      endDate: d.endDate || d.contractEnd || '—',
      deposit: d.deposit || 0,
    };
  } catch {
    return { unitName: '—', ownerName: '—', rentAmount: 0, contractStatus: '—', startDate: '—', endDate: '—', deposit: 0 };
  }
}

/** تبويبات البوابة */
const tabs = [
  { key: 'contracts', label: 'عقودي', icon: '📋' },
  { key: 'payments', label: 'مدفوعاتي', icon: '💳' },
  { key: 'maintenance', label: 'صيانة', icon: '🔧' },
  { key: 'documents', label: 'مستنداتي', icon: '📄' },
];

export default function TenantDashboard({ contracts, user }: Props) {
  const [activeTab, setActiveTab] = useState('contracts');

  // إحصائيات
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => {
    try { const d = JSON.parse(c.data); return d.contractStatus === 'Active' || d.status === 'Active'; } catch { return false; }
  }).length;
  const totalRent = contracts.reduce((sum, c) => {
    try { const d = JSON.parse(c.data); return sum + (d.rentAmount || d.monthlyRent || 0); } catch { return sum; }
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="إجمالي العقود" value={totalContracts} icon="📋" color="blue" />
        <StatCard title="عقود نشطة" value={activeContracts} icon="✅" color="green" />
        <StatCard title="الإيجار الشهري" value={`${totalRent.toLocaleString()} ر.ع`} icon="💰" color="red" />
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
          {activeTab === 'contracts' && <ContractsTab contracts={contracts} />}
          {activeTab === 'payments' && <PaymentsTab contracts={contracts} />}
          {activeTab === 'maintenance' && <MaintenanceTab />}
          {activeTab === 'documents' && <DocumentsTab contracts={contracts} />}
        </div>
      </div>
    </div>
  );
}

/** بطاقة إحصائية */
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
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

/** تبويب العقود */
function ContractsTab({ contracts }: { contracts: Contract[] }) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-5xl block mb-4">📋</span>
        <p className="text-lg">لا توجد عقود مسجلة</p>
        <p className="text-sm mt-2">سيتم عرض عقودك هنا عند تسجيلها</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map(contract => {
        const d = parseContractData(contract.data);
        const isActive = d.contractStatus === 'Active';
        return (
          <div key={contract.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{d.unitName}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isActive ? 'نشط' : d.contractStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500">المالك</p>
                    <p className="font-medium">{d.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">الإيجار الشهري</p>
                    <p className="font-medium text-[#C8102E]">{d.rentAmount.toLocaleString()} ر.ع</p>
                  </div>
                  <div>
                    <p className="text-gray-500">بداية العقد</p>
                    <p className="font-medium">{d.startDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">نهاية العقد</p>
                    <p className="font-medium">{d.endDate}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#a00d24] transition-colors">
                عرض العقد
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                تحميل PDF
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                طلب تجديد
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** تبويب المدفوعات */
function PaymentsTab({ contracts }: { contracts: Contract[] }) {
  const totalDue = contracts.reduce((sum, c) => {
    try { const d = JSON.parse(c.data); return sum + (d.rentAmount || d.monthlyRent || 0); } catch { return sum; }
  }, 0);

  return (
    <div>
      <div className="bg-gradient-to-l from-[#C8102E] to-[#a00d24] rounded-xl p-6 text-white mb-6">
        <h3 className="text-lg font-semibold">الإيجار الشهري المستحق</h3>
        <p className="text-3xl font-bold mt-2">{totalDue.toLocaleString()} <span className="text-lg">ر.ع</span></p>
        <p className="text-white/70 text-sm mt-1">تاريخ الاستحقاق: 1 من كل شهر</p>
        <button className="mt-4 px-6 py-3 bg-white text-[#C8102E] font-bold rounded-lg hover:bg-gray-100 transition-colors">
          💳 دفع الآن
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-gray-700">سجل المدفوعات</h4>
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
          <span className="text-4xl block mb-3">💳</span>
          <p>سيتم ربط بوابة الدفع قريباً</p>
          <p className="text-sm mt-1">سجل مدفوعاتك سيظهر هنا</p>
        </div>
      </div>
    </div>
  );
}

/** تبويب الصيانة */
function MaintenanceTab() {
  return (
    <div className="text-center py-12">
      <span className="text-5xl block mb-4">🔧</span>
      <h3 className="text-lg font-semibold text-gray-700">طلب صيانة</h3>
      <p className="text-gray-500 mt-2 mb-6">يمكنك تقديم طلب صيانة للعقار هنا</p>
      <form className="max-w-md mx-auto text-right space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع الصيانة</label>
          <select className="w-full border rounded-lg px-4 py-2">
            <option>كهرباء</option>
            <option>سباكة</option>
            <option>تكييف</option>
            <option>دهان</option>
            <option>أخرى</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف المشكلة</label>
          <textarea className="w-full border rounded-lg px-4 py-2 h-24" placeholder="اشرح المشكلة بالتفصيل..."></textarea>
        </div>
        <button type="submit" className="w-full px-6 py-3 bg-[#C8102E] text-white font-bold rounded-lg hover:bg-[#a00d24] transition-colors">
          إرسال الطلب
        </button>
      </form>
    </div>
  );
}

/** تبويب المستندات */
function DocumentsTab({ contracts }: { contracts: Contract[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-gray-700">مستنداتي</h4>
      {contracts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <span className="text-4xl block mb-3">📄</span>
          <p>لا توجد مستندات</p>
        </div>
      ) : (
        contracts.map(c => {
          const d = parseContractData(c.data);
          return (
            <div key={c.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium">عقد إيجار — {d.unitName}</p>
                  <p className="text-sm text-gray-500">تم التوقيع: {new Date(c.createdAt).toLocaleDateString('ar-OM')}</p>
                </div>
              </div>
              <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">تحميل</button>
            </div>
          );
        })
      )}
    </div>
  );
}
