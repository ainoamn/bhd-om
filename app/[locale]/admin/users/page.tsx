'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getAllContacts,
  createContact,
  syncContactsFromUsers,
  syncContactToAddressBookApi,
} from '@/lib/data/addressBook';
import { ADDRESS_BOOK_UPDATED_EVENT, emitAddressBookUpdated } from '@/lib/utils/addressBookEvents';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';
import { isValidUserSerialLike, safeUserSerialForDisplay, shortenUserSerial } from '@/lib/utils/serialNumber';
import UserBarcode from '@/components/admin/UserBarcode';

interface PlanInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  priceMonthly: number;
  currency: string;
}

interface UserRow {
  id: string;
  serialNumber: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  plan?: PlanInfo | null;
  subscriptionEndAt?: string | null;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'roleAdmin',
  CLIENT: 'roleClient',
  OWNER: 'roleOwner',
};

function AddUserModal({
  locale,
  t,
  onSuccess,
  onClose,
}: {
  locale: string;
  t: (k: string) => string;
  onSuccess: (creds: { serialNumber: string; email: string; generatedPassword: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'OWNER'>('CLIENT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError(locale === 'ar' ? 'الاسم مطلوب (حرفان على الأقل)' : 'Name required (min 2 chars)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const category = role === 'OWNER' ? 'LANDLORD' : 'CLIENT';
      const res = await fetch('/api/admin/users/create-from-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === 'ar' ? 'فشل الإنشاء' : 'Create failed'));
        return;
      }
      if (data.userId) {
        const nameParts = name.trim().split(/\s+/).filter(Boolean);
        const fullPhone = (phone || '').replace(/\D/g, '');
        const { code } = parsePhoneToCountryAndNumber(phone || '968');
        const ph = fullPhone.length >= 8
          ? (fullPhone.startsWith(code) ? fullPhone : code + fullPhone.replace(/^0+/, ''))
          : `968${String(Date.now()).slice(-7)}`;
        const created = createContact(
          {
            contactType: 'PERSONAL',
            firstName: nameParts[0] || name.trim(),
            familyName: nameParts.length > 1 ? nameParts[nameParts.length - 1]! : nameParts[0] || '',
            secondName: nameParts.length > 3 ? nameParts[1] : undefined,
            thirdName: nameParts.length > 4 ? nameParts[2] : undefined,
            nationality: 'عماني',
            gender: 'MALE',
            email: data.email && !data.email.includes('@nologin.bhd') ? data.email : undefined,
            phone: ph,
            category: category === 'LANDLORD' ? 'LANDLORD' : 'CLIENT',
            address: { fullAddress: '—', fullAddressEn: '—' },
            userId: data.userId,
          } as Parameters<typeof createContact>[0],
          { userSerialNumber: data.serialNumber || undefined }
        );
        await syncContactToAddressBookApi(created);
        emitAddressBookUpdated();
      }
      onSuccess({
        serialNumber: data.serialNumber || '',
        email: data.email || '',
        generatedPassword: data.generatedPassword || '',
      });
      onClose();
    } catch {
      setError(locale === 'ar' ? 'فشل الإنشاء' : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{locale === 'ar' ? 'إضافة مستخدم جديد' : 'Add new user'}</h3>
        <p className="text-sm text-gray-500 mb-4">{locale === 'ar' ? 'سيُضاف تلقائياً إلى دفتر العناوين' : 'Will be auto-added to address book'}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="admin-input w-full" required minLength={2} placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full name'} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="admin-input w-full" placeholder={locale === 'ar' ? 'اختياري - للدخول بالرقم فقط اتركه فارغاً' : 'Optional - leave empty for phone-only login'} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="admin-input w-full" placeholder="968..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('role')}</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'CLIENT' | 'OWNER')} className="admin-select w-full">
              <option value="CLIENT">{t('roleClient')}</option>
              <option value="OWNER">{t('roleOwner')}</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] disabled:opacity-50">
              {submitting ? (locale === 'ar' ? 'جاري...' : 'Creating...') : (locale === 'ar' ? 'إضافة' : 'Add')}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  locale,
  t,
  onSave,
  onClose,
}: {
  user: UserRow;
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

export default function UsersAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('usersAdmin');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requireAdmin, setRequireAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [contacts, setContacts] = useState<{ email: string; userId?: string }[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [resetResult, setResetResult] = useState<{ serialNumber: string; email: string; generatedPassword: string } | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addedUserCreds, setAddedUserCreds] = useState<{ serialNumber: string; email: string; generatedPassword: string } | null>(null);

  const buildFallbackUsers = useCallback(async (): Promise<UserRow[]> => {
    const rows: UserRow[] = [];
    try {
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionData = sessionRes.ok ? await sessionRes.json() : null;
      const me = sessionData?.user as
        | { id?: string; serialNumber?: string; name?: string; email?: string; phone?: string; role?: string }
        | undefined;
      if (me?.id) {
        rows.push({
          id: me.id,
          serialNumber: (() => {
            const sn = me.serialNumber?.trim();
            return sn && !sn.includes('@') ? sn : '—';
          })(),
          name: me.name || '—',
          email: me.email || '',
          phone: me.phone || null,
          role: me.role || 'CLIENT',
          createdAt: new Date().toISOString(),
          plan: null,
          subscriptionEndAt: null,
        });
      }
    } catch {}
    try {
      const bookingsRes = await fetch('/api/bookings?limit=50&offset=0', { credentials: 'include' });
      const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
      if (Array.isArray(bookings)) {
        for (const b of bookings) {
          const id = String(b?.clientId || b?.userId || '').trim();
          const email = String(b?.clientEmail || b?.email || '').trim();
          const name = String(b?.clientName || b?.name || '').trim();
          const phone = String(b?.clientPhone || b?.phone || '').trim();
          if (!id && !email && !name && !phone) continue;
          const key = id || email || `${name}:${phone}`;
          if (rows.some((u) => (u.id || u.email || '') === key || (!!email && u.email === email))) continue;
          rows.push({
            id: id || key,
            serialNumber: (() => {
              const fromBooking = b?.clientSerialNumber ?? b?.serialNumber;
              const s = fromBooking != null && fromBooking !== '' ? String(fromBooking).trim() : '';
              if (s && !s.includes('@')) return s;
              return '—';
            })(),
            name: name || '—',
            email: email || '',
            phone: phone || null,
            role: 'CLIENT',
            createdAt: new Date().toISOString(),
            plan: null,
            subscriptionEndAt: null,
          });
        }
      }
    } catch {}
    return rows;
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store', credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setRequireAdmin(true);
        setUsers([]);
        return;
      }
      if (!res.ok) {
        const fallback = await buildFallbackUsers();
        setUsers(fallback);
        return;
      }
      const data = await res.json();
      let usersList = Array.isArray(data) ? data : [];
      if (usersList.length === 0) {
        usersList = await buildFallbackUsers();
      }
      setUsers(usersList);
      if (usersList.length > 0) {
        const { added } = syncContactsFromUsers(usersList);
        if (added > 0) {
          setSyncMsg(locale === 'ar' ? `تمت إضافة ${added} مستخدم تلقائياً لدفتر العناوين` : `${added} user(s) auto-added to address book`);
          setTimeout(() => setSyncMsg(null), 3000);
        }
      }
    } catch {
      const fallback = await buildFallbackUsers();
      setUsers(fallback);
    } finally {
      setLoading(false);
    }
  }, [locale, buildFallbackUsers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadUsers();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [locale, loadUsers]);

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      if (usersList.length > 0) syncContactsFromUsers(usersList);
    } catch {
      setUsers([]);
    }
  };

  const fixUserSerial = async (u: { id: string; email: string }) => {
    try {
      const res = await fetch('/api/admin/users/fix-serial', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: u.id, email: u.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          locale === 'ar'
            ? (data?.error || 'فشل توليد الرقم')
            : (data?.error || 'Failed to generate serial');
        setSyncMsg(msg);
        setTimeout(() => setSyncMsg(null), 3000);
        try {
          alert(msg);
        } catch {}
        return;
      }
      const nextSerial = typeof data?.serialNumber === 'string' ? data.serialNumber : '';
      if (nextSerial) {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, serialNumber: nextSerial } : x)));
      }
      setSyncMsg(locale === 'ar' ? 'تم توليد الرقم المتسلسل' : 'Serial generated');
      setTimeout(() => setSyncMsg(null), 2500);
      // نعمل refresh كتحقق نهائي فقط
      refreshUsers();
    } catch {
      setSyncMsg(locale === 'ar' ? 'فشل توليد الرقم' : 'Failed');
      setTimeout(() => setSyncMsg(null), 2500);
      try {
        alert(locale === 'ar' ? 'فشل توليد الرقم' : 'Failed');
      } catch {}
    }
  };

  const handleAddUserSuccess = (creds: { serialNumber: string; email: string; generatedPassword: string }) => {
    setAddedUserCreds(creds);
    setSyncMsg(locale === 'ar' ? 'تمت إضافة المستخدم ودفتر العناوين تلقائياً' : 'User added and auto-added to address book');
    setTimeout(() => setSyncMsg(null), 3000);
    refreshUsers();
  };

  useEffect(() => {
    const list = getAllContacts(true);
    setContacts(list.map((c) => ({
      email: (c.email || '').toLowerCase(),
      userId: (c as { userId?: string }).userId,
    })));
  }, [users]);

  useEffect(() => {
    const refreshAddrFlags = () => {
      const list = getAllContacts(true);
      setContacts(list.map((c) => ({
        email: (c.email || '').toLowerCase(),
        userId: (c as { userId?: string }).userId,
      })));
    };
    window.addEventListener(ADDRESS_BOOK_UPDATED_EVENT, refreshAddrFlags);
    return () => window.removeEventListener(ADDRESS_BOOK_UPDATED_EVENT, refreshAddrFlags);
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (q && !u.serialNumber?.toUpperCase().includes(q.toUpperCase()) &&
        !u.name?.toLowerCase().includes(q) &&
        !u.email?.toLowerCase().includes(q) &&
        !u.phone?.includes(q)) return false;
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    return true;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    clients: users.filter((u) => u.role === 'CLIENT').length,
  };

  const isInAddressBook = (user: { email: string; id: string }) =>
    contacts.some((c) => c.email === user.email.toLowerCase() || c.userId === user.id);

  const handleAddToAddressBook = async (user: UserRow) => {
    if (isInAddressBook(user)) {
      setSyncMsg(locale === 'ar' ? 'موجود في دفتر العناوين' : 'Already in address book');
      setTimeout(() => setSyncMsg(null), 2500);
      return;
    }
    setAddingId(user.id);
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
        : `968${String(Date.now()).slice(-7)}`; // placeholder when no phone

      const created = createContact(
        {
          contactType: 'PERSONAL',
          firstName,
          secondName,
          thirdName,
          familyName: familyName || firstName,
          nationality: 'عماني',
          gender: 'MALE',
          email: user.email?.includes('@nologin.bhd') ? undefined : user.email,
          phone,
          category: user.role === 'OWNER' ? 'LANDLORD' : 'CLIENT',
          address: { fullAddress: '—', fullAddressEn: '—' },
          userId: user.id,
        } as Parameters<typeof createContact>[0],
        { userSerialNumber: user.serialNumber }
      );
      await syncContactToAddressBookApi(created);
      emitAddressBookUpdated();
      setContacts((prev) => [...prev, { email: user.email.toLowerCase(), userId: user.id }]);
      setSyncMsg(locale === 'ar' ? 'تمت الإضافة لدفتر العناوين' : 'Added to address book');
      setTimeout(() => setSyncMsg(null), 2500);
    } catch {
      setSyncMsg(locale === 'ar' ? 'فشل الإضافة' : 'Failed');
      setTimeout(() => setSyncMsg(null), 2500);
    } finally {
      setAddingId(null);
    }
  };

  const handleResetPassword = async (user: UserRow) => {
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
        setSyncMsg(data.error || (locale === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Reset failed'));
        setTimeout(() => setSyncMsg(null), 2500);
        setResetPasswordUser(null);
      }
    } catch {
      setSyncMsg(locale === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Reset failed');
      setTimeout(() => setSyncMsg(null), 2500);
      setResetPasswordUser(null);
    }
  };

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
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...updated } : u)));
      setEditUser(null);
      setSyncMsg(locale === 'ar' ? 'تم التحديث' : 'Updated');
      emitAddressBookUpdated();
      setTimeout(() => setSyncMsg(null), 2500);
    } catch {
      setSyncMsg(locale === 'ar' ? 'فشل التحديث' : 'Update failed');
      setTimeout(() => setSyncMsg(null), 2500);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-full min-h-0">
      {syncMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-medium">
          {syncMsg}
        </div>
      )}
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle') + (locale === 'ar' ? ' — إدارة أسماء المستخدمين وكلمات المرور.' : ' — Manage usernames and passwords.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all"
            >
              <span>+</span>
              {t('addUser')}
            </button>
            <Link
              href={`/${locale}/admin/address-book`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all"
            >
              <span>📇</span>
              {locale === 'ar' ? 'دفتر العناوين' : 'Address Book'}
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="admin-card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('total')}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="admin-card p-4 border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">{t('admins')}</p>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.admins}</p>
        </div>
        <div className="admin-card p-4 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{t('clients')}</p>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.clients}</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">{t('title')}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="admin-input w-48 sm:w-56 py-2 text-sm"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="admin-select text-sm py-2"
            >
              <option value="ALL">{locale === 'ar' ? 'كل الأدوار' : 'All roles'}</option>
              <option value="ADMIN">{t('roleAdmin')}</option>
              <option value="CLIENT">{t('roleClient')}</option>
              <option value="OWNER">{t('roleOwner')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse text-gray-400">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          </div>
        ) : requireAdmin ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl mx-auto mb-4">🔐</div>
            <p className="text-gray-700 font-medium text-lg">{locale === 'ar' ? 'يجب تسجيل الدخول كمدير لعرض قائمة المستخدمين' : 'You must be logged in as Admin to view the users list'}</p>
            <p className="text-gray-500 text-sm mt-2">{locale === 'ar' ? 'سجّل الخروج ثم ادخل بحساب المدير (admin@bhd-om.com)' : 'Sign out then log in with admin account (admin@bhd-om.com)'}</p>
            <Link href={`/${locale}/login`} className="inline-block mt-4 px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
              {locale === 'ar' ? 'صفحة تسجيل الدخول' : 'Login page'}
            </Link>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">👤</div>
            <p className="text-gray-500 font-medium text-lg">{t('noUsers')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('noUsersHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full min-w-0">
            <table className="admin-table min-w-[900px] text-sm w-full">
              <thead>
                <tr>
                  <th className="w-28 px-3 py-2 text-xs">{t('username')}</th>
                  <th className="w-36 px-3 py-2 text-xs">{t('name')}</th>
                  <th className="w-40 px-3 py-2 text-xs max-w-[160px]">{t('email')}</th>
                  <th className="w-28 px-3 py-2 text-xs">{t('phone')}</th>
                  <th className="w-24 px-3 py-2 text-xs">{t('role')}</th>
                  <th className="w-32 px-3 py-2 text-xs">{locale === 'ar' ? 'الباقة' : 'Plan'}</th>
                  <th className="w-24 px-3 py-2 text-xs">{t('status')}</th>
                  <th className="w-48 px-3 py-2 text-xs">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono text-xs font-medium max-w-[min(100%,14rem)]">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        className="text-[#8B6F47] hover:text-[#6B5535] hover:underline cursor-pointer transition-colors block break-all"
                        title={
                          safeUserSerialForDisplay(u.serialNumber) !== '—'
                            ? `${shortenUserSerial(u.serialNumber)} · ${u.serialNumber}`
                            : undefined
                        }
                      >
                        {safeUserSerialForDisplay(u.serialNumber)}
                      </Link>
                      {!isValidUserSerialLike(u.serialNumber) && u.email && u.email.includes('@') && (
                        <button
                          type="button"
                          onClick={() => void fixUserSerial({ id: u.id, email: u.email })}
                          className="mt-1 text-[11px] font-semibold text-amber-700 hover:underline"
                        >
                          {locale === 'ar' ? 'توليد رقم' : 'Generate'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <UserBarcode userId={u.id} locale={locale} size={28} className="shrink-0" />
                        <Link
                          href={`/${locale}/admin/users/${u.id}`}
                          className="text-gray-900 hover:text-[#8B6F47] hover:underline cursor-pointer transition-colors"
                        >
                          {u.name || '—'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {u.email && !u.email.includes('@nologin.bhd') ? (
                        <Link
                          href={`/${locale}/admin/users/${u.id}`}
                          className="text-[#8B6F47] hover:text-[#6B5535] hover:underline truncate block text-xs cursor-pointer transition-colors"
                        >
                          {u.email}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">{locale === 'ar' ? 'دخول بالرقم فقط' : 'Login by ID only'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {u.phone ? (
                        <Link
                          href={`/${locale}/admin/users/${u.id}`}
                          className="text-[#8B6F47] hover:text-[#6B5535] hover:underline text-xs cursor-pointer transition-colors"
                        >
                          {u.phone}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`admin-badge ${u.role === 'ADMIN' ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                        {t(roleLabels[u.role] || 'roleClient')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {u.plan ? (
                        <Link
                          href={`/${locale}/admin/subscriptions`}
                          className="text-[#8B6F47] hover:text-[#6B5535] hover:underline text-xs font-medium"
                        >
                          {locale === 'ar' ? u.plan.nameAr : u.plan.nameEn}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">{locale === 'ar' ? '— لا باقة —' : '— No plan —'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="admin-badge admin-badge-success">{t('statusActive')}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-[#8B6F47] text-xs font-medium"
                          title={locale === 'ar' ? 'تعديل' : 'Edit'}
                        >
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          disabled={!!resetPasswordUser}
                          className="p-1.5 rounded hover:bg-gray-100 text-amber-600 text-xs font-medium disabled:opacity-50"
                          title={locale === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
                        >
                          {resetPasswordUser?.id === u.id ? (locale === 'ar' ? 'جاري...' : '...') : (locale === 'ar' ? 'كلمة مرور' : 'Password')}
                        </button>
                        {!isInAddressBook(u) ? (
                          <button
                            type="button"
                            onClick={() => handleAddToAddressBook(u)}
                            disabled={!!addingId}
                            className="p-1.5 rounded hover:bg-gray-100 text-[#8B6F47] text-xs font-medium disabled:opacity-50"
                          >
                            {addingId === u.id ? (locale === 'ar' ? 'جاري...' : 'Adding...') : (locale === 'ar' ? 'دفتر العناوين' : 'Address Book')}
                          </button>
                        ) : (
                          <Link
                            href={`/${locale}/admin/address-book`}
                            className="p-1.5 rounded hover:bg-gray-100 text-emerald-600 text-xs font-medium"
                          >
                            {locale === 'ar' ? 'في الدفتر' : 'In Book'}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: إضافة مستخدم */}
      {showAddUser && (
        <AddUserModal
          locale={locale}
          t={t}
          onSuccess={handleAddUserSuccess}
          onClose={() => setShowAddUser(false)}
        />
      )}

      {/* Modal: تعديل المستخدم */}
      {editUser && (
        <EditUserModal
          user={editUser}
          locale={locale}
          t={t}
          onSave={handleSaveEdit}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* Modal: بيانات المستخدم المضاف (كلمة المرور المؤقتة) */}
      {addedUserCreds && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAddedUserCreds(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('userCreated')}</h3>
                <p className="text-sm text-gray-600">{t('generatedPasswordHint')}</p>
              </div>
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">{t('username')}</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono text-sm select-all">
                    {addedUserCreds.serialNumber}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(addedUserCreds.serialNumber)}
                    className="px-4 py-2 rounded-lg font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300"
                  >
                    {t('copyPassword')}
                  </button>
                </div>
              </div>
              {addedUserCreds.email && !addedUserCreds.email.includes('@nologin.bhd') && (
                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1">{t('email')}</label>
                  <p className="font-mono text-sm text-gray-900 break-all">{addedUserCreds.email}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">{t('generatedPassword')}</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono text-sm select-all">
                    {addedUserCreds.generatedPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(addedUserCreds.generatedPassword)}
                    className="px-4 py-2 rounded-lg font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300"
                  >
                    {t('copyPassword')}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddedUserCreds(null)}
              className="w-full mt-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
            >
              {locale === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: نتيجة إعادة تعيين كلمة المرور */}
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
              {locale === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
