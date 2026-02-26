'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';
import UserBarcode from '@/components/admin/UserBarcode';
import { shortenUserSerial } from '@/lib/utils/serialNumber';
import {
  createContact,
  getContactForUser,
  isAuthorizedRepresentative,
  getLinkedCompanyName,
  getLinkedRepPosition,
  type Contact,
} from '@/lib/data/addressBook';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';
import { normalizeDateForInput } from '@/lib/utils/dateFormat';

interface UserDetail {
  id: string;
  serialNumber: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  dashboardType: string | null;
  createdAt: string;
  updatedAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'roleAdmin',
  CLIENT: 'roleClient',
  OWNER: 'roleOwner',
};

const CATEGORY_KEYS: Record<string, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
  AUTHORIZED_REP: 'categoryAuthorizedRep',
  COMPANY: 'categoryCompany',
  OTHER: 'categoryOther',
};

function EditUserModal({
  user,
  locale,
  t,
  onSave,
  onClose,
}: {
  user: UserDetail;
  locale: string;
  t: (k: string) => string;
  onSave: (updates: { name?: string; email?: string; phone?: string | null; role?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{locale === 'ar' ? 'تعديل المستخدم' : 'Edit User'}</h3>
        <p className="text-sm text-gray-500 mb-4 font-mono" title={user.serialNumber}>{shortenUserSerial(user.serialNumber)}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="admin-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="admin-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="admin-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('role')}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="admin-select w-full">
              <option value="ADMIN">{t('roleAdmin')}</option>
              <option value="CLIENT">{t('roleClient')}</option>
              <option value="OWNER">{t('roleOwner')}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => onSave({ name, email, phone: phone || null, role })}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
          >
            {locale === 'ar' ? 'حفظ' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const id = params?.id as string;
  const t = useTranslations('usersAdmin');
  const tAddr = useTranslations('addressBook');
  const ar = locale === 'ar';

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requireAdmin, setRequireAdmin] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserDetail | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserDetail | null>(null);
  const [resetResult, setResetResult] = useState<{ serialNumber: string; email: string; generatedPassword: string } | null>(null);
  const [addingToAddressBook, setAddingToAddressBook] = useState(false);

  const contact: Contact | null = user
    ? (() => {
        const found = getContactForUser({ id: user.id, email: user.email, phone: user.phone });
        return found && typeof found === 'object' && 'id' in found && (found as Contact).id ? (found as Contact) : null;
      })()
    : null;
  const isInAddressBook = !!contact;
  const isCompany = contact ? (contact.contactType === 'COMPANY' || !!contact.companyData) : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (!cancelled) setRequireAdmin(res.status === 401);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSaveEdit = async (updates: { name?: string; email?: string; phone?: string | null; role?: string }) => {
    if (!editUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        setSyncMsg(data.error || 'Failed');
        setTimeout(() => setSyncMsg(null), 2500);
        return;
      }
      const updated = await res.json();
      setUser((prev) => (prev?.id === editUser.id ? { ...prev, ...updated } : prev));
      setEditUser(null);
      setSyncMsg(ar ? 'تم التحديث' : 'Updated');
      setTimeout(() => setSyncMsg(null), 2500);
    } catch {
      setSyncMsg(ar ? 'فشل التحديث' : 'Update failed');
      setTimeout(() => setSyncMsg(null), 2500);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    setResetPasswordUser(user);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.generatedPassword) {
        setResetResult({
          serialNumber: data.serialNumber || user.serialNumber,
          email: data.email || user.email,
          generatedPassword: data.generatedPassword,
        });
      } else {
        setSyncMsg(data.error || (ar ? 'فشل إعادة تعيين كلمة المرور' : 'Reset failed'));
        setTimeout(() => setSyncMsg(null), 2500);
        setResetPasswordUser(null);
      }
    } catch {
      setSyncMsg(ar ? 'فشل إعادة تعيين كلمة المرور' : 'Reset failed');
      setTimeout(() => setSyncMsg(null), 2500);
      setResetPasswordUser(null);
    }
  };

  const handleAddToAddressBook = async () => {
    if (!user || isInAddressBook) return;
    setAddingToAddressBook(true);
    try {
      const nameParts = (user.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || user.name || '';
      const familyName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
      const secondName = nameParts.length > 3 ? nameParts[1] : undefined;
      const thirdName = nameParts.length > 4 ? nameParts[2] : undefined;
      const fullPhone = (user.phone || '').replace(/\D/g, '');
      const { code } = parsePhoneToCountryAndNumber(user.phone || '968');
      const phone = fullPhone.length >= 8
        ? (fullPhone.startsWith(code) ? fullPhone : code + fullPhone.replace(/^0+/, ''))
        : `968${String(Date.now()).slice(-7)}`;

      createContact({
        contactType: 'PERSONAL',
        firstName,
        secondName,
        thirdName,
        familyName: familyName || firstName,
        nationality: 'عماني',
        gender: 'MALE',
        email: user.email?.includes('@nologin.bhd') ? undefined : user.email,
        phone,
        category: 'CLIENT',
        address: { fullAddress: '—', fullAddressEn: '—' },
        userId: user.id,
      } as Parameters<typeof createContact>[0]);
      setSyncMsg(ar ? 'تمت الإضافة لدفتر العناوين' : 'Added to address book');
      setTimeout(() => setSyncMsg(null), 2500);
    } catch {
      setSyncMsg(ar ? 'فشل الإضافة' : 'Failed');
      setTimeout(() => setSyncMsg(null), 2500);
    } finally {
      setAddingToAddressBook(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-card-body text-center py-16">
          <div className="animate-pulse text-gray-400">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
        </div>
      </div>
    );
  }

  if (requireAdmin) {
    return (
      <div className="admin-card">
        <div className="p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl mx-auto mb-4">🔐</div>
          <p className="text-gray-700 font-medium text-lg">{ar ? 'يجب تسجيل الدخول كمدير لعرض صفحة المستخدم' : 'You must be logged in as Admin to view this page'}</p>
          <Link href={`/${locale}/login`} className="inline-block mt-4 px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
            {ar ? 'صفحة تسجيل الدخول' : 'Login page'}
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="admin-card">
        <div className="p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">👤</div>
          <p className="text-gray-700 font-medium text-lg">{ar ? 'المستخدم غير موجود' : 'User not found'}</p>
          <Link href={`/${locale}/admin/users`} className="inline-block mt-4 px-6 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20">
            {ar ? '← العودة لقائمة المستخدمين' : '← Back to users'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {syncMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-medium">
          {syncMsg}
        </div>
      )}

      <AdminPageHeader
        title={
          <div className="flex items-center gap-3">
            <UserBarcode userId={user.id} locale={locale} size={40} />
            <span>{user.name}</span>
          </div>
        }
        subtitle={shortenUserSerial(user.serialNumber) !== '—' ? shortenUserSerial(user.serialNumber) : user.serialNumber}
        actions={
          <Link
            href={`/${locale}/admin/users`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            <Icon name="chevronRight" className="w-4 h-4" />
            {ar ? 'قائمة المستخدمين' : 'Users list'}
          </Link>
        }
      />

      <div className="admin-card overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('username')}</p>
              <p className="font-mono text-[#8B6F47] font-medium" title={user.serialNumber || undefined}>
                {shortenUserSerial(user.serialNumber)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('name')}</p>
              <p className="font-semibold text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('email')}</p>
              {user.email && !user.email.includes('@nologin.bhd') ? (
                <a href={`mailto:${user.email}`} className="text-[#8B6F47] hover:underline break-all">{user.email}</a>
              ) : (
                <span className="text-gray-400 text-sm">{ar ? 'دخول بالرقم فقط' : 'Login by ID only'}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('phone')}</p>
              {user.phone ? (
                <a href={`tel:${user.phone}`} className="text-[#8B6F47] hover:underline">{user.phone}</a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('role')}</p>
              <span className={`admin-badge ${user.role === 'ADMIN' ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                {t(roleLabels[user.role] || 'roleClient')}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{ar ? 'تاريخ الإنشاء' : 'Created'}</p>
              <p className="text-gray-700 text-sm">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditUser(user)}
              className="px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-colors"
            >
              {ar ? 'تعديل' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!!resetPasswordUser}
              className="px-4 py-2.5 rounded-xl font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              {resetPasswordUser?.id === user.id ? (ar ? 'جاري...' : '...') : (ar ? 'إعادة تعيين كلمة المرور' : 'Reset password')}
            </button>
            {!isInAddressBook ? (
              <button
                type="button"
                onClick={handleAddToAddressBook}
                disabled={addingToAddressBook}
                className="px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 disabled:opacity-50 transition-colors"
              >
                {addingToAddressBook ? (ar ? 'جاري...' : 'Adding...') : (ar ? 'إضافة لدفتر العناوين' : 'Add to Address Book')}
              </button>
            ) : (
              <Link
                href={`/${locale}/admin/address-book`}
                className="inline-flex px-4 py-2.5 rounded-xl font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                {ar ? 'في دفتر العناوين →' : 'In Address Book →'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* بيانات دفتر العناوين - تُعرض دائماً */}
      <div className="admin-card overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-bold text-[#8B6F47]">
            {ar ? 'سجل دفتر العناوين' : 'Address Book Record'}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {contact
              ? (ar ? 'كافة البيانات والمعلومات المخزنة لجهة الاتصال' : 'All stored data and information for this contact')
              : (ar ? 'لا يوجد سجل مرتبط في دفتر العناوين' : 'No linked record in address book')}
          </p>
        </div>
        <div className="p-6 space-y-6">
            {contact ? (
              <>
            {/* نوع الجهة: شخصي / شركة */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{tAddr('contactType')}</p>
              <span className={`admin-badge ${isCompany ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                {isCompany ? tAddr('contactTypeCompany') : tAddr('contactTypePersonal')}
              </span>
            </div>

            {isCompany ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('serialNo')}</p>
                    <p className="font-mono text-sm">{contact.serialNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('category')}</p>
                    <p className="font-medium">{tAddr(CATEGORY_KEYS[contact.category] || 'categoryOther')}</p>
                  </div>
                  {contact.companyData && (
                    <>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('companyNameAr')}</p>
                        <p className="font-semibold text-gray-900">{contact.companyData.companyNameAr || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('companyNameEn')}</p>
                        <p className="text-gray-700">{contact.companyData.companyNameEn || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('commercialRegistrationNumber')}</p>
                        <p className="font-mono text-sm">{contact.companyData.commercialRegistrationNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('commercialRegistrationExpiry')}</p>
                        <p>{contact.companyData.commercialRegistrationExpiry ? normalizeDateForInput(contact.companyData.commercialRegistrationExpiry) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('establishmentDate')}</p>
                        <p>{contact.companyData.establishmentDate ? normalizeDateForInput(contact.companyData.establishmentDate) : '—'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('phone')}</p>
                    <a href={`tel:${contact.phone}`} className="text-[#8B6F47] hover:underline">{contact.phone || '—'}</a>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('email')}</p>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-[#8B6F47] hover:underline break-all">{contact.email}</a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  {contact.address && (contact.address.fullAddress || contact.address.fullAddressEn) && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('address')}</p>
                      <p className="text-sm">{contact.address.fullAddress || contact.address.fullAddressEn || '—'}</p>
                      {(contact.address.governorate || contact.address.state || contact.address.area || contact.address.village || contact.address.street || contact.address.building || contact.address.floor) && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                          {contact.address.governorate && <p>{ar ? 'المحافظة' : 'Governorate'}: {contact.address.governorate}</p>}
                          {contact.address.state && <p>{ar ? 'الولاية' : 'State'}: {contact.address.state}</p>}
                          {contact.address.area && <p>{ar ? 'المنطقة' : 'Area'}: {contact.address.area}</p>}
                          {contact.address.village && <p>{ar ? 'القرية' : 'Village'}: {contact.address.village}</p>}
                          {contact.address.street && <p>{ar ? 'الشارع' : 'Street'}: {contact.address.street}</p>}
                          {contact.address.building && <p>{ar ? 'المبنى' : 'Building'}: {contact.address.building}</p>}
                          {contact.address.floor && <p>{ar ? 'الطابق' : 'Floor'}: {contact.address.floor}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {contact.companyData?.authorizedRepresentatives?.length ? (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{tAddr('authorizedRepresentatives')}</p>
                    <div className="space-y-4">
                      {contact.companyData.authorizedRepresentatives.map((rep) => (
                        <div key={rep.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="font-semibold text-gray-900 mb-2">{ar ? (rep.nameEn || [rep.firstName, rep.secondName, rep.thirdName, rep.familyName].filter(Boolean).join(' ') || rep.name) : (rep.nameEn || rep.name || [rep.firstName, rep.secondName, rep.thirdName, rep.familyName].filter(Boolean).join(' '))}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <span><strong>{tAddr('repPosition')}:</strong> {rep.position || '—'}</span>
                            <span><strong>{tAddr('repPhone')}:</strong> {rep.phone || '—'}</span>
                            {rep.civilId && <span><strong>{tAddr('repCivilId')}:</strong> {rep.civilId}</span>}
                            {rep.passportNumber && <span><strong>{tAddr('repPassport')}:</strong> {rep.passportNumber}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('serialNo')}</p>
                  <p className="font-mono text-sm">{contact.serialNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('category')}</p>
                  <p className="font-medium">{tAddr(CATEGORY_KEYS[contact.category] || 'categoryOther')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('firstName')}</p>
                  <p className="font-medium">{contact.firstName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('secondName')}</p>
                  <p>{contact.secondName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('thirdName')}</p>
                  <p>{contact.thirdName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('familyName')}</p>
                  <p className="font-medium">{contact.familyName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('nationality')}</p>
                  <p>{contact.nationality || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('gender')}</p>
                  <p>{contact.gender === 'FEMALE' ? tAddr('female') : tAddr('male')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('email')}</p>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-[#8B6F47] hover:underline break-all">{contact.email}</a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('phone')}</p>
                  <a href={`tel:${contact.phone}`} className="text-[#8B6F47] hover:underline">{contact.phone || '—'}</a>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('phoneAlt')}</p>
                  {contact.phoneSecondary ? (
                    <a href={`tel:${contact.phoneSecondary}`} className="text-[#8B6F47] hover:underline">{contact.phoneSecondary}</a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('civilId')}</p>
                  <p className="font-mono text-sm">{contact.civilId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('civilIdExpiry')}</p>
                  <p>{contact.civilIdExpiry ? normalizeDateForInput(contact.civilIdExpiry) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('passportNumber')}</p>
                  <p className="font-mono text-sm">{contact.passportNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('passportExpiry')}</p>
                  <p>{contact.passportExpiry ? normalizeDateForInput(contact.passportExpiry) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('workplace')}</p>
                  <p>{contact.workplace || contact.workplaceEn || contact.company || contact.position || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('address')}</p>
                  <p className="text-sm">{contact.address?.fullAddress || contact.address?.fullAddressEn || '—'}</p>
                  {(contact.address?.governorate || contact.address?.state || contact.address?.area || contact.address?.village || contact.address?.street || contact.address?.building || contact.address?.floor) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                      {contact.address?.governorate && <p>{ar ? 'المحافظة' : 'Governorate'}: {contact.address.governorate}</p>}
                      {contact.address?.state && <p>{ar ? 'الولاية' : 'State'}: {contact.address.state}</p>}
                      {contact.address?.area && <p>{ar ? 'المنطقة' : 'Area'}: {contact.address.area}</p>}
                      {contact.address?.village && <p>{ar ? 'القرية' : 'Village'}: {contact.address.village}</p>}
                      {contact.address?.street && <p>{ar ? 'الشارع' : 'Street'}: {contact.address.street}</p>}
                      {contact.address?.building && <p>{ar ? 'المبنى' : 'Building'}: {contact.address.building}</p>}
                      {contact.address?.floor && <p>{ar ? 'الطابق' : 'Floor'}: {contact.address.floor}</p>}
                    </div>
                  )}
                </div>
                {(contact.nameEn || contact.name) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('nameEn')}</p>
                    <p>{contact.nameEn || contact.name || '—'}</p>
                  </div>
                )}
                {isAuthorizedRepresentative(contact) && (
                  <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 uppercase mb-2">{tAddr('authorizedRepresentatives')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {getLinkedCompanyName(contact, locale) && <span><strong>{tAddr('linkedCompany')}:</strong> {getLinkedCompanyName(contact, locale)}</span>}
                      {getLinkedRepPosition(contact) && <span><strong>{tAddr('repPosition')}:</strong> {getLinkedRepPosition(contact)}</span>}
                    </div>
                  </div>
                )}
                {contact.tags?.length ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{ar ? 'الوسوم' : 'Tags'}</p>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {contact.notes?.trim() && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{tAddr('notes')}</p>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <Link
                href={`/${locale}/admin/address-book`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 transition-colors"
              >
                <Icon name="archive" className="w-4 h-4" />
                {ar ? 'فتح دفتر العناوين' : 'Open Address Book'}
              </Link>
            </div>
              </>
            ) : (
              <div className="py-4">
                <p className="text-gray-600 mb-4">
                  {ar ? 'هذا المستخدم غير مرتبط بسجل في دفتر العناوين. يمكنك إضافته لربط بياناته.' : 'This user is not linked to an address book record. You can add them to link their data.'}
                </p>
                <button
                  type="button"
                  onClick={handleAddToAddressBook}
                  disabled={addingToAddressBook}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 disabled:opacity-50 transition-colors"
                >
                  <Icon name="plus" className="w-4 h-4" />
                  {addingToAddressBook ? (ar ? 'جاري الإضافة...' : 'Adding...') : (ar ? 'إضافة لدفتر العناوين' : 'Add to Address Book')}
                </button>
              </div>
            )}
          </div>
        </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          locale={locale}
          t={t}
          onSave={handleSaveEdit}
          onClose={() => setEditUser(null)}
        />
      )}

      {resetResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setResetResult(null); setResetPasswordUser(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('passwordReset')}</h3>
                <p className="text-sm text-gray-600">{t('generatedPasswordHint')}</p>
              </div>
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">{t('username')}</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono text-sm select-all">
                    {resetResult.serialNumber}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(resetResult.serialNumber)}
                    className="px-4 py-2 rounded-lg font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300"
                  >
                    {t('copyPassword')}
                  </button>
                </div>
              </div>
              {resetResult.email && !resetResult.email.includes('@nologin.bhd') && (
                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1">{t('email')}</label>
                  <p className="font-mono text-sm text-gray-900 break-all">{resetResult.email}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">{t('generatedPassword')}</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono text-sm select-all">
                    {resetResult.generatedPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(resetResult.generatedPassword)}
                    className="px-4 py-2 rounded-lg font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300"
                  >
                    {t('copyPassword')}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setResetResult(null); setResetPasswordUser(null); }}
              className="w-full mt-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
            >
              {ar ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
