/**
 * نقطة نهاية موحّدة لجلب بيانات المحاسبة (حسابات، مستندات، قيود، فترات).
 * تُشغّل مزامنة الحجوزات المدفوعة تلقائياً قبل إرجاع البيانات.
 * لا يشترط التحقق من الجلسة للقراءة — الصفحة محمية بمسار /admin؛ لضمان ظهور البيانات دائماً.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountsFromDb,
  getDocumentsFromDb,
  getJournalEntriesFromDb,
  getFiscalPeriodsFromDb,
  syncPaidBookingsToAccountingDb,
  syncSubscriptionHistoryToAccountingDb,
} from '@/lib/accounting/data/dbService';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

export async function GET(request: NextRequest) {
  const fromDate = new URL(request.url).searchParams.get('fromDate') || undefined;
  const toDate = new URL(request.url).searchParams.get('toDate') || undefined;

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

  let accounts: any[] = [];
  let documents: any[] = [];
  let journalEntries: any[] = [];
  let periods: any[] = [];

  try {
    const [acc, doc, ent, per] = await Promise.all([
      getAccountsFromDb(),
      getDocumentsFromDb({ fromDate, toDate }),
      getJournalEntriesFromDb({ fromDate, toDate }),
      getFiscalPeriodsFromDb(),
    ]);
    accounts = acc;
    documents = doc;
    journalEntries = ent;
    periods = per;
  } catch (err) {
    console.error('Accounting data GET:', err);
    try {
      accounts = await getAccountsFromDb();
    } catch {
      accounts = [];
    }
  }

  return NextResponse.json(
    { accounts, documents, journalEntries, periods },
    { headers: NO_CACHE }
  );
}

