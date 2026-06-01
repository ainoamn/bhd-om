'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';
import { getRequiredFieldClass } from '@/lib/utils/requiredFields';

type LinkedContact = {
  id?: string;
  name?: string;
  firstName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  serialNumber?: string;
  category?: string;
  civilId?: string;
  passportNumber?: string;
};

export default function MyContactsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');
  const tAddr = useTranslations('addressBook');

  const role = (session?.user as { role?: string } | undefined)?.role;
  const title = role === 'OWNER' ? tOwner('myContacts') : tClient('myContacts');

  const [contact, setContact] = useState<LinkedContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/user/linked-contact', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (!alive) return;
        setContact(row && typeof row === 'object' ? (row as LinkedContact) : null);
      })
      .catch(() => {
        if (!alive) return;
        setContact(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const displayName =
    contact?.name ||
    [contact?.firstName, contact?.familyName].filter(Boolean).join(' ') ||
    (session?.user as { name?: string } | undefined)?.name ||
    '—';

  const categoryLabel = (() => {
    const cat = String(contact?.category || '').toUpperCase();
    const keys: Record<string, string> = {
      CLIENT: 'categoryClient',
      LANDLORD: 'categoryLandlord',
      TENANT: 'categoryTenant',
    };
    const key = keys[cat];
    return key ? tAddr(key) : cat || '—';
  })();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        subtitle={ar ? 'بيانات جهة الاتصال المرتبطة بحسابك' : 'Contact details linked to your account'}
        actions={
          <Link href={`/${locale}/admin/my-account`} className="admin-btn admin-btn--primary text-sm">
            {ar ? 'تعديل في حسابي' : 'Edit in My Account'}
          </Link>
        }
      />

      {loading ? (
        <div className="admin-card p-12 text-center">
          <p className="text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
        </div>
      ) : !contact ? (
        <div className="admin-card p-12 text-center">
          <Icon name="users" className="mx-auto mb-4 h-12 w-12 text-gray-300" aria-hidden />
          <p className="mb-4 text-gray-600">
            {ar ? 'لا توجد جهة اتصال مرتبطة بعد. أكمل بياناتك من صفحة حسابي.' : 'No linked contact yet. Complete your profile in My Account.'}
          </p>
          <Link href={`/${locale}/admin/my-account`} className="admin-btn admin-btn--primary">
            {ar ? 'الانتقال إلى حسابي' : 'Go to My Account'}
          </Link>
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{displayName}</h2>
            <span className="admin-badge">{categoryLabel}</span>
          </div>
          <div className="admin-card-body grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{ar ? 'الرقم المتسلسل' : 'Serial'}</label>
              <p className={`admin-input ${getRequiredFieldClass(true, contact.serialNumber)}`}>{contact.serialNumber || '—'}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{ar ? 'البريد' : 'Email'}</label>
              <p className={`admin-input ${getRequiredFieldClass(true, contact.email)}`}>{contact.email || '—'}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{ar ? 'الهاتف' : 'Phone'}</label>
              <p className={`admin-input ${getRequiredFieldClass(true, contact.phone)}`}>{contact.phone || '—'}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{ar ? 'الرقم المدني / الجواز' : 'Civil ID / Passport'}</label>
              <p className="admin-input">{contact.civilId || contact.passportNumber || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {ar
          ? 'لإدارة جهات اتصال إضافية أو سجلات CRM كاملة، تواصل مع الإدارة.'
          : 'For additional contacts or full CRM records, contact administration.'}
      </p>
    </div>
  );
}
