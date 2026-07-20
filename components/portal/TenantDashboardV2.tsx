'use client';

import { useState } from 'react';
import SignatureModal from './SignatureModal';
import PaymentSelector from './PaymentSelector';

// أنواع البيانات
interface Contract { id: string; data: string; status: string | null; createdAt: Date; updatedAt: Date; }
interface Alert { id: string; type: string; title: string; message: string; priority: string; status: string; dueDate: Date | null; createdAt: Date; }
interface Task { id: string; type: string; title: string; description: string | null; status: string; dueDate: Date | null; createdAt: Date; }
interface DueAmount { id: string; type: string; amount: number; status: string; dueDate: Date; paidAmount: number; description: string | null; }
interface Score { id: string; category: string; score: number; level: string; notes: string | null; }
interface User { id: string; name: string | null; email: string | null; phone: string | null; image?: string | null; }

interface Props {
  user: User | null;
  contracts: Contract[];
  alerts: Alert[];
  tasks: Task[];
  dueAmounts: DueAmount[];
  scores: Score[];
}

/** تحليل بيانات العقد */
function parseContract(data: string) {
  try { const d = JSON.parse(data); return { unit: d.unitName || d.propertyName || '—', owner: d.ownerName || '—', rent: d.rentAmount || d.monthlyRent || 0, status: d.contractStatus || d.status || '—', start: d.startDate || d.contractStart || '—', end: d.endDate || d.contractEnd || '—', deposit: d.deposit || 0 }; }
  catch { return { unit: '—', owner: '—', rent: 0, status: '—', start: '—', end: '—', deposit: 0 }; }
}

/** مستوى التقييم — لون */
function scoreColor(level: string) {
  const map: Record<string, string> = { EXCELLENT: 'bg-green-500', GOOD: 'bg-green-400', AVERAGE: 'bg-yellow-400', POOR: 'bg-orange-400', CRITICAL: 'bg-red-500' };
  return map[level] || 'bg-gray-400';
}
function scoreLabel(level: string) {
  const map: Record<string, string> = { EXCELLENT: 'ممتاز', GOOD: 'جيد', AVERAGE: 'متوسط', POOR: 'ضعيف', CRITICAL: 'حرج' };
  return map[level] || level;
}

/** أيقونة التنبيه */
function alertIcon(type: string) {
  const map: Record<string, string> = { RENT_DUE: '💰', RENT_OVERDUE: '⚠️', BILL_DUE: '📄', BILL_OVERDUE: '🔴', CONTRACT_EXPIRE: '⏰', MAINTENANCE: '🔧', TASK_ASSIGNED: '📋', SYSTEM: '🔔' };
  return map[type] || '🔔';
}
function alertColor(priority: string) {
  const map: Record<string, string> = { CRITICAL: 'border-red-500 bg-red-50', HIGH: 'border-orange-400 bg-orange-50', MEDIUM: 'border-yellow-400 bg-yellow-50', LOW: 'border-blue-300 bg-blue-50' };
  return map[priority] || 'border-gray-300';
}

const tabs = [
  { key: 'overview', label: 'نظرة عامة', icon: '📊' },
  { key: 'contracts', label: 'عقودي', icon: '📋' },
  { key: 'payments', label: 'المبالغ المستحقة', icon: '💰' },
  { key: 'alerts', label: 'تنبيهات', icon: '🔔' },
  { key: 'tasks', label: 'مهامي', icon: '✅' },
  { key: 'calendar', label: 'تقويم', icon: '📅' },
  { key: 'score', label: 'تقييمي', icon: '⭐' },
];

export default function TenantDashboardV2({ user, contracts: initialContracts, alerts: initialAlerts, tasks: initialTasks, dueAmounts, scores }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  // حالة التوقيع الذكي
  const [sigOpen, setSigOpen] = useState(false);
  const [sigContractId, setSigContractId] = useState('');
  const [sigContractName, setSigContractName] = useState('');

  // حالة البيانات القابلة للتحديث
  const [tasks, setTasks] = useState(initialTasks);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [contracts] = useState(initialContracts);

  // حالة محدد بوابة الدفع
  const [paySelectorOpen, setPaySelectorOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDesc, setPayDesc] = useState('');
  const [payDueId, setPayDueId] = useState<string | undefined>(undefined);

  // ملخص
  const totalDue = dueAmounts.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const overdueCount = dueAmounts.filter(d => d.status === 'OVERDUE').length;
  const unreadAlerts = alerts.filter(a => a.status === 'UNREAD').length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  const overall = scores.find(s => s.category === 'OVERALL');
  const rentScore = scores.find(s => s.category === 'RENT_PAYMENT');
  const billScore = scores.find(s => s.category === 'BILL_PAYMENT');
  const maintScore = scores.find(s => s.category === 'MAINTENANCE');

  /** فتح نموذج التوقيع الذكي */
  const openSignature = (contractId: string, contractName: string) => {
    setSigContractId(contractId);
    setSigContractName(contractName);
    setSigOpen(true);
  };

  /** فتح محدد بوابة الدفع */
  const openPaymentSelector = (dueId: string, amount: number, description: string) => {
    setPayDueId(dueId);
    setPayAmount(amount);
    setPayDesc(description);
    setPaySelectorOpen(true);
  };

  /** تبديل حالة المهمة */
  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await fetch('/api/portal/task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (e) {
      console.error('Task update failed:', e);
    }
  };

  /** تجاهل التنبيه */
  const handleAlertDismiss = async (alertId: string) => {
    try {
      const res = await fetch('/api/portal/alert', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'DISMISSED' }),
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (e) {
      console.error('Alert dismiss failed:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1A1A2E] via-[#2d2d44] to-[#1A1A2E] text-white px-6 py-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              🚪 بوابة المستأجر
              {overall && (
                <span className={`text-sm px-3 py-1 rounded-full text-white ${scoreColor(overall.level)}`}>
                  {scoreLabel(overall.level)} ({overall.score}/100)
                </span>
              )}
            </h1>
            <p className="text-white/60 text-sm mt-1">{user?.name} — {user?.email}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {unreadAlerts > 0 && <span className="bg-red-500 text-white px-3 py-1 rounded-full animate-pulse">🔔 {unreadAlerts} تنبيه</span>}
            {totalDue > 0 && <span className="bg-[#C8102E] text-white px-3 py-1 rounded-full">💰 {totalDue.toLocaleString()} ر.ع مستحق</span>}
          </div>
        </div>
      </header>

      {/* التبويبات */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-[#C8102E] text-[#C8102E] bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'alerts' && unreadAlerts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadAlerts}</span>}
              {tab.key === 'tasks' && pendingTasks > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTasks}</span>}
              {tab.key === 'payments' && dueAmounts.length > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{dueAmounts.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* المحتوى */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab contracts={contracts} alerts={alerts} tasks={tasks} dueAmounts={dueAmounts} totalDue={totalDue} overdueCount={overdueCount} unreadAlerts={unreadAlerts} pendingTasks={pendingTasks} overall={overall} />}
        {activeTab === 'contracts' && <ContractsTab contracts={contracts} onSign={openSignature} />}
        {activeTab === 'payments' && <PaymentsTab dueAmounts={dueAmounts} totalDue={totalDue} onPay={openPaymentSelector} />}
        {activeTab === 'alerts' && <AlertsTab alerts={alerts} onDismiss={handleAlertDismiss} />}
        {activeTab === 'tasks' && <TasksTab tasks={tasks} onToggle={handleTaskToggle} />}
        {activeTab === 'calendar' && <CalendarTab dueAmounts={dueAmounts} contracts={contracts} />}
        {activeTab === 'score' && <ScoreTab overall={overall} rentScore={rentScore} billScore={billScore} maintScore={maintScore} />}
      </div>

      {/* نموذج التوقيع الذكي */}
      <SignatureModal
        isOpen={sigOpen}
        onClose={() => setSigOpen(false)}
        contractId={sigContractId}
        contractName={sigContractName}
      />

      <PaymentSelector
        isOpen={paySelectorOpen}
        onClose={() => setPaySelectorOpen(false)}
        amount={payAmount}
        description={payDesc}
        dueId={payDueId}
      />
    </div>
  );
}

// ========== نظرة عامة ==========
function OverviewTab({ contracts, totalDue, overdueCount, unreadAlerts, pendingTasks, overall }: any) {
  return (
    <div className="space-y-6">
      {/* بطاقات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickCard icon="📋" title="عقودي" value={contracts.length} color="blue" />
        <QuickCard icon="💰" title="مستحق" value={`${totalDue.toLocaleString()} ر.ع`} color="red" />
        <QuickCard icon="🔔" title="تنبيهات" value={unreadAlerts} subtitle="غير مقروء" color="orange" />
        <QuickCard icon="✅" title="مهام" value={pendingTasks} subtitle="معلقة" color="green" />
      </div>

      {overall && (
        <div className={`rounded-xl p-6 text-white ${scoreColor(overall.level)}`}>
          <h3 className="text-lg font-bold flex items-center gap-2">⭐ تقييمي العام: {scoreLabel(overall.level)} ({overall.score}/100)</h3>
          <p className="mt-2 text-white/90">{overall.notes}</p>
        </div>
      )}

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-red-700">لديك {overdueCount} مبالغ متأخرة!</p>
            <p className="text-red-600 text-sm">الرجاء تسديدها في أقرب وقت لتجنب الغرامات.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickCard({ icon, title, value, subtitle, color }: any) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 border-blue-200 text-blue-700', red: 'bg-red-50 border-red-200 text-red-700', orange: 'bg-orange-50 border-orange-200 text-orange-700', green: 'bg-green-50 border-green-200 text-green-700' };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-sm opacity-80"><span>{icon}</span><span>{title}</span></div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
    </div>
  );
}

// ========== عقودي ==========
function ContractsTab({ contracts, onSign }: { contracts: Contract[]; onSign: (id: string, name: string) => void }) {
  if (contracts.length === 0) return <EmptyState icon="📋" title="لا توجد عقود" desc="سيتم عرض عقودك هنا" />;
  return (
    <div className="space-y-3">
      {contracts.map(c => {
        const d = parseContract(c.data);
        const isActive = d.status === 'Active';
        return (
          <div key={c.id} className="border rounded-xl p-5 hover:shadow-md transition-all bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{d.unit}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isActive ? 'نشط' : d.status}</span>
              </div>
              <span className="text-[#C8102E] font-bold">{d.rent.toLocaleString()} ر.ع/شهر</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm text-gray-600">
              <div><p className="text-gray-400">المالك</p><p className="font-medium text-gray-800">{d.owner}</p></div>
              <div><p className="text-gray-400">البداية</p><p className="font-medium">{d.start}</p></div>
              <div><p className="text-gray-400">النهاية</p><p className="font-medium">{d.end}</p></div>
              <div><p className="text-gray-400">التأمين</p><p className="font-medium">{d.deposit.toLocaleString()} ر.ع</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => onSign(c.id, d.unit)} className="px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#a00d24] transition-colors">🔏 توقيع ذكي</button>
              <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors">📄 تحميل</button>
              <button className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors">🔄 تجديد</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== المبالغ المستحقة ==========
function PaymentsTab({ dueAmounts, totalDue, onPay }: { dueAmounts: DueAmount[]; totalDue: number; onPay: (dueId: string, amount: number, desc: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-[#C8102E] to-[#a00d24] rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold">إجمالي المبالغ المستحقة</h3>
        <p className="text-4xl font-bold mt-2">{totalDue.toLocaleString()} <span className="text-xl">ر.ع</span></p>
        {totalDue > 0 && (
          <button
            type="button"
            onClick={() => onPay('ALL', totalDue, 'إجمالي المبالغ المستحقة')}
            className="mt-4 px-6 py-3 bg-white text-[#C8102E] font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            اختر طريقة الدفع
          </button>
        )}
      </div>

      {dueAmounts.length === 0 ? <EmptyState icon="💰" title="لا توجد مبالغ مستحقة" desc="جميع مدفوعاتك محدثة ✅" /> : (
        <div className="space-y-2">
          {dueAmounts.map(d => (
            <div key={d.id} className={`border-l-4 rounded-lg p-4 flex items-center justify-between ${d.status === 'OVERDUE' ? 'border-l-red-500 bg-red-50' : 'border-l-yellow-400 bg-yellow-50'}`}>
              <div>
                <p className="font-bold">{d.description || (d.type === 'RENT' ? 'إيجار' : d.type === 'BILL' ? 'فاتورة' : 'مبلغ')} — <span className="text-[#C8102E]">{(d.amount - d.paidAmount).toLocaleString()} ر.ع</span></p>
                <p className="text-sm text-gray-500">مستحق: {new Date(d.dueDate).toLocaleDateString('ar-OM')}</p>
                {d.status === 'OVERDUE' && <p className="text-sm text-red-600 font-semibold">⚠️ متأخر!</p>}
              </div>
              <button
                type="button"
                onClick={() => onPay(d.id, d.amount - d.paidAmount, d.description || `دفع ${d.type}`)}
                className="px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#a00d24] transition-colors"
              >
                دفع
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== تنبيهات ==========
function AlertsTab({ alerts, onDismiss }: { alerts: Alert[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) return <EmptyState icon="🔔" title="لا توجد تنبيهات" desc="ستظهر التنبيهات هنا" />;
  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <div key={a.id} className={`border rounded-lg p-4 ${alertColor(a.priority)}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{alertIcon(a.type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold">{a.title}</h4>
                {a.status === 'UNREAD' && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">جديد</span>}
              </div>
              <p className="text-sm text-gray-600 mt-1">{a.message}</p>
              {a.dueDate && <p className="text-sm text-gray-400 mt-1">📅 {new Date(a.dueDate).toLocaleDateString('ar-OM')}</p>}
            </div>
            <button
              onClick={() => onDismiss(a.id)}
              className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
              title="تجاهل"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== مهامي ==========
function TasksTab({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: string, status: string) => void }) {
  if (tasks.length === 0) return <EmptyState icon="✅" title="لا توجد مهام" desc="ستظهر مهامك هنا" />;
  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <div key={t.id} className="border rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
          <button
            onClick={() => onToggle(t.id, t.status)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${t.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}
          >
            {t.status === 'COMPLETED' && <span className="text-white text-xs">✓</span>}
          </button>
          <div className="flex-1">
            <p className={`font-medium ${t.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
            {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
          </div>
          {t.dueDate && <span className="text-sm text-gray-400">{new Date(t.dueDate).toLocaleDateString('ar-OM')}</span>}
          <span className={`px-2 py-1 rounded text-xs ${t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {t.status === 'PENDING' ? 'معلقة' : t.status === 'COMPLETED' ? 'مكتملة' : 'قيد التنفيذ'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ========== تقويم ==========
function CalendarTab({ dueAmounts, contracts }: { dueAmounts: DueAmount[]; contracts: Contract[] }) {
  // جمع كل الأحداث
  const events = [
    ...dueAmounts.map(d => ({ date: d.dueDate, title: d.type === 'RENT' ? '💰 إيجار مستحق' : d.type === 'BILL' ? '📄 فاتورة' : '💳 مبلغ مستحق', amount: d.amount, status: d.status })),
    ...contracts.map(c => {
      try { const d = JSON.parse(c.data); return { date: new Date(d.endDate || d.contractEnd || Date.now()), title: '⏰ انتهاء عقد', amount: 0, status: 'PENDING' }; } catch { return null; }
    }).filter(Boolean),
  ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (events.length === 0) return <EmptyState icon="📅" title="لا توجد أحداث" desc="ستظهر مواعيد الاستحقاق وانتهاء العقود هنا" />;

  // تجميع حسب الشهر
  const byMonth: Record<string, any[]> = {};
  events.forEach((e: any) => {
    const key = new Date(e.date).toLocaleDateString('ar-OM', { year: 'numeric', month: 'long' });
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  });

  return (
    <div className="space-y-6">
      {Object.entries(byMonth).map(([month, monthEvents]) => (
        <div key={month}>
          <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">{month}</h3>
          <div className="space-y-2">
            {(monthEvents as any[]).map((e, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                <div className="text-center min-w-[60px]">
                  <p className="text-2xl font-bold text-[#C8102E]">{new Date(e.date).getDate()}</p>
                  <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString('ar-OM', { weekday: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{e.title}</p>
                  {e.amount > 0 && <p className="text-sm text-[#C8102E]">{e.amount.toLocaleString()} ر.ع</p>}
                </div>
                {e.status === 'OVERDUE' && <span className="text-red-500 text-sm font-semibold">متأخر</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== تقييمي ==========
function ScoreTab({ overall, rentScore, billScore, maintScore }: any) {
  return (
    <div className="space-y-6">
      {overall && (
        <div className={`rounded-xl p-8 text-white text-center ${scoreColor(overall.level)}`}>
          <p className="text-lg opacity-90">التقييم العام</p>
          <p className="text-6xl font-bold my-3">{overall.score}<span className="text-2xl">/100</span></p>
          <p className="text-xl font-semibold">{scoreLabel(overall.level)}</p>
          <p className="mt-3 opacity-90">{overall.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard title="💰 دفع الإيجار" score={rentScore} />
        <ScoreCard title="📄 دفع الفواتير" score={billScore} />
        <ScoreCard title="🔧 طلبات الصيانة" score={maintScore} />
      </div>
    </div>
  );
}

function ScoreCard({ title, score }: { title: string; score: Score | null }) {
  if (!score) return <div className="border rounded-xl p-5 text-center text-gray-400"><p>{title}</p><p className="text-2xl mt-2">—</p></div>;
  return (
    <div className="border rounded-xl p-5">
      <p className="text-gray-600 text-sm">{title}</p>
      <div className="flex items-center gap-3 mt-2">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${scoreColor(score.level)}`}>
          {score.score}
        </div>
        <div>
          <p className="font-bold">{scoreLabel(score.level)}</p>
          <p className="text-xs text-gray-500">{score.notes}</p>
        </div>
      </div>
      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${scoreColor(score.level)}`} style={{ width: `${score.score}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return <div className="text-center py-16 text-gray-400"><span className="text-5xl block mb-4">{icon}</span><p className="text-lg">{title}</p><p className="text-sm mt-2">{desc}</p></div>;
}
