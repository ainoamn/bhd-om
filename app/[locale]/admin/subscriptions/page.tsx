'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import {
  FEATURE_PERMISSIONS,
  PLAN_FEATURES,
  PLAN_COLORS,
  DEFAULT_PLANS_FOR_ADMIN,
} from '@/lib/featurePermissions';

function schedule(fn: () => void) {
  setTimeout(fn, 0);
}
/** تأخير قصير لقطع ربط العمل بتفاعل النقر — مع الحفاظ على عمل الحفظ */
function scheduleAfterInteraction(fn: () => void, delayMs = 50) {
  setTimeout(fn, delayMs);
}
/** إخفاء عنصر بدون reflow (لا display:none) لتفادي انسداد الرسم */
function hideEl(el: HTMLElement | null) {
  if (!el) return;
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
}
function showEl(el: HTMLElement | null) {
  if (!el) return;
  el.style.visibility = '';
  el.style.pointerEvents = '';
}

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
  /** من قائمة الاشتراكات: سعر الباقة الحالية وترتيبها وحالة الاسترداد */
  currentPlanPrice?: number;
  currentPlanSortOrder?: number;
  refundProcessedAt?: string | null;
};

const ALL_FEATURES = Object.keys(FEATURE_PERMISSIONS);

function getInitialConfig(): Record<string, string[]> {
  const c: Record<string, string[]> = {};
  (['basic', 'standard', 'premium', 'enterprise'] as const).forEach((code) => {
    c[code] = [...(PLAN_FEATURES[code] || [])];
  });
  return c;
}

function mapApiPlanToRow(p: {
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
}): PlanRow {
  return {
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
  };
}

const FETCH_OPTS = { credentials: 'include' as RequestCredentials };

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  const [plans, setPlans] = useState<PlanRow[]>(() => DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
  const [plansConfig, setPlansConfig] = useState<Record<string, string[]>>(getInitialConfig);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
  const [editingFeaturesAr, setEditingFeaturesAr] = useState<string[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [refundingUserId, setRefundingUserId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterPlan, setUserFilterPlan] = useState<string>('');

  const limitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plansRef = useRef(plans);
  const configRef = useRef(plansConfig);
  const modalEditRef = useRef<HTMLDivElement>(null);
  const modalFeaturesRef = useRef<HTMLDivElement>(null);
  plansRef.current = plans;
  configRef.current = plansConfig;

  const isDbPlan = useCallback((id: string) => id.length > 20 && !['basic', 'standard', 'premium', 'enterprise'].includes(id), []);
  const plansFromDb = plans.length > 0 && plans.every((p) => isDbPlan(p.id));

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = (userSearch || '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.serialNumber || '').toLowerCase().includes(q)
      );
    }
    if (userFilterPlan) {
      list = list.filter((u) => u.subscription?.planId === userFilterPlan);
    }
    return list;
  }, [users, userSearch, userFilterPlan]);

  const loadData = useCallback(async (retry = 0) => {
    /** لا ننتظر isAdmin من useSession — أثناء loading يكون false فيتأخر الجلب؛ الخادم يفرض الصلاحيات */
    if (sessionStatus === 'unauthenticated') return;
    const ts = Date.now();
    try {
      const [planRes, userRes, subRes] = await Promise.all([
        fetch(`/api/admin/plans?_=${ts}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' } }),
        fetch(`/api/admin/users?_=${ts}`, FETCH_OPTS),
        fetch(`/api/subscriptions?_=${ts}`, FETCH_OPTS),
      ]);

      if ((planRes.status === 403 || planRes.status === 401) && retry < 3) {
        await new Promise((r) => setTimeout(r, 350 + retry * 250));
        return loadData(retry + 1);
      }

      const subs: { userId: string; planId: string; status: string; plan?: { priceMonthly?: number; sortOrder?: number }; refundProcessedAt?: string | null }[] = [];
      if (subRes.ok) {
        const d = await subRes.json();
        if (Array.isArray(d?.list)) d.list.forEach((s: { userId: string; planId: string; status: string; plan?: { priceMonthly?: number; sortOrder?: number }; refundProcessedAt?: string | null }) => subs.push(s));
      }

      let planList: Parameters<typeof mapApiPlanToRow>[0][] = [];
      if (planRes.ok) {
        const d = await planRes.json();
        planList = Array.isArray(d?.list) ? d.list : [];
      }
      if (planList.length === 0) {
        try {
          await fetch('/api/plans/init', { method: 'POST', ...FETCH_OPTS }).then((r) => r.json().catch(() => ({})));
          const reRes = await fetch(`/api/admin/plans?_=${Date.now()}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache' } });
          if (reRes.ok) {
            const rej = await reRes.json();
            planList = Array.isArray(rej?.list) ? rej.list : [];
          }
        } catch {}
      }

      if (planList.length > 0) {
        const rows = planList.map(mapApiPlanToRow);
        const config: Record<string, string[]> = {};
        planList.forEach((p: { id: string; code: string; permissions?: string[] }) => {
          config[p.id] = Array.isArray(p.permissions) && p.permissions.length > 0 ? [...p.permissions] : [...(PLAN_FEATURES[p.code] || [])];
        });
        setPlans(rows);
        setPlansConfig(config);
      } else {
        setPlans(DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
        setPlansConfig(getInitialConfig());
      }

      if (userRes.ok) {
        const uList = await userRes.json();
        const arr = Array.isArray(uList) ? uList : [];
        const userRows: UserRow[] = arr.map((u: { id: string; name: string; email: string; serialNumber?: string }) => {
          const sub = subs.find((s) => s.userId === u.id);
          return {
            id: u.id,
            name: u.name || (ar ? 'مستخدم' : 'User'),
            email: u.email || '',
            serialNumber: u.serialNumber,
            subscription: sub ? { planId: sub.planId, status: sub.status } : undefined,
            currentPlanPrice: sub?.plan?.priceMonthly ?? 0,
            currentPlanSortOrder: sub?.plan?.sortOrder ?? 0,
            refundProcessedAt: sub?.refundProcessedAt ?? null,
          };
        });
        setUsers(userRows);
      }
    } catch (e) {
      console.error(e);
      setPlans(DEFAULT_PLANS_FOR_ADMIN as PlanRow[]);
      setPlansConfig(getInitialConfig());
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, ar]);

  useEffect(() => {
    if (sessionStatus !== 'unauthenticated') void loadData();
  }, [sessionStatus, loadData]);

  const patchPlan = useCallback(async (plan: PlanRow, opts?: { permissions?: string[]; features?: string[] }): Promise<{ ok: boolean; error?: string }> => {
    if (!isDbPlan(plan.id)) return { ok: false, error: 'Plan id not from DB' };
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...FETCH_OPTS,
        body: JSON.stringify({
          limitsJson: JSON.stringify({
            maxProperties: plan.maxProperties,
            maxUnits: plan.maxUnits,
            maxBookings: plan.maxBookings,
            maxUsers: plan.maxUsers,
            storageGB: plan.storageGB,
          }),
          permissionsJson: JSON.stringify(opts?.permissions ?? configRef.current[plan.id] ?? []),
          nameAr: plan.nameAr,
          nameEn: plan.nameEn,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly ?? undefined,
          featuresJson: JSON.stringify(opts?.features ?? (plan.featuresAr?.length ? plan.featuresAr : plan.features)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data?.error as string) || `HTTP ${res.status}`;
        const details = data?.details as string | undefined;
        return { ok: false, error: details ? `${msg}: ${details}` : msg };
      }
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }, [isDbPlan]);

  const hasFeature = (planId: string, featureId: string) => (plansConfig[planId] || []).includes(featureId);
  const allSelected = (planId: string) => (plansConfig[planId] || []).length === ALL_FEATURES.length;

  const onToggleFeature = (planId: string, featureId: string) => {
    const arr = plansConfig[planId] || [];
    const next = arr.includes(featureId) ? arr.filter((f) => f !== featureId) : [...arr, featureId];
    setPlansConfig((prev) => {
      const nextConfig = { ...prev, [planId]: next };
      configRef.current = nextConfig;
      return nextConfig;
    });
    const plan = plans.find((p) => p.id === planId);
    if (plan && isDbPlan(plan.id)) schedule(() => patchPlan(plan, { permissions: next }));
  };

  const onToggleAllFeatures = (planId: string) => {
    const current = plansConfig[planId] || [];
    const next = current.length === ALL_FEATURES.length ? [] : [...ALL_FEATURES];
    setPlansConfig((prev) => {
      const nextConfig = { ...prev, [planId]: next };
      configRef.current = nextConfig;
      return nextConfig;
    });
    const plan = plans.find((p) => p.id === planId);
    if (plan && isDbPlan(plan.id)) schedule(() => patchPlan(plan, { permissions: next }));
  };

  const onLimitChange = (planId: string, field: keyof PlanRow, value: number) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p)));
    if (limitDebounceRef.current) clearTimeout(limitDebounceRef.current);
    limitDebounceRef.current = setTimeout(() => {
      const plan = plansRef.current.find((p) => p.id === planId);
      if (plan && isDbPlan(plan.id)) patchPlan(plan);
      limitDebounceRef.current = null;
    }, 800);
  };

  const saveAllChanges = useCallback(async () => {
    if (!plansFromDb) return;
    if (limitDebounceRef.current) {
      clearTimeout(limitDebounceRef.current);
      limitDebounceRef.current = null;
    }
    setSavingAll(true);
    try {
      let firstError: string | null = null;
      let savedCount = 0;
      const list = plansRef.current;
      const config = configRef.current;
      for (const plan of list) {
        if (!isDbPlan(plan.id)) continue;
        const permissions = config[plan.id] ?? [];
        const result = await patchPlan(plan, { permissions });
        if (!result.ok) firstError = result.error ?? (ar ? 'خطأ' : 'Error');
        else savedCount += 1;
      }
      if (firstError) {
        alert(ar ? `فشل الحفظ: ${firstError}` : `Save failed: ${firstError}`);
      } else if (savedCount > 0) {
        // عدم استدعاء loadData() بعد الحفظ لئلا يفشل الطلب فيستبدل loadData البيانات الافتراضية وترجع الشاشة كما كانت
        alert(ar ? 'تم حفظ جميع التغييرات.' : 'All changes saved.');
      }
    } finally {
      setSavingAll(false);
    }
  }, [plansFromDb, isDbPlan, patchPlan, ar]);

  const onAssignPlan = async (userId: string, planId: string) => {
    setAssigningUserId(userId);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...FETCH_OPTS,
        body: JSON.stringify({ userId, planId, durationMonths: 12 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, subscription: { planId, status: 'active' }, refundProcessedAt: null } : u
          )
        );
        alert(ar ? 'تم تعيين الباقة بنجاح!' : 'Plan assigned!');
      } else {
        const errCode = data?.error as string;
        const msg = data?.message as string;
        if (errCode === 'refund_required' && msg) {
          alert(msg);
        } else {
          const detail = (data?.details as string) || (data?.error as string);
          alert(detail ? `${data?.error || (ar ? 'فشل التعيين' : 'Assign failed')}: ${detail}` : (data?.error || (ar ? 'فشل التعيين' : 'Assign failed')));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningUserId(null);
    }
  };

  const onRefundDone = async (userId: string) => {
    setRefundingUserId(userId);
    try {
      const res = await fetch('/api/subscriptions/refund-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...FETCH_OPTS,
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, refundProcessedAt: new Date().toISOString() } : u))
        );
        alert(ar ? 'تم تسجيل استرداد المبلغ. يمكنك الآن تعيين الباقة الأقل.' : 'Refund recorded. You can now assign the lower plan.');
      } else {
        alert(data?.error || data?.details || (ar ? 'فشل' : 'Failed'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefundingUserId(null);
    }
  };

  const openEdit = (plan: PlanRow) => {
    setEditingPlan({ ...plan });
    setShowEditModal(true);
  };

  const onSaveEdit = async () => {
    const plan = editingPlan;
    if (!plan) return;
    if (!isDbPlan(plan.id)) {
      const saveBtn = modalEditRef.current?.querySelector('[data-save="edit"]') as HTMLButtonElement | null;
      try {
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = ar ? 'جاري الحفظ...' : 'Saving...'; }
        await fetch('/api/plans/init', { method: 'POST', ...FETCH_OPTS }).then((r) => r.json().catch(() => ({})));
        let listRes = await fetch(`/api/admin/plans?_=${Date.now()}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache' } });
        for (let r = 0; r < 2 && (listRes.status === 403 || listRes.status === 401); r++) {
          await new Promise((x) => setTimeout(x, 400));
          listRes = await fetch(`/api/admin/plans?_=${Date.now()}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache' } });
        }
        if (!listRes.ok) {
          const errData = await listRes.json().catch(() => ({}));
          const details = (errData?.details as string) || (errData?.error as string);
          const msg = details ? `${listRes.status}: ${details}` : String(listRes.status);
          alert(ar ? `تعذر تحميل الباقات (${msg}).` : `Could not load plans (${msg}).`);
          return;
        }
        const listData = await listRes.json();
        const list = Array.isArray(listData?.list) ? listData.list : [];
        const found = list.find((p: { code: string }) => p.code === plan.code);
        if (!found) {
          await loadData();
          setShowEditModal(false);
          setEditingPlan(null);
          return;
        }
        const planWithRealId = { ...plan, id: found.id };
        const result = await patchPlan(planWithRealId);
        if (result.ok) {
          setShowEditModal(false);
          setEditingPlan(null);
          await loadData();
        } else {
          alert(ar ? `فشل الحفظ: ${result.error || 'خطأ غير معروف'}` : `Save failed: ${result.error || 'Unknown error'}`);
        }
      } catch (e) {
        console.error(e);
        alert(ar ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = ar ? 'حفظ' : 'Save'; }
      }
      return;
    }
    const el = modalEditRef.current;
    const saveBtn = el?.querySelector('[data-save="edit"]') as HTMLButtonElement | null;
    try {
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = ar ? 'جاري الحفظ...' : 'Saving...'; }
      const result = await patchPlan(plan);
      if (result.ok) {
        setShowEditModal(false);
        setEditingPlan(null);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
        setTimeout(() => loadData(), 300);
      } else {
        alert(ar ? `فشل الحفظ: ${result.error || 'خطأ غير معروف'}` : `Save failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(ar ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = ar ? 'حفظ' : 'Save'; }
    }
  };

  const openFeatures = (plan: PlanRow) => {
    setEditingPlanId(plan.id);
    setEditingFeatures([...(plan.features || [])]);
    setEditingFeaturesAr([...(plan.featuresAr || [])]);
    setShowFeaturesModal(true);
  };

  const onSaveFeatures = async () => {
    const planId = editingPlanId;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    if (!isDbPlan(plan.id)) {
      const saveBtn = modalFeaturesRef.current?.querySelector('[data-save="features"]') as HTMLButtonElement | null;
      try {
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = ar ? 'جاري الحفظ...' : 'Saving...'; }
        await fetch('/api/plans/init', { method: 'POST', ...FETCH_OPTS }).then((r) => r.json().catch(() => ({})));
        let listRes = await fetch(`/api/admin/plans?_=${Date.now()}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache' } });
        for (let r = 0; r < 2 && (listRes.status === 403 || listRes.status === 401); r++) {
          await new Promise((x) => setTimeout(x, 400));
          listRes = await fetch(`/api/admin/plans?_=${Date.now()}`, { ...FETCH_OPTS, headers: { Pragma: 'no-cache' } });
        }
        if (!listRes.ok) {
          const errData = await listRes.json().catch(() => ({}));
          const details = (errData?.details as string) || (errData?.error as string);
          const msg = details ? `${listRes.status}: ${details}` : String(listRes.status);
          alert(ar ? `تعذر تحميل الباقات (${msg}).` : `Could not load plans (${msg}).`);
          return;
        }
        const listData = await listRes.json();
        const list = Array.isArray(listData?.list) ? listData.list : [];
        const found = list.find((p: { code: string }) => p.code === plan.code);
        if (!found) {
          await loadData();
          setShowFeaturesModal(false);
          return;
        }
        const feats = editingFeatures.filter((f) => f.trim() !== '');
        const featsAr = editingFeaturesAr.filter((f) => f.trim() !== '');
        const featuresToSave = featsAr.length ? featsAr : feats;
        const planWithRealId = { ...plan, id: found.id };
        const result = await patchPlan(planWithRealId, { features: featuresToSave });
        if (result.ok) {
          setShowFeaturesModal(false);
          await loadData();
        } else {
          alert(ar ? `فشل حفظ الميزات: ${result.error || 'خطأ غير معروف'}` : `Features save failed: ${result.error || 'Unknown error'}`);
        }
      } catch (e) {
        console.error(e);
        alert(ar ? 'حدث خطأ أثناء حفظ الميزات' : 'An error occurred while saving features');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = ar ? 'حفظ الميزات' : 'Save features'; }
      }
      return;
    }
    const feats = editingFeatures.filter((f) => f.trim() !== '');
    const featsAr = editingFeaturesAr.filter((f) => f.trim() !== '');
    const featuresToSave = featsAr.length ? featsAr : feats;
    const el = modalFeaturesRef.current;
    const saveBtn = el?.querySelector('[data-save="features"]') as HTMLButtonElement | null;
    try {
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = ar ? 'جاري الحفظ...' : 'Saving...'; }
      const result = await patchPlan(plan, { features: featuresToSave });
      if (result.ok) {
        setShowFeaturesModal(false);
        setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, features: feats, featuresAr: featsAr } : p)));
        setTimeout(() => loadData(), 300);
      } else {
        alert(ar ? `فشل حفظ الميزات: ${result.error || 'خطأ غير معروف'}` : `Features save failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving features:', error);
      alert(ar ? 'حدث خطأ أثناء حفظ الميزات' : 'An error occurred while saving features');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = ar ? 'حفظ الميزات' : 'Save features'; }
    }
  };

  if (sessionStatus === 'unauthenticated' || (sessionStatus === 'authenticated' && !isAdmin)) {
    return (
      <div className="admin-page-content">
        <div className="admin-card max-w-lg mx-auto overflow-hidden">
          <div className="admin-card-body p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-5" style={{ lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {ar ? 'إدارة الباقات متاحة للإدارة فقط.' : 'Plan management is for administrators only.'}
            </p>
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
          <h1 className="admin-page-title" style={{ lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {ar ? 'إدارة الاشتراكات والصلاحيات' : 'Subscriptions & Permissions'}
          </h1>
          <p className="admin-page-subtitle" style={{ marginTop: 0 }}>
            {ar ? 'التحكم الكامل في الباقات، الميزات، والصلاحيات' : 'Full control over plans, features and permissions'}
          </p>
          {plans.length > 0 && plansFromDb && (
            <div className="mt-4" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={saveAllChanges}
                disabled={savingAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-opacity disabled:opacity-50 text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 border-2 border-transparent"
              >
                <Icon name="checkCircle" className={`w-5 h-5 shrink-0 ${savingAll ? 'animate-spin opacity-80' : ''}`} />
                {savingAll ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ جميع التغييرات' : 'Save all changes')}
              </button>
              <p className="text-sm text-gray-500 mt-2" style={{ lineHeight: 1.5 }}>
                {ar ? 'يحفظ الحدود والصلاحيات لجميع الباقات' : 'Saves limits and permissions for all plans'}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" style={{ marginBottom: '1.5rem' }}>
          {[
            { label: ar ? 'الباقات' : 'Plans', value: plans.length, icon: 'folder', color: 'bg-[var(--primary)]/10' },
            { label: ar ? 'المستخدمون' : 'Users', value: users.length, icon: 'users', color: 'bg-emerald-500/10' },
            { label: ar ? 'الصلاحيات' : 'Permissions', value: ALL_FEATURES.length, icon: 'lock', color: 'bg-violet-500/10' },
            { label: ar ? 'النشطة' : 'Active', value: users.filter((u) => u.subscription?.status === 'active').length, icon: 'checkCircle', color: 'bg-amber-500/10' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="admin-card overflow-hidden">
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1" style={{ lineHeight: 1.5 }}>{label}</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <Icon name={icon as 'folder' | 'users' | 'lock' | 'checkCircle'} className="w-6 h-6 text-[var(--primary)]" />
                </div>
              </div>
            </div>
          ))}
        </div>

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
                              <input
                                type="number"
                                value={plan[key]}
                                onChange={(e) => onLimitChange(plan.id, key, Number(e.target.value))}
                                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[var(--primary)]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الميزات' : 'Features'} ({(plan.featuresAr || []).length})</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {(plan.featuresAr || []).slice(0, 5).map((f, i) => (
                            <p key={i} className="flex items-start gap-2 text-xs text-gray-600" style={{ lineHeight: 1.5 }}>
                              <span className="text-emerald-600 shrink-0">✓</span>
                              <span className="line-clamp-1">{f}</span>
                            </p>
                          ))}
                          {(plan.featuresAr || []).length > 5 && <p className="text-xs text-gray-500">+{(plan.featuresAr || []).length - 5}</p>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600" style={{ lineHeight: 1.5 }}>
                        {ar ? 'الصلاحيات' : 'Permissions'}: {plansConfig[plan.id]?.length ?? 0} / {ALL_FEATURES.length}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => openEdit(plan)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold transition-colors">
                          <Icon name="pencil" className="w-4 h-4" />
                          {ar ? 'تعديل' : 'Edit'}
                        </button>
                        <button type="button" onClick={() => openFeatures(plan)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold transition-colors">
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

        {plans.length > 0 && (
          <div className="admin-card mb-6 overflow-hidden" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header border-b border-gray-100">
              <h2 className="admin-card-title flex items-center gap-2 text-lg font-bold text-gray-900" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                <span className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Icon name="lock" className="w-5 h-5 text-violet-600" />
                </span>
                {ar ? 'مصفوفة الصلاحيات' : 'Permissions matrix'} ({ALL_FEATURES.length})
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
                          <button
                            type="button"
                            onClick={() => onToggleAllFeatures(plan.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${allSelected(plan.id) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {allSelected(plan.id) ? (ar ? 'إلغاء الكل' : 'Deselect all') : (ar ? 'تحديد الكل' : 'Select all')}
                          </button>
                          <p className="text-xs text-gray-600 mt-1" style={{ lineHeight: 1.5 }}>{(plansConfig[plan.id] || []).length} / {ALL_FEATURES.length}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ALL_FEATURES.map((featureId) => {
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
                              <input
                                type="checkbox"
                                checked={hasFeature(plan.id, featureId)}
                                onChange={() => onToggleFeature(plan.id, featureId)}
                                className="w-5 h-5 text-[var(--primary)] border-gray-300 rounded focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
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
            <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/50">
              <p className="text-sm text-gray-600" style={{ lineHeight: 1.5 }}>{ALL_FEATURES.length} {ar ? 'صلاحية' : 'permissions'} · {plans.length} {ar ? 'باقة' : 'plans'}</p>
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-header border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <h2 className="admin-card-title flex items-center gap-2 text-lg font-bold text-gray-900" style={{ lineHeight: 1.5, marginBottom: 0 }}>
              <span className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="users" className="w-5 h-5 text-emerald-600" />
              </span>
              {ar ? 'تعيين الباقات للمستخدمين' : 'Assign plans to users'}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="magnifyingGlass" className="w-4 h-4" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={ar ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 sm:w-56 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                />
              </label>
              <select
                value={userFilterPlan}
                onChange={(e) => setUserFilterPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
                title={ar ? 'فلترة حسب الباقة الحالية' : 'Filter by current plan'}
              >
                <option value="">{ar ? 'كل الباقات' : 'All plans'}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.nameAr}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-card-body p-0 overflow-hidden">
            {users.length === 0 ? (
              <p className="text-gray-500 py-8 px-4 text-center">{ar ? 'لا يوجد مستخدمون.' : 'No users.'}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-gray-500 py-8 px-4 text-center">{ar ? 'لا توجد نتائج للبحث أو الفلتر.' : 'No results for search or filter.'}</p>
            ) : (
              <div className="admin-table-wrapper overflow-x-auto">
                <table className="admin-table min-w-[640px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'المستخدم' : 'User'}</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'البريد / الرقم' : 'Email / Number'}</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'الباقة الحالية' : 'Current plan'}</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'استرداد المبلغ' : 'Refund'}</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'تعيين الباقة' : 'Assign plan'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const currentPlan = user.subscription ? plans.find((p) => p.id === user.subscription!.planId) : null;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900" style={{ lineHeight: 1.5 }}>{user.name || (ar ? '—' : '—')}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm" style={{ lineHeight: 1.5 }}>{user.email || user.serialNumber || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            {currentPlan ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Icon name="checkCircle" className="w-4 h-4 shrink-0" />
                                {currentPlan.nameAr}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">{ar ? 'بدون باقة' : 'No plan'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(user.currentPlanPrice ?? 0) > 0 ? (
                              user.refundProcessedAt ? (
                                <span className="text-xs text-emerald-600 font-medium">{ar ? 'تم الاسترداد' : 'Refund done'}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onRefundDone(user.id)}
                                  disabled={refundingUserId === user.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100 disabled:opacity-60"
                                  title={ar ? 'بعد تنفيذ استرداد المبلغ من لوحة المحاسبة اضغط هنا' : 'After processing refund in accounting, click here'}
                                >
                                  {refundingUserId === user.id ? (ar ? 'جاري...' : '...') : (ar ? 'تم استرداد المبلغ' : 'Refund done')}
                                </button>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {plans.map((plan) => {
                                const isCurrent = user.subscription?.planId === plan.id;
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => onAssignPlan(user.id, plan.id)}
                                    disabled={assigningUserId === user.id || !plansFromDb}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-60 shrink-0 ${isCurrent ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-[var(--primary)]/50 hover:bg-gray-50'}`}
                                    title={plan.nameAr}
                                  >
                                    {isCurrent && <Icon name="checkCircle" className="w-3.5 h-3.5" />}
                                    {plan.nameAr}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredUsers.length > 0 && (
              <p className="text-sm text-gray-500 px-4 py-3 border-t border-gray-100" style={{ lineHeight: 1.5 }}>
                {ar ? `عرض ${filteredUsers.length} من ${users.length} مستخدم` : `${filteredUsers.length} of ${users.length} users`}
              </p>
            )}
          </div>
        </div>
      </div>

      {showEditModal && editingPlan && (
        <div ref={modalEditRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'تعديل الباقة' : 'Edit plan'}: {editingPlan.nameAr}</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors" aria-label={ar ? 'إغلاق' : 'Close'}>×</button>
            </div>
            <div className="p-5 space-y-5" style={{ lineHeight: 1.5 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                  <input type="text" value={editingPlan.nameAr} onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                  <input type="text" value={editingPlan.nameEn} onChange={(e) => setEditingPlan({ ...editingPlan, nameEn: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--primary)]" />
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
                    {(['basic', 'standard', 'premium', 'enterprise'] as const).map((code) => (
                      <option key={code} value={code}>{ar ? { basic: 'أساسي', standard: 'معياري', premium: 'مميز', enterprise: 'مؤسسي' }[code] : code}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" style={{ marginBottom: '1.5rem' }}>{ar ? 'اللون' : 'Color'}</label>
                <div className="flex gap-2 flex-wrap">
                  {(['basic', 'standard', 'premium', 'enterprise'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, color: PLAN_COLORS[code] || 'bg-[var(--primary)]' })}
                      className={`${PLAN_COLORS[code]} px-3 py-2 rounded-xl text-white text-xs font-semibold transition-all ${editingPlan.color === PLAN_COLORS[code] ? 'ring-2 ring-offset-2 ring-gray-500' : 'opacity-80 hover:opacity-100'}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200" style={{ paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" data-save="edit" onClick={onSaveEdit} className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  {ar ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFeaturesModal && (
        <div ref={modalFeaturesRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFeaturesModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900" style={{ lineHeight: 1.5 }}>{ar ? 'تعديل الميزات' : 'Edit features'}: {plans.find((p) => p.id === editingPlanId)?.nameAr}</h3>
              <button type="button" onClick={() => setShowFeaturesModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors" aria-label={ar ? 'إغلاق' : 'Close'}>×</button>
            </div>
            <div className="p-5">
              <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                <button type="button" onClick={() => { setEditingFeatures([...editingFeatures, '']); setEditingFeaturesAr([...editingFeaturesAr, '']); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  <Icon name="plus" className="w-4 h-4" />
                  {ar ? 'إضافة ميزة' : 'Add feature'}
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editingFeaturesAr.map((_, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input type="text" value={editingFeatures[idx] || ''} onChange={(e) => { const n = [...editingFeatures]; n[idx] = e.target.value; setEditingFeatures(n); }} placeholder={ar ? 'بالإنجليزية' : 'English'} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)]" />
                    </div>
                    <div className="col-span-6">
                      <input type="text" value={editingFeaturesAr[idx] || ''} onChange={(e) => { const n = [...editingFeaturesAr]; n[idx] = e.target.value; setEditingFeaturesAr(n); }} placeholder={ar ? 'بالعربية' : 'Arabic'} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)]" />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => { setEditingFeatures(editingFeatures.filter((_, i) => i !== idx)); setEditingFeaturesAr(editingFeaturesAr.filter((_, i) => i !== idx)); }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6 pt-5 border-t border-gray-200" style={{ marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowFeaturesModal(false)} className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
<button type="button" data-save="features" onClick={onSaveFeatures} className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
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
