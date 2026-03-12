'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/icons/Icon';
import PageHero from '@/components/shared/PageHero';
import UnifiedPaymentForm from '@/components/shared/UnifiedPaymentForm';
import { getSiteContent } from '@/lib/data/siteContent';
import {
  getYearlyPrice,
  formatPlanCurrency,
  type SubscriptionPlanDisplay,
  type UserSubscriptionDisplay,
} from '@/lib/subscriptionSystem';

/** تأجيل التنفيذ لتفادي انسداد واجهة المستخدم (INP) */
function schedule(fn: () => void) {
  setTimeout(fn, 0);
}

const HERO_DEFAULTS = {
  heroTitleAr: 'باقات الاشتراك',
  heroTitleEn: 'Subscription Plans',
  heroSubtitleAr: 'اختر الباقة المناسبة لإدارة عقاراتك في سلطنة عُمان',
  heroSubtitleEn: 'Choose the right plan for your property management in Oman',
  heroImage: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1920&q=80',
};

const FETCH_OPTS = { cache: 'no-store' as RequestCache, credentials: 'include' as RequestCredentials };

export default function SubscriptionsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const [plans, setPlans] = useState<SubscriptionPlanDisplay[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionDisplay | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const selectedRef = useRef(selectedPlanId);
  const cycleRef = useRef(billingCycle);
  selectedRef.current = selectedPlanId;
  cycleRef.current = billingCycle;

  const pageContent = (() => {
    try {
      const c = getSiteContent();
      return (c as { pagesSubscriptions?: typeof HERO_DEFAULTS }).pagesSubscriptions ?? HERO_DEFAULTS;
    } catch {
      return HERO_DEFAULTS;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [plansRes, meRes] = await Promise.all([
          fetch('/api/plans', FETCH_OPTS),
          session?.user ? fetch('/api/subscriptions/me', FETCH_OPTS) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (plansRes?.ok) {
          const data = await plansRes.json();
          if (Array.isArray(data?.list) && data.list.length > 0) setPlans(data.list);
        }
        if (meRes?.ok) {
          const data = await meRes.json();
          if (data?.subscription) setUserSubscription(data.subscription);
          if (Array.isArray(data?.plans) && data.plans.length > 0) {
            setPlans((prev) => (prev.length > 0 ? prev : data.plans));
          }
        }
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session?.user]);

  const handleSelectPlan = (planId: string) => {
    if (!session?.user) {
      router.push(`/${locale}/login?callbackUrl=/${locale}/subscriptions`);
      return;
    }
    setSelectedPlanId(planId);
    setShowPaymentModal(true);
  };

  /** النقر لا يفعل إلا schedule — لا setState ثقيل ولا fetch في نفس النقر */
  const handlePayment = () => {
    const planId = selectedRef.current;
    if (!planId) return;
    schedule(() => {
      setSubmitting(true);
      const cycle = cycleRef.current;
      fetch('/api/subscriptions/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          durationMonths: cycle === 'yearly' ? 12 : 1,
        }),
      })
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (data?.ok && !data?.error) {
            setShowPaymentModal(false);
            setSelectedPlanId('');
            alert(ar ? 'تم تفعيل الاشتراك بنجاح!' : 'Subscription activated!');
            return fetch('/api/subscriptions/me', { credentials: 'include' }).then((r) => r.json());
          }
          setSubmitting(false);
          alert(data?.error || (ar ? 'حدث خطأ' : 'An error occurred'));
        })
        .then((d) => {
          if (d?.subscription) setUserSubscription(d.subscription);
          if (d) router.push(`/${locale}/admin/my-account`);
        })
        .catch(() => {
          setSubmitting(false);
          alert(ar ? 'حدث خطأ في عملية الدفع' : 'Payment error');
        });
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" data-page="subscriptions">
        <PageHero
          title={ar ? pageContent.heroTitleAr : pageContent.heroTitleEn}
          subtitle={ar ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
          backgroundImage={pageContent.heroImage}
          compact
        />
        <div className="flex justify-center items-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B6F47] border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600 font-medium">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-page="subscriptions" dir={ar ? 'rtl' : 'ltr'}>
      <PageHero
        title={ar ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        subtitle={ar ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
        backgroundImage={pageContent.heroImage}
        compact
      />

      <section className="bg-gray-50 border-b border-gray-100 py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className={`text-base font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {ar ? 'شهرياً' : 'Monthly'}
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
              className="relative w-14 h-8 rounded-full transition-colors bg-gray-200 aria-pressed:bg-[#8B6F47]"
              style={billingCycle === 'yearly' ? { backgroundColor: '#8B6F47' } : undefined}
              aria-pressed={billingCycle === 'yearly'}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200 ${billingCycle === 'yearly' ? 'start-1' : 'end-1'}`}
              />
            </button>
            <span className={`text-base font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {ar ? 'سنوياً' : 'Yearly'}
            </span>
            {billingCycle === 'yearly' && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
                {ar ? 'وفّر 20%' : 'Save 20%'}
              </span>
            )}
          </div>
        </div>
      </section>

      {userSubscription?.plan && (
        <section className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon name="shieldCheck" className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm opacity-90 mb-0.5">{ar ? 'اشتراكك الحالي' : 'Your plan'}</div>
                  <div className="text-xl font-bold">{userSubscription.plan.nameAr || userSubscription.plan.nameEn}</div>
                  <div className="text-sm opacity-90 mt-1">
                    {userSubscription.status === 'active'
                      ? (ar ? 'نشط' : 'Active') + (userSubscription.remainingDays != null ? ` · ${userSubscription.remainingDays} ${ar ? 'يوم متبقي' : 'days left'}` : '')
                      : (ar ? 'منتهي' : 'Expired')}
                  </div>
                </div>
              </div>
              <Link
                href={`/${locale}/admin/my-account`}
                className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors shrink-0"
              >
                {ar ? 'لوحة التحكم' : 'Dashboard'}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
        {plans.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-lg text-gray-700 mb-2">{ar ? 'الباقات غير متوفرة حالياً.' : 'Plans not available.'}</p>
            <p className="text-gray-600 text-sm mb-6">{ar ? 'يمكن للمسؤول تهيئة الباقات من لوحة التحكم ← الاشتراكات.' : 'Admin can initialize plans from Dashboard → Subscriptions.'}</p>
            <Link href={`/${locale}/admin/subscriptions`} className="inline-block px-5 py-2.5 bg-[#8B6F47] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
              {ar ? 'لوحة التحكم' : 'Dashboard'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const isCurrentPlan = userSubscription?.planId === plan.id;
              const price = billingCycle === 'yearly' ? getYearlyPrice(plan.priceMonthly) : plan.priceMonthly;
              const priceLabel = billingCycle === 'yearly' ? (ar ? 'سنوياً' : 'Yearly') : (ar ? 'شهرياً' : 'Monthly');
              const popular = plan.code === 'standard';
              const colorClass = popular ? 'bg-[#8B6F47] text-white' : 'bg-white border border-gray-200';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden ${popular ? 'ring-2 ring-[#8B6F47] md:-mt-2 md:mb-2' : ''} ${colorClass}`}
                >
                  {popular && (
                    <div className="absolute top-0 left-0 right-0 py-1.5 bg-[#8B6F47] text-white text-center text-sm font-bold">
                      {ar ? 'الأكثر اختياراً' : 'Most popular'}
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-3 end-3">
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold">
                        {ar ? 'باقتك' : 'Current'}
                      </span>
                    </div>
                  )}

                  <div className={`p-6 ${popular ? 'pt-10' : ''}`}>
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8B6F47]/10 text-[#8B6F47] mb-4">
                        <Icon name={idx === 0 ? 'building' : idx === 1 ? 'creditCard' : 'archive'} className="w-7 h-7" />
                      </div>
                      <h3 className={`text-xl font-bold mb-1 ${popular ? 'text-white' : 'text-gray-900'}`}>
                        {ar ? plan.nameAr : plan.nameEn}
                      </h3>
                      <p className={`text-sm ${popular ? 'text-white/80' : 'text-gray-500'}`}>
                        {plan.descriptionAr || plan.descriptionEn || ''}
                      </p>
                    </div>

                    <div className="text-center mb-6">
                      <div className={`text-4xl font-bold ${popular ? 'text-white' : 'text-gray-900'}`}>
                        {formatPlanCurrency(price, plan.currency)}
                      </div>
                      <div className={`text-sm ${popular ? 'text-white/80' : 'text-gray-500'}`}>{priceLabel}</div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {(plan.features || []).slice(0, 5).map((feature: string, fidx: number) => (
                        <li key={fidx} className="flex items-start gap-2 text-sm">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          <span className={popular ? 'text-white/90' : 'text-gray-700'}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrentPlan}
                      className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
                        isCurrentPlan
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : popular
                            ? 'bg-white text-[#8B6F47] hover:bg-gray-50'
                            : 'bg-[#8B6F47] text-white hover:opacity-90'
                      }`}
                    >
                      {isCurrentPlan ? (ar ? 'باقتك الحالية' : 'Current plan') : ar ? 'اختر الباقة' : 'Choose plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {plans.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              {ar ? 'مقارنة الباقات' : 'Plan comparison'}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right px-4 py-4 font-semibold text-gray-700">{ar ? 'الميزة' : 'Feature'}</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center px-4 py-4 font-semibold text-gray-900">
                        {ar ? plan.nameAr : plan.nameEn}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: ar ? 'عدد العقارات' : 'Properties', key: 'maxProperties' },
                    { label: ar ? 'عدد الحجوزات' : 'Bookings', key: 'maxBookings' },
                    { label: ar ? 'عدد المستخدمين' : 'Users', key: 'maxUsers' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                      {plans.map((plan) => {
                        const val = plan.limits?.[row.key];
                        const display = val === -1 || val == null ? '∞' : String(val);
                        return (
                          <td key={plan.id} className="text-center px-4 py-3 text-gray-900">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-20 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative h-64 lg:min-h-[320px]">
              <Image
                src="https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80"
                alt={ar ? 'سلطنة عُمان' : 'Sultanate of Oman'}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{ar ? 'لماذا بن حمود؟' : 'Why Bin Hamood?'}</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center shrink-0 text-[#8B6F47] font-bold">1</span>
                  {ar ? 'واجهة بسيطة وسريعة لإدارة العقارات' : 'Simple, fast interface for property management'}
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center shrink-0 text-[#8B6F47] font-bold">2</span>
                  {ar ? 'أمان عالٍ لبياناتك وحساباتك' : 'High security for your data and accounts'}
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center shrink-0 text-[#8B6F47] font-bold">3</span>
                  {ar ? 'دعم محلي في سلطنة عُمان' : 'Local support in the Sultanate of Oman'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {showPaymentModal && selectedPlanId && (() => {
        const plan = plans.find((p) => p.id === selectedPlanId);
        const amount = plan ? (billingCycle === 'yearly' ? getYearlyPrice(plan.priceMonthly) : plan.priceMonthly) : 0;
        const currency = plan?.currency || 'OMR';
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-3xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {ar ? 'إتمام الدفع — ' : 'Complete payment — '}
                  {plan ? (ar ? plan.nameAr : plan.nameEn) : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setSelectedPlanId(''); }}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label={ar ? 'إغلاق' : 'Close'}
                >
                  <Icon name="x" className="w-6 h-6" />
                </button>
              </div>
              <UnifiedPaymentForm
                locale={locale}
                amount={amount}
                currency={currency}
                cardData={cardData}
                onCardDataChange={setCardData}
                onSubmit={handlePayment}
                onCancel={() => { setShowPaymentModal(false); setSelectedPlanId(''); }}
                submitLabel={submitting ? (ar ? 'جاري المعالجة...' : 'Processing...') : (ar ? 'إتمام الدفع' : 'Pay')}
                cancelLabel={ar ? 'إلغاء' : 'Cancel'}
                loading={submitting}
                disabled={submitting}
                showSimulationBadge
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
