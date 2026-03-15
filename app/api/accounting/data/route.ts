/**
 * نقطة نهاية موحّدة لجلب بيانات المحاسبة (حسابات، مستندات، قيود، فترات).
 * تُشغّل مزامنة الحجوزات المدفوعة تلقائياً قبل إرجاع البيانات — مؤتمت بالكامل بدون زر أو تدخل.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountsFromDb,
  getDocumentsFromDb,
  getJournalEntriesFromDb,
  getFiscalPeriodsFromDb,
  syncPaidBookingsToAccountingDb,
} from '@/lib/accounting/data/dbService';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

export async function GET(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
  }
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
