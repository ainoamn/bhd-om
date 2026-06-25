'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shortenUserSerial } from '@/lib/utils/serialNumber';

interface ScanContact {
  id: string;
  serialNumber: string | null;
  nameAr: string;
  nameEn: string;
  contactType: string;
  category: string;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  nationality: string | null;
  civilId: string | null;
  commercialRegistrationNumber: string | null;
  linkedUserId: string | null;
  createdAt: string | null;
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  CLIENT: { ar: 'عميل', en: 'Client' },
  TENANT: { ar: 'مستأجر', en: 'Tenant' },
  LANDLORD: { ar: 'مالك', en: 'Landlord' },
  SUPPLIER: { ar: 'مورد', en: 'Supplier' },
  PARTNER: { ar: 'شريك', en: 'Partner' },
  GOVERNMENT: { ar: 'جهة حكومية', en: 'Government' },
  AUTHORIZED_REP: { ar: 'مفوض بالتوقيع', en: 'Authorized Rep' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};

export default function ScanContactPage() {
  const params = useParams();
  const contactId = params?.contactId as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const dir = ar ? 'rtl' : 'ltr';

  const [contact, setContact] = useState<ScanContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      setError(ar ? 'معرف غير صالح' : 'Invalid ID');
      return;
    }
    fetch(`/api/scan/contact/${contactId}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setContact(data);
        setError(null);
      })
      .catch(() => {
        setError(ar ? 'جهة الاتصال غير موجودة' : 'Contact not found');
        setContact(null);
      })
      .finally(() => setLoading(false));
  }, [contactId, ar]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-10" dir={dir}>
        <p className="text-center text-sm text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-[60vh] w-full bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-10" dir={dir}>
        <div className="w-full max-w-xl mx-auto rounded-3xl border border-gray-200 bg-white shadow-xl p-6 text-center">
          <p className="text-red-800 font-semibold">{error}</p>
          <Link href={`/${locale}`} className="inline-block mt-4 text-[#8B6F47] font-semibold hover:underline">
            {ar ? 'الرئيسية' : 'Home'}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = ar ? contact.nameAr : contact.nameEn || contact.nameAr;
  const cat = CATEGORY_LABELS[contact.category] || { ar: contact.category, en: contact.category };
  const serial = contact.serialNumber || '—';
  const shortSerial = serial !== '—' ? shortenUserSerial(serial) : '—';

  return (
    <div className="w-full bg-gradient-to-b from-[#f7f3ee] via-gray-50 to-white px-4 py-8" dir={dir}>
      <div className="w-full max-w-xl mx-auto rounded-3xl border border-gray-200/70 bg-white shadow-xl overflow-hidden">
        <div className="bg-[#8B6F47] text-white px-6 py-6">
          <p className="text-xs font-semibold opacity-90">{ar ? 'بطاقة جهة اتصال' : 'Contact card'}</p>
          <h1 className="text-2xl font-extrabold mt-2">{displayName}</h1>
          <p className="text-sm opacity-90 mt-2">
            {contact.contactType === 'COMPANY' ? (ar ? 'شركة' : 'Company') : ar ? 'شخص' : 'Person'}
            {' · '}
            {ar ? cat.ar : cat.en}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500">{ar ? 'الرقم المتسلسل' : 'Serial number'}</p>
            <p className="font-mono text-sm mt-1 break-all" dir="ltr">
              {shortSerial !== '—' ? `${shortSerial} · ${serial}` : serial}
            </p>
            {serial !== '—' && (
              <button
                type="button"
                onClick={() => void copy('serial', serial)}
                className="text-xs font-semibold text-[#8B6F47] hover:underline mt-2"
              >
                {copiedKey === 'serial' ? (ar ? 'تم النسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
              </button>
            )}
          </div>
          {contact.phone && (
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${contact.phone}`} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-sm">
                {ar ? 'اتصال' : 'Call'}
              </a>
              <a
                href={`https://wa.me/${contact.phone.replace(/\D/g, '').replace(/^0+/, '968')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-sm"
              >
                {ar ? 'واتساب' : 'WhatsApp'}
              </a>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 text-sm">
            {contact.phone && (
              <div>
                <span className="text-gray-500">{ar ? 'الهاتف' : 'Phone'}: </span>
                <span className="font-mono" dir="ltr">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div>
                <span className="text-gray-500">{ar ? 'البريد' : 'Email'}: </span>
                <a href={`mailto:${contact.email}`} className="text-[#8B6F47] font-semibold break-all">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.nationality && (
              <div>
                <span className="text-gray-500">{ar ? 'الجنسية' : 'Nationality'}: </span>
                {contact.nationality}
              </div>
            )}
            {contact.civilId && (
              <div>
                <span className="text-gray-500">{ar ? 'الرقم المدني' : 'Civil ID'}: </span>
                <span className="font-mono" dir="ltr">{contact.civilId}</span>
              </div>
            )}
            {contact.commercialRegistrationNumber && (
              <div>
                <span className="text-gray-500">{ar ? 'س.ت.' : 'CR No.'}: </span>
                <span className="font-mono" dir="ltr">{contact.commercialRegistrationNumber}</span>
              </div>
            )}
          </div>
          {contact.linkedUserId && (
            <Link
              href={`/${locale}/scan/${contact.linkedUserId}`}
              className="block text-center text-sm font-semibold text-[#8B6F47] hover:underline"
            >
              {ar ? 'عرض بطاقة المستخدم المرتبط' : 'View linked user card'}
            </Link>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">
        <Link href={`/${locale}`} className="text-[#8B6F47] font-semibold hover:underline">
          {ar ? 'الرئيسية' : 'Home'}
        </Link>
      </p>
    </div>
  );
}
