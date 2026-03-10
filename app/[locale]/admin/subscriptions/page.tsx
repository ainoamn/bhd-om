'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import { FEATURE_PERMISSIONS, PLAN_FEATURES, PLAN_COLORS, DEFAULT_PLANS_FOR_ADMIN } from '@/lib/featurePermissions';

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

function SaveAllButton({
  disabled,
  plans,
  plansConfig,
  onSuccess,
  ar,
  variant = 'outline',
}: {
  disabled: boolean;
  plans: PlanRow[];
  plansConfig: Record<string, string[]>;
  onSuccess: () => void;
  ar: boolean;
  variant?: 'outline' | 'solid';
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const disabledRef = useRef(disabled);
  const plansRef = useRef(plans);
  const plansConfigRef = useRef(plansConfig);
  const onSuccessRef = useRef(onSuccess);
  const arRef = useRef(ar);
  disabledRef.current = disabled;
  plansRef.current = plans;
  plansConfigRef.current = plansConfig;
  onSuccessRef.current = onSuccess;
  arRef.current = ar;

  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const setButtonBusy = (busy: boolean) => {
      const b = buttonRef.current;
      if (!b) return;
      b.disabled = busy;
      const span = b.querySelector('[data-save-label]');
      if (span) span.textContent = busy ? (arRef.current ? 'جاري الحفظ...' : 'Saving...') : (arRef.current ? 'حفظ جميع التغييرات' : 'Save all changes');
    };
    const handler = () => {
      // INP: do zero work here — only schedule so handler returns in <1ms
      if (disabledRef.current) {
        setTimeout(() => alert(arRef.current ? 'حدّث الصفحة لتحميل الباقات من النظام ثم احفظ.' : 'Refresh the page to load plans from system, then save.'), 0);
        return;
      }
      setTimeout(() => {
        setButtonBusy(true);
        setTimeout(() => {
          const plansList = plansRef.current;
          const config = plansConfigRef.current;
          const isAr = arRef.current;
          const done = onSuccessRef.current;
          (async () => {
            try {
              const results = await Promise.all(
                plansList.map(async (plan) => {
                  const res = await fetch(`/api/plans/${plan.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    cache: 'no-store',
                    body: JSON.stringify({
                      limitsJson: JSON.stringify({
                        maxProperties: plan.maxProperties,
                        maxUnits: plan.maxUnits,
                        maxBookings: plan.maxBookings,
                        maxUsers: plan.maxUsers,
                        storageGB: plan.storageGB,
                      }),
                      permissionsJson: JSON.stringify(config[plan.id] || []),
                      nameAr: plan.nameAr,
                      nameEn: plan.nameEn,
                      priceMonthly: plan.priceMonthly,
                      priceYearly: plan.priceYearly ?? undefined,
                      featuresJson: JSON.stringify(plan.featuresAr?.length ? plan.featuresAr : plan.features),
                    }),
                  });
                  return { ok: res.ok, nameAr: plan.nameAr, error: res.ok ? null : (await res.json().catch(() => ({}))).error };
                })
              );
              const failed = results.filter((r) => !r.ok).map((r) => r.nameAr + (r.error ? `: ${r.error}` : ''));
              if (failed.length > 0) {
                setButtonBusy(false);
                setTimeout(() => alert((isAr ? 'فشل الحفظ: ' : 'Save failed: ') + failed.join('\n')), 0);
                return;
              }
              setButtonBusy(false);
              setTimeout(() => alert(isAr ? 'تم حفظ جميع التغييرات بنجاح!' : 'All changes saved!'), 0);
              if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => done(), { timeout: 2500 });
              } else {
                setTimeout(done, 500);
              }
            } catch (e) {
              console.error(e);
              setButtonBusy(false);
              setTimeout(() => alert(isAr ? 'فشل الحفظ' : 'Save failed'), 0);
            }
          })();
        }, 0);
      }, 0);
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);

  const baseClass = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-opacity disabled:opacity-50';
  const className = variant === 'solid'
    ? baseClass + ' text-white bg-[var(--primary)] hover:opacity-90'
    : baseClass + ' text-[var(--primary)] bg-white border-2 border-[var(--primary)] hover:bg-gray-50';
  return (
    <button ref={buttonRef} type="button" className={className}>
      <Icon name="check" className="w-5 h-5 pointer-events-none" />
      <span data-save-label className="pointer-events-none">{ar ? 'حفظ جميع التغييرات' : 'Save all changes'}</span>
    </button>
  );
}

function getInitialPlansConfig(): Record<string, string[]> {
  const config: Record<string, string[]> = {};
  (['basic', 'standard', 'premium', 'enterprise'] as const).forEach((code) => {
    config[code] = [...(PLAN_FEATURES[code] || [])];
  });
  return config;
}

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session, status: sessionStatus } = useSession();
  const [plans, setPlans] = useState<PlanRow[]>(() => DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
  const [plansConfig, setPlansConfig] = useState<Record<string, string[]>>(getInitialPlansConfig);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [showEditFeaturesModal, setShowEditFeaturesModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
  const [editingFeaturesAr, setEditingFeaturesAr] = useState<string[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';
  const isPlanIdFromDb = (id: string) => id.length > 20 && !['basic', 'standard', 'premium', 'enterprise'].includes(id);
  const plansFromDb = plans.length > 0 && plans.every((p) => isPlanIdFromDb(p.id));

  const loadData = async (retryCount = 0) => {
    if (!isAdmin) return;
    const doFetch = () => {
      const t = Date.now();
      return Promise.all([
        fetch(`/api/admin/plans?_=${t}`, { cache: 'no-store', credentials: 'include', headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' } }),
        fetch(`/api/admin/users?_=${t}`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/subscriptions?_=${t}`, { cache: 'no-store', credentials: 'include' }),
      ]);
    };
    try {
      let [plansRes, usersRes, subRes] = await doFetch();
      if ((plansRes.status === 403 || plansRes.status === 401) && retryCount < 3) {
        await new Promise((r) => setTimeout(r, 350 + retryCount * 250));
        return loadData(retryCount + 1);
      }
      const subs: { userId: string; planId: string; status: string }[] = [];
      if (subRes.ok) {
        const d = await subRes.json();
        if (Array.isArray(d.list)) d.list.forEach((s: { userId: string; planId: string; status: string }) => subs.push({ userId: s.userId, planId: s.planId, status: s.status }));
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        let list = Array.isArray(d.list) ? d.list : [];
        if (list.length === 0) {
          try {
            const initRes = await fetch('/api/plans/init', { method: 'POST', credentials: 'include', cache: 'no-store' });
            const initData = await initRes.json().catch(() => ({}));
            if (initRes.ok && initData?.ok) {
              const [replansRes] = await doFetch();
              if (replansRes.ok) {
                const rej = await replansRes.json();
                list = Array.isArray(rej.list) ? rej.list : [];
              }
            }
          } catch (_) {}
        }
        if (list.length === 0) {
          setPlans(DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
          setPlansConfig(getInitialPlansConfig());
        } else {
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
          const config: Record<string, string[]> = {};
          list.forEach((p: { id: string; code: string; permissions?: string[] }) => {
            config[p.id] = Array.isArray(p.permissions) && p.permissions.length > 0 ? [...p.permissions] : [...(PLAN_FEATURES[p.code] || [])];
          });
          setPlans(rows);
          setPlansConfig(config);
        }
      } else {
        if (plansRes.status === 403 || plansRes.status === 401) {
          setLoading(false);
          return;
        }
        setPlans(DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
        setPlansConfig(getInitialPlansConfig());
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
      setPlans(DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
      setPlansConfig(getInitialPlansConfig());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
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

  const assignPlanToUser = async (userId: string, planId: string) => {
    setAssigningUserId(userId);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
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
    const planToSave = editingPlan;
    const msg = ar ? 'تم حفظ التعديلات! لا تنسَ «حفظ جميع التغييرات»' : 'Saved! Remember to click «Save all changes»';
    setTimeout(() => {
      startTransition(() => {
        setPlans((prev) => prev.map((p) => (p.id === planToSave.id ? planToSave : p)));
        setShowEditPlanModal(false);
        setEditingPlan(null);
      });
      setTimeout(() => alert(msg), 0);
    }, 0);
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
    const planId = editingPlanId;
    const feats = editingFeatures.filter((f) => f.trim() !== '');
    const featsAr = editingFeaturesAr.filter((f) => f.trim() !== '');
    const msg = ar ? 'تم حفظ الميزات! لا تنسَ «حفظ جميع التغييرات»' : 'Features saved! Remember «Save all changes»';
    setTimeout(() => {
      startTransition(() => {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId ? { ...p, features: feats, featuresAr: featsAr } : p
          )
        );
        setShowEditFeaturesModal(false);
      });
      setTimeout(() => alert(msg), 0);
    }, 0);
  };

  if (sessionStatus === 'unauthenticated' || (sessionStatus === 'authenticated' && !isAdmin)) {
    return (
      <div className="admin-page-content">
        <div className="admin-card max-w-lg mx-auto overflow-hidden">
          <div className="admin-card-body p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-5" style={{ lineHeight: 1.5, marginBottom: '1.5rem' }}>{ar ? 'إدارة الباقات متاحة للإدارة فقط. يمكنك الاشتراك في الباقات أو عرض اشتراكك من الصفحة العامة.' : 'Plan management is for administrators only. You can subscribe or view your plan on the public page.'}</p>
            <Link
              href={`/${locale}/subscriptions`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-[var(--primary)] hover:opacity-90 transition-opacity"
            >
              <Icon name="creditCard" className="w-5 h-5" />
              {ar ? 'الباقات والاشتراك' : 'Plans & Subscribe'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="admin-page-content" dir={ar ? 'rtl' : 'ltr'}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {ar ? 'إدارة الاشتراكات والصلاحيات' : 'Subscriptions & Permissions'}
          </h1>
          <p className="admin-page-subtitle" style={{ marginTop: 0 }}>
            {ar ? 'التحكم الكامل في الباقات، الميزات، والصلاحيات' : 'Full control over plans, features and permissions'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3" style={{ gap: '1.5rem' }}>
          <SaveAllButton disabled={!plansFromDb} plans={plans} plansConfig={plansConfig} onSuccess={loadData} ar={ar} variant="outline" />
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1" style={{ lineHeight: 1.5 }}>{ar ? 'الباقات' : 'Plans'}</p>
              <p className="text-2xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{plans.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <Icon name="folder" className="w-6 h-6 text-[var(--primary)]" />
            </div>
          </div>
        </div>
        <div className="admin-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1" style={{ lineHeight: 1.5 }}>{ar ? 'المستخدمون' : 'Users'}</p>
              <p className="text-2xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{users.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Icon name="users" className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="admin-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1" style={{ lineHeight: 1.5 }}>{ar ? 'الصلاحيات' : 'Permissions'}</p>
              <p className="text-2xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{allFeatures.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Icon name="lock" className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="admin-card overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1" style={{ lineHeight: 1.5 }}>{ar ? 'النشطة' : 'Active'}</p>
              <p className="text-2xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{users.filter((u) => u.subscription?.status === 'active').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Icon name="checkCircle" className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

        {/* تفاصيل الباقات */}
        {plans.length > 0 && (
          <div className="admin-card mb-6" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header border-b border-gray-100">
              <h2 className="admin-card-title flex items-center gap-2 text-lg font-bold text-gray-900" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                <span className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Icon name="folder" className="w-5 h-5 text-[var(--primary)]" />
                </span>
                {ar ? 'تفاصيل الباقات' : 'Plan details'}
              </h2>
            </div>
            <div className="admin-card-body p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[var(--primary)]/40 hover:shadow-md transition-all">
                    <div className={`${plan.color} p-4 text-white`} style={{ lineHeight: 1.5 }}>
                      <p className="text-lg font-bold mb-0.5">{plan.nameAr}</p>
                      <p className="text-2xl font-extrabold">{plan.priceMonthly} {plan.currency}</p>
                      <p className="text-sm opacity-90">{plan.duration === 'monthly' ? (ar ? 'شهرياً' : 'Monthly') : (ar ? 'سنوياً' : 'Yearly')}</p>
                    </div>
                    <div className="p-4 space-y-4" style={{ lineHeight: 1.5 }}>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2" style={{ marginBottom: '1.5rem' }}>{ar ? 'الحدود' : 'Limits'}</p>
                        <div className="space-y-3">
                          {[
                            { key: 'maxProperties' as const, label: ar ? 'العقارات' : 'Properties' },
                            { key: 'maxUnits' as const, label: ar ? 'الوحدات' : 'Units' },
                            { key: 'maxBookings' as const, label: ar ? 'الحجوزات' : 'Bookings' },
                            { key: 'maxUsers' as const, label: ar ? 'المستخدمون' : 'Users' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex justify-between items-center gap-2">
                              <span className="text-sm text-gray-600">{label}</span>
                              <input type="number" value={plan[key]} onChange={(e) => updatePlanLimit(plan.id, key, Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الميزات' : 'Features'} ({(plan.featuresAr || []).length})</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {(plan.featuresAr || []).slice(0, 5).map((feature, idx) => (
                            <p key={idx} className="flex items-start gap-2 text-xs text-gray-600" style={{ lineHeight: 1.5 }}>
                              <span className="text-emerald-600 shrink-0">✓</span>
                              <span className="line-clamp-1">{feature}</span>
                            </p>
                          ))}
                          {(plan.featuresAr || []).length > 5 && <p className="text-xs text-gray-500">+{(plan.featuresAr || []).length - 5}</p>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600" style={{ lineHeight: 1.5 }}>
                        {ar ? 'الصلاحيات' : 'Permissions'}: {plansConfig[plan.id]?.length || 0} / {allFeatures.length}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => openEditModal(plan)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold transition-colors">
                          <Icon name="pencil" className="w-4 h-4" />
                          {ar ? 'تعديل' : 'Edit'}
                        </button>
                        <button type="button" onClick={() => openEditFeaturesModal(plan)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold transition-colors">
                          <Icon name="folder" className="w-4 h-4" />
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

        {/* مصفوفة الصلاحيات */}
        {plans.length > 0 && (
          <div className="admin-card mb-6 overflow-hidden" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header border-b border-gray-100">
              <h2 className="admin-card-title flex items-center gap-2 text-lg font-bold text-gray-900" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                <span className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Icon name="lock" className="w-5 h-5 text-violet-600" />
                </span>
                {ar ? 'مصفوفة الصلاحيات' : 'Permissions matrix'} ({allFeatures.length})
              </h2>
            </div>
            <div className="admin-table-wrapper overflow-x-auto">
              <table className="admin-table min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-900 sticky right-0 bg-gray-50 z-10 min-w-[200px]" style={{ lineHeight: 1.5 }}>{ar ? 'الصلاحية' : 'Permission'}</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-4 py-4 text-center min-w-[140px]">
                        <div className={`inline-block px-3 py-1.5 rounded-xl text-white font-semibold text-sm ${plan.color}`} style={{ lineHeight: 1.5 }}>{plan.nameAr}</div>
                        <div className="mt-2" style={{ marginTop: '1.5rem' }}>
                          <button type="button" onClick={() => toggleAllFeatures(plan.id)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${areAllFeaturesSelected(plan.id) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                            {areAllFeaturesSelected(plan.id) ? (ar ? 'إلغاء الكل' : 'Deselect all') : (ar ? 'تحديد الكل' : 'Select all')}
                          </button>
                          <p className="text-xs text-gray-600 mt-1" style={{ lineHeight: 1.5 }}>{(plansConfig[plan.id] || []).length} / {allFeatures.length}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allFeatures.map((featureId) => {
                    const feature = FEATURE_PERMISSIONS[featureId];
                    if (!feature) return null;
                    return (
                      <tr key={featureId} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 sticky right-0 bg-white z-10">
                          <p className="text-sm font-medium text-gray-900" style={{ lineHeight: 1.5 }}>{feature.nameAr}</p>
                          <p className="text-xs text-gray-500 mt-0.5" style={{ lineHeight: 1.5 }}>{feature.descriptionAr}</p>
                        </td>
                        {plans.map((plan) => (
                          <td key={plan.id} className="px-4 py-3 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={hasFeature(plan.id, featureId)} onChange={() => toggleFeature(plan.id, featureId)} className="w-5 h-5 text-[var(--primary)] border-gray-300 rounded focus:ring-2 focus:ring-[var(--primary)] cursor-pointer" />
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
              <p className="text-sm text-gray-600" style={{ lineHeight: 1.5 }}>{allFeatures.length} {ar ? 'صلاحية' : 'permissions'} · {plans.length} {ar ? 'باقة' : 'plans'}</p>
              <SaveAllButton disabled={!plansFromDb} plans={plans} plansConfig={plansConfig} onSuccess={loadData} ar={ar} variant="solid" />
            </div>
          </div>
        )}

        {/* تعيين الباقات للمستخدمين */}
        <div className="admin-card">
          <div className="admin-card-header border-b border-gray-100">
            <h2 className="admin-card-title flex items-center gap-2 text-lg font-bold text-gray-900" style={{ lineHeight: 1.5, marginBottom: 0 }}>
              <span className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="users" className="w-5 h-5 text-emerald-600" />
              </span>
              {ar ? 'تعيين الباقات للمستخدمين' : 'Assign plans to users'}
            </h2>
          </div>
          <div className="admin-card-body p-4 sm:p-6">
            <div className="space-y-5" style={{ lineHeight: 1.5 }}>
              {users.length === 0 ? (
                <p className="text-gray-500 py-6">{ar ? 'لا يوجد مستخدمون.' : 'No users.'}</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 hover:border-gray-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4" style={{ marginBottom: '1.5rem' }}>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg" style={{ lineHeight: 1.5 }}>{user.name}</p>
                        <p className="text-sm text-gray-600" style={{ lineHeight: 1.5 }}>{user.email || user.serialNumber}</p>
                      </div>
                      {user.subscription && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">
                          <Icon name="checkCircle" className="w-4 h-4" />
                          {plans.find((p) => p.id === user.subscription!.planId)?.nameAr}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => assignPlanToUser(user.id, plan.id)}
                          disabled={assigningUserId === user.id || !plansFromDb}
                          className={`p-4 rounded-xl border-2 transition-all text-left disabled:opacity-60 ${user.subscription?.planId === plan.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-[var(--primary)]/40 hover:bg-white'}`}
                        >
                          <p className="text-xs font-semibold text-gray-700 mb-1" style={{ lineHeight: 1.5 }}>{plan.nameAr}</p>
                          <p className="text-base font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{plan.priceMonthly} {plan.currency}</p>
                          <p className="text-xs text-gray-500 mt-1" style={{ lineHeight: 1.5 }}>{(plansConfig[plan.id] || []).length} {ar ? 'صلاحية' : 'perms'}</p>
                          {user.subscription?.planId === plan.id && <Icon name="checkCircle" className="w-5 h-5 text-emerald-600 mt-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Edit plan */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditPlanModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'تعديل الباقة' : 'Edit plan'}: {editingPlan.nameAr}</h3>
              <button type="button" onClick={() => setShowEditPlanModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors" aria-label={ar ? 'إغلاق' : 'Close'}>×</button>
            </div>
            <div className="p-5 space-y-5" style={{ lineHeight: 1.5 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                  <input type="text" value={editingPlan.nameAr} onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                  <input type="text" value={editingPlan.nameEn} onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'السعر (ر.ع)' : 'Price'}</label>
                  <input type="number" value={editingPlan.priceMonthly} onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'المدة' : 'Duration'}</label>
                  <select value={editingPlan.duration} onChange={(e) => setEditingPlan({ ...editingPlan, duration: e.target.value as 'monthly' | 'yearly' })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="monthly">{ar ? 'شهري' : 'Monthly'}</option>
                    <option value="yearly">{ar ? 'سنوي' : 'Yearly'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الأولوية' : 'Priority'}</label>
                  <select value={editingPlan.priority} onChange={(e) => setEditingPlan({ ...editingPlan, priority: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="basic">{ar ? 'أساسي' : 'Basic'}</option>
                    <option value="standard">{ar ? 'معياري' : 'Standard'}</option>
                    <option value="premium">{ar ? 'مميز' : 'Premium'}</option>
                    <option value="enterprise">{ar ? 'مؤسسي' : 'Enterprise'}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'اللون (حسب الباقة)' : 'Color (by plan)'}</label>
                <div className="flex gap-2 flex-wrap">
                  {['basic', 'standard', 'premium', 'enterprise'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, color: PLAN_COLORS[code] || 'bg-[var(--primary)]' })}
                      className={`${PLAN_COLORS[code]} px-3 py-2 rounded-xl text-white text-xs font-semibold transition-all ${editingPlan.color === (PLAN_COLORS[code]) ? 'ring-2 ring-offset-2 ring-gray-500' : 'opacity-80 hover:opacity-100'}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200" style={{ paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditPlanModal(false)} className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={saveEditedPlan} className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  {ar ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit features */}
      {showEditFeaturesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditFeaturesModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'تعديل الميزات' : 'Edit features'}: {plans.find((p) => p.id === editingPlanId)?.nameAr}</h3>
              <button type="button" onClick={() => setShowEditFeaturesModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors" aria-label={ar ? 'إغلاق' : 'Close'}>×</button>
            </div>
            <div className="p-5">
              <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                <button type="button" onClick={addFeature} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  <Icon name="plus" className="w-4 h-4" />
                  {ar ? 'إضافة ميزة' : 'Add feature'}
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editingFeaturesAr.map((featureAr, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input type="text" value={editingFeatures[idx] || ''} onChange={(e) => { const n = [...editingFeatures]; n[idx] = e.target.value; setEditingFeatures(n); }} placeholder={ar ? 'بالإنجليزية' : 'English'} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)]" />
                    </div>
                    <div className="col-span-6">
                      <input type="text" value={featureAr} onChange={(e) => { const n = [...editingFeaturesAr]; n[idx] = e.target.value; setEditingFeaturesAr(n); }} placeholder={ar ? 'بالعربية' : 'Arabic'} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)]" />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeFeature(idx)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6 pt-5 border-t border-gray-200" style={{ marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditFeaturesModal(false)} className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={saveFeaturesChanges} className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  {ar ? 'حفظ الميزات' : 'Save features'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
