import { getAccountingDataForPage } from '@/lib/accounting/data/dbService';
import AdminAccountingClient from './AdminAccountingClient';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isMigrationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /column .* does not exist/i.test(msg) ||
    /Invalid .* invocation/i.test(msg) ||
    /migration/i.test(msg)
  );
}

export default async function AdminAccountingPage() {
  let initialData: AccountingInitialData | undefined;
  let serverLoadError: string | undefined;

  try {
    const data = await getAccountingDataForPage();
    initialData = {
      accounts: data.accounts ?? [],
      documents: data.documents ?? [],
      journalEntries: data.journalEntries ?? [],
      periods: data.periods ?? [],
      meta: data.meta,
    } as unknown as AccountingInitialData;
  } catch (err) {
    console.error('AdminAccountingPage SSR load failed:', err);
    if (isMigrationError(err)) {
      serverLoadError =
        'Database schema out of date. Run: npx prisma migrate deploy — then npm run db:backfill-accounting-journal-links';
    } else {
      serverLoadError = err instanceof Error ? err.message : 'Accounting data load failed';
    }
  }

  return <AdminAccountingClient initialData={initialData} serverLoadError={serverLoadError} />;
}
