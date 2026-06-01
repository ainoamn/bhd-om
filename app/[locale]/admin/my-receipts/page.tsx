'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MyAccountingDocumentsTable from '@/components/admin/MyAccountingDocumentsTable';

export default function MyReceiptsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav.clientNav');

  const user = session?.user as { id?: string } | undefined;
  const [receipts, setReceipts] = useState<Array<{ id: string; serialNumber?: string; date?: string; totalAmount?: number; status?: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/me/accounting-documents?type=RECEIPT', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!alive) return;
        setReceipts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!alive) return;
        setReceipts([]);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('myReceipts')} subtitle={locale === 'ar' ? 'الإيصالات المرتبطة بحسابك' : 'Receipts linked to your account'} />
      <div className="admin-card overflow-hidden">
        <MyAccountingDocumentsTable
          locale={locale}
          docType="RECEIPT"
          documents={receipts}
          loaded={loaded}
          emptyMessageAr="لا توجد إيصالات"
          emptyMessageEn="No receipts"
        />
      </div>
    </div>
  );
}
