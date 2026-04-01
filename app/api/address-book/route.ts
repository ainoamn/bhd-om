/**
 * دفتر العناوين على الخادم — مزامنة جهات الاتصال مع قاعدة البيانات
 * GET: استرجاع كل الجهات (لتحميل الصفحة وعرضها)
 * POST: إضافة جهة اتصال جديدة (من صفحة البيانات الإضافية أو دفتر العناوين)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAuthSubFromRequest } from '@/lib/auth/getAuthSubFromRequest';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import {
  deleteOtherAddressBookRowsForUser,
  deleteOtherPersonalRowsSamePhone,
  getDuplicateDropContactIdsFromDbRows,
} from '@/lib/server/addressBookDedupe';

const READ_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=20, stale-while-revalidate=90',
  Vary: 'Cookie, Authorization',
};

export async function GET(req: NextRequest) {
  try {
    const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '0');
    const offsetRaw = Number(req.nextUrl.searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 0;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.addressBookContact.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    const drop = getDuplicateDropContactIdsFromDbRows(rows);
    if (drop.size > 0) {
      await prisma.addressBookContact.deleteMany({
        where: { contactId: { in: [...drop] } },
      });
    }
    let keptRows = rows.filter((r) => !drop.has(r.contactId));

    /** بعد الدمج النظري: حذف أي صف شخصي آخر بنفس هاتف صف مربوط بحساب (يفضّل صف «حسابي» / linkedUserId) */
    const canonical = [...keptRows].sort(
      (a, b) => (b.linkedUserId ? 1 : 0) - (a.linkedUserId ? 1 : 0)
    );
    for (const r of canonical) {
      const d = (r.data as Record<string, unknown>) || {};
      if (!r.linkedUserId && typeof d.userId !== 'string') continue;
      await deleteOtherPersonalRowsSamePhone(r.contactId, d.phone);
    }
    keptRows = await prisma.addressBookContact.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const userIds = [
      ...new Set(
        keptRows
          .map((r) => {
            const uid = (r.data as Record<string, unknown>)?.userId;
            return typeof uid === 'string' ? uid.trim() : '';
          })
          .filter(Boolean)
      ),
    ];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, serialNumber: true },
          })
        : [];
    const serialByUser = new Map(users.map((u) => [u.id, u.serialNumber]));

    const contacts = keptRows
      .map((r) => {
        const c = { ...((r.data as Record<string, unknown>) ?? {}) };
        if (!(c && typeof (c as { id?: string }).id === 'string')) return null;
        const uid = typeof c.userId === 'string' ? c.userId.trim() : '';
        if (uid && serialByUser.has(uid)) {
          c.serialNumber = serialByUser.get(uid);
        }
        /** يُمرَّر للواجهة ليتوافق الدمج المحلي مع منطق Prisma (صف مرتبط بحساب) */
        c.linkedUserId = r.linkedUserId ?? null;
        return c;
      })
      .filter((c): c is Record<string, unknown> => c != null);

    const totalCount = contacts.length;
    const paged = limit > 0 ? contacts.slice(offset, offset + limit) : contacts;
    return NextResponse.json(paged, {
      headers: {
        ...READ_CACHE_HEADERS,
        'X-Total-Count': String(totalCount),
        'X-Limit': String(limit || totalCount),
        'X-Offset': String(offset),
      },
    });
  } catch (e) {
    console.error('Address book GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch address book' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const raw = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    const contactId = typeof raw.id === 'string' ? raw.id : null;
    if (!contactId) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });
    }

    const bodyUserId = typeof raw.userId === 'string' && raw.userId.trim() ? raw.userId.trim() : undefined;
    if (bodyUserId && bodyUserId !== sub && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (bodyUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: bodyUserId },
        select: { serialNumber: true },
      });
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found for userId' }, { status: 400 });
      }
      raw.serialNumber = dbUser.serialNumber;
    }

    if (bodyUserId) {
      await deleteOtherAddressBookRowsForUser(contactId, bodyUserId);
    }

    const ident = await assertAddressBookIdentityUnique(raw, contactId);
    if (!ident.ok) {
      return NextResponse.json({ error: ident.message, code: ident.code }, { status: 409 });
    }

    const linkedUserId = bodyUserId ?? null;
    if (linkedUserId) {
      await prisma.addressBookContact.updateMany({
        where: { linkedUserId, NOT: { contactId } },
        data: { linkedUserId: null },
      });
    }

    await prisma.addressBookContact.upsert({
      where: { contactId },
      create: { contactId, linkedUserId, data: raw as object },
      update: { data: raw as object, linkedUserId, updatedAt: new Date() },
    });

    if (raw.phone) {
      await deleteOtherPersonalRowsSamePhone(contactId, raw.phone);
    }

    return NextResponse.json(raw);
  } catch (e) {
    console.error('Address book POST error:', e);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
