'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { PLAN_COLORS } from '@/lib/featurePermissions';
import { getYearlyPrice, formatPlanCurrency, type SubscriptionPlanDisplay, type UserSubscriptionDisplay } from '@/lib/subscriptionSystem';

export default function SubscriptionsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
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
          if (Array.isArray(data.list) && data.list.length > 0) setPlans((prev) => (prev.length > 0 ? prev : data.list));
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
        body: JSON.stringify({ planId: selectedPlanId, durationMonths: billingCycle === 'yearly' ? 12 : 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || (ar ? 'حدث خطأ' : 'An error occurred'));
        return;
      }
      setShowPaymentModal(false);
      setSelectedPlanId('');
      alert(ar ? 'تم تفعيل الاشتراك بنجاح!' : 'Subscription activated!');
      const refetch = await fetch('/api/subscriptions/me');
      if (refetch.ok) {
        const d = await refetch.json();
        if (d.subscription) setUserSubscription(d.subscription);
      }
      router.push(`/${locale}/admin/my-account`);
    } catch (e) {
      console.error(e);
      alert(ar ? 'حدث خطأ في عملية الدفع' : 'Payment error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[var(--primary)]/5 via-white to-[var(--primary)]/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary)]/5 via-white to-[var(--primary)]/10" dir={ar ? 'rtl' : 'ltr'}>
      {/* Hero Header — كما في الموقع القديم */}
      <div className="bg-gradient-to-r from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="mb-6">
            <span className="inline-block px-6 py-2 bg-white/20 backdrop-blur-lg rounded-full text-sm font-bold border border-white/30 mb-6">
              {ar ? 'عرض خاص - خصم 20% على الاشتراك السنوي' : 'Special offer - 20% off yearly'}
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
            {ar ? 'اختر الباقة المثالية' : 'Choose the right plan'}
          </h1>
          <p className="text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed">
            {ar ? 'باقات مرنة ومتنوعة تناسب جميع احتياجاتك في إدارة العقارات' : 'Flexible plans for property management'}
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={'font-medium ' + (billingCycle === 'monthly' ? 'text-white' : 'text-white/60')}>
              {ar ? 'شهرياً' : 'Monthly'}
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
              className={'relative w-16 h-8 rounded-full transition-all ' + (billingCycle === 'yearly' ? 'bg-green-500' : 'bg-white/30')}
            >
              <span
                className={'absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ' + (billingCycle === 'yearly' ? 'right-1' : 'right-9')}
              />
            </button>
            <span className={'font-medium ' + (billingCycle === 'yearly' ? 'text-white' : 'text-white/60')}>
              {ar ? 'سنوياً' : 'Yearly'}
            </span>
            {billingCycle === 'yearly' && (
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold animate-pulse">
                {ar ? 'وفّر 20%' : 'Save 20%'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      {userSubscription && userSubscription.plan && (
        <div className="max-w-7xl mx-auto px-6 -mt-10 mb-8 relative z-10">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
                  <Icon name="shieldCheck" className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm opacity-90 mb-1">{ar ? 'اشتراكك الحالي' : 'Your plan'}</div>
                  <div className="text-2xl font-bold">
                    {userSubscription.plan.nameAr || userSubscription.plan.nameEn}
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    {userSubscription.status === 'active'
                      ? '✓ ' + (ar ? 'نشط' : 'Active') + (userSubscription.remainingDays != null ? ' - ' + userSubscription.remainingDays + ' ' + (ar ? 'يوم متبقي' : 'days left') : ' - ' + (ar ? 'حتى' : 'until') + ' ' + new Date(userSubscription.endAt).toLocaleDateString(locale))
                      : '⚠️ ' + (ar ? 'منتهي' : 'Expired')}
                  </div>
                </div>
              </div>
              <Link
                href={'/' + locale + '/admin/my-account'}
                className="px-6 py-3 bg-white text-green-600 rounded-xl hover:bg-gray-50 font-bold shadow-lg transition-all"
              >
                {ar ? 'عرض لوحة التحكم' : 'Dashboard'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {plans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center mb-16">
            <p className="text-lg text-gray-700 mb-4">{ar ? 'الباقات غير متوفرة حالياً.' : 'Plans not available.'}</p>
            <p className="text-gray-600 mb-6">
              {ar ? 'إذا كنت مسؤولاً، ادخل لوحة التحكم ← الاشتراكات واضغط «تهيئة الباقات الافتراضية».' : 'Go to Dashboard → Subscriptions and click «Initialize default plans».'}
            </p>
            <Link href={'/' + locale + '/admin/subscriptions'} className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90">
              {ar ? 'لوحة التحكم — الاشتراكات' : 'Dashboard — Subscriptions'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, idx) => {
              const isCurrentPlan = userSubscription?.planId === plan.id;
              const price = billingCycle === 'yearly' ? getYearlyPrice(plan.priceMonthly) : plan.priceMonthly;
              const priceLabel = billingCycle === 'yearly' ? (ar ? 'سنوياً' : 'Yearly') : (ar ? 'شهرياً' : 'Monthly');
              const popular = plan.code === 'standard';
              const color = PLAN_COLORS[plan.code] || 'bg-[var(--primary)]';

              return (
                <div
                  key={plan.id}
                  className={'relative rounded-3xl shadow-2xl transition-all transform hover:scale-105 ' + (popular ? 'ring-2 ring-[var(--primary)] scale-110 z-10 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white' : 'bg-white hover:shadow-3xl')}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="px-6 py-2 bg-[var(--primary-light)] text-white rounded-full text-sm font-bold shadow-lg flex items-center justify-center gap-2">
                        ★ {ar ? 'الأكثر شعبية' : 'Popular'}
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-4">
                      <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg">
                        ✓ {ar ? 'باقتك الحالية' : 'Current plan'}
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    <div className="text-center mb-8">
                      <div className="text-5xl mb-4">
                        {idx === 0 ? '🌱' : idx === 1 ? '🚀' : idx === 2 ? '💎' : '👑'}
                      </div>
                      <h3 className={'text-2xl font-bold mb-2 ' + (popular ? 'text-white' : 'text-gray-900')}>
                        {ar ? plan.nameAr : plan.nameEn}
                      </h3>
                      <p className={'text-sm ' + (popular ? 'text-white/80' : 'text-gray-600')}>
                        {plan.descriptionAr || plan.descriptionEn || ''}
                      </p>
                    </div>

                    <div className="text-center mb-8">
                      <div className={'text-5xl font-extrabold mb-2 ' + (popular ? 'text-white' : 'text-gray-900')}>
                        {formatPlanCurrency(price, plan.currency)}
                      </div>
                      <div className={'text-sm ' + (popular ? 'text-white/80' : 'text-gray-600')}>{priceLabel}</div>
                      {billingCycle === 'yearly' && (
                        <div className={'text-xs mt-2 ' + (popular ? 'text-white/70' : 'text-gray-500')}>
                          <span className="line-through">{formatPlanCurrency(plan.priceMonthly * 12, plan.currency)}</span>
                          <span className="text-green-600 font-bold ms-2">{ar ? 'وفّر' : 'Save'} {formatPlanCurrency(plan.priceMonthly * 12 * 0.2, plan.currency)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-8">
                      {(plan.features || []).map((feature: string, fidx: number) => (
                        <div key={fidx} className="flex items-start gap-3">
                          <span className={'flex-shrink-0 mt-0.5 ' + (popular ? 'text-green-300' : 'text-green-600')}>✓</span>
                          <span className={'text-sm ' + (popular ? 'text-white/90' : 'text-gray-700')}>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className={'grid grid-cols-2 gap-3 mb-8 pb-8 border-b ' + (popular ? 'border-white/20' : 'border-gray-200')}>
                      <div className={'text-center p-3 rounded-lg ' + (popular ? 'bg-white/10' : 'bg-gray-50')}>
                        <div className={'text-2xl font-bold ' + (popular ? 'text-white' : 'text-gray-900')}>
                          {plan.limits?.maxProperties === -1 || plan.limits?.maxProperties == null ? '∞' : plan.limits.maxProperties}
                        </div>
                        <div className={'text-xs ' + (popular ? 'text-white/70' : 'text-gray-600')}>{ar ? 'عقار' : 'Properties'}</div>
                      </div>
                      <div className={'text-center p-3 rounded-lg ' + (popular ? 'bg-white/10' : 'bg-gray-50')}>
                        <div className={'text-2xl font-bold ' + (popular ? 'text-white' : 'text-gray-900')}>
                          {plan.limits?.maxBookings === -1 || plan.limits?.maxBookings == null ? '∞' : plan.limits.maxBookings}
                        </div>
                        <div className={'text-xs ' + (popular ? 'text-white/70' : 'text-gray-600')}>{ar ? 'حجز' : 'Bookings'}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrentPlan}
                      className={'w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ' + (popular ? 'bg-white text-[var(--primary)] hover:bg-gray-50' : isCurrentPlan ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:opacity-90')}
                    >
                      {isCurrentPlan ? (ar ? '✓ باقتك الحالية' : 'Current plan') : ar ? 'اشترك الآن' : 'Subscribe'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features Comparison — كما في الموقع القديم */}
        {plans.length > 0 && (
          <div className="mt-20 bg-white rounded-3xl shadow-2xl p-10">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              {ar ? 'مقارنة شاملة للباقات' : 'Plan comparison'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right px-6 py-4 text-sm font-bold text-gray-700">{ar ? 'الميزة' : 'Feature'}</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center px-6 py-4">
                        <div className={'inline-block px-4 py-2 ' + (PLAN_COLORS[plan.code] || 'bg-gray-500') + ' text-white rounded-lg font-bold'}>
                          {ar ? plan.nameAr : plan.nameEn}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { label: '🏢 ' + (ar ? 'عدد العقارات' : 'Properties'), key: 'maxProperties' },
                    { label: '🏠 ' + (ar ? 'عدد الوحدات' : 'Units'), key: 'maxUnits' },
                    { label: '📅 ' + (ar ? 'عدد الحجوزات' : 'Bookings'), key: 'maxBookings' },
                    { label: '👥 ' + (ar ? 'عدد المستخدمين' : 'Users'), key: 'maxUsers' },
                    { label: '💾 ' + (ar ? 'مساحة التخزين' : 'Storage'), key: 'storageGB', suffix: ' GB' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{row.label}</td>
                      {plans.map((plan) => {
                        const val = plan.limits?.[row.key];
                        const display = val === -1 || val == null ? '∞' : String(val) + (row.suffix || '');
                        return (
                          <td key={plan.id} className="text-center px-6 py-4">
                            <span className="font-bold text-gray-900">{display}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">🔐 {ar ? 'عدد الصلاحيات' : 'Permissions'}</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center px-6 py-4">
                        <span className="font-bold text-[var(--primary)]">—</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* لماذا بن حمود؟ — كما في الموقع القديم */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">{ar ? 'لماذا بن حمود؟' : 'Why BHD?'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { icon: '🚀', title: ar ? 'سريع وسهل' : 'Fast & easy', desc: ar ? 'واجهة بسيطة وسلسة' : 'Simple interface' },
              { icon: '🔒', title: ar ? 'آمن ومحمي' : 'Secure', desc: ar ? 'أمان عالي لبياناتك' : 'Your data is safe' },
              { icon: '🤖', title: ar ? 'ذكاء اصطناعي' : 'AI-powered', desc: ar ? 'توصيات وتحليلات ذكية' : 'Smart insights' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all">
                <div className="text-6xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal — كما في الموقع القديم */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              {ar ? 'إتمام عملية الدفع' : 'Complete payment'}
            </h3>

            {selectedPlanId && (
              <div className="bg-gradient-to-r from-[var(--primary)]/10 to-[var(--primary)]/5 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">{ar ? 'الباقة المختارة' : 'Selected plan'}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {plans.find((p) => p.id === selectedPlanId)?.nameAr || plans.find((p) => p.id === selectedPlanId)?.nameEn}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-3xl font-bold text-[var(--primary)]">
                      {formatPlanCurrency(
                        billingCycle === 'yearly'
                          ? getYearlyPrice(plans.find((p) => p.id === selectedPlanId)?.priceMonthly || 0)
                          : plans.find((p) => p.id === selectedPlanId)?.priceMonthly || 0,
                        plans.find((p) => p.id === selectedPlanId)?.currency || 'OMR'
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{billingCycle === 'yearly' ? (ar ? 'سنوياً' : 'Yearly') : (ar ? 'شهرياً' : 'Monthly')}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">{ar ? 'طريقة الدفع' : 'Payment method'}</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'credit', label: ar ? 'بطاقة ائتمان' : 'Card', icon: '💳' },
                  { id: 'bank', label: ar ? 'تحويل بنكي' : 'Bank', icon: '🏦' },
                  { id: 'cash', label: ar ? 'نقداً' : 'Cash', icon: '💵' },
                ].map((method) => (
                  <button key={method.id} type="button" className="p-4 border-2 border-gray-200 rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all text-center">
                    <div className="text-3xl mb-2">{method.icon}</div>
                    <div className="text-sm font-medium text-gray-700">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => { setShowPaymentModal(false); setSelectedPlanId(''); }}
                className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-lg transition-all"
              >
                <Icon name="x" className="w-5 h-5 inline-block ms-2" />
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={submitting}
                className="flex-1 px-6 py-4 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <Icon name="creditCard" className="w-5 h-5" />
                {submitting ? (ar ? 'جاري...' : '...') : (ar ? 'إتمام الدفع' : 'Pay')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
