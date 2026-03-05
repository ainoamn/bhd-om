'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Plan = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  features?: string[];
  limits?: Record<string, number>;
  isActive?: boolean;
  sortOrder?: number;
};
type SubItem = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startAt: string;
  endAt: string;
  usage: Record<string, number>;
  user: { id: string; name: string; email: string; serialNumber: string; role: string };
  plan: Plan;
  pendingChangeRequests: number;
};
type ChangeReq = {
  id: string;
  userId: string;
  requestedPlanId: string;
  direction: string;
  status: string;
  reason: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; serialNumber: string } | null;
  requestedPlan: { id: string; code: string; nameAr: string; nameEn: string } | null;
};

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<SubItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeReq[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; serialNumber: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [initPlansLoading, setInitPlansLoading] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  const handleInitPlans = async () => {
    setInitPlansLoading(true);
    try {
      const res = await fetch('/api/plans/init', { method: 'POST' });
      const d = await res.json();
      if (res.ok && d.ok) {
        alert(ar ? `تم إنشاء ${d.created} باقة افتراضية. حدّث الصفحة.` : `${d.created} default plans created. Refresh.`);
        await load();
      } else {
        alert(d.error || d.message || (ar ? 'فشل تهيئة الباقات' : 'Init failed'));
      }
    } catch (e) {
      console.error(e);
      alert(ar ? 'حدث خطأ' : 'Error');
    } finally {
      setInitPlansLoading(false);
    }
  };

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [subRes, reqRes, adminPlansRes, usersRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/subscriptions/change-requests'),
        fetch('/api/admin/plans'),
        fetch('/api/admin/users'),
      ]);
      if (subRes.ok) {
        const d = await subRes.json();
        setSubscriptions(Array.isArray(d.list) ? d.list : []);
      }
      if (reqRes.ok) {
        const d = await reqRes.json();
        setChangeRequests(Array.isArray(d.list) ? d.list : []);
      }
      if (adminPlansRes.ok) {
        const d = await adminPlansRes.json();
        setPlans(Array.isArray(d.list) ? d.list : []);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(Array.isArray(u) ? u : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openEditPlanModal = (plan: Plan) => {
    setEditingPlan({
      ...plan,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      limits: plan.limits ? { ...plan.limits } : { maxProperties: 0, maxUnits: 0, maxBookings: 0, maxUsers: 0, storageGB: 0 },
    });
    setShowEditPlanModal(true);
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: editingPlan.nameAr,
          nameEn: editingPlan.nameEn,
          priceMonthly: editingPlan.priceMonthly,
          priceYearly: editingPlan.priceYearly ?? null,
          featuresJson: JSON.stringify(editingPlan.features || []),
          limitsJson: JSON.stringify(editingPlan.limits || {}),
        }),
      });
      if (res.ok) {
        setShowEditPlanModal(false);
        setEditingPlan(null);
        await load();
        alert(ar ? 'تم حفظ الباقة بنجاح' : 'Plan saved');
      } else {
        const d = await res.json();
        alert(d.error || (ar ? 'فشل الحفظ' : 'Save failed'));
      }
    } catch (e) {
      console.error(e);
      alert(ar ? 'حدث خطأ' : 'Error');
    } finally {
      setSavingPlan(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const handleAssign = async () => {
    if (!assignUserId || !assignPlanId) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assignUserId, planId: assignPlanId, durationMonths: 12 }),
      });
      if (res.ok) {
        setAssignUserId('');
        setAssignPlanId('');
        load();
      } else {
        const d = await res.json();
        alert(d.error || (ar ? 'فشل التعيين' : 'Assign failed'));
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/subscriptions/change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) load();
      else {
        const d = await res.json();
        alert(d.error || (ar ? 'فشل الإجراء' : 'Action failed'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-card p-6">
        <p className="text-gray-600">{ar ? 'غير مصرح لك بعرض هذه الصفحة.' : 'You are not authorized to view this page.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={ar ? 'الاشتراكات والباقات' : 'Subscriptions & Plans'}
        subtitle={ar ? 'متابعة الاشتراكات، تواريخ الاشتراك، نوع الباقة، الترقية والسجل' : 'Track subscriptions, dates, plan type, upgrades and history'}
      />

      {loading ? (
        <div className="admin-card p-8 text-center text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <>
          {/* تهيئة الباقات عند عدم وجود أي باقة */}
          {plans.length === 0 && (
            <div className="admin-card border-2 border-amber-200 bg-amber-50/50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{ar ? 'لا توجد باقات في النظام' : 'No plans in system'}</h2>
              <p className="text-gray-700 mb-4">
                {ar
                  ? 'لم تُضف أي باقة بعد. اضغط أدناه لإنشاء الباقات الافتراضية (أساسية، معيارية، مميزة، مؤسسية) ثم حدّث الصفحة لرؤية قائمة الباقات وتعيينها للمستخدمين.'
                  : 'No plans have been added. Click below to create the default plans (Basic, Standard, Premium, Enterprise), then refresh to see and assign them.'}
              </p>
              <button
                type="button"
                onClick={handleInitPlans}
                disabled={initPlansLoading}
                className="admin-btn-primary bg-amber-600 hover:bg-amber-700"
              >
                {initPlansLoading ? (ar ? 'جاري الإنشاء...' : 'Creating...') : (ar ? 'تهيئة الباقات الافتراضية' : 'Initialize default plans')}
              </button>
            </div>
          )}

          {/* تفاصيل الباقات — تحكم كامل كما في الموقع القديم */}
          {plans.length > 0 && (
            <div className="admin-card overflow-hidden">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {ar ? 'تفاصيل الباقات — تعديل الأسعار والحدود والميزات' : 'Plan details — edit prices, limits & features'}
                </h2>
              </div>
              <div className="admin-card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                      <div className="bg-primary/90 p-4 text-white">
                        <div className="text-lg font-bold">{ar ? plan.nameAr : plan.nameEn}</div>
                        <div className="text-2xl font-bold mt-1">{plan.priceMonthly} {plan.currency}</div>
                        <div className="text-sm opacity-90">{plan.priceYearly != null ? `${plan.priceYearly} سنوياً` : ''}</div>
                        {plan.isActive === false && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500 rounded text-xs">{ar ? 'معطّلة' : 'Inactive'}</span>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-xs font-bold text-gray-500">{ar ? 'الحدود:' : 'Limits:'}</div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div className="flex justify-between"><span>{ar ? 'عقارات' : 'Properties'}</span><span className="font-medium">{plan.limits?.maxProperties ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'وحدات' : 'Units'}</span><span className="font-medium">{plan.limits?.maxUnits ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'حجوزات' : 'Bookings'}</span><span className="font-medium">{plan.limits?.maxBookings ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'مستخدمون' : 'Users'}</span><span className="font-medium">{plan.limits?.maxUsers ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'تخزين (GB)' : 'Storage GB'}</span><span className="font-medium">{plan.limits?.storageGB ?? '—'}</span></div>
                        </div>
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          {(plan.features || []).length} {ar ? 'ميزة' : 'features'}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditPlanModal(plan)}
                          className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 text-sm"
                        >
                          {ar ? 'تعديل الباقة' : 'Edit plan'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* تعيين باقة لمستخدم */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{ar ? 'تعيين باقة لمستخدم' : 'Assign plan to user'}</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{ar ? 'المستخدم' : 'User'}</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="admin-select min-w-[200px]"
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.serialNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{ar ? 'الباقة' : 'Plan'}</label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  className="admin-select min-w-[180px]"
                >
                  <option value="">—</option>
                  {plans.filter((p) => p.isActive !== false).map((p) => (
                    <option key={p.id} value={p.id}>{ar ? p.nameAr : p.nameEn} — {p.priceMonthly} {p.currency}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!assignUserId || !assignPlanId || assigning}
                className="admin-btn-primary"
              >
                {assigning ? (ar ? 'جاري...' : '...') : ar ? 'تعيين' : 'Assign'}
              </button>
            </div>
          </div>

          {/* طلبات الترقية/التنزيل */}
          {changeRequests.length > 0 && (
            <div className="admin-card overflow-hidden">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{ar ? 'طلبات الترقية / تنزيل الباقة' : 'Upgrade / Downgrade requests'}</h2>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{ar ? 'المستخدم' : 'User'}</th>
                      <th>{ar ? 'النوع' : 'Type'}</th>
                      <th>{ar ? 'الباقة المطلوبة' : 'Requested plan'}</th>
                      <th>{ar ? 'التاريخ' : 'Date'}</th>
                      <th>{ar ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeRequests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.user ? (
                            <span>{r.user.name} <span className="text-gray-500">({r.user.serialNumber})</span></span>
                          ) : r.userId}
                        </td>
                        <td>
                          <span className={`admin-badge ${r.direction === 'upgrade' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {r.direction === 'upgrade' ? (ar ? 'ترقية' : 'Upgrade') : (ar ? 'تنزيل' : 'Downgrade')}
                          </span>
                        </td>
                        <td>{r.requestedPlan ? (ar ? r.requestedPlan.nameAr : r.requestedPlan.nameEn) : r.requestedPlanId}</td>
                        <td className="text-sm text-gray-600">{new Date(r.createdAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestAction(r.id, 'approve')}
                              className="text-sm text-emerald-600 hover:underline"
                            >
                              {ar ? 'اعتماد' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestAction(r.id, 'reject')}
                              className="text-sm text-red-600 hover:underline"
                            >
                              {ar ? 'رفض' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* قائمة الاشتراكات */}
          <div className="admin-card overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{ar ? 'سجل الاشتراكات' : 'Subscriptions list'}</h2>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{ar ? 'المستخدم' : 'User'}</th>
                    <th>{ar ? 'الباقة' : 'Plan'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                    <th>{ar ? 'بداية' : 'Start'}</th>
                    <th>{ar ? 'نهاية' : 'End'}</th>
                    <th>{ar ? 'طلبات معلقة' : 'Pending requests'}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-8">
                        {ar ? 'لا توجد اشتراكات مسجلة.' : 'No subscriptions yet.'}
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div>
                            <div className="font-medium">{s.user.name}</div>
                            <div className="text-xs text-gray-500">{s.user.email} — {s.user.serialNumber}</div>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium">{ar ? s.plan.nameAr : s.plan.nameEn}</span>
                          <span className="text-gray-500 text-sm"> — {s.plan.priceMonthly} {s.plan.currency}</span>
                        </td>
                        <td>
                          <span className={`admin-badge ${s.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="text-sm">{new Date(s.startAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                        <td className="text-sm">{new Date(s.endAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                        <td>{s.pendingChangeRequests > 0 ? <span className="text-amber-600 font-medium">{s.pendingChangeRequests}</span> : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: تعديل الباقة */}
          {showEditPlanModal && editingPlan && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !savingPlan && setShowEditPlanModal(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="bg-primary p-4 text-white flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-xl font-bold">{ar ? 'تعديل الباقة:' : 'Edit plan:'} {editingPlan.nameAr}</h3>
                  <button type="button" onClick={() => !savingPlan && setShowEditPlanModal(false)} className="p-2 hover:bg-white/20 rounded-lg">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{ar ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                      <input
                        type="text"
                        value={editingPlan.nameAr}
                        onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })}
                        className="admin-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{ar ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                      <input
                        type="text"
                        value={editingPlan.nameEn}
                        onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })}
                        className="admin-input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{ar ? 'السعر الشهري' : 'Price monthly'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPlan.priceMonthly}
                        onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                        className="admin-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{ar ? 'السعر السنوي (اختياري)' : 'Price yearly (optional)'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPlan.priceYearly ?? ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="admin-input w-full"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'الحدود (أرقام، -1 = غير محدود)' : 'Limits (-1 = unlimited)'}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(['maxProperties', 'maxUnits', 'maxBookings', 'maxUsers', 'storageGB'] as const).map((key) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-0.5">{key}</label>
                          <input
                            type="number"
                            value={editingPlan.limits?.[key] ?? ''}
                            onChange={(e) => setEditingPlan({
                              ...editingPlan,
                              limits: { ...(editingPlan.limits || {}), [key]: e.target.value === '' ? 0 : Number(e.target.value) },
                            })}
                            className="admin-input w-full text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'الميزات (سطر لكل ميزة)' : 'Features (one per line)'}</label>
                    <textarea
                      rows={6}
                      value={(editingPlan.features || []).join('\n')}
                      onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })}
                      className="admin-input w-full font-mono text-sm"
                      placeholder={ar ? 'حتى 5 عقارات\nحتى 20 وحدة\n...' : 'Up to 5 properties\n...'}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                  <button type="button" onClick={() => !savingPlan && setShowEditPlanModal(false)} className="admin-btn-secondary">
                    {ar ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="button" onClick={savePlan} disabled={savingPlan} className="admin-btn-primary">
                    {savingPlan ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ الباقة' : 'Save plan')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
