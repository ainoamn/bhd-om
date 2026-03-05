'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import { FEATURE_PERMISSIONS, PLAN_FEATURES, PLAN_COLORS } from '@/lib/featurePermissions';

type PlanRow = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  duration: 'monthly' | 'yearly';
  priority: string;
  color: string;
  maxProperties: number;
  maxUnits: number;
  maxBookings: number;
  maxUsers: number;
  storageGB: number;
  features: string[];
  featuresAr: string[];
  isActive?: boolean;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  serialNumber?: string;
  subscription?: { planId: string; status: string };
};

const allFeatures = Object.keys(FEATURE_PERMISSIONS);

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [plansConfig, setPlansConfig] = useState<Record<string, string[]>>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [showEditFeaturesModal, setShowEditFeaturesModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
  const [editingFeaturesAr, setEditingFeaturesAr] = useState<string[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [plansRes, usersRes, subRes] = await Promise.all([
        fetch('/api/admin/plans'),
        fetch('/api/admin/users'),
        fetch('/api/subscriptions'),
      ]);
      const subs: { userId: string; planId: string; status: string }[] = [];
      if (subRes.ok) {
        const d = await subRes.json();
        if (Array.isArray(d.list)) d.list.forEach((s: { userId: string; planId: string; status: string }) => subs.push({ userId: s.userId, planId: s.planId, status: s.status }));
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        const list = Array.isArray(d.list) ? d.list : [];
        const rows: PlanRow[] = list.map((p: {
          id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; priceYearly?: number; currency: string;
          features?: string[]; limits?: Record<string, number>; permissions?: string[]; isActive?: boolean;
        }) => ({
          id: p.id,
          code: p.code,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          currency: p.currency,
          duration: 'monthly',
          priority: p.code,
          color: PLAN_COLORS[p.code] || 'bg-[var(--primary)]',
          maxProperties: p.limits?.maxProperties ?? 0,
          maxUnits: p.limits?.maxUnits ?? 0,
          maxBookings: p.limits?.maxBookings ?? 0,
          maxUsers: p.limits?.maxUsers ?? 0,
          storageGB: p.limits?.storageGB ?? 0,
          features: p.features || [],
          featuresAr: p.features || [],
          isActive: p.isActive,
        }));
        setPlans(rows);
        const config: Record<string, string[]> = {};
        list.forEach((p: { id: string; code: string; permissions?: string[] }) => {
          config[p.id] = Array.isArray(p.permissions) && p.permissions.length > 0 ? [...p.permissions] : [...(PLAN_FEATURES[p.code] || [])];
        });
        setPlansConfig(config);
      }
      if (usersRes.ok) {
        const uList = await usersRes.json();
        const userRows: UserRow[] = (Array.isArray(uList) ? uList : []).map((u: { id: string; name: string; email: string; serialNumber?: string }) => ({
          id: u.id,
          name: u.name || (ar ? 'مستخدم' : 'User'),
          email: u.email || '',
          serialNumber: u.serialNumber,
          subscription: subs.find((s) => s.userId === u.id) ? { planId: subs.find((s) => s.userId === u.id)!.planId, status: subs.find((s) => s.userId === u.id)!.status } : undefined,
        }));
        setUsers(userRows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

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
    const allSelected = current.length === allFeatures.length;
    setPlansConfig((prev) => ({ ...prev, [planId]: allSelected ? [] : [...allFeatures] }));
  };
  const areAllFeaturesSelected = (planId: string) => (plansConfig[planId] || []).length === allFeatures.length;

  const updatePlanLimit = (planId: string, field: keyof PlanRow, value: number) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p)));
  };

  const saveChanges = async () => {
    setSavingAll(true);
    try {
      for (const plan of plans) {
        await fetch(`/api/plans/${plan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limitsJson: JSON.stringify({
              maxProperties: plan.maxProperties,
              maxUnits: plan.maxUnits,
              maxBookings: plan.maxBookings,
              maxUsers: plan.maxUsers,
              storageGB: plan.storageGB,
            }),
            permissionsJson: JSON.stringify(plansConfig[plan.id] || []),
            nameAr: plan.nameAr,
            nameEn: plan.nameEn,
            priceMonthly: plan.priceMonthly,
            priceYearly: plan.priceYearly ?? undefined,
            featuresJson: JSON.stringify(plan.featuresAr?.length ? plan.featuresAr : plan.features),
          }),
        });
      }
      alert(ar ? 'تم حفظ جميع التغييرات بنجاح!' : 'All changes saved!');
      await loadData();
    } catch (e) {
      console.error(e);
      alert(ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSavingAll(false);
    }
  };

  const assignPlanToUser = async (userId: string, planId: string) => {
    setAssigningUserId(userId);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId, durationMonths: 12 }),
      });
      if (res.ok) {
        alert(ar ? 'تم تعيين الباقة بنجاح!' : 'Plan assigned!');
        await loadData();
      } else {
        const d = await res.json();
        alert(d.error || (ar ? 'فشل التعيين' : 'Assign failed'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningUserId(null);
    }
  };

  const openEditModal = (plan: PlanRow) => {
    setEditingPlan({ ...plan });
    setShowEditPlanModal(true);
  };
  const saveEditedPlan = () => {
    if (!editingPlan) return;
    setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    setShowEditPlanModal(false);
    setEditingPlan(null);
    alert(ar ? 'تم حفظ التعديلات! لا تنسَ «حفظ جميع التغييرات»' : 'Saved! Remember to click «Save all changes»');
  };

  const openEditFeaturesModal = (plan: PlanRow) => {
    setEditingPlanId(plan.id);
    setEditingFeatures([...(plan.features || [])]);
    setEditingFeaturesAr([...(plan.featuresAr || [])]);
    setShowEditFeaturesModal(true);
  };
  const addFeature = () => {
    setEditingFeatures([...editingFeatures, '']);
    setEditingFeaturesAr([...editingFeaturesAr, '']);
  };
  const removeFeature = (index: number) => {
    setEditingFeatures(editingFeatures.filter((_, i) => i !== index));
    setEditingFeaturesAr(editingFeaturesAr.filter((_, i) => i !== index));
  };
  const saveFeaturesChanges = () => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === editingPlanId
          ? { ...p, features: editingFeatures.filter((f) => f.trim() !== ''), featuresAr: editingFeaturesAr.filter((f) => f.trim() !== '') }
          : p
      )
    );
    setShowEditFeaturesModal(false);
    alert(ar ? 'تم حفظ الميزات! لا تنسَ «حفظ جميع التغييرات»' : 'Features saved! Remember «Save all changes»');
  };

  const handleInitPlans = async () => {
    setInitLoading(true);
    try {
      const res = await fetch('/api/plans/init', { method: 'POST' });
      const d = await res.json();
      if (res.ok && d.ok) {
        alert(ar ? `تم إنشاء ${d.created} باقة. حدّث الصفحة.` : `${d.created} plans created.`);
        await loadData();
      } else alert(d.error || (ar ? 'فشل' : 'Failed'));
    } catch (e) {
      console.error(e);
    } finally {
      setInitLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-gray-600">{ar ? 'غير مصرح لك.' : 'Not authorized.'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4" />
          <p className="text-gray-600">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir={ar ? 'rtl' : 'ltr'}>
      <div className="max-w-[1800px] mx-auto px-4">
        {/* Header — كما في الموقع القديم */}
        <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{ar ? 'إدارة الاشتراكات والصلاحيات' : 'Subscriptions & Permissions'}</h1>
              <p className="text-white/80">{ar ? 'التحكم الكامل في الباقات، الميزات، والصلاحيات' : 'Full control over plans, features and permissions'}</p>
            </div>
            <div className="flex gap-3">
              {plans.length === 0 && (
                <button
                  type="button"
                  onClick={handleInitPlans}
                  disabled={initLoading}
                  className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600"
                >
                  {initLoading ? (ar ? 'جاري...' : '...') : (ar ? 'تهيئة الباقات الافتراضية' : 'Init default plans')}
                </button>
              )}
              <button
                type="button"
                onClick={saveChanges}
                disabled={savingAll || plans.length === 0}
                className="bg-white text-[var(--primary)] px-6 py-3 rounded-xl font-bold hover:bg-gray-50 shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Icon name="check" className="w-5 h-5" />
                {savingAll ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ جميع التغييرات' : 'Save all changes')}
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-[var(--primary)] flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'الباقات' : 'Plans'}</div>
              <div className="text-2xl font-bold text-gray-900">{plans.length}</div>
            </div>
            <Icon name="folder" className="w-8 h-8 text-[var(--primary)]" />
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
              <div className="text-2xl font-bold text-gray-900">{allFeatures.length}</div>
            </div>
            <Icon name="lock" className="w-8 h-8 text-purple-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">{ar ? 'النشطة' : 'Active'}</div>
              <div className="text-2xl font-bold text-gray-900">{users.filter((u) => u.subscription?.status === 'active').length}</div>
            </div>
            <Icon name="checkCircle" className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* جدول الباقات — تفاصيل الباقات مع حدود قابلة للتعديل كما في الموقع القديم */}
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
                  <div key={plan.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-[var(--primary)]/30 transition-all">
                    <div className={`${plan.color} p-4 text-white`}>
                      <div className="text-xl font-bold mb-1">{plan.nameAr}</div>
                      <div className="text-3xl font-extrabold">{plan.priceMonthly} {plan.currency}</div>
                      <div className="text-sm opacity-90">{plan.duration === 'monthly' ? (ar ? 'شهرياً' : 'Monthly') : (ar ? 'سنوياً' : 'Yearly')}</div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2">{ar ? 'الحدود:' : 'Limits:'}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{ar ? 'العقارات:' : 'Properties'}</span>
                            <input type="number" value={plan.maxProperties} onChange={(e) => updatePlanLimit(plan.id, 'maxProperties', Number(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{ar ? 'الوحدات:' : 'Units'}</span>
                            <input type="number" value={plan.maxUnits} onChange={(e) => updatePlanLimit(plan.id, 'maxUnits', Number(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{ar ? 'الحجوزات:' : 'Bookings'}</span>
                            <input type="number" value={plan.maxBookings} onChange={(e) => updatePlanLimit(plan.id, 'maxBookings', Number(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{ar ? 'المستخدمون:' : 'Users'}</span>
                            <input type="number" value={plan.maxUsers} onChange={(e) => updatePlanLimit(plan.id, 'maxUsers', Number(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2">{ar ? 'الميزات' : 'Features'} ({(plan.featuresAr || []).length}):</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {(plan.featuresAr || []).slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                              <span className="text-green-600">✓</span>
                              <span className="line-clamp-1">{feature}</span>
                            </div>
                          ))}
                          {(plan.featuresAr || []).length > 5 && <div className="text-xs text-gray-500">+{(plan.featuresAr || []).length - 5}</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 mb-2">{ar ? 'الصلاحيات' : 'Permissions'} ({plansConfig[plan.id]?.length || 0}):</div>
                        <div className="text-sm text-gray-600">{plansConfig[plan.id]?.length || 0} {ar ? 'من' : 'of'} {allFeatures.length}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                        <button type="button" onClick={() => openEditModal(plan)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-bold flex items-center justify-center gap-1">
                          <Icon name="pencil" className="w-3 h-3" />
                          {ar ? 'تعديل' : 'Edit'}
                        </button>
                        <button type="button" onClick={() => openEditFeaturesModal(plan)} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-bold flex items-center justify-center gap-1">
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

        {/* مصفوفة الصلاحيات — كما في الموقع القديم */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Icon name="lock" className="w-6 h-6" />
                {ar ? 'مصفوفة الصلاحيات' : 'Permissions matrix'} ({allFeatures.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 sticky right-0 bg-gray-50 z-10">{ar ? 'الصلاحية' : 'Permission'}</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center min-w-[150px]">
                        <div className={`inline-block px-3 py-1 rounded-lg text-white font-bold text-sm ${plan.color}`}>{plan.nameAr}</div>
                        <div className="mt-2">
                          <button type="button" onClick={() => toggleAllFeatures(plan.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${areAllFeaturesSelected(plan.id) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                            {areAllFeaturesSelected(plan.id) ? (ar ? 'إلغاء الكل' : 'Deselect all') : (ar ? 'تحديد الكل' : 'Select all')}
                          </button>
                          <div className="text-xs text-gray-600 mt-1">{(plansConfig[plan.id] || []).length}/{allFeatures.length}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allFeatures.map((featureId) => {
                    const feature = FEATURE_PERMISSIONS[featureId];
                    if (!feature) return null;
                    return (
                      <tr key={featureId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 sticky right-0 bg-white z-10">
                          <div className="text-sm font-medium text-gray-900">{feature.nameAr}</div>
                          <div className="text-xs text-gray-500">{feature.descriptionAr}</div>
                        </td>
                        {plans.map((plan) => (
                          <td key={plan.id} className="px-6 py-3 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={hasFeature(plan.id, featureId)} onChange={() => toggleFeature(plan.id, featureId)} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer" />
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
              <div className="text-sm text-gray-600">{allFeatures.length} {ar ? 'صلاحية' : 'permissions'} • {plans.length} {ar ? 'باقة' : 'plans'}</div>
              <button type="button" onClick={saveChanges} disabled={savingAll} className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 flex items-center gap-2">
                <Icon name="check" className="w-5 h-5" />
                {ar ? 'حفظ جميع التغييرات' : 'Save all changes'}
              </button>
            </div>
          </div>
        )}

        {/* تعيين الباقات للمستخدمين — كما في الموقع القديم */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Icon name="users" className="w-6 h-6 text-[var(--primary)]" />
            {ar ? 'تعيين الباقات للمستخدمين' : 'Assign plans to users'}
          </h2>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-gray-500 py-4">{ar ? 'لا يوجد مستخدمون.' : 'No users.'}</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="border-2 border-gray-200 rounded-xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="font-bold text-lg text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email || user.serialNumber}</div>
                    </div>
                    {user.subscription && (
                      <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                        ✓ {plans.find((p) => p.id === user.subscription!.planId)?.nameAr}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => assignPlanToUser(user.id, plan.id)}
                        disabled={assigningUserId === user.id}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          user.subscription?.planId === plan.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-gray-700 mb-1">{plan.nameAr}</div>
                        <div className="text-lg font-bold text-gray-900">{plan.priceMonthly} {plan.currency}</div>
                        <div className="text-xs text-gray-500 mt-1">{(plansConfig[plan.id] || []).length} {ar ? 'صلاحية' : 'perms'}</div>
                        {user.subscription?.planId === plan.id && <Icon name="checkCircle" className="w-5 h-5 text-green-600 mt-2" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: تعديل معلومات الباقة — كما في الموقع القديم */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditPlanModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] p-6 text-white flex items-center justify-between rounded-t-2xl">
              <h3 className="text-2xl font-bold">{ar ? 'تعديل:' : 'Edit:'} {editingPlan.nameAr}</h3>
              <button type="button" onClick={() => setShowEditPlanModal(false)} className="p-2 hover:bg-white/20 rounded-lg">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                  <input type="text" value={editingPlan.nameAr} onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                  <input type="text" value={editingPlan.nameEn} onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'السعر (ر.ع)' : 'Price'}</label>
                  <input type="number" value={editingPlan.priceMonthly} onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'المدة' : 'Duration'}</label>
                  <select value={editingPlan.duration} onChange={(e) => setEditingPlan({ ...editingPlan, duration: e.target.value as 'monthly' | 'yearly' })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                    <option value="monthly">{ar ? 'شهري' : 'Monthly'}</option>
                    <option value="yearly">{ar ? 'سنوي' : 'Yearly'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'الأولوية' : 'Priority'}</label>
                  <select value={editingPlan.priority} onChange={(e) => setEditingPlan({ ...editingPlan, priority: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                    <option value="basic">{ar ? 'أساسي' : 'Basic'}</option>
                    <option value="standard">{ar ? 'معياري' : 'Standard'}</option>
                    <option value="premium">{ar ? 'مميز' : 'Premium'}</option>
                    <option value="enterprise">{ar ? 'مؤسسي' : 'Enterprise'}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'اللون (حسب الباقة)' : 'Color (by plan)'}</label>
                <div className="flex gap-2 flex-wrap">
                  {['basic', 'standard', 'premium', 'enterprise'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, color: PLAN_COLORS[code] || 'bg-[var(--primary)]' })}
                      className={`${PLAN_COLORS[code]} px-3 py-2 rounded-lg text-white text-xs font-bold ${editingPlan.color === (PLAN_COLORS[code]) ? 'ring-4 ring-gray-400' : ''}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <button type="button" onClick={() => setShowEditPlanModal(false)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={saveEditedPlan} className="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90">
                  {ar ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل الميزات — كما في الموقع القديم */}
      {showEditFeaturesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditFeaturesModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] p-6 text-white flex items-center justify-between rounded-t-2xl">
              <h3 className="text-2xl font-bold">{ar ? 'تعديل الميزات:' : 'Edit features:'} {plans.find((p) => p.id === editingPlanId)?.nameAr}</h3>
              <button type="button" onClick={() => setShowEditFeaturesModal(false)} className="p-2 hover:bg-white/20 rounded-lg">×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <button type="button" onClick={addFeature} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 font-bold flex items-center gap-2">
                  <Icon name="plus" className="w-4 h-4" />
                  {ar ? 'إضافة ميزة' : 'Add feature'}
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editingFeaturesAr.map((featureAr, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input type="text" value={editingFeatures[idx] || ''} onChange={(e) => { const n = [...editingFeatures]; n[idx] = e.target.value; setEditingFeatures(n); }} placeholder={ar ? 'بالإنجليزية' : 'English'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div className="col-span-6">
                      <input type="text" value={featureAr} onChange={(e) => { const n = [...editingFeaturesAr]; n[idx] = e.target.value; setEditingFeaturesAr(n); }} placeholder={ar ? 'بالعربية' : 'Arabic'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeFeature(idx)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6 pt-6 border-t-2 border-gray-200">
                <button type="button" onClick={() => setShowEditFeaturesModal(false)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={saveFeaturesChanges} className="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90">
                  {ar ? 'حفظ الميزات' : 'Save features'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
