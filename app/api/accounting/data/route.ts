/**
 * نقطة نهاية موحّدة لجلب بيانات المحاسبة (حسابات، مستندات، قيود، فترات).
 * Paginated bootstrap — optimized for large datasets.
 */
import { NextRequest, NextResponse, after } from 'next/server';
import {
  getAccountsFromDb,
  getDocumentsPageFromDb,
  getJournalEntriesPageFromDb,
  getFiscalPeriodsFromDb,
  syncPaidBookingsToAccountingDb,
  syncSubscriptionHistoryToAccountingDb,
  ACCOUNTING_DEFAULT_PAGE_SIZE,
  ACCOUNTING_MAX_PAGE_SIZE,
} from '@/lib/accounting/data/dbService';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;
  const limitRaw = Number(searchParams.get('limit') || ACCOUNTING_DEFAULT_PAGE_SIZE);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(ACCOUNTING_MAX_PAGE_SIZE, Math.floor(limitRaw))
    : ACCOUNTING_DEFAULT_PAGE_SIZE;

  after(async () => {
    try {
      await syncPaidBookingsToAccountingDb();
    } catch (syncErr) {
      console.error('Accounting sync bookings:', syncErr);
    }
    try {
      await syncSubscriptionHistoryToAccountingDb();
    } catch (syncSubErr) {
      console.error('Accounting sync subscription history:', syncSubErr);
    }
  });

  let accounts: Awaited<ReturnType<typeof getAccountsFromDb>> = [];
  let documents: Awaited<ReturnType<typeof getDocumentsPageFromDb>>['items'] = [];
  let journalEntries: Awaited<ReturnType<typeof getJournalEntriesPageFromDb>>['items'] = [];
  let periods: Awaited<ReturnType<typeof getFiscalPeriodsFromDb>> = [];
  let meta = {
    documentsTotal: 0,
    journalTotal: 0,
    documentsTruncated: false,
    journalTruncated: false,
  };

  try {
    const [acc, docPage, jrnPage, per] = await Promise.all([
      getAccountsFromDb(),
      getDocumentsPageFromDb({ fromDate, toDate, limit, offset: 0 }),
      getJournalEntriesPageFromDb({ fromDate, toDate, limit, offset: 0 }),
      getFiscalPeriodsFromDb(),
    ]);
    accounts = acc;
    documents = docPage.items;
    journalEntries = jrnPage.items;
    periods = per;
    meta = {
      documentsTotal: docPage.total,
      journalTotal: jrnPage.total,
      documentsTruncated: docPage.total > docPage.items.length,
      journalTruncated: jrnPage.total > jrnPage.items.length,
    };
  } catch (err) {
    console.error('Accounting data GET:', err);
    try {
      accounts = await getAccountsFromDb();
    } catch {
      accounts = [];
    }
  }

  return NextResponse.json(
    { accounts, documents, journalEntries, periods, meta },
    { headers: NO_CACHE }
  );
}
