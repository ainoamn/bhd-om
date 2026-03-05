'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';

type PlanInfo = { id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; currency: string; features?: string[] };
type SubData = {
  subscription: {
    id: string;
    planId: string;
    status: string;
    startAt: string;
    endAt: string;
    plan: PlanInfo | null;
  } | null;
  plans: Array<{ id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; sortOrder: number }>;
  pendingRequest: { id: string; direction: string; status: string } | null;
};

export default function MyAccountPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav');
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');
  const [subData, setSubData] = useState<SubData | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestPlanId, setRequestPlanId] = useState('');
  const [requestDirection, setRequestDirection] = useState<'upgrade' | 'downgrade'>('upgrade');
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const user = session?.user as { name?: string; email?: string; phone?: string; role?: string } | undefined;
  const title = user?.role === 'OWNER' ? tOwner('myAccount') : tClient('myAccount');

  useEffect(() => {
    fetch('/api/subscriptions/me')
      .then((r) => r.json())
      .then((d) => setSubData(d))
      .catch(() => setSubData(null));
  }, []);

  const handleSubmitRequest = async () => {
    if (!requestPlanId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedPlanId: requestPlanId, direction: requestDirection, reason: requestReason || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRequestModal(false);
        setRequestPlanId('');
        setRequestReason('');
        fetch('/api/subscriptions/me').then((r) => r.json()).then((d) => setSubData(d));
      } else {
        alert(data.error || (ar ? 'فشل إرسال الطلب' : 'Request failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={ar ? 'بيانات حسابك وباقتك' : 'Your account details and plan'} />
      <div className="admin-card max-w-md">
        <div className="admin-card-body space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الاسم' : 'Name'}</label>
            <p className="text-gray-900 font-medium">{user?.name || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
            <p className="text-gray-900">{user?.email || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الهاتف' : 'Phone'}</label>
            <p className="text-gray-900">{user?.phone || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'نوع الحساب / الباقة' : 'Account / Plan type'}</label>
            {subData?.subscription?.plan ? (
              <p className="text-gray-900 font-medium">{ar ? subData.subscription.plan.nameAr : subData.subscription.plan.nameEn} — {subData.subscription.plan.priceMonthly} {subData.subscription.plan.currency}/{ar ? 'شهر' : 'mo'}</p>
            ) : (
              <p className="text-gray-500">{ar ? 'لا يوجد اشتراك فعّال' : 'No active subscription'}</p>
            )}
            {subData?.pendingRequest && (
              <p className="text-amber-600 text-sm mt-1">{ar ? 'لديك طلب ترقية/تنزيل قيد المراجعة' : 'You have a pending upgrade/downgrade request'}</p>
            )}
          </div>
          {subData?.subscription && !subData?.pendingRequest && subData?.plans?.length > 0 && (
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => { setRequestDirection('upgrade'); setRequestPlanId(''); setShowRequestModal(true); }}
                className="admin-btn-primary text-sm"
              >
                {ar ? 'طلب ترقية الباقة' : 'Request upgrade'}
              </button>
              <button
                type="button"
                onClick={() => { setRequestDirection('downgrade'); setRequestPlanId(''); setShowRequestModal(true); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {ar ? 'طلب تنزيل الباقة' : 'Request downgrade'}
              </button>
            </div>
          )}
          {(session?.user as { role?: string })?.role === 'ADMIN' && (
            <p className="text-sm text-gray-500 pt-2">
              <Link href={`/${locale}/admin/subscriptions`} className="text-[#8B6F47] hover:underline">{ar ? 'إدارة الاشتراكات من لوحة الإدارة' : 'Manage subscriptions from admin'}</Link>
            </p>
          )}
        </div>
      </div>

      {showRequestModal && subData?.plans && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="admin-card max-w-md w-full">
            <div className="admin-card-body">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {requestDirection === 'upgrade' ? (ar ? 'طلب ترقية الباقة' : 'Request plan upgrade') : (ar ? 'طلب تنزيل الباقة' : 'Request plan downgrade')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{ar ? 'الباقة المطلوبة' : 'Requested plan'}</label>
                  <select
                    value={requestPlanId}
                    onChange={(e) => setRequestPlanId(e.target.value)}
                    className="admin-select w-full"
                  >
                    <option value="">—</option>
                    {subData.plans
                      .filter((p) => requestDirection === 'upgrade' ? (p.sortOrder > (subData.subscription?.plan ? (subData.plans.find((x) => x.id === subData.subscription?.planId)?.sortOrder ?? 0) : -1)) : (p.sortOrder < (subData.subscription?.plan ? (subData.plans.find((x) => x.id === subData.subscription?.planId)?.sortOrder ?? 99) : 99)))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{ar ? p.nameAr : p.nameEn} — {p.priceMonthly} OMR</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{ar ? 'السبب (اختياري)' : 'Reason (optional)'}</label>
                  <textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} className="admin-input w-full" rows={2} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowRequestModal(false)} className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="button" onClick={handleSubmitRequest} disabled={!requestPlanId || submitting} className="admin-btn-primary">{submitting ? (ar ? 'جاري الإرسال...' : 'Sending...') : (ar ? 'إرسال الطلب' : 'Submit request')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
