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
  createContact,
  getContactDisplayName,
  type Contact,
  type ContactAddress,
} from '@/lib/data/addressBook';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { normalizeDateForInput } from '@/lib/utils/dateFormat';
import UnifiedPaymentForm from '@/components/shared/UnifiedPaymentForm';
import { openReceiptPrintWindow } from '@/lib/utils/receiptPrint';

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
  plans: Array<{ id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; currency?: string; sortOrder: number }>;
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
  /** 1 = اختر الباقة، 2 = للترقية شاشة الدفع، للتنزيل نافذة التنبيه، 3 = للتنزيل فقط شاشة الدفع */
  const [requestStep, setRequestStep] = useState<1 | 2 | 3>(1);
  const [requestPlanId, setRequestPlanId] = useState('');
  const [requestDirection, setRequestDirection] = useState<'upgrade' | 'downgrade'>('upgrade');
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  /** بعد نجاح الدفع يُعرض إيصال ثم زر إغلاق */
  const [paymentSuccess, setPaymentSuccess] = useState<{ planNameAr: string; planNameEn: string; amount: number; currency: string; direction: 'upgrade' | 'downgrade' } | null>(null);

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
    } else {
      const { code, number } = parsePhoneToCountryAndNumber(user.phone || '968');
      const nameParts = (user.name || '').trim().split(/\s+/).filter(Boolean);
      setForm((prev) => ({
        ...prev,
        firstName: nameParts[0] ?? '',
        familyName: nameParts.slice(1).join(' ') || prev.familyName,
        email: user.email ?? prev.email,
        phoneCountryCode: code || '968',
        phone: number ?? prev.phone,
      }));
    }
  }, [user?.id, user?.email, user?.phone, user?.name]);

  useEffect(() => {
    fetch('/api/subscriptions/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSubData(d))
      .catch(() => setSubData(null));
  }, []);

  const handleSaveContact = () => {
    if (!user?.id) return;
    const fullPhone = form.phoneCountryCode + (form.phone || '').replace(/\D/g, '');
    if (!fullPhone || fullPhone.replace(/\D/g, '').length < 8) {
      alert(ar ? 'الهاتف مطلوب (8 أرقام على الأقل)' : 'Phone required (at least 8 digits)');
      return;
    }
    setSaving(true);
    try {
      if (fullContact) {
        const updates: Partial<Contact> = {
          firstName: form.firstName.trim() || fullContact.firstName,
          secondName: form.secondName.trim() || undefined,
          thirdName: form.thirdName.trim() || undefined,
          familyName: form.familyName.trim() || fullContact.familyName,
          nameEn: form.nameEn.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: fullPhone,
          phoneSecondary: form.phoneSecondary.trim() || undefined,
          nationality: form.nationality.trim() || fullContact.nationality,
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
        const updated = updateContact(fullContact.id, updates);
        if (updated) {
          setContact(updated);
          setEditing(false);
        }
      } else {
        const firstName = form.firstName.trim() || (user?.name?.split(/\s+/)[0]) || '';
        const familyName = form.familyName.trim() || (user?.name?.split(/\s+/).slice(1).join(' ')) || '—';
        const created = createContact({
          contactType: 'PERSONAL',
          category: 'CLIENT',
          firstName: firstName || '—',
          familyName,
          nationality: form.nationality.trim() || 'عماني',
          gender: form.gender,
          phone: fullPhone,
          secondName: form.secondName.trim() || undefined,
          thirdName: form.thirdName.trim() || undefined,
          nameEn: form.nameEn.trim() || undefined,
          email: form.email.trim() || undefined,
          phoneSecondary: form.phoneSecondary.trim() || undefined,
          civilId: form.civilId.trim() || undefined,
          civilIdExpiry: form.civilIdExpiry.trim() || undefined,
          passportNumber: form.passportNumber.trim() || undefined,
          passportExpiry: form.passportExpiry.trim() || undefined,
          workplace: form.workplace.trim() || undefined,
          position: form.position.trim() || undefined,
          address: form.address,
          notes: form.notes.trim() || undefined,
          userId: user.id,
        });
        setContact(created);
        setEditing(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'DUPLICATE_PHONE') alert(ar ? 'رقم الهاتف مسجّل لجهة اتصال أخرى' : 'Phone already registered');
      else if (msg === 'DUPLICATE_CIVIL_ID') alert(ar ? 'الرقم المدني مسجّل' : 'Civil ID already registered');
      else if (msg === 'DUPLICATE_PASSPORT') alert(ar ? 'رقم الجواز مسجّل' : 'Passport already registered');
      else alert(ar ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlans = subData?.plans?.filter((p) => {
    const currentSort = subData.subscription?.planId
      ? (subData.plans.find((x) => x.id === subData.subscription?.planId)?.sortOrder ?? 0)
      : requestDirection === 'upgrade' ? -1 : 99;
    return requestDirection === 'upgrade' ? p.sortOrder > currentSort : p.sortOrder < currentSort;
  }) ?? [];

  const selectedPlan = requestPlanId ? subData?.plans?.find((p) => p.id === requestPlanId) : null;
  const paymentAmount = requestDirection === 'upgrade' && selectedPlan ? selectedPlan.priceMonthly : 0;

  const closePlanModal = () => {
    setShowRequestModal(false);
    setRequestStep(1);
    setRequestPlanId('');
    setRequestReason('');
    setCardData({ number: '', expiry: '', cvv: '', name: '' });
    setPaymentSuccess(null);
  };

  /** تاريخ تفعيل الباقة الجديدة عند التنزيل = اليوم التالي لانتهاء الاشتراك الحالي */
  const downgradeActivationDate = subData?.subscription?.endAt
    ? (() => {
        const d = new Date(subData.subscription.endAt);
        d.setDate(d.getDate() + 1);
        return d;
      })()
    : null;

  const handlePrintReceipt = () => {
    if (!paymentSuccess) return;
    const isAr = locale === 'ar';
    const planName = isAr ? paymentSuccess.planNameAr : paymentSuccess.planNameEn;
    const typeLabel = isAr ? (paymentSuccess.direction === 'upgrade' ? 'ترقية' : 'تنزيل') : (paymentSuccess.direction === 'upgrade' ? 'Upgrade' : 'Downgrade');
    const d = new Date();
    openReceiptPrintWindow({
      docTitleAr: 'إيصال الدفع',
      docTitleEn: 'Payment Receipt',
      date: d,
      locale,
      rows: [
        { labelAr: 'الباقة', labelEn: 'Plan', value: planName },
        { labelAr: 'المبلغ', labelEn: 'Amount', value: `${paymentSuccess.amount.toLocaleString('en-US')} ${paymentSuccess.currency}` },
        { labelAr: 'النوع', labelEn: 'Type', value: typeLabel },
        { labelAr: 'التاريخ', labelEn: 'Date', value: d.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' }) },
      ],
      autoPrint: true,
    });
  };

  const handleSelectPlanForChange = (planId: string) => {
    setRequestPlanId(planId);
    setCardData({ number: '', expiry: '', cvv: '', name: '' });
    setPaymentSuccess(null);
    if (requestDirection === 'downgrade') setRequestStep(2);
    else setRequestStep(2);
  };

  const handleSubmitPayment = async () => {
    if (!requestPlanId) return;
    if (requestDirection === 'upgrade' && (!cardData.number.trim() || cardData.number.replace(/\s/g, '').length < 4)) {
      alert(ar ? 'أدخل بيانات البطاقة' : 'Enter card details');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/me/change-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestedPlanId: requestPlanId,
          direction: requestDirection,
          payment: {
            cardLast4: cardData.number.replace(/\s/g, '').slice(-4),
            cardExpiry: cardData.expiry,
            cardholderName: cardData.name.trim(),
            amount: paymentAmount,
            currency: selectedPlan?.currency ?? 'OMR',
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setPaymentSuccess({
          planNameAr: selectedPlan?.nameAr ?? '',
          planNameEn: selectedPlan?.nameEn ?? '',
          amount: paymentAmount,
          currency: selectedPlan?.currency ?? 'OMR',
          direction: requestDirection,
        });
        fetch('/api/subscriptions/me', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).then((d) => setSubData(d));
      } else {
        alert(data?.error || data?.details || (ar ? 'فشل تنفيذ الطلب' : 'Request failed'));
      }
    } catch (e) {
      alert(ar ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const fullContact = contact && 'id' in contact && contact.id ? (contact as Contact) : null;
  const addressDisplay = fullContact ? formatAddress(fullContact.address) : '—';

  return (
    <div className="admin-main-inner space-y-6">
      <AdminPageHeader title={title} subtitle={ar ? 'بيانات حسابك وباقتك' : 'Your account details and plan'} />

      {/* بياناتي — تعديل وتعبئة على نفس الصفحة (بيانات المستخدم فقط) */}
      <div className="admin-card max-w-3xl">
        <div className="admin-card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="admin-card-title">{ar ? 'بياناتي' : 'My data'}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <button type="button" onClick={() => setEditing(false)} className="admin-btn-secondary">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" onClick={handleSaveContact} disabled={saving} className="admin-btn-primary">
                  {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="admin-btn-primary inline-flex items-center gap-2">
                <Icon name="pencil" className="w-4 h-4" />
                {ar ? 'تعديل وتعبئة البيانات' : 'Edit & fill data'}
              </button>
            )}
          </div>
        </div>
        <div className="admin-card-body space-y-4">
          {editing ? (
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
          ) : fullContact ? (
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
          ) : (
            <div className="space-y-2 text-gray-600">
              <p>{ar ? 'عبّئ البيانات أدناه واضغط «حفظ» لربط سجلك بحسابك.' : 'Fill in the data below and click Save to link your record to your account.'}</p>
              <div className="pt-2 space-y-1">
                <p><span className="font-semibold">{ar ? 'الاسم:' : 'Name:'}</span> {user?.name || '—'}</p>
                <p><span className="font-semibold">{ar ? 'البريد:' : 'Email:'}</span> {user?.email || '—'}</p>
                <p><span className="font-semibold">{ar ? 'الهاتف:' : 'Phone:'}</span> {user?.phone || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* الباقة والاشتراك / نوع الحساب — نافذة واحدة */}
      <div className="admin-card max-w-2xl">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{ar ? 'الباقة والاشتراك / نوع الحساب' : 'Plan & subscription / Account type'}</h2>
        </div>
        <div className="admin-card-body space-y-4">
          {!isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600 m-0">{ar ? 'اشترك في باقة أو غيّر باقتك الحالية من صفحة الباقات.' : 'Subscribe to a plan or change your current plan from the plans page.'}</p>
              <Link href={`/${locale}/subscriptions`} className="admin-btn-primary inline-flex items-center gap-2 no-underline">
                <Icon name="creditCard" className="w-5 h-5" />
                {ar ? 'الاشتراك في الباقات' : 'Subscribe to plans'}
              </Link>
            </div>
          )}
          <div>
            <label className="admin-form-label">{ar ? 'الباقة الحالية' : 'Current plan'}</label>
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
            <div className="pt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setRequestDirection('upgrade'); setRequestPlanId(''); setRequestStep(1); setShowRequestModal(true); }} className="admin-btn-primary">
                {ar ? 'طلب ترقية الباقة' : 'Request upgrade'}
              </button>
              <button type="button" onClick={() => { setRequestDirection('downgrade'); setRequestPlanId(''); setRequestStep(1); setShowRequestModal(true); }} className="admin-btn-secondary">
                {ar ? 'طلب تنزيل الباقة' : 'Request downgrade'}
              </button>
            </div>
          )}
          {subData?.subscription?.plan && subData?.subscription?.startAt && subData?.subscription?.endAt && (
            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">{ar ? 'تاريخ الاشتراك والدفع' : 'Subscription / payment date'}</span>
                    <p className="font-medium text-gray-900">{new Date(subData.subscription.startAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' })}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{ar ? 'تاريخ البدء' : 'Start date'}</span>
                    <p className="font-medium text-gray-900">{new Date(subData.subscription.startAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' })}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{ar ? 'تاريخ الانتهاء' : 'End date'}</span>
                    <p className="font-medium text-gray-900">{new Date(subData.subscription.endAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' })}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sub = subData.subscription!;
                    const plan = sub.plan!;
                    const startDate = new Date(sub.startAt);
                    const endDate = new Date(sub.endAt);
                    openReceiptPrintWindow({
                      docTitleAr: 'إيصال الاشتراك',
                      docTitleEn: 'Subscription receipt',
                      date: startDate,
                      locale,
                      rows: [
                        { labelAr: 'الباقة', labelEn: 'Plan', value: locale === 'ar' ? plan.nameAr : plan.nameEn },
                        { labelAr: 'المبلغ الشهري', labelEn: 'Monthly amount', value: `${plan.priceMonthly} ${plan.currency}` },
                        { labelAr: 'تاريخ الاشتراك والدفع', labelEn: 'Subscription / payment date', value: startDate.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' }) },
                        { labelAr: 'تاريخ البدء', labelEn: 'Start date', value: startDate.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' }) },
                        { labelAr: 'تاريخ الانتهاء', labelEn: 'End date', value: endDate.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'long' }) },
                      ],
                      autoPrint: true,
                    });
                  }}
                  className="admin-btn-secondary inline-flex items-center gap-2"
                >
                  <Icon name="printer" className="w-4 h-4" />
                  {ar ? 'طباعة الإيصال' : 'Print receipt'}
                </button>
              </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-black/60 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="plan-modal-title">
          <div
            className={`admin-modal w-full flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden ${paymentSuccess ? 'max-w-md' : requestStep === 1 ? 'max-w-4xl' : requestStep === 2 && requestDirection === 'downgrade' ? 'max-w-2xl' : 'max-w-5xl max-h-[95vh]'}`}
          >
            <div className="admin-modal-header flex items-center justify-between gap-4 flex-shrink-0">
              <h3 id="plan-modal-title" className="admin-modal-title">
                {paymentSuccess
                  ? (ar ? 'إيصال الدفع' : 'Payment receipt')
                  : requestStep === 1
                    ? (requestDirection === 'upgrade' ? (ar ? 'اختر الباقة للترقية' : 'Choose plan to upgrade') : (ar ? 'اختر الباقة للتنزيل' : 'Choose plan to downgrade'))
                    : requestStep === 2 && requestDirection === 'downgrade'
                      ? (ar ? 'تنبيه تنزيل الباقة' : 'Downgrade notice')
                      : (requestDirection === 'upgrade' ? (ar ? 'إتمام الدفع' : 'Complete payment') : (ar ? 'إتمام الدفع للباقة الجديدة' : 'Pay for new plan'))}
              </h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closePlanModal} className="admin-btn-secondary text-sm py-1.5 px-3">
                  {ar ? 'إغلاق' : 'Close'}
                </button>
                <button type="button" onClick={closePlanModal} className="admin-modal-close" aria-label={ar ? 'إغلاق' : 'Close'}>
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="admin-modal-body flex-1 overflow-y-auto min-h-0">
              {paymentSuccess ? (
                <div className="p-6 space-y-6">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{ar ? 'تمت العملية بنجاح' : 'Payment successful'}</h4>
                    <p className="text-gray-600 text-sm">{ar ? 'تم تسجيل الدفع وتحديث الباقة.' : 'Payment recorded and plan updated.'}</p>
                  </div>
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <h4 className="admin-card-title text-base">{ar ? 'تفاصيل الإيصال' : 'Receipt details'}</h4>
                    </div>
                    <div className="admin-card-body space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'الباقة' : 'Plan'}</span>
                        <span className="font-semibold text-gray-900">{ar ? paymentSuccess.planNameAr : paymentSuccess.planNameEn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'المبلغ' : 'Amount'}</span>
                        <span className="font-semibold text-gray-900">{paymentSuccess.amount.toLocaleString('en-US')} {paymentSuccess.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'النوع' : 'Type'}</span>
                        <span className="font-semibold text-gray-900">{paymentSuccess.direction === 'upgrade' ? (ar ? 'ترقية' : 'Upgrade') : (ar ? 'تنزيل' : 'Downgrade')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'التاريخ' : 'Date'}</span>
                        <span className="font-semibold text-gray-900">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button type="button" onClick={handlePrintReceipt} className="admin-btn-primary px-6 inline-flex items-center gap-2">
                      <Icon name="printer" className="w-5 h-5" />
                      {ar ? 'طباعة الإيصال' : 'Print receipt'}
                    </button>
                    <button type="button" onClick={closePlanModal} className="admin-btn-secondary px-6">
                      {ar ? 'إغلاق النافذة' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : requestStep === 1 ? (
                <>
                  <p className="admin-text-sm admin-text-secondary mb-4" style={{ lineHeight: 'var(--admin-line-height, 1.5)' }}>
                    {ar ? 'اختر الباقة ثم انتقل إلى شاشة الدفع (نفس تجربة حجز العقار).' : 'Choose a plan then proceed to the payment screen (same as property booking).'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handleSelectPlanForChange(plan.id)}
                        className="admin-bg-primary admin-border admin-rounded-lg text-right p-4 hover:shadow-md transition-all border-2 hover:border-[var(--admin-primary)]"
                      >
                        <div className="font-bold admin-text-primary">{ar ? plan.nameAr : plan.nameEn}</div>
                        <div className="font-semibold mt-1" style={{ color: 'var(--admin-primary)' }}>{plan.priceMonthly} {plan.currency ?? 'OMR'}/{ar ? 'شهر' : 'mo'}</div>
                        <span className="admin-text-sm admin-text-tertiary mt-2 block">{ar ? 'اختر ←' : 'Select ←'}</span>
                      </button>
                    ))}
                  </div>
                  {filteredPlans.length === 0 && (
                    <p className="admin-text-secondary py-4">{ar ? 'لا توجد باقات متاحة لهذا الاتجاه.' : 'No plans available for this direction.'}</p>
                  )}
                </>
              ) : requestStep === 2 && requestDirection === 'downgrade' && selectedPlan ? (
                <div className="p-6 space-y-6">
                  <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-right space-y-4">
                    <p className="font-semibold text-amber-900">
                      {ar
                        ? `الباقة الجديدة (${selectedPlan.nameAr}) سيتم تفعيلها من تاريخ ${downgradeActivationDate ? downgradeActivationDate.toLocaleDateString('ar-OM', { dateStyle: 'long' }) : '—'}`
                        : `The new plan (${selectedPlan.nameEn}) will be activated from ${downgradeActivationDate ? downgradeActivationDate.toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—'}`}
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-amber-900 text-sm">
                      <li>{ar ? 'لن تتمكن من استخدام الميزات والصلاحيات الموجودة في الباقة الحالية بعد تاريخ التفعيل.' : 'You will not be able to use the features and permissions of your current plan after the activation date.'}</li>
                      <li>{ar ? 'سيتم حذف كافة البيانات التي لا تتناسق مع الباقة التالية (مثل عقارات أو وحدات تتجاوز حد الباقة الجديدة).' : 'All data that does not comply with the new plan will be removed (e.g. properties or units exceeding the new plan limit).'}</li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button type="button" onClick={() => setRequestStep(1)} className="admin-btn-secondary">
                      {ar ? '← رجوع' : '← Back'}
                    </button>
                    <button type="button" onClick={() => setRequestStep(3)} className="admin-btn-primary inline-flex items-center gap-2">
                      {ar ? 'استمرار' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : ((requestStep === 2 && requestDirection === 'upgrade') || (requestStep === 3 && requestDirection === 'downgrade')) && selectedPlan ? (
                <div className="bg-[#0f0d0b] min-h-[480px] p-4 md:p-6 rounded-b-xl">
                  <UnifiedPaymentForm
                    locale={locale}
                    amount={paymentAmount}
                    currency={selectedPlan.currency ?? 'OMR'}
                    cardData={cardData}
                    onCardDataChange={setCardData}
                    onSubmit={handleSubmitPayment}
                    onCancel={() => { if (requestDirection === 'downgrade') setRequestStep(2); else { setRequestStep(1); setRequestPlanId(''); } setPaymentSuccess(null); }}
                    submitLabel={requestDirection === 'upgrade' ? (ar ? 'دفع وترقية الباقة' : 'Pay & upgrade') : (ar ? 'تأكيد التنزيل والدفع' : 'Confirm downgrade & pay')}
                    cancelLabel={ar ? '← رجوع' : '← Back'}
                    loading={submitting}
                    disabled={submitting}
                    showSimulationBadge
                    amountNote={requestDirection === 'downgrade' ? (ar ? 'سيُطبّق بعد انتهاء الفترة الحالية' : 'Applied at period end') : undefined}
                  />
                </div>
              ) : null}
            </div>
            {requestStep === 1 && !paymentSuccess && (
              <div className="admin-modal-footer flex-shrink-0">
                <button type="button" onClick={closePlanModal} className="admin-btn-secondary">
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
