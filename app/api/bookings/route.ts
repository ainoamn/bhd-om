/**
 * تخزين واسترجاع الحجوزات على الخادم حتى تظهر في لوحة الإدارة والمحاسبة.
 * عند حفظ حجز مدفوع: يُنشأ إيصال في المحاسبة (قاعدة البيانات) تلقائياً.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDataScope } from '@/lib/auth/adminPermissions';
import { createBookingReceiptInDb, syncPaidBookingsToAccountingDb } from '@/lib/accounting/data/dbService';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    const session = token
      ? {
          user: {
            id: token.sub as string | undefined,
            role: token.role as string | undefined,
            organizationId: token.organizationId as string | null | undefined,
          },
        }
      : null;
    const scope = getDataScope(session);

    if (scope.isAdmin) {
      try {
        await syncPaidBookingsToAccountingDb();
      } catch {
        // عدم إيقاف استجابة الحجوزات عند فشل المزامنة
      }
    }

    const rows = await prisma.bookingStorage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    let bookings = rows.map((r) => {
      try {
        const parsed = JSON.parse(r.data) as { propertyId?: number | string; email?: string; phone?: string; id?: string; [k: string]: unknown };
        // بعض السجلات القديمة/غير المكتملة قد لا تحتوي `id` داخل JSON؛ نستخدم `bookingId` من الـ DB كبديل
        if (!parsed.id && r.bookingId) (parsed as { id?: string }).id = r.bookingId;
        return parsed;
      } catch {
        return null;
      }
    }).filter(Boolean) as { propertyId?: number | string; email?: string; phone?: string; [k: string]: unknown }[];

    if (scope.userId && !scope.isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: scope.userId },
        select: { email: true, phone: true },
      });
      if (user?.email) {
        const norm = (s: string) => (s || '').trim().toLowerCase();
        const normPhone = (s: string) => (s || '').replace(/\D/g, '').replace(/^968/, '').slice(-8);
        const userEmail = norm(user.email);
        const userPhone = user.phone ? normPhone(user.phone) : '';
        bookings = bookings.filter((b) => {
          const matchEmail = userEmail && norm(String(b.email || '')) === userEmail;
          const matchPhone = userPhone && normPhone(String(b.phone || '')) === userPhone;
          return matchEmail || matchPhone;
        });
      } else {
        bookings = [];
      }
    }

    return NextResponse.json(bookings);
  } catch (e) {
    console.error('Bookings GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }
    const data = JSON.stringify(body);
    await prisma.bookingStorage.upsert({
      where: { bookingId: id },
      create: { bookingId: id, data },
      update: { data, updatedAt: new Date() },
    });

    if (body.paymentConfirmed && body.priceAtBooking > 0 && body.type === 'BOOKING') {
      try {
        await createBookingReceiptInDb({
          id: body.id,
          propertyId: Number(body.propertyId),
          unitKey: body.unitKey,
          propertyTitleAr: body.propertyTitleAr,
          propertyTitleEn: body.propertyTitleEn,
          name: body.name || '',
          priceAtBooking: Number(body.priceAtBooking),
          paymentDate: body.paymentDate,
          paymentMethod: body.paymentMethod,
          paymentReferenceNo: body.paymentReferenceNo,
          contactId: body.contactId,
          bankAccountId: body.bankAccountId,
        });
      } catch (accErr) {
        console.error('Booking receipt (accounting) error:', accErr);
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('Bookings POST error:', e);
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
  }
}
