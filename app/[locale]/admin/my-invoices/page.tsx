'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MyAccountingDocumentsTable from '@/components/admin/MyAccountingDocumentsTable';

export default function MyInvoicesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; role?: string } | undefined;
  const [invoices, setInvoices] = useState<Array<{ id: string; serialNumber?: string; date?: string; totalAmount?: number; status?: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/me/accounting-documents?type=INVOICE', { credentials: 'include' })
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

  const title = user?.role === 'OWNER' ? tOwner('myInvoices') : tClient('myInvoices');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={locale === 'ar' ? 'الفواتير المرتبطة بحسابك' : 'Invoices linked to your account'} />
      <div className="admin-card overflow-hidden">
        <MyAccountingDocumentsTable
          locale={locale}
          docType="INVOICE"
          documents={invoices}
          loaded={loaded}
          emptyMessageAr="لا توجد فواتير"
          emptyMessageEn="No invoices"
        />
      </div>
    </div>
  );
}
