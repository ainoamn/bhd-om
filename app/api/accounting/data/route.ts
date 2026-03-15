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
} from '@/lib/accounting/data/dbService';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    await syncPaidBookingsToAccountingDb();

    const [accounts, documents, journalEntries, periods] = await Promise.all([
      getAccountsFromDb(),
      getDocumentsFromDb({ fromDate, toDate }),
      getJournalEntriesFromDb({ fromDate, toDate }),
      getFiscalPeriodsFromDb(),
    ]);

    return NextResponse.json(
      { accounts, documents, journalEntries, periods },
      { headers: NO_CACHE }
    );
  } catch (err) {
    console.error('Accounting data GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounting data' },
      { status: 500 }
    );
  }
}

