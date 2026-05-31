/**
 * تخزين واسترجاع الحجوزات على الخادم حتى تظهر في لوحة الإدارة والمحاسبة.
 * عند حفظ حجز مدفوع: يُنشأ إيصال في المحاسبة (قاعدة البيانات) تلقائياً.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataScope } from '@/lib/auth/adminPermissions';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { createBookingReceiptInDb, syncPaidBookingsToAccountingDb } from '@/lib/accounting/data/dbService';
import { bookingMatchesClientRecord, bookingVisibleToOwner, normPhoneLast8 } from '@/lib/data/ownerLandlordMatch';
import { HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import { generateBhdSerial, isValidBhdSerial } from '@/lib/server/serialNumbers';
import { findConflictingActiveBooking } from '@/lib/server/bookingDuplicateCheck';
import { parsePaginationParams, paginationResponseHeaders, slicePage } from '@/lib/server/pagination';
import { extractBookingStorageDenorm } from '@/lib/server/bookingStorageDenorm';
import {
  backfillBookingStorageDenormBatch,
  listBookingStorageRows,
  parseBookingStorageData,
  type BookingListFilters,
} from '@/lib/server/repositories/bookingStorageRepo';

const CACHE_BOOKINGS_LIST = 'private, no-store';

function parseBookingListFilters(url: URL): BookingListFilters | undefined {
  const filters: BookingListFilters = {};
  const propertyIdRaw = url.searchParams.get('propertyId');
  const status = url.searchParams.get('status')?.trim();
  const bookingType =
    url.searchParams.get('type')?.trim() || url.searchParams.get('bookingType')?.trim();
  if (propertyIdRaw && Number.isFinite(Number(propertyIdRaw))) {
    filters.propertyId = Number(propertyIdRaw);
  }
  if (status) filters.status = status;
  if (bookingType) filters.bookingType = bookingType;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 500 });

    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const token = auth.token as { sub?: string; role?: string; organizationId?: string | null };
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
    const filters = scope.isAdmin ? parseBookingListFilters(url) : undefined;

    const { total: rowTotal, rows } = await listBookingStorageRows({
      ...pagination,
      adminScope: scope.isAdmin,
      filters,
    });
    let bookings: { propertyId?: number | string; email?: string; phone?: string; bookingSerial?: string; [k: string]: unknown }[] = [];
    /** كان يُولَّد الرقم ويُحدَّث الصف في نفس الطلب — متسلسلاً وبطيئاً جداً مع عشرات الحجوزات */
    const deferredSerialJobs: {
      bookingId: string;
      year: number;
      parsed: Record<string, unknown>;
    }[] = [];

    for (const r of rows) {
      try {
        const parsed = parseBookingStorageData(r);
        if (!parsed) continue;
        const year = r.createdAt.getFullYear();
        const needSerial =
          !parsed.bookingSerial || !isValidBhdSerial(String(parsed.bookingSerial));
        if (needSerial) {
          deferredSerialJobs.push({
            bookingId: r.bookingId,
            year,
            parsed: { ...parsed } as Record<string, unknown>,
          });
        }
        bookings.push(parsed);
      } catch {
        /* تخطي سجل تالف */
      }
    }

    /** مزامنة المحاسبة + إصلاح أرقام BKG — بعد إرسال JSON للمتصفح */
    after(async () => {
      if (scope.isAdmin) {
        try {
          await syncPaidBookingsToAccountingDb();
        } catch {
          /* ignore */
        }
        try {
          await backfillBookingStorageDenormBatch(50);
        } catch {
          /* ignore */
        }
      }
      for (const job of deferredSerialJobs) {
        try {
          const bookingSerial = await generateBhdSerial('BKG', { year: job.year });
          const next = { ...job.parsed, bookingSerial };
          const denorm = extractBookingStorageDenorm(next);
          await prisma.bookingStorage.update({
            where: { bookingId: job.bookingId },
            data: { data: JSON.stringify(next), updatedAt: new Date(), ...denorm },
          });
        } catch (err) {
          console.error('Deferred BKG serial fix:', job.bookingId, err);
        }
      }
    });

    if (scope.userId && !scope.isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: scope.userId },
        select: { email: true, phone: true, role: true },
      });
      const role = String(token?.role || user?.role || '');
      const userEmailRaw = (user?.email || '').trim().toLowerCase();
      const userPhone8 = normPhoneLast8(user?.phone || '');
      if (!user || (userEmailRaw.length < 3 && userPhone8.length < 6)) {
        bookings = [];
      } else if (role === 'OWNER') {
        const ownedRows = await prisma.property.findMany({
          where: { ownerId: scope.userId },
          select: { serialNumber: true },
        });
        const ownerPortfolioSerials = new Set(
          ownedRows.map((r) => String(r.serialNumber || '').trim()).filter(Boolean)
        );
        bookings = bookings.filter((b) =>
          bookingVisibleToOwner(
            b as Record<string, unknown>,
            userEmailRaw,
            userPhone8,
            user.phone,
            ownerPortfolioSerials
          )
        );
      } else {
        bookings = bookings.filter((b) =>
          bookingMatchesClientRecord(b as Record<string, unknown>, userEmailRaw, userPhone8)
        );
      }
    }

    const totalAfterFilter = bookings.length;
    const paged = scope.isAdmin && !pagination.unlimited
      ? bookings
      : slicePage(bookings, pagination);
    const totalCount = scope.isAdmin && !pagination.unlimited ? rowTotal : totalAfterFilter;

    return NextResponse.json(paged, {
      headers: {
        'Cache-Control': CACHE_BOOKINGS_LIST,
        Vary: HTTP_CACHE_VARY_AUTH,
        ...paginationResponseHeaders(totalCount, pagination),
      },
    });
  } catch (e) {
    console.error('Bookings GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER', 'CLIENT', 'OWNER', 'LANDLORD']);
    if (forbidden) return forbidden;

    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }
    const year = new Date().getFullYear();
    const needSerial =
      !body.bookingSerial || !isValidBhdSerial(String(body.bookingSerial));
    const payload: Record<string, unknown> = needSerial
      ? { ...body, bookingSerial: await generateBhdSerial('BKG', { year }) }
      : body;
    const allRows = await prisma.bookingStorage.findMany({ select: { bookingId: true, data: true } });
    const conflict = findConflictingActiveBooking(payload as Record<string, unknown>, allRows);
    if (conflict) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_ACTIVE_BOOKING',
          conflictingBookingId: conflict.conflictingBookingId,
          message: 'An active booking already exists for this property and user.',
        },
        { status: 409 }
      );
    }

    const data = JSON.stringify(payload);
    const denorm = extractBookingStorageDenorm(payload);
    await prisma.bookingStorage.upsert({
      where: { bookingId: id },
      create: { bookingId: id, data, ...denorm },
      update: { data, updatedAt: new Date(), ...denorm },
    });

    if (payload.paymentConfirmed && Number(payload.priceAtBooking) > 0 && payload.type === 'BOOKING') {
      try {
        await createBookingReceiptInDb({
          id: String(payload.id),
          propertyId: Number(payload.propertyId),
          unitKey: typeof payload.unitKey === 'string' ? payload.unitKey : undefined,
          propertyTitleAr: typeof payload.propertyTitleAr === 'string' ? payload.propertyTitleAr : undefined,
          propertyTitleEn: typeof payload.propertyTitleEn === 'string' ? payload.propertyTitleEn : undefined,
          name: typeof payload.name === 'string' ? payload.name : '',
          priceAtBooking: Number(payload.priceAtBooking),
          paymentDate: typeof payload.paymentDate === 'string' ? payload.paymentDate : undefined,
          paymentMethod: typeof payload.paymentMethod === 'string' ? payload.paymentMethod : undefined,
          paymentReferenceNo: typeof payload.paymentReferenceNo === 'string' ? payload.paymentReferenceNo : undefined,
          contactId: typeof payload.contactId === 'string' ? payload.contactId : null,
          bankAccountId: typeof payload.bankAccountId === 'string' ? payload.bankAccountId : null,
        });
      } catch (accErr) {
        console.error('Booking receipt (accounting) error:', accErr);
      }
    }

    return NextResponse.json({
      ok: true,
      id,
      bookingSerial: typeof payload.bookingSerial === 'string' ? payload.bookingSerial : undefined,
    });
  } catch (e) {
    console.error('Bookings POST error:', e);
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
  }
}
