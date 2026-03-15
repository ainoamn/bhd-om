/**
 * مزامنة الحجوزات المدفوعة مع المحاسبة: إنشاء إيصال في قاعدة البيانات لكل حجز مدفوع لم يُنشأ له إيصال بعد.
 * يُستدعى من لوحة الإدارة أو تلقائياً لضمان ظهور مبالغ الحجوزات في الحسابات.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';
import { createBookingReceiptInDb } from '@/lib/accounting/data/dbService';

export async function POST(req: NextRequest) {
  const role = await getAccountingRoleFromRequest(req);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const rows = await prisma.bookingStorage.findMany({ orderBy: { createdAt: 'desc' } });
    let created = 0;
    for (const r of rows) {
      let b: { id?: string; type?: string; paymentConfirmed?: boolean; priceAtBooking?: number; propertyId?: number; unitKey?: string; propertyTitleAr?: string; propertyTitleEn?: string; name?: string; paymentDate?: string; paymentMethod?: string; paymentReferenceNo?: string; contactId?: string; bankAccountId?: string };
      try {
        b = JSON.parse(r.data);
      } catch {
        continue;
      }
      if (b.type !== 'BOOKING' || !b.paymentConfirmed || !b.priceAtBooking || b.priceAtBooking <= 0 || !b.id) continue;
      const result = await createBookingReceiptInDb({
        id: b.id,
        propertyId: Number(b.propertyId),
        unitKey: b.unitKey,
        propertyTitleAr: b.propertyTitleAr,
        propertyTitleEn: b.propertyTitleEn,
        name: b.name || '',
        priceAtBooking: Number(b.priceAtBooking),
        paymentDate: b.paymentDate,
        paymentMethod: b.paymentMethod,
        paymentReferenceNo: b.paymentReferenceNo,
        contactId: b.contactId,
        bankAccountId: b.bankAccountId,
      });
      if (result) created++;
    }
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    console.error('Sync bookings to accounting:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
