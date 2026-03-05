'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type Plan = { id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; currency: string };
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

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [subRes, reqRes, plansRes, usersRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/subscriptions/change-requests'),
        fetch('/api/plans'),
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
      if (plansRes.ok) {
        const d = await plansRes.json();
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
                  {plans.map((p) => (
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
        </>
      )}
    </div>
  );
}
