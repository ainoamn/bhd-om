'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  getYearlyPrice,
  formatPlanCurrency,
  type SubscriptionPlanDisplay,
  type UserSubscriptionDisplay,
} from '@/lib/subscriptionSystem';

const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-blue-500',
  standard: 'bg-green-500',
  premium: 'bg-purple-500',
  enterprise: 'bg-amber-600',
};

export default function SubscriptionsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const { data: session, status } = useSession();
  const [plans, setPlans] = useState<SubscriptionPlanDisplay[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionDisplay | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const load = async () => {
      try {
        if (session?.user) {
          const res = await fetch('/api/subscriptions/me');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.plans) && data.plans.length > 0) setPlans(data.plans);
            if (data.subscription) setUserSubscription(data.subscription);
          }
        }
        const resPlans = await fetch('/api/plans');
        if (resPlans.ok) {
          const data = await resPlans.json();
          if (Array.isArray(data.list) && data.list.length > 0) {
            setPlans((prev) => (prev.length > 0 ? prev : data.list));
          }
        }
      } catch (e) {
        console.error(e);
        const resPlans = await fetch('/api/plans');
        if (resPlans.ok) {
          const data = await resPlans.json();
          if (Array.isArray(data.list) && data.list.length > 0) setPlans(data.list);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status, session?.user]);

  const handleSelectPlan = (planId: string) => {
    if (!session?.user) {
      router.push(`/${locale}/login?callbackUrl=/${locale}/subscriptions`);
      return;
    }
    setSelectedPlanId(planId);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedPlanId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          durationMonths: billingCycle === 'yearly' ? 12 : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'));
        return;
      }
      setShowPaymentModal(false);
      setSelectedPlanId('');
      alert(locale === 'ar' ? 'تم تفعيل الاشتراك بنجاح' : 'Subscription activated successfully');
      const refetch = await fetch('/api/subscriptions/me');
      if (refetch.ok) {
        const d = await refetch.json();
        if (d.subscription) setUserSubscription(d.subscription);
      }
      router.push(`/${locale}/admin/my-account`);
    } catch (e) {
      console.error(e);
      alert(locale === 'ar' ? 'حدث خطأ في عملية الاشتراك' : 'Subscription request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const ar = locale === 'ar';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center mb-10">
          <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-bold mb-4">
            {ar ? 'عرض خاص — خصم 20% على الاشتراك السنوي' : 'Special offer — 20% off yearly'}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {ar ? 'اختر الباقة المثالية' : 'Choose the right plan'}
          </h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto mb-8">
            {ar
              ? 'باقات مرنة تناسب إدارة العقارات والحجوزات والعقود'
              : 'Flexible plans for property management, bookings and contracts'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className={billingCycle === 'monthly' ? 'font-semibold' : 'opacity-70'}>
              {ar ? 'شهرياً' : 'Monthly'}
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
              className={`relative w-14 h-7 rounded-full transition-all ${billingCycle === 'yearly' ? 'bg-green-400' : 'bg-white/30'}`}
              aria-label={ar ? 'تبديل الفترة' : 'Toggle billing'}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${billingCycle === 'yearly' ? 'right-1' : 'right-8'}`}
              />
            </button>
            <span className={billingCycle === 'yearly' ? 'font-semibold' : 'opacity-70'}>
              {ar ? 'سنوياً' : 'Yearly'}
            </span>
            {billingCycle === 'yearly' && (
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">
                {ar ? 'وفّر 20%' : 'Save 20%'}
              </span>
            )}
          </div>
        </div>

        {/* Current subscription banner */}
        {userSubscription && userSubscription.plan && (
          <div className="max-w-4xl mx-auto mb-10">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">✓</div>
                <div>
                  <div className="text-sm opacity-90">{ar ? 'اشتراكك الحالي' : 'Your plan'}</div>
                  <div className="text-xl font-bold">{userSubscription.plan.nameAr || userSubscription.plan.nameEn}</div>
                  <div className="text-sm opacity-90">
                    {userSubscription.status === 'active'
                      ? `${ar ? 'نشط حتى' : 'Active until'} ${new Date(userSubscription.endAt).toLocaleDateString(locale)}`
                      : userSubscription.status}
                  </div>
                </div>
              </div>
              <Link
                href={`/${locale}/admin/my-account`}
                className="px-5 py-2.5 bg-white text-green-700 rounded-xl hover:bg-gray-100 font-semibold transition-colors"
              >
                {ar ? 'عرض لوحة التحكم' : 'Dashboard'}
              </Link>
            </div>
          </div>
        )}

        {/* Plans grid أو رسالة عدم توفر باقات */}
        {plans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center mb-16">
            <p className="text-lg text-gray-700 mb-4">
              {ar ? 'الباقات غير متوفرة حالياً.' : 'Plans are not available at the moment.'}
            </p>
            <p className="text-gray-600 mb-6">
              {ar
                ? 'إذا كنت مسؤولاً عن الموقع، ادخل إلى لوحة التحكم ← الاشتراكات والباقات واضغط «تهيئة الباقات الافتراضية».'
                : 'If you are an administrator, go to Dashboard → Subscriptions & Plans and click «Initialize default plans».'}
            </p>
            <Link
              href={`/${locale}/admin/subscriptions`}
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
            >
              {ar ? 'لوحة التحكم — الاشتراكات' : 'Dashboard — Subscriptions'}
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, idx) => {
            const isCurrent = userSubscription?.planId === plan.id;
            const price =
              billingCycle === 'yearly' && (plan.priceYearly ?? plan.priceMonthly)
                ? (plan.priceYearly ?? getYearlyPrice(plan.priceMonthly))
                : plan.priceMonthly;
            const priceLabel = billingCycle === 'yearly' ? (ar ? 'سنوياً' : 'Yearly') : (ar ? 'شهرياً' : 'Monthly');
            const color = PLAN_COLORS[plan.code] || 'bg-gray-500';
            const popular = plan.code === 'standard';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl shadow-xl transition-all hover:shadow-2xl ${
                  popular ? 'ring-2 ring-primary scale-[1.02] bg-white' : 'bg-white'
                }`}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary text-white rounded-full text-sm font-bold">
                      {ar ? 'الأكثر شعبية' : 'Popular'}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-4 end-4">
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                      {ar ? 'باقتك' : 'Current'}
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">
                      {idx === 0 ? '🌱' : idx === 1 ? '🚀' : idx === 2 ? '💎' : '👑'}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {ar ? plan.nameAr : plan.nameEn}
                    </h3>
                  </div>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-gray-900">
                      {formatPlanCurrency(price, plan.currency)}
                    </div>
                    <div className="text-sm text-gray-600">{priceLabel}</div>
                    {billingCycle === 'yearly' && (
                      <div className="text-xs mt-1 text-gray-500">
                        <span className="line-through">
                          {formatPlanCurrency(plan.priceMonthly * 12, plan.currency)}
                        </span>
                        <span className="text-green-600 font-semibold ms-1">
                          {ar ? 'وفّر' : 'Save'}{' '}
                          {formatPlanCurrency(plan.priceMonthly * 12 * 0.2, plan.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {(plan.features || []).slice(0, 6).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2 mb-6 pb-6 border-b border-gray-200">
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="text-lg font-bold text-gray-900">
                        {plan.limits?.maxProperties === -1 || plan.limits?.maxProperties == null
                          ? '∞'
                          : plan.limits.maxProperties}
                      </div>
                      <div className="text-xs text-gray-600">{ar ? 'عقار' : 'Properties'}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="text-lg font-bold text-gray-900">
                        {plan.limits?.maxBookings === -1 || plan.limits?.maxBookings == null
                          ? '∞'
                          : plan.limits.maxBookings}
                      </div>
                      <div className="text-xs text-gray-600">{ar ? 'حجز' : 'Bookings'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      isCurrent
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {isCurrent ? (ar ? 'باقتك الحالية' : 'Current plan') : ar ? 'اشترك الآن' : 'Subscribe'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Comparison table */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 overflow-x-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              {ar ? 'مقارنة الباقات' : 'Plan comparison'}
            </h2>
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right py-4 px-4 text-sm font-bold text-gray-700">
                    {ar ? 'الميزة' : 'Feature'}
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center py-4 px-4">
                      <span
                        className={`inline-block px-3 py-1.5 ${PLAN_COLORS[p.code] || 'bg-gray-500'} text-white rounded-lg font-bold text-sm`}
                      >
                        {ar ? p.nameAr : p.nameEn}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { label: ar ? 'عدد العقارات' : 'Properties', key: 'maxProperties' },
                  { label: ar ? 'عدد الوحدات' : 'Units', key: 'maxUnits' },
                  { label: ar ? 'عدد الحجوزات' : 'Bookings', key: 'maxBookings' },
                  { label: ar ? 'المستخدمون' : 'Users', key: 'maxUsers' },
                  { label: ar ? 'التخزين (GB)' : 'Storage (GB)', key: 'storageGB', suffix: ' GB' },
                ].map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-700">{row.label}</td>
                    {plans.map((p) => {
                      const val = p.limits?.[row.key];
                      const display =
                        val === -1 || val == null ? '∞' : `${val}${row.suffix || ''}`;
                      return (
                        <td key={p.id} className="text-center py-3 px-4 font-semibold text-gray-900">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CTA when not logged in */}
        {!session?.user && (
          <p className="text-center mt-8 text-gray-600">
            {ar ? 'سجّل الدخول لاختيار باقة والاشتراك.' : 'Sign in to choose a plan and subscribe.'}{' '}
            <Link href={`/${locale}/login`} className="text-primary font-semibold underline">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </p>
        )}
      </div>

      {/* Payment modal */}
      {showPaymentModal && selectedPlanId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {ar ? 'إتمام الاشتراك' : 'Complete subscription'}
            </h3>
            {(() => {
              const plan = plans.find((p) => p.id === selectedPlanId);
              if (!plan) return null;
              const price =
                billingCycle === 'yearly'
                  ? (plan.priceYearly ?? getYearlyPrice(plan.priceMonthly))
                  : plan.priceMonthly;
              return (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="text-sm text-gray-600 mb-1">{ar ? 'الباقة' : 'Plan'}</div>
                  <div className="text-xl font-bold text-gray-900">
                    {ar ? plan.nameAr : plan.nameEn}
                  </div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {formatPlanCurrency(price, plan.currency)}{' '}
                    <span className="text-sm font-normal text-gray-600">
                      {billingCycle === 'yearly' ? (ar ? 'سنوياً' : 'Yearly') : (ar ? 'شهرياً' : 'Monthly')}
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-sm text-gray-600 mb-6">
              {ar
                ? 'سيتم تفعيل اشتراكك فوراً. يمكنك تغيير الباقة لاحقاً من لوحة التحكم.'
                : 'Your subscription will be activated immediately. You can change plan later from the dashboard.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !submitting && setShowPaymentModal(false)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-70"
              >
                {submitting ? (ar ? 'جاري...' : 'Processing...') : ar ? 'إتمام الاشتراك' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
