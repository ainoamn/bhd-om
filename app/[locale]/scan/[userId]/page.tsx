'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-10" dir={dir}>
        <div className="max-w-xl mx-auto">
          <div className="rounded-3xl border border-gray-200/70 bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-6 bg-[#8B6F47]">
              <div className="h-4 w-40 bg-white/25 rounded animate-pulse" />
              <div className="h-7 w-64 bg-white/25 rounded mt-3 animate-pulse" />
              <div className="h-4 w-56 bg-white/25 rounded mt-3 animate-pulse" />
            </div>
            <div className="p-6 space-y-4">
              <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
              <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-10" dir={dir}>
        <div className="max-w-xl mx-auto">
          <div className="rounded-3xl border border-gray-200/70 bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-6 bg-[#8B6F47] text-white">
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
                {ar ? 'بطاقة المستخدم' : 'User card'}
              </p>
              <h1 className="text-xl font-bold mt-2">{ar ? 'تعذر عرض البيانات' : 'Unable to display'}</h1>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 font-semibold">
                {error}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/${locale}`}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800"
                >
                  {ar ? 'الرئيسية' : 'Home'}
                </a>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold bg-[#8B6F47] hover:bg-[#6B5535] text-white"
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

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      // ignore
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
  /** ملخص بصيغة دفتر العناوين: الاسم | الهاتف | الرقم المتسلسل */
  const displaySummary = [user.name, user.phone, user.serialNumber].filter(Boolean).join(' | ') || '—';
  const shortSerial = shortenUserSerial(user.serialNumber);
  const fullSerial = user.serialNumber;
  const roleLabel = roleLabels[user.role] || { ar: user.role, en: user.role };
  const dashLabel = user.dashboardType && dashboardLabels[user.dashboardType]
    ? dashboardLabels[user.dashboardType]
    : null;
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
    ? (ar ? user.subscription.plan.nameAr : user.subscription.plan.nameEn)
    : (ar ? 'بدون باقة' : 'No plan');
  const ratingStars = Math.max(0, Math.min(5, Number(user.rating?.stars ?? 0)));
  const ratingLabel =
    user.rating?.level === 'GOLD'
      ? (ar ? 'ذهبي' : 'Gold')
      : user.rating?.level === 'SILVER'
        ? (ar ? 'فضي' : 'Silver')
        : (ar ? 'برونزي' : 'Bronze');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-10" dir={dir}>
      <div className="max-w-2xl mx-auto">
        <div className="w-full rounded-3xl border border-gray-200/70 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative overflow-hidden bg-[#8B6F47] text-white">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
            </div>
            <div className="relative px-6 py-7">
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
                {ar ? 'بطاقة المستخدم' : 'User card'}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-extrabold text-lg">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold leading-snug truncate">{user.name}</h1>
                  <p className="text-xs opacity-90 mt-1">{ar ? 'رمز المستخدم' : 'User token'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {ar ? roleLabel.ar : roleLabel.en}
                </span>
                {dashLabel && (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    {ar ? dashLabel.ar : dashLabel.en}
                  </span>
                )}
              </div>
              <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
                <p className="text-[11px] font-semibold opacity-90">{ar ? 'الرقم المتسلسل' : 'Serial'}</p>
                <p className="font-mono text-sm mt-1 break-all" dir="ltr">
                  {shortSerial !== '—' ? `${shortSerial} · ${fullSerial}` : fullSerial}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy('serial', fullSerial)}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-xs font-semibold"
                  >
                    {copiedKey === 'serial' ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ الرقم' : 'Copy serial')}
                  </button>
                  {user.phone && (
                    <a
                      href={`tel:${user.phone}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-xs font-semibold"
                    >
                      {ar ? 'اتصال' : 'Call'}
                    </a>
                  )}
                  {user.phone && (
                    <a
                      href={`https://wa.me/${user.phone.replace(/\\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-xs font-semibold"
                    >
                      {ar ? 'واتساب' : 'WhatsApp'}
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm opacity-90 mt-4">{displaySummary}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Subscription + rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'الاشتراك' : 'Subscription'}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">{ar ? 'الباقة' : 'Plan'}</span>
                    <span className="font-semibold text-gray-900 truncate">{planName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">{ar ? 'بداية' : 'Start'}</span>
                    <span className="font-mono text-gray-900" dir="ltr">{subStart}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">{ar ? 'نهاية' : 'End'}</span>
                    <span className="font-mono text-gray-900" dir="ltr">{subEnd}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'التقييم (قريباً)' : 'Rating (soon)'}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ratingLabel}</p>
                    <p className="text-xs text-gray-500">{ar ? 'نظام تقييم العملاء قيد الإعداد' : 'Customer ratings system in progress'}</p>
                  </div>
                  <div className="font-mono text-sm text-[#8B6F47]" dir="ltr">
                    {'★'.repeat(ratingStars)}{'☆'.repeat(5 - ratingStars)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'ملخص النشاط' : 'Activity summary'}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500">{ar ? 'عقارات (ملك)' : 'Owned properties'}</p>
                  <p className="mt-2 text-2xl font-extrabold text-gray-900">{user.stats?.ownedProperties ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500">{ar ? 'حجوزات' : 'Bookings'}</p>
                  <p className="mt-2 text-2xl font-extrabold text-gray-900">{user.stats?.bookings ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500">{ar ? 'معاينات' : 'Viewings'}</p>
                  <p className="mt-2 text-2xl font-extrabold text-gray-900">{user.stats?.viewings ?? 0}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {ar
                  ? 'هذه أرقام إرشادية مبنية على بيانات قاعدة البيانات الحالية.'
                  : 'These are indicative counts based on current database records.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'معلومات الاتصال' : 'Contact'}</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{ar ? 'الهاتف' : 'Phone'}</p>
                    {user.phone ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-gray-900" dir="ltr">
                          {user.phone}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copy('phone', user.phone!)}
                          className="text-xs font-semibold text-[#8B6F47] hover:underline"
                        >
                          {copiedKey === 'phone' ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{ar ? 'البريد' : 'Email'}</p>
                    {user.email ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <a className="text-sm text-[#8B6F47] font-semibold hover:underline break-all" href={`mailto:${user.email}`}>
                          {user.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => void copy('email', user.email!)}
                          className="text-xs font-semibold text-[#8B6F47] hover:underline"
                        >
                          {copiedKey === 'email' ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ' : 'Copy')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">{ar ? 'دخول بالرقم فقط' : 'Serial-only login'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'سجل النظام' : 'System'}</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{ar ? 'تاريخ الإنشاء' : 'Created'}</p>
                    <p className="mt-1 text-sm text-gray-900">{createdAt}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{ar ? 'المعرف' : 'ID'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-700 break-all" dir="ltr">
                        {user.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copy('id', user.id)}
                        className="text-xs font-semibold text-[#8B6F47] hover:underline"
                      >
                        {copiedKey === 'id' ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ' : 'Copy')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">{ar ? 'ملاحظة' : 'Note'}</p>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                {ar
                  ? 'هذه البطاقة مخصصة للعرض السريع عند مسح الباركود وتعمل على جميع الأجهزة.'
                  : 'This card is designed for quick viewing after scanning a QR code and works on all devices.'}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          {ar ? 'بن حمود للتطوير' : 'BIN HAMOOD DEVELOPMENT SPC'}
        </p>
      </div>
    </div>
  );
}
