'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, usePathname, useRouter } from 'next/navigation';
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

/** ينتظر إطاري رسم قبل تشغيل مزامنة ثقيلة على الخيط الرئيسي — حتى يظهر جدول الأسماء قبل أي عمل طويل */
function scheduleAfterNextPaint(cb: () => void) {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(cb, 0);
    });
  });
}

const roleLabels: Record<string, string> = {
  ADMIN: 'roleAdmin',
  CLIENT: 'roleClient',
  OWNER: 'roleOwner',
};

function formatUserListDate(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso.slice(0, 16);
  }
}

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('usersAdmin');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requireAdmin, setRequireAdmin] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  useEffect(() => {
    if (searchParams.get('addUser') !== '1') return;
    setShowAddUser(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('addUser');
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

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
      setLoadError(null);
      const res = await fetch('/api/admin/users?limit=200&offset=0', { cache: 'no-store', credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setRequireAdmin(true);
        setUsers([]);
        return;
      }
      // إذا كانت نسخة الإنتاج لا تحتوي API route (404)، نرجع لمسار احتياطي بدل إظهار 0 مستخدم.
      if (res.status === 404) {
        const fallback = await buildFallbackUsers();
        setLoadError(
          locale === 'ar'
            ? 'واجهة API لقائمة المستخدمين غير متاحة على هذه النسخة (404). تم عرض قائمة احتياطية.'
            : 'Users list API is not available on this deployment (404). Showing a fallback list.'
        );
        setUsers(fallback);
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        const base =
          locale === 'ar'
            ? (data?.error || 'تعذر تحميل قائمة المستخدمين')
            : (data?.error || 'Failed to load users list');
        const details = text && !data?.error ? text.slice(0, 300) : '';
        const msg = `${base}\nHTTP ${res.status}${details ? `\n${details}` : ''}`;
        setLoadError(msg);
        setUsers([]);
        return;
      }
      const data = await res.json();
      let usersList = Array.isArray(data) ? data : [];
      // لا نلجأ لمسار احتياطي هنا حتى لا تظهر بيانات/أرقام غير متسقة في لوحة الإدارة
      setUsers(usersList);
      /** مزامنة دفتر العناوين في الخلفية — بدون تنبيه عند التحميل (كان يظهر قبل الأسماء لأن العمل يحجب الرسم) */
      if (usersList.length > 0) {
        const list = usersList;
        const runSync = () => {
          try {
            syncContactsFromUsers(list);
          } catch {
            /* ignore */
          }
        };
        scheduleAfterNextPaint(() => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(runSync, { timeout: 4000 });
          } else {
            setTimeout(runSync, 0);
          }
        });
      }
    } catch {
      setLoadError(locale === 'ar' ? 'تعذر الاتصال بالخادم' : 'Network error');
      setUsers([]);
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
      const res = await fetch('/api/admin/users?limit=200&offset=0', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      if (usersList.length > 0) {
        const list = usersList;
        const runSync = () => {
          try {
            syncContactsFromUsers(list);
          } catch {
            /* ignore */
          }
        };
        scheduleAfterNextPaint(() => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(runSync, { timeout: 4000 });
          } else {
            setTimeout(runSync, 0);
          }
        });
      }
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
    owners: users.filter((u) => u.role === 'OWNER').length,
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
    <div className="users-admin-page-compact space-y-4 w-full max-w-full min-h-0">
      {syncMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 font-medium">
          {syncMsg}
        </div>
      )}
      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-900 font-medium whitespace-pre-wrap">
          {loadError}
          <button
            type="button"
            className="mr-2 underline font-semibold"
            onClick={() => {
              setLoading(true);
              void loadUsers();
            }}
          >
            {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}
      <AdminPageHeader
        compact
        title={t('title')}
        subtitle={t('subtitle') + (locale === 'ar' ? ' — إدارة أسماء المستخدمين وكلمات المرور.' : ' — Manage usernames and passwords.')}
        actionsClassName="users-toolbar-actions"
        actions={
          <div className="flex flex-wrap gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all"
            >
              <span>+</span>
              {t('addUser')}
            </button>
            <Link
              href={`/${locale}/admin/address-book`}
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all"
            >
              <span>📇</span>
              {locale === 'ar' ? 'دفتر العناوين' : 'Address Book'}
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="admin-card rounded-xl p-3 shadow-none">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">{t('total')}</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums">{stats.total}</p>
        </div>
        <div className="admin-card rounded-xl p-3 border-blue-200/80 shadow-none">
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide leading-tight">{t('admins')}</p>
          <p className="text-lg font-bold text-blue-700 mt-0.5 tabular-nums">{stats.admins}</p>
        </div>
        <div className="admin-card rounded-xl p-3 border-emerald-200/80 shadow-none">
          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide leading-tight">{t('clients')}</p>
          <p className="text-lg font-bold text-emerald-700 mt-0.5 tabular-nums">{stats.clients}</p>
        </div>
        <div className="admin-card rounded-xl p-3 border-amber-200/80 shadow-none">
          <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide leading-tight">{t('owners')}</p>
          <p className="text-lg font-bold text-amber-900 mt-0.5 tabular-nums">{stats.owners}</p>
        </div>
      </div>

      <div className="admin-card users-list-card overflow-hidden rounded-xl shadow-sm">
        <div className="px-3 py-2 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/40">
          <h2 className="text-sm font-semibold text-gray-800">{t('title')}</h2>
          <div className="flex flex-wrap gap-1.5 items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="admin-input w-44 sm:w-52 py-1.5 px-3 text-xs rounded-lg"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="admin-select text-xs py-1.5 px-2 rounded-lg min-w-0"
            >
              <option value="ALL">{locale === 'ar' ? 'كل الأدوار' : 'All roles'}</option>
              <option value="ADMIN">{t('roleAdmin')}</option>
              <option value="CLIENT">{t('roleClient')}</option>
              <option value="OWNER">{t('roleOwner')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-gray-400 text-sm">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          </div>
        ) : requireAdmin ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-2xl mx-auto mb-3">🔐</div>
            <p className="text-gray-700 font-medium text-sm">{locale === 'ar' ? 'يجب تسجيل الدخول كمدير لعرض قائمة المستخدمين' : 'You must be logged in as Admin to view the users list'}</p>
            <p className="text-gray-500 text-xs mt-2">{locale === 'ar' ? 'سجّل الخروج ثم ادخل بحساب المدير (admin@bhd-om.com)' : 'Sign out then log in with admin account (admin@bhd-om.com)'}</p>
            <Link href={`/${locale}/login`} className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
              {locale === 'ar' ? 'صفحة تسجيل الدخول' : 'Login page'}
            </Link>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-3">👤</div>
            <p className="text-gray-500 font-medium text-sm">{t('noUsers')}</p>
            <p className="text-gray-400 text-xs mt-1">{t('noUsersHint')}</p>
          </div>
        ) : (
          <div className="w-full min-w-0 divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <article
                key={u.id}
                className="hover:bg-stone-50/70 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1.5">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <UserBarcode userId={u.id} locale={locale} size={24} className="shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        prefetch={true}
                        className="text-sm font-semibold text-gray-900 hover:text-[#8B6F47] hover:underline break-words leading-snug"
                      >
                        {u.name || '—'}
                      </Link>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    <span className={`admin-badge text-[10px] px-1.5 py-0.5 ${u.role === 'ADMIN' ? 'admin-badge-warning' : 'admin-badge-info'}`}>
                      {t(roleLabels[u.role] || 'roleClient')}
                    </span>
                    <span className="admin-badge admin-badge-success text-[10px] px-1.5 py-0.5">{t('statusActive')}</span>
                  </div>
                </div>

                <dl className="mt-2.5 grid grid-cols-1 gap-x-3 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('username')}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 break-all font-mono text-[11px] text-gray-800">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        prefetch
                        className="text-[#8B6F47] hover:underline"
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
                          className="font-sans text-[11px] font-semibold text-amber-700 hover:underline"
                        >
                          {locale === 'ar' ? 'توليد رقم' : 'Generate'}
                        </button>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('email')}</dt>
                    <dd className="mt-0.5 break-all text-gray-800 leading-snug">
                      {u.email && !u.email.includes('@nologin.bhd') ? (
                        <Link href={`/${locale}/admin/users/${u.id}`} prefetch className="text-[#8B6F47] hover:underline">
                          {u.email}
                        </Link>
                      ) : (
                        <span className="text-gray-400">{locale === 'ar' ? 'دخول بالرقم فقط' : 'Login by ID only'}</span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('phone')}</dt>
                    <dd className="mt-0.5 break-all text-gray-800 leading-snug">
                      {u.phone ? (
                        <Link href={`/${locale}/admin/users/${u.id}`} prefetch className="text-[#8B6F47] hover:underline">
                          {u.phone}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('registeredAt')}</dt>
                    <dd className="mt-0.5 text-gray-800 text-[11px]">{formatUserListDate(u.createdAt, locale)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('plan')}</dt>
                    <dd className="mt-0.5 break-words text-gray-800 leading-snug">
                      {u.plan ? (
                        <Link href={`/${locale}/admin/subscriptions`} prefetch className="text-[#8B6F47] hover:underline font-medium">
                          {locale === 'ar' ? u.plan.nameAr : u.plan.nameEn}
                        </Link>
                      ) : (
                        <span className="text-gray-400">{locale === 'ar' ? '— لا باقة —' : '— No plan —'}</span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('subscriptionEnds')}</dt>
                    <dd className="mt-0.5 text-gray-800 text-[11px]">
                      {u.subscriptionEndAt ? formatUserListDate(u.subscriptionEndAt, locale) : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(u)}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8B6F47] hover:bg-gray-50"
                  >
                    {locale === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(u)}
                    disabled={!!resetPasswordUser}
                    className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {resetPasswordUser?.id === u.id ? (locale === 'ar' ? 'جاري...' : '...') : (locale === 'ar' ? 'كلمة مرور' : 'Password')}
                  </button>
                  {!isInAddressBook(u) ? (
                    <button
                      type="button"
                      onClick={() => handleAddToAddressBook(u)}
                      disabled={!!addingId}
                      className="rounded-md border border-[#8B6F47]/30 bg-[#8B6F47]/5 px-2.5 py-1 text-[11px] font-semibold text-[#6B5535] hover:bg-[#8B6F47]/10 disabled:opacity-50"
                    >
                      {addingId === u.id ? (locale === 'ar' ? 'جاري...' : 'Adding...') : (locale === 'ar' ? 'إضافة للدفتر' : 'Add to book')}
                    </button>
                  ) : (
                    <Link
                      href={`/${locale}/admin/address-book`}
                      prefetch
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      {locale === 'ar' ? 'في الدفتر' : 'In book'}
                    </Link>
                  )}
                  <Link
                    href={`/${locale}/admin/users/${u.id}`}
                    prefetch
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {locale === 'ar' ? 'تفاصيل' : 'Details'}
                  </Link>
                </div>
              </article>
            ))}
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
