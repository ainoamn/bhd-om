/**
 * مزامنة الحجوزات المدفوعة مع المحاسبة (استدعاء برمجي فقط — التشغيل التلقائي يتم من GET /api/accounting/data و GET /api/bookings).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';
import { syncPaidBookingsToAccountingDb } from '@/lib/accounting/data/dbService';

export async function POST(req: NextRequest) {
  const role = await getAccountingRoleFromRequest(req);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const created = await syncPaidBookingsToAccountingDb();
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    console.error('Sync bookings to accounting:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
