'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineDuplicate,
  HiOutlineHome,
  HiOutlineIdentification,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { shortenUserSerial } from '@/lib/utils/serialNumber';

interface ScanUser {
  id: string;
  serialNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  dashboardType: string | null;
  createdAt: string;
  subscription?: {
    status: string;
    startAt: string;
    endAt: string;
    plan: { code: string; nameAr: string; nameEn: string } | null;
  } | null;
  stats?: {
    ownedProperties: number;
    bookings: number;
    viewings: number;
  } | null;
  rating?: {
    level: string;
    score: number;
    stars: number;
  } | null;
}

function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(139,111,71,0.18),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(120,90,60,0.08),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B6F47' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default function ScanUserPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const dir = ar ? 'rtl' : 'ltr';

  const [user, setUser] = useState<ScanUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(ar ? 'معرف غير صالح' : 'Invalid ID');
      return;
    }
    fetch(`/api/scan/${userId}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch(() => {
        setError(ar ? 'المستخدم غير موجود' : 'User not found');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [userId, ar]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const roleLabels: Record<string, { ar: string; en: string }> = {
    ADMIN: { ar: 'مدير', en: 'Admin' },
    CLIENT: { ar: 'عميل', en: 'Client' },
    OWNER: { ar: 'مالك', en: 'Owner' },
  };
  const dashboardLabels: Record<string, { ar: string; en: string }> = {
    CLIENT: { ar: 'عميل', en: 'Client' },
    TENANT: { ar: 'مستأجر', en: 'Tenant' },
    LANDLORD: { ar: 'مالك', en: 'Landlord' },
    SUPPLIER: { ar: 'مورد', en: 'Supplier' },
    PARTNER: { ar: 'شريك', en: 'Partner' },
    GOVERNMENT: { ar: 'حكومة', en: 'Government' },
    AUTHORIZED_REP: { ar: 'مفوض بالتوقيع', en: 'Authorized Rep' },
    COMPANY: { ar: 'شركة', en: 'Company' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-stone-50" dir={dir}>
        <MeshBackground />
        <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:max-w-2xl sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-stone-200/80" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-stone-200/80" />
          </div>
          <div className="flex-1 overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white shadow-xl shadow-stone-900/5">
            <div className="h-44 bg-gradient-to-br from-stone-800 to-stone-900 animate-pulse" />
            <div className="space-y-4 p-6">
              <div className="h-24 animate-pulse rounded-2xl bg-stone-100" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
                <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
                <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-stone-500">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen w-full bg-stone-50" dir={dir}>
        <MeshBackground />
        <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:max-w-xl">
          <ScanTopBar ar={ar} locale={locale} />
          <div className="mt-8 flex-1 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-stone-800 to-[#5c4a32] px-6 py-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                {ar ? 'تحقق الهوية' : 'Identity'}
              </p>
              <h1 className="mt-2 text-2xl font-bold">{ar ? 'تعذر عرض البيانات' : 'Unable to display'}</h1>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-900">
                {error}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/${locale}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
                >
                  <HiOutlineHome className="h-5 w-5" />
                  {ar ? 'الرئيسية' : 'Home'}
                </Link>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-xl bg-[#8B6F47] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#6B5535]"
                >
                  {ar ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shortSerial = shortenUserSerial(user.serialNumber);
  const fullSerial = user.serialNumber;
  const roleLabel = roleLabels[user.role] || { ar: user.role, en: user.role };
  const dashLabel =
    user.dashboardType && dashboardLabels[user.dashboardType] ? dashboardLabels[user.dashboardType] : null;
  const createdAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const initials = String(user.name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.slice(0, 1))
    .join('')
    .toUpperCase();

  const subStart = user.subscription?.startAt
    ? new Date(user.subscription.startAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')
    : '—';
  const subEnd = user.subscription?.endAt
    ? new Date(user.subscription.endAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')
    : '—';
  const planName = user.subscription?.plan
    ? ar
      ? user.subscription.plan.nameAr
      : user.subscription.plan.nameEn
    : ar
      ? 'بدون باقة'
      : 'No plan';
  const ratingStars = Math.max(0, Math.min(5, Number(user.rating?.stars ?? 0)));
  const ratingLabel =
    user.rating?.level === 'GOLD'
      ? ar
        ? 'ذهبي'
        : 'Gold'
      : user.rating?.level === 'SILVER'
        ? ar
          ? 'فضي'
          : 'Silver'
        : ar
          ? 'برونزي'
          : 'Bronze';

  const statItems = [
    {
      key: 'owned',
      value: user.stats?.ownedProperties ?? 0,
      label: ar ? 'عقارات' : 'Properties',
      sub: ar ? 'ملك' : 'Owned',
      tone: 'from-amber-500/20 to-amber-600/5 text-amber-900',
    },
    {
      key: 'book',
      value: user.stats?.bookings ?? 0,
      label: ar ? 'حجوزات' : 'Bookings',
      sub: ar ? 'نشطة' : 'Active',
      tone: 'from-emerald-500/20 to-emerald-600/5 text-emerald-900',
    },
    {
      key: 'view',
      value: user.stats?.viewings ?? 0,
      label: ar ? 'معاينات' : 'Viewings',
      sub: ar ? 'مجدولة' : 'Scheduled',
      tone: 'from-sky-500/20 to-sky-600/5 text-sky-900',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-stone-50 pb-12" dir={dir}>
      <MeshBackground />
      <div className="relative mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6 lg:max-w-3xl lg:px-8">
        <ScanTopBar ar={ar} locale={locale} />

        <article className="mt-6 overflow-hidden rounded-[1.75rem] border border-stone-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(28,25,23,0.18)] ring-1 ring-black/5">
          {/* Hero — بطاقة هوية رقمية */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#44403c] px-6 pb-10 pt-8 text-white sm:px-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8B6F47]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-200/10 blur-3xl" />
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#c4a574] via-[#8B6F47] to-[#5c4a32]" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="relative shrink-0">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[#d4b896] to-[#8B6F47] opacity-90" />
                  <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[#1c1917] text-xl font-bold tracking-tight text-white shadow-inner sm:h-[5.25rem] sm:w-[5.25rem] sm:text-2xl">
                    {initials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    {ar ? 'بطاقة تحقق — بن حمود للتطوير' : 'Verification — BHD'}
                  </p>
                  <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{user.name}</h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm ring-1 ring-white/15">
                      {ar ? roleLabel.ar : roleLabel.en}
                    </span>
                    {dashLabel && (
                      <span className="inline-flex items-center rounded-full bg-[#8B6F47]/35 px-3 py-1 text-xs font-semibold backdrop-blur-sm ring-1 ring-white/10">
                        {ar ? dashLabel.ar : dashLabel.en}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 backdrop-blur-md sm:flex-col sm:items-stretch">
                <HiOutlineShieldCheck className="mx-auto h-8 w-8 text-[#d4b896] opacity-90 sm:h-9 sm:w-9" aria-hidden />
                <span className="text-center text-[10px] font-medium leading-tight text-white/70 sm:max-w-[5rem]">
                  {ar ? 'بيانات مرتبطة بالنظام' : 'Linked to BHD system'}
                </span>
              </div>
            </div>

            <div className="relative mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    <HiOutlineIdentification className="h-4 w-4" aria-hidden />
                    {ar ? 'الرقم المتسلسل' : 'Serial number'}
                  </p>
                  <p className="mt-2 font-mono text-sm font-semibold tracking-wide text-white sm:text-base" dir="ltr">
                    {shortSerial !== '—' ? (
                      <>
                        <span className="text-[#e7d5b8]">{shortSerial}</span>
                        <span className="mx-2 text-white/35">·</span>
                        <span className="text-white/90">{fullSerial}</span>
                      </>
                    ) : (
                      fullSerial
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy('serial', fullSerial)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  <HiOutlineDuplicate className="h-4 w-4" />
                  {copiedKey === 'serial' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {user.phone && (
                  <>
                    <a
                      href={`tel:${user.phone}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-white min-[380px]:flex-none"
                    >
                      <HiOutlinePhone className="h-4 w-4 text-[#8B6F47]" />
                      {ar ? 'اتصال' : 'Call'}
                    </a>
                    <a
                      href={`https://wa.me/${user.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#20bd5a] min-[380px]:flex-none"
                    >
                      {ar ? 'واتساب' : 'WhatsApp'}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100 bg-stone-50/80 [dir=rtl]:divide-x-reverse">
            {statItems.map((s) => (
              <div key={s.key} className="px-2 py-5 text-center sm:px-4">
                <p
                  className={`mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold ${s.tone}`}
                >
                  {s.value}
                </p>
                <p className="text-xs font-bold text-stone-800">{s.label}</p>
                <p className="mt-0.5 text-[10px] text-stone-500">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {/* Subscription + rating */}
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <HiOutlineChartBar className="h-4 w-4 text-[#8B6F47]" />
                  {ar ? 'الاشتراك' : 'Subscription'}
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3 border-b border-stone-200/80 pb-2">
                    <dt className="text-stone-500">{ar ? 'الباقة' : 'Plan'}</dt>
                    <dd className="max-w-[60%] text-end font-semibold text-stone-900">{planName}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-stone-600">
                    <dt>{ar ? 'البداية' : 'Start'}</dt>
                    <dd className="font-mono text-stone-900" dir="ltr">
                      {subStart}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 text-stone-600">
                    <dt>{ar ? 'النهاية' : 'End'}</dt>
                    <dd className="font-mono text-stone-900" dir="ltr">
                      {subEnd}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-stone-100 bg-gradient-to-br from-stone-50 to-amber-50/30 p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <HiOutlineShieldCheck className="h-4 w-4 text-[#8B6F47]" />
                  {ar ? 'التقييم' : 'Rating'}
                </h2>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-stone-900">{ratingLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      {ar ? 'نظام تقييم العملاء قيد الإعداد' : 'Customer rating system in progress'}
                    </p>
                  </div>
                  <div className="text-lg text-[#8B6F47]" dir="ltr" aria-label="stars">
                    {'★'.repeat(ratingStars)}
                    <span className="text-stone-300">{'☆'.repeat(5 - ratingStars)}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Contact + system */}
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-stone-100 p-5">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <HiOutlineMail className="h-4 w-4 text-[#8B6F47]" />
                  {ar ? 'التواصل' : 'Contact'}
                </h2>
                <ul className="mt-4 space-y-4">
                  <li>
                    <p className="text-xs font-medium text-stone-500">{ar ? 'الهاتف' : 'Phone'}</p>
                    {user.phone ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-stone-900" dir="ltr">
                          {user.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copy('phone', user.phone!)}
                          className="text-xs font-semibold text-[#8B6F47] hover:underline"
                        >
                          {copiedKey === 'phone' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </li>
                  <li>
                    <p className="text-xs font-medium text-stone-500">{ar ? 'البريد' : 'Email'}</p>
                    {user.email ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <a
                          className="break-all text-sm font-semibold text-[#8B6F47] hover:underline"
                          href={`mailto:${user.email}`}
                        >
                          {user.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => void copy('email', user.email!)}
                          className="text-xs font-semibold text-[#8B6F47] hover:underline"
                        >
                          {copiedKey === 'email' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-stone-500">{ar ? 'لا يوجد بريد مسجل' : 'No email'}</span>
                    )}
                  </li>
                </ul>
              </section>

              <section className="rounded-2xl border border-stone-100 p-5">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <HiOutlineCalendar className="h-4 w-4 text-[#8B6F47]" />
                  {ar ? 'السجل' : 'Record'}
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">{ar ? 'تاريخ الإنشاء' : 'Created'}</dt>
                    <dd className="mt-1 text-stone-900">{createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">{ar ? 'المعرف' : 'ID'}</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-xs text-stone-700" dir="ltr">
                        {user.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copy('id', user.id)}
                        className="text-xs font-semibold text-[#8B6F47] hover:underline"
                      >
                        {copiedKey === 'id' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
                      </button>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-3 text-center text-xs leading-relaxed text-stone-500">
              {ar
                ? 'هذه البطاقة للعرض السريع بعد مسح رمز QR. البيانات مأخوذة من أنظمة بن حمود للتطوير.'
                : 'This card is for quick display after scanning a QR code. Data is sourced from BHD systems.'}
            </p>
          </div>
        </article>

        <p className="mt-8 text-center text-[11px] font-medium tracking-wide text-stone-400">
          BIN HAMOOD DEVELOPMENT SPC · {ar ? '٢٠٢٦' : '2026'}
        </p>
      </div>
    </div>
  );
}

function ScanTopBar({ ar, locale }: { ar: boolean; locale: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-400">BHD</p>
        <p className="truncate text-sm font-bold text-stone-800">{ar ? 'بن حمود للتطوير' : 'BIN HAMOOD DEVELOPMENT'}</p>
      </div>
      <Link
        href={`/${locale}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white/90 px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:shadow"
        prefetch
      >
        <HiOutlineHome className="h-5 w-5 text-[#8B6F47]" aria-hidden />
        {ar ? 'الرئيسية' : 'Home'}
      </Link>
    </header>
  );
}
