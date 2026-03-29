'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedContracts } from '@/lib/data/contactLinks';
import { getPropertyIdsForLandlord } from '@/lib/data/propertyLandlords';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { searchDocuments } from '@/lib/data/accounting';
import { getSectionsForRole, loadDashboardSettingsFromServer, DASHBOARD_SETTINGS_EVENT } from '@/lib/data/dashboardSettings';
import type { DashboardSectionKey } from '@/lib/config/dashboardRoles';
import type { PropertyBooking } from '@/lib/data/bookings';
import { contractDataMatchesLandlord } from '@/lib/data/ownerLandlordMatch';

export default function OwnerDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const tNav = useTranslations('admin.nav.ownerNav');
  const [allowedSections, setAllowedSections] = useState<DashboardSectionKey[]>(() => getSectionsForRole('LANDLORD'));

  useEffect(() => {
    loadDashboardSettingsFromServer().then(() => setAllowedSections(getSectionsForRole('LANDLORD')));
    const handler = () => setAllowedSections(getSectionsForRole('LANDLORD'));
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_SETTINGS_EVENT, handler);
  }, []);

  const can = (section: DashboardSectionKey) => allowedSections.includes(section);

  const user = session?.user as { id?: string; email?: string; name?: string; phone?: string } | undefined;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;

  const landlordContactId = (contact as { id?: string } | null)?.id || '';
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const [serverBookings, setServerBookings] = useState<PropertyBooking[]>([]);
  useEffect(() => {
    if (userRole !== 'OWNER' && !landlordContactId) return;
    let alive = true;
    fetch('/api/bookings', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PropertyBooking[]) => {
        if (!alive) return;
        if (Array.isArray(list)) setServerBookings(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [landlordContactId, userRole]);

  const landlordMatchCtx = useMemo(
    () => ({
      contactId: landlordContactId || undefined,
      userEmail: user?.email,
      userPhone: user?.phone,
    }),
    [landlordContactId, user?.email, user?.phone]
  );

  const propertyIds = useMemo(() => {
    const localIds = landlordContactId && typeof window !== 'undefined' ? getPropertyIdsForLandlord(landlordContactId) : [];
    const derived = new Set<number>();
    for (const b of serverBookings as PropertyBooking[]) {
      const cd = (b as PropertyBooking)?.contractData as Record<string, unknown> | undefined;
      if (!contractDataMatchesLandlord(cd, landlordMatchCtx)) continue;
      const pid = Number(b.propertyId);
      if (Number.isFinite(pid)) derived.add(pid);
    }
    return Array.from(new Set([...localIds, ...Array.from(derived)])).filter((n) => Number.isFinite(n));
  }, [landlordContactId, serverBookings, landlordMatchCtx]);
  const overrides = getPropertyDataOverrides();
  const properties = propertyIds.map((pid) => getPropertyById(pid, overrides)).filter(Boolean);

  const contracts = contact && typeof window !== 'undefined' ? getContactLinkedContracts(contact as Parameters<typeof getContactLinkedContracts>[0]) : [];
  const landlordContracts = contracts.filter((c) => c.role === 'landlord');

  const verificationTasks = useMemo(() => {
    const tasks: Array<{ bookingId: string; propertyId: number; token: string; createdAt?: string }> = [];
    for (const b of serverBookings as PropertyBooking[]) {
      const cd = b.contractData as Record<string, unknown> | undefined;
      if (!contractDataMatchesLandlord(cd, landlordMatchCtx)) continue;
      const reqs: unknown[] = Array.isArray((b as PropertyBooking & { signatureRequests?: unknown[] }).signatureRequests)
        ? ((b as PropertyBooking & { signatureRequests: unknown[] }).signatureRequests ?? [])
        : [];
      const pending = reqs.find(
        (r) => String((r as { actorRole?: string })?.actorRole) === 'OWNER' && String((r as { status?: string })?.status) === 'PENDING'
      ) as { token?: string; createdAt?: string } | undefined;
      if (pending?.token) tasks.push({ bookingId: String(b.id), propertyId: Number(b.propertyId), token: String(pending.token), createdAt: pending.createdAt });
    }
    return tasks.slice(0, 10);
  }, [serverBookings, landlordMatchCtx]);

  const docs = contact && typeof window !== 'undefined' ? searchDocuments({ contactId: (contact as { id?: string }).id }) : [];
  const invoices = docs.filter((d) => d.type === 'INVOICE' || (d.type as string) === 'SALES_INVOICE');

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const contractStatusKey = (s: string) => (s === 'ACTIVE' ? (locale === 'ar' ? 'نشط' : 'Active') : s === 'ENDED' ? (locale === 'ar' ? 'منتهي' : 'Ended') : s);

  const hasAnyBlock = can('dashboard') || can('myProperties') || can('myContracts') || can('myInvoices') || can('notifications') || can('subscriptions');
  const [subscription, setSubscription] = useState<{ planNameAr?: string; planNameEn?: string; status?: string; endAt?: string } | null>(null);
  useEffect(() => {
    if (!allowedSections.includes('subscriptions')) return;
    fetch('/api/subscriptions/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && (d.plan || d.planNameAr || d.planNameEn) && setSubscription({ planNameAr: d.plan?.nameAr ?? d.planNameAr, planNameEn: d.plan?.nameEn ?? d.planNameEn, status: d.status, endAt: d.endAt }));
  }, [allowedSections]);

  return (
    <div>
      {(can('dashboard') || !hasAnyBlock) && (
        <div className="admin-page-header">
          <h1 className="admin-page-title">{tNav('dashboard')}</h1>
          <p className="admin-page-subtitle">
            {locale === 'ar' ? 'مرحباً، ' : 'Welcome, '}{user?.name || (locale === 'ar' ? 'المالك' : 'Owner')}
          </p>
        </div>
      )}

      {can('subscriptions') && (
        <div className="admin-card mb-8">
          <div className="admin-card-header flex flex-wrap items-center justify-between gap-4">
            <h2 className="admin-card-title">{locale === 'ar' ? 'اشتراكك' : 'Your subscription'}</h2>
            <Link
              href={`/${locale}/subscriptions`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}
            >
              <Icon name="creditCard" className="w-5 h-5" />
              {locale === 'ar' ? 'ترقية أو تخفيض الباقة' : 'Upgrade or change plan'}
            </Link>
          </div>
          <div className="admin-card-body">
            {subscription?.planNameAr || subscription?.planNameEn ? (
              <p className="text-gray-700">
                {locale === 'ar' ? 'الباقة الحالية: ' : 'Current plan: '}
                <strong>{locale === 'ar' ? (subscription.planNameAr || subscription.planNameEn) : (subscription.planNameEn || subscription.planNameAr)}</strong>
                {subscription.endAt && (
                  <span className="text-sm text-gray-500 block mt-1">
                    {locale === 'ar' ? 'تنتهي في: ' : 'Ends: '}{new Date(subscription.endAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-gray-600">{locale === 'ar' ? 'لا يوجد اشتراك فعّال. يمكنك الاشتراك في باقة من صفحة الباقات.' : 'No active subscription. You can subscribe to a plan from the plans page.'}</p>
            )}
          </div>
        </div>
      )}

      {hasAnyBlock && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {can('myProperties') && (
            <Link href={`/${locale}/admin/my-properties`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Icon name="building" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{properties.length}</div>
                  <div className="text-sm text-gray-500">{tNav('myProperties')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('myContracts') && (
            <Link href={`/${locale}/admin/my-contracts`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <Icon name="archive" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{landlordContracts.length}</div>
                  <div className="text-sm text-gray-500">{tNav('myContracts')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('myInvoices') && (
            <Link href={`/${locale}/admin/my-invoices`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                  <Icon name="documentText" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{invoices.length}</div>
                  <div className="text-sm text-gray-500">{tNav('myInvoices')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('notifications') && (
            <Link href={`/${locale}/admin/notifications`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
                  <Icon name="inbox" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">{tNav('notifications')}</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {(can('myProperties') || can('myContracts')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {can('myProperties') && (
            <div className="admin-card">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="admin-card-title">{tNav('myProperties')}</h2>
                <Link href={`/${locale}/admin/my-properties`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                  {locale === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              <div className="admin-card-body">
                {properties.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">{locale === 'ar' ? 'لا توجد عقارات مرتبطة بحسابك' : 'No properties linked to your account'}</p>
                ) : (
                  <ul className="space-y-3">
                    {properties.slice(0, 5).map((p) => (
                      <li key={p?.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{locale === 'ar' ? p?.titleAr : p?.titleEn || p?.titleAr}</p>
                          <p className="text-xs text-gray-500">{(p as { serialNumber?: string }).serialNumber || p?.id}</p>
                        </div>
                        <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {can('myContracts') && (
            <div className="admin-card">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="admin-card-title">{tNav('myContracts')}</h2>
                <Link href={`/${locale}/admin/my-contracts`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                  {locale === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              <div className="admin-card-body">
                {landlordContracts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">{locale === 'ar' ? 'لا توجد عقود' : 'No contracts'}</p>
                ) : (
                  <ul className="space-y-3">
                    {landlordContracts.slice(0, 5).map((c) => (
                      <li key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{c.unitDisplay || c.propertyTitleAr}</p>
                          <p className="text-xs text-gray-500">{fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {contractStatusKey(c.status)}</p>
                        </div>
                        <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {verificationTasks.length > 0 && (
        <div className="admin-card mb-8">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{locale === 'ar' ? 'مهام توثيق العقود' : 'Contract verification tasks'}</h2>
            <Link href={`/${locale}/admin/my-bookings`} className="text-sm font-medium text-[#8B6F47] hover:underline">
              {locale === 'ar' ? 'عرض الحجوزات' : 'View bookings'}
            </Link>
          </div>
          <div className="admin-card-body">
            <ul className="space-y-3">
              {verificationTasks.map((t) => (
                <li key={t.token} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <div className="text-sm text-amber-900 font-semibold">
                    {locale === 'ar' ? 'بانتظار توقيعك على عقد مرتبط بعقار' : 'Waiting for your signature for a contract'}
                    <span className="ms-2 font-mono text-xs text-amber-700">({t.bookingId})</span>
                  </div>
                  <Link
                    href={`/${locale}/sign/${encodeURIComponent(t.token)}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8B6F47] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B5535]"
                  >
                    {locale === 'ar' ? 'فتح التوثيق' : 'Open signing'}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!hasAnyBlock && (
        <div className="admin-card p-8 text-center">
          <p className="text-gray-600">
            {locale === 'ar' ? 'لا توجد أقسام مخصّصة لك في لوحة التحكم. تواصل مع المدير إن احتجت صلاحيات إضافية.' : 'No dashboard sections are assigned to you. Contact the administrator if you need additional access.'}
          </p>
        </div>
      )}
    </div>
  );
}
