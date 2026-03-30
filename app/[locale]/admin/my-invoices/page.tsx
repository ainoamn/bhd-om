'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function MyInvoicesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav');
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; email?: string; phone?: string; role?: string } | undefined;
  const [invoices, setInvoices] = useState<Array<{ id: string; serialNumber?: string; date?: string; totalAmount?: number }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/me/accounting-documents?type=INVOICE', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!alive) return;
        setInvoices(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!alive) return;
        setInvoices([]);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

  const title = user?.role === 'OWNER' ? tOwner('myInvoices') : tClient('myInvoices');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={locale === 'ar' ? 'الفواتير المرتبطة بحسابك' : 'Invoices linked to your account'} />
      <div className="admin-card overflow-hidden">
        {!loaded ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'لا توجد فواتير' : 'No invoices'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'الرقم' : 'Number'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">{d.serialNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3 font-medium">{d.totalAmount?.toLocaleString(locale === 'ar' ? 'ar-OM' : 'en')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
