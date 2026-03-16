'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getDraftKeys, loadDraft } from '@/lib/utils/draftStorage';

type DraftItem = { key: string; label: string; href: string };

function buildDraftItems(keys: string[], locale: string): DraftItem[] {
  const ar = locale === 'ar';
  const items: DraftItem[] = [];
  for (const key of keys) {
    if (key.startsWith('extra-data_')) {
      const propertyId = key.replace(/^extra-data_/, '');
      items.push({
        key,
        label: ar ? `بيانات إضافية — عقار ${propertyId}` : `Extra data — Property ${propertyId}`,
        href: `/${locale}/admin/properties/${propertyId}/extra-data`,
      });
      continue;
    }
    if (key.startsWith('contract_terms_')) {
      const bookingId = key.replace(/^contract_terms_/, '');
      const draft = loadDraft<{ propertyId?: number; bookingId?: string }>(key);
      const propertyId = draft?.propertyId;
      if (propertyId != null) {
        items.push({
          key,
          label: ar ? `شروط تعاقد — حجز ${bookingId}` : `Contract terms — Booking ${bookingId}`,
          href: `/${locale}/properties/${propertyId}/contract-terms?bookingId=${encodeURIComponent(bookingId)}`,
        });
      } else {
        items.push({
          key,
          label: ar ? `شروط تعاقد — ${bookingId}` : `Contract terms — ${bookingId}`,
          href: `/${locale}/admin/my-bookings`,
        });
      }
      continue;
    }
    if (key === 'contact_new' || key.startsWith('contact_edit_')) {
      items.push({
        key,
        label: ar ? (key === 'contact_new' ? 'جهة اتصال جديدة' : 'تعديل جهة اتصال') : key === 'contact_new' ? 'New contact' : 'Edit contact',
        href: `/${locale}/admin/address-book`,
      });
      continue;
    }
    items.push({
      key,
      label: ar ? `مسودة — ${key}` : `Draft — ${key}`,
      href: `/${locale}/admin`,
    });
  }
  return items;
}

export default function AdminDraftsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const refreshDrafts = () => {
    const keys = getDraftKeys();
    setDraftItems(buildDraftItems(keys, locale));
  };

  useEffect(() => {
    refreshDrafts();
  }, [locale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => refreshDrafts();
    window.addEventListener('bhd-draft-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('bhd-draft-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, [locale]);

  const ar = locale === 'ar';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={ar ? 'المسودات غير المحفوظة' : 'Unsaved drafts'}
        subtitle={ar ? 'انقر على أي مسودة للانتقال إليها وإكمال الحفظ' : 'Click any draft to go to it and save'}
      />
      <div className="admin-card">
        <div className="admin-card-body">
          {draftItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {ar ? 'لا توجد مسودات غير محفوظة.' : 'No unsaved drafts.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {draftItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors rounded-lg"
                  >
                    <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="pencil" className="w-5 h-5 text-amber-700" />
                    </span>
                    <span className="flex-1 font-medium text-gray-900">{item.label}</span>
                    <Icon name="chevronLeft" className="w-5 h-5 text-gray-400 rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
