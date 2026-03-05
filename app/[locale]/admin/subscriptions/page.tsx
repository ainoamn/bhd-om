'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import { FEATURE_PERMISSIONS, PLAN_COLORS } from '@/lib/featurePermissions';

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
  permissions?: string[];
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

const allFeatureIds = Object.keys(FEATURE_PERMISSIONS);

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<SubItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeReq[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; serialNumber: string }>>([]);
  const [plansConfig, setPlansConfig] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [initPlansLoading, setInitPlansLoading] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

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
        const list = Array.isArray(d.list) ? d.list : [];
        setPlans(list);
        const config: Record<string, string[]> = {};
        list.forEach((p: Plan) => { config[p.id] = Array.isArray(p.permissions) ? [...p.permissions] : []; });
        setPlansConfig(config);
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

  useEffect(() => { load(); }, [isAdmin]);

  const handleInitPlans = async () => {
    setInitPlansLoading(true);
    try {
      const res = await fetch('/api/plans/init', { method: 'POST' });
      const d = await res.json();
      if (res.ok && d.ok) {
        alert(ar ? `تم إنشاء ${d.created} باقة. حدّث الصفحة.` : `${d.created} plans created.`);
        await load();
      } else alert(d.error || (ar ? 'فشل' : 'Failed'));
    } catch (e) { console.error(e); alert(ar ? 'خطأ' : 'Error'); }
    finally { setInitPlansLoading(false); }
  };

  const toggleFeature = (planId: string, featureId: string) => {
    setPlansConfig((prev) => {
      const arr = prev[planId] || [];
      const has = arr.includes(featureId);
      return { ...prev, [planId]: has ? arr.filter((f) => f !== featureId) : [...arr, featureId] };
    });
  };
  const hasFeature = (planId: string, featureId: string) => (plansConfig[planId] || []).includes(featureId);
  const toggleAllFeatures = (planId: string) => {
    const current = plansConfig[planId] || [];
    const allSelected = current.length === allFeatureIds.length;
    setPlansConfig((prev) => ({ ...prev, [planId]: allSelected ? [] : [...allFeatureIds] }));
  };
  const areAllFeaturesSelected = (planId: string) => (plansConfig[planId] || []).length === allFeatureIds.length;

  const saveAllPermissions = async () => {
    setSavingPermissions(true);
    try {
      for (const plan of plans) {
        const perms = plansConfig[plan.id] || [];
        await fetch(`/api/plans/${plan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissionsJson: JSON.stringify(perms) }),
        });
      }
      alert(ar ? 'تم حفظ الصلاحيات' : 'Permissions saved');
      await load();
    } catch (e) { console.error(e); alert(ar ? 'فشل الحفظ' : 'Save failed'); }
    finally { setSavingPermissions(false); }
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
        alert(ar ? 'تم حفظ الباقة' : 'Plan saved');
      } else {
        const d = await res.json();
        alert(d.error || (ar ? 'فشل الحفظ' : 'Save failed'));
      }
    } catch (e) { console.error(e); alert(ar ? 'خطأ' : 'Error'); }
    finally { setSavingPlan(false); }
  };

  const assignPlanToUser = async (userId: string, planId: string) => {
    setAssigning(userId);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId, durationMonths: 12 }),
      });
      if (res.ok) await load();
      else { const d = await res.json(); alert(d.error || (ar ? 'فشل التعيين' : 'Assign failed')); }
    } catch (e) { console.error(e); }
    finally { setAssigning(null); }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/subscriptions/change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) load();
      else { const d = await res.json(); alert(d.error); }
    } catch (e) { console.error(e); }
  };

  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
  const getUserPlanId = (userId: string) => subscriptions.find((s) => s.userId === userId)?.planId;

  if (!isAdmin) {
    return (
      <div className="admin-card p-6">
        <p className="text-gray-600">{ar ? 'غير مصرح لك.' : 'Not authorized.'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={ar ? 'rtl' : 'ltr'}>
      <div className="max-w-[1800px] mx-auto px-4">
        {/* Header — مثل الموقع القديم */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{ar ? 'إدارة الاشتراكات والصلاحيات' : 'Subscriptions & Permissions'}</h1>
              <p className="text-white/90">{ar ? 'التحكم في الباقات، الميزات، والصلاحيات' : 'Manage plans, features and permissions'}</p>
            </div>
            <button
              type="button"
              onClick={saveAllPermissions}
              disabled={savingPermissions || plans.length === 0}
              className="bg-white text-green-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Icon name="check" className="w-5 h-5" />
              {savingPermissions ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ جميع التغييرات' : 'Save all changes')}
            </button>
          </div>
        </div>

        {/* تهيئة الباقات عند عدم وجود أي باقة */}
        {plans.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{ar ? 'لا توجد باقات' : 'No plans'}</h2>
            <p className="text-gray-700 mb-4">{ar ? 'اضغط لإنشاء الباقات الافتراضية (أساسية، معيارية، مميزة، مؤسسية).' : 'Click to create default plans.'}</p>
            <button type="button" onClick={handleInitPlans} disabled={initPlansLoading} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700">
              {initPlansLoading ? (ar ? 'جاري...' : '...') : (ar ? 'تهيئة الباقات الافتراضية' : 'Initialize default plans')}
            </button>
          </div>
        )}

        {/* إحصائيات — 4 بطاقات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'الباقات' : 'Plans'}</div>
              <div className="text-2xl font-bold text-gray-900">{plans.length}</div>
            </div>
            <Icon name="folder" className="w-8 h-8 text-blue-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'المستخدمون' : 'Users'}</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <Icon name="users" className="w-8 h-8 text-green-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'الصلاحيات' : 'Permissions'}</div>
              <div className="text-2xl font-bold text-gray-900">{allFeatureIds.length}</div>
            </div>
            <Icon name="lock" className="w-8 h-8 text-purple-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'اشتراكات نشطة' : 'Active'}</div>
              <div className="text-2xl font-bold text-gray-900">{activeSubsCount}</div>
            </div>
            <Icon name="checkCircle" className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* تفاصيل الباقات — رأس غامق + بطاقات */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="folder" className="w-6 h-6" />
                {ar ? 'تفاصيل الباقات' : 'Plan details'}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                  <div key={plan.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-green-300 transition-all">
                    <div className={`${PLAN_COLORS[plan.code] || 'bg-gray-500'} p-4 text-white`}>
                      <div className="text-xl font-bold mb-1">{ar ? plan.nameAr : plan.nameEn}</div>
                      <div className="text-3xl font-extrabold">{plan.priceMonthly} {plan.currency}</div>
                      <div className="text-sm opacity-90">{ar ? 'شهرياً' : 'Monthly'}</div>
                      {plan.isActive === false && <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500 rounded text-xs">{ar ? 'معطّلة' : 'Inactive'}</span>}
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2">{ar ? 'الحدود:' : 'Limits:'}</div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div className="flex justify-between"><span>{ar ? 'عقارات' : 'Properties'}</span><span className="font-medium">{plan.limits?.maxProperties ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'وحدات' : 'Units'}</span><span className="font-medium">{plan.limits?.maxUnits ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'حجوزات' : 'Bookings'}</span><span className="font-medium">{plan.limits?.maxBookings ?? '—'}</span></div>
                          <div className="flex justify-between"><span>{ar ? 'مستخدمون' : 'Users'}</span><span className="font-medium">{plan.limits?.maxUsers ?? '—'}</span></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2">{ar ? 'الميزات' : 'Features'}: ({(plan.features || []).length})</div>
                        <div className="space-y-1 max-h-24 overflow-y-auto text-xs text-gray-600">
                          {(plan.features || []).slice(0, 4).map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-green-600">✓</span>
                              <span className="line-clamp-1">{f}</span>
                            </div>
                          ))}
                          {(plan.features || []).length > 4 && <div className="text-gray-500">+{(plan.features || []).length - 4}</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500">{ar ? 'الصلاحيات' : 'Permissions'}: {(plansConfig[plan.id] || []).length} / {allFeatureIds.length}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                        <button type="button" onClick={() => openEditPlanModal(plan)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-bold flex items-center justify-center gap-1">
                          <Icon name="pencil" className="w-3 h-3" />
                          {ar ? 'تعديل' : 'Edit'}
                        </button>
                        <button type="button" onClick={() => openEditPlanModal(plan)} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-bold flex items-center justify-center gap-1">
                          <Icon name="folder" className="w-3 h-3" />
                          {ar ? 'الميزات' : 'Features'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* مصفوفة الصلاحيات — صلاحيات كل باقة */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="lock" className="w-6 h-6" />
                {ar ? 'مصفوفة الصلاحيات' : 'Permissions matrix'} ({allFeatureIds.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 sticky right-0 bg-gray-50 z-10">{ar ? 'الصلاحية' : 'Permission'}</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center min-w-[140px]">
                        <div className={`inline-block px-3 py-1 rounded-lg text-white font-bold text-sm ${PLAN_COLORS[plan.code] || 'bg-gray-500'}`}>
                          {ar ? plan.nameAr : plan.nameEn}
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => toggleAllFeatures(plan.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${areAllFeaturesSelected(plan.id) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            {areAllFeaturesSelected(plan.id) ? (ar ? 'إلغاء الكل' : 'Deselect all') : (ar ? 'تحديد الكل' : 'Select all')}
                          </button>
                          <div className="text-xs text-gray-600 mt-1">{(plansConfig[plan.id] || []).length}/{allFeatureIds.length}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allFeatureIds.map((fid) => {
                    const f = FEATURE_PERMISSIONS[fid];
                    if (!f) return null;
                    return (
                      <tr key={fid} className="hover:bg-gray-50">
                        <td className="px-6 py-3 sticky right-0 bg-white z-10">
                          <div className="text-sm font-medium text-gray-900">{f.nameAr}</div>
                          {f.descriptionAr && <div className="text-xs text-gray-500">{f.descriptionAr}</div>}
                        </td>
                        {plans.map((plan) => (
                          <td key={plan.id} className="px-6 py-3 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasFeature(plan.id, fid)}
                                onChange={() => toggleFeature(plan.id, fid)}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                              />
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 p-6 border-t-2 border-gray-200 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-gray-600">
                {allFeatureIds.length} {ar ? 'صلاحية' : 'permissions'} • {plans.length} {ar ? 'باقة' : 'plans'}
              </div>
              <button type="button" onClick={saveAllPermissions} disabled={savingPermissions} className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                <Icon name="check" className="w-5 h-5" />
                {savingPermissions ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ جميع التغييرات' : 'Save all changes')}
              </button>
            </div>
          </div>
        )}

        {/* تعيين الباقات للمستخدمين — بطاقة لكل مستخدم */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Icon name="users" className="w-6 h-6 text-green-600" />
            {ar ? 'تعيين الباقات للمستخدمين' : 'Assign plans to users'}
          </h2>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-gray-500 py-4">{ar ? 'لا يوجد مستخدمون.' : 'No users.'}</p>
            ) : (
              users.map((user) => {
                const currentPlanId = getUserPlanId(user.id);
                return (
                  <div key={user.id} className="border-2 border-gray-200 rounded-xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="font-bold text-lg text-gray-900">{user.name || (ar ? 'مستخدم' : 'User')}</div>
                        <div className="text-sm text-gray-600">{user.email} — {user.serialNumber}</div>
                      </div>
                      {currentPlanId && (
                        <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                          ✓ {plans.find((p) => p.id === currentPlanId)?.nameAr || plans.find((p) => p.id === currentPlanId)?.nameEn}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {plans.filter((p) => p.isActive !== false).map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => assignPlanToUser(user.id, plan.id)}
                          disabled={assigning === user.id}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            currentPlanId === plan.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-gray-700 mb-1">{ar ? plan.nameAr : plan.nameEn}</div>
                          <div className="text-lg font-bold text-gray-900">{plan.priceMonthly} {plan.currency}</div>
                          <div className="text-xs text-gray-500 mt-1">{(plansConfig[plan.id] || []).length} {ar ? 'صلاحية' : 'perms'}</div>
                          {currentPlanId === plan.id && <Icon name="checkCircle" className="w-5 h-5 text-green-600 mt-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* طلبات الترقية/التنزيل */}
        {changeRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{ar ? 'طلبات الترقية / تنزيل الباقة' : 'Upgrade / Downgrade requests'}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-bold text-gray-900">{ar ? 'المستخدم' : 'User'}</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'النوع' : 'Type'}</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'الباقة المطلوبة' : 'Requested plan'}</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {changeRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">{r.user ? `${r.user.name} (${r.user.serialNumber})` : r.userId}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${r.direction === 'upgrade' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.direction === 'upgrade' ? (ar ? 'ترقية' : 'Upgrade') : (ar ? 'تنزيل' : 'Downgrade')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">{r.requestedPlan ? (ar ? r.requestedPlan.nameAr : r.requestedPlan.nameEn) : '—'}</td>
                      <td className="px-6 py-3 text-center text-sm text-gray-600">{new Date(r.createdAt).toLocaleDateString(locale)}</td>
                      <td className="px-6 py-3 text-center">
                        <button type="button" onClick={() => handleRequestAction(r.id, 'approve')} className="text-emerald-600 hover:underline text-sm font-medium me-2">{ar ? 'اعتماد' : 'Approve'}</button>
                        <button type="button" onClick={() => handleRequestAction(r.id, 'reject')} className="text-red-600 hover:underline text-sm font-medium">{ar ? 'رفض' : 'Reject'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* سجل الاشتراكات */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{ar ? 'سجل الاشتراكات' : 'Subscriptions list'}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-bold text-gray-900">{ar ? 'المستخدم' : 'User'}</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'الباقة' : 'Plan'}</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'بداية' : 'Start'}</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">{ar ? 'نهاية' : 'End'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-8">{ar ? 'لا توجد اشتراكات.' : 'No subscriptions.'}</td></tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{s.user.name}</div>
                        <div className="text-xs text-gray-500">{s.user.email} — {s.user.serialNumber}</div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="font-medium">{ar ? s.plan.nameAr : s.plan.nameEn}</span>
                        <span className="text-gray-500 text-sm"> — {s.plan.priceMonthly} {s.plan.currency}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{s.status}</span>
                      </td>
                      <td className="px-6 py-3 text-center text-sm">{new Date(s.startAt).toLocaleDateString(locale)}</td>
                      <td className="px-6 py-3 text-center text-sm">{new Date(s.endAt).toLocaleDateString(locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal تعديل الباقة */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !savingPlan && setShowEditPlanModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold">{ar ? 'تعديل:' : 'Edit:'} {editingPlan.nameAr}</h3>
              <button type="button" onClick={() => !savingPlan && setShowEditPlanModal(false)} className="p-2 hover:bg-white/20 rounded-lg">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                  <input type="text" value={editingPlan.nameAr} onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                  <input type="text" value={editingPlan.nameEn} onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'السعر الشهري' : 'Price monthly'}</label>
                  <input type="number" step="0.01" value={editingPlan.priceMonthly} onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'السعر السنوي' : 'Price yearly'}</label>
                  <input type="number" step="0.01" value={editingPlan.priceYearly ?? ''} onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: e.target.value === '' ? undefined : Number(e.target.value) })} className="admin-input w-full" placeholder="—" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الحدود' : 'Limits'}</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['maxProperties', 'maxUnits', 'maxBookings', 'maxUsers', 'storageGB'] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-0.5">{key}</label>
                      <input type="number" value={editingPlan.limits?.[key] ?? ''} onChange={(e) => setEditingPlan({ ...editingPlan, limits: { ...(editingPlan.limits || {}), [key]: e.target.value === '' ? 0 : Number(e.target.value) } })} className="admin-input w-full text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الميزات (سطر لكل ميزة)' : 'Features (one per line)'}</label>
                <textarea rows={5} value={(editingPlan.features || []).join('\n')} onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })} className="admin-input w-full text-sm" placeholder={ar ? 'حتى 5 عقارات\n...' : 'Up to 5 properties\n...'} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button type="button" onClick={() => !savingPlan && setShowEditPlanModal(false)} className="admin-btn-secondary">{ar ? 'إلغاء' : 'Cancel'}</button>
              <button type="button" onClick={savePlan} disabled={savingPlan} className="admin-btn-primary">{savingPlan ? (ar ? 'جاري...' : '...') : (ar ? 'حفظ' : 'Save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
