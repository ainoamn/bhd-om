'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import {
  getContactForUser,
  updateContact,
  getContactDisplayName,
  type Contact,
  type ContactAddress,
} from '@/lib/data/addressBook';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { normalizeDateForInput } from '@/lib/utils/dateFormat';

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

const emptyAddress: ContactAddress = {
  governorate: '',
  state: '',
  area: '',
  village: '',
  street: '',
  building: '',
  floor: '',
  fullAddress: '',
  fullAddressEn: '',
};

function formatAddress(a?: ContactAddress): string {
  if (!a) return '—';
  if (a.fullAddress?.trim()) return a.fullAddress;
  const parts = [a.governorate, a.state, a.area, a.village, a.street, a.building, a.floor].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

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

  const user = session?.user as { id?: string; name?: string; email?: string; phone?: string; role?: string } | undefined;
  const title = user?.role === 'OWNER' ? tOwner('myAccount') : tClient('myAccount');
  const isAdmin = user?.role === 'ADMIN';

  const [contact, setContact] = useState<Contact | { id: string; email?: string; phone?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    secondName: '',
    thirdName: '',
    familyName: '',
    nameEn: '',
    email: '',
    phoneCountryCode: '968',
    phone: '',
    phoneSecondary: '',
    nationality: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    civilId: '',
    civilIdExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    workplace: '',
    position: '',
    address: { ...emptyAddress },
    notes: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    const c = getContactForUser({ id: user.id, email: user.email ?? null, phone: user.phone ?? null });
    setContact('id' in c && c.id ? (c as Contact) : c);
    if (c && 'id' in c && c.id && 'firstName' in c) {
      const co = c as Contact;
      const { code, number } = parsePhoneToCountryAndNumber(co.phone || '968');
      setForm({
        firstName: co.firstName ?? '',
        secondName: co.secondName ?? '',
        thirdName: co.thirdName ?? '',
        familyName: co.familyName ?? '',
        nameEn: co.nameEn ?? '',
        email: co.email ?? '',
        phoneCountryCode: code || '968',
        phone: number ?? '',
        phoneSecondary: co.phoneSecondary ?? '',
        nationality: co.nationality ?? '',
        gender: (co.gender as 'MALE' | 'FEMALE') ?? 'MALE',
        civilId: co.civilId ?? '',
        civilIdExpiry: co.civilIdExpiry ?? '',
        passportNumber: co.passportNumber ?? '',
        passportExpiry: co.passportExpiry ?? '',
        workplace: co.workplace ?? '',
        position: co.position ?? '',
        address: { ...emptyAddress, ...co.address },
        notes: co.notes ?? '',
      });
    }
  }, [user?.id, user?.email, user?.phone]);

  useEffect(() => {
    fetch('/api/subscriptions/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSubData(d))
      .catch(() => setSubData(null));
  }, []);

  const handleSaveContact = () => {
    if (!contact || !('id' in contact) || !contact.id) return;
    setSaving(true);
    try {
      const fullPhone = form.phoneCountryCode + (form.phone || '').replace(/\D/g, '');
      const updates: Partial<Contact> = {
        firstName: form.firstName.trim() || (contact as Contact).firstName,
        secondName: form.secondName.trim() || undefined,
        thirdName: form.thirdName.trim() || undefined,
        familyName: form.familyName.trim() || (contact as Contact).familyName,
        nameEn: form.nameEn.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: fullPhone || (contact as Contact).phone,
        phoneSecondary: form.phoneSecondary.trim() || undefined,
        nationality: form.nationality.trim() || (contact as Contact).nationality,
        gender: form.gender,
        civilId: form.civilId.trim() || undefined,
        civilIdExpiry: form.civilIdExpiry.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        passportExpiry: form.passportExpiry.trim() || undefined,
        workplace: form.workplace.trim() || undefined,
        position: form.position.trim() || undefined,
        address: form.address,
        notes: form.notes.trim() || undefined,
      };
      const updated = updateContact(contact.id, updates);
      if (updated) {
        setContact(updated);
        setEditing(false);
      }
    } catch (e) {
      alert(ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestPlanId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestedPlanId: requestPlanId, direction: requestDirection, reason: requestReason || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRequestModal(false);
        setRequestPlanId('');
        setRequestReason('');
        fetch('/api/subscriptions/me', { credentials: 'include' }).then((r) => r.json()).then((d) => setSubData(d));
      } else {
        alert(data.error || (ar ? 'فشل إرسال الطلب' : 'Request failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fullContact = contact && 'id' in contact && contact.id ? (contact as Contact) : null;
  const addressDisplay = fullContact ? formatAddress(fullContact.address) : '—';

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={ar ? 'بيانات حسابك وباقتك' : 'Your account details and plan'} />

      {/* زر الاشتراك في الباقات — للعميل والمالك */}
      {!isAdmin && (
        <div className="admin-card border-2 border-[var(--primary)]/20 bg-[var(--primary)]/5">
          <div className="admin-card-body flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{ar ? 'الباقات والاشتراك' : 'Plans & subscription'}</h2>
              <p className="text-sm text-gray-600">{ar ? 'اشترك في باقة أو غيّر باقتك الحالية من صفحة الباقات.' : 'Subscribe to a plan or change your current plan from the plans page.'}</p>
            </div>
            <Link
              href={`/${locale}/subscriptions`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-md hover:opacity-95 transition-opacity"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}
            >
              <Icon name="creditCard" className="w-5 h-5" />
              {ar ? 'الاشتراك في الباقات' : 'Subscribe to plans'}
            </Link>
          </div>
        </div>
      )}

      {/* بياناتي من دفتر العناوين */}
      <div className="admin-card max-w-3xl">
        <div className="admin-card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="admin-card-title">{ar ? 'بياناتي (كما في دفتر العناوين)' : 'My data (as in address book)'}</h2>
          {fullContact && (
            editing ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={handleSaveContact} disabled={saving} className="px-4 py-2 rounded-lg font-medium text-white bg-[var(--primary)] hover:opacity-90">
                  {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary)]/10">
                <Icon name="pencil" className="w-4 h-4" />
                {ar ? 'تعديل' : 'Edit'}
              </button>
            )
          )}
        </div>
        <div className="admin-card-body space-y-4">
          {fullContact ? (
            editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الاسم الأول' : 'First name'}</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الاسم الثاني' : 'Second name'}</label>
                  <input type="text" value={form.secondName} onChange={(e) => setForm({ ...form, secondName: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الاسم الثالث' : 'Third name'}</label>
                  <input type="text" value={form.thirdName} onChange={(e) => setForm({ ...form, thirdName: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'اسم العائلة' : 'Family name'}</label>
                  <input type="text" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className="admin-input w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                  <input type="text" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الهاتف' : 'Phone'}</label>
                  <div className="flex gap-2">
                    <PhoneCountryCodeSelect value={form.phoneCountryCode} onChange={(code) => setForm({ ...form, phoneCountryCode: code })} locale={locale as 'ar' | 'en'} />
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="admin-input flex-1" placeholder="12345678" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'هاتف ثانوي' : 'Secondary phone'}</label>
                  <input type="tel" value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الجنسية' : 'Nationality'}</label>
                  <input type="text" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الجنس' : 'Gender'}</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'MALE' | 'FEMALE' })} className="admin-select w-full">
                    <option value="MALE">{ar ? 'ذكر' : 'Male'}</option>
                    <option value="FEMALE">{ar ? 'أنثى' : 'Female'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                  <input type="text" value={form.civilId} onChange={(e) => setForm({ ...form, civilId: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'انتهاء الرقم المدني' : 'Civil ID expiry'}</label>
                  <input type="date" value={normalizeDateForInput(form.civilIdExpiry)} onChange={(e) => setForm({ ...form, civilIdExpiry: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'رقم الجواز' : 'Passport number'}</label>
                  <input type="text" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'انتهاء الجواز' : 'Passport expiry'}</label>
                  <input type="date" value={normalizeDateForInput(form.passportExpiry)} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="admin-input w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'جهة العمل' : 'Workplace'}</label>
                  <input type="text" value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} className="admin-input w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'المنصب' : 'Position'}</label>
                  <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="admin-input w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'العنوان' : 'Address'}</label>
                  <textarea value={form.address.fullAddress} onChange={(e) => setForm({ ...form, address: { ...form.address, fullAddress: e.target.value } })} className="admin-input w-full" rows={2} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="admin-input w-full" rows={2} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {fullContact.serialNumber && (
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-gray-600">{ar ? 'الرقم المتسلسل:' : 'Serial:'}</span>
                    <span className="mr-2 font-mono text-gray-900">{fullContact.serialNumber}</span>
                  </div>
                )}
                <div><span className="font-semibold text-gray-600">{ar ? 'الاسم:' : 'Name:'}</span> <span className="text-gray-900">{getContactDisplayName(fullContact, locale)}</span></div>
                {fullContact.nameEn && <div><span className="font-semibold text-gray-600">{ar ? 'الاسم (إنجليزي):' : 'Name (EN):'}</span> <span className="text-gray-900">{fullContact.nameEn}</span></div>}
                <div><span className="font-semibold text-gray-600">{ar ? 'البريد:' : 'Email:'}</span> <span className="text-gray-900">{fullContact.email || '—'}</span></div>
                <div><span className="font-semibold text-gray-600">{ar ? 'الهاتف:' : 'Phone:'}</span> <span className="text-gray-900">{fullContact.phone || '—'}</span></div>
                {fullContact.phoneSecondary && <div><span className="font-semibold text-gray-600">{ar ? 'هاتف ثانوي:' : 'Secondary:'}</span> <span className="text-gray-900">{fullContact.phoneSecondary}</span></div>}
                <div><span className="font-semibold text-gray-600">{ar ? 'الجنسية:' : 'Nationality:'}</span> <span className="text-gray-900">{fullContact.nationality || '—'}</span></div>
                <div><span className="font-semibold text-gray-600">{ar ? 'الجنس:' : 'Gender:'}</span> <span className="text-gray-900">{fullContact.gender === 'FEMALE' ? (ar ? 'أنثى' : 'Female') : (ar ? 'ذكر' : 'Male')}</span></div>
                {fullContact.civilId && <div><span className="font-semibold text-gray-600">{ar ? 'الرقم المدني:' : 'Civil ID:'}</span> <span className="text-gray-900">{fullContact.civilId}</span></div>}
                {fullContact.civilIdExpiry && <div><span className="font-semibold text-gray-600">{ar ? 'انتهاء الرقم المدني:' : 'Civil ID expiry:'}</span> <span className="text-gray-900">{new Date(fullContact.civilIdExpiry).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}</span></div>}
                {fullContact.passportNumber && <div><span className="font-semibold text-gray-600">{ar ? 'رقم الجواز:' : 'Passport:'}</span> <span className="text-gray-900">{fullContact.passportNumber}</span></div>}
                {fullContact.passportExpiry && <div><span className="font-semibold text-gray-600">{ar ? 'انتهاء الجواز:' : 'Passport expiry:'}</span> <span className="text-gray-900">{new Date(fullContact.passportExpiry).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}</span></div>}
                {fullContact.workplace && <div className="sm:col-span-2"><span className="font-semibold text-gray-600">{ar ? 'جهة العمل:' : 'Workplace:'}</span> <span className="text-gray-900">{fullContact.workplace}</span></div>}
                {fullContact.position && <div><span className="font-semibold text-gray-600">{ar ? 'المنصب:' : 'Position:'}</span> <span className="text-gray-900">{fullContact.position}</span></div>}
                <div className="sm:col-span-2"><span className="font-semibold text-gray-600">{ar ? 'العنوان:' : 'Address:'}</span> <span className="text-gray-900">{addressDisplay}</span></div>
                {fullContact.notes && <div className="sm:col-span-2"><span className="font-semibold text-gray-600">{ar ? 'ملاحظات:' : 'Notes:'}</span> <span className="text-gray-900">{fullContact.notes}</span></div>}
              </div>
            )
          ) : (
            <div className="space-y-2 text-gray-600">
              <p>{ar ? 'لا توجد بيانات مرتبطة بك في دفتر العناوين بعد. الاسم والبريد والهاتف أدناه من حسابك.' : 'No address book entry linked yet. Name, email and phone below are from your account.'}</p>
              <div className="pt-2 space-y-1">
                <p><span className="font-semibold">{ar ? 'الاسم:' : 'Name:'}</span> {user?.name || '—'}</p>
                <p><span className="font-semibold">{ar ? 'البريد:' : 'Email:'}</span> {user?.email || '—'}</p>
                <p><span className="font-semibold">{ar ? 'الهاتف:' : 'Phone:'}</span> {user?.phone || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* الباقة الحالية وطلب ترقية/تنزيل */}
      <div className="admin-card max-w-md">
        <div className="admin-card-body space-y-4">
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
              <button type="button" onClick={() => { setRequestDirection('upgrade'); setRequestPlanId(''); setShowRequestModal(true); }} className="admin-btn-primary text-sm">
                {ar ? 'طلب ترقية الباقة' : 'Request upgrade'}
              </button>
              <button type="button" onClick={() => { setRequestDirection('downgrade'); setRequestPlanId(''); setShowRequestModal(true); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                {ar ? 'طلب تنزيل الباقة' : 'Request downgrade'}
              </button>
            </div>
          )}
          {isAdmin && (
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
                  <select value={requestPlanId} onChange={(e) => setRequestPlanId(e.target.value)} className="admin-select w-full">
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
