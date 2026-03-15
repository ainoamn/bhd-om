import { getAccountingDataForPage } from '@/lib/accounting/data/dbService';
import AdminAccountingClient from './AdminAccountingClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminAccountingPage() {
  const data = await getAccountingDataForPage();
  const initialData = {
    accounts: data.accounts ?? [],
    documents: data.documents ?? [],
    journalEntries: data.journalEntries ?? [],
    periods: data.periods ?? [],
  };
  return <AdminAccountingClient initialData={initialData} />;
}
