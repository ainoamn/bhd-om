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
import { HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import {
  assertUserSyncFromContactAllowed,
  syncUserTableFromAddressBookContact,
} from '@/lib/server/syncUserToAddressBook';
import { applyUserIdentityToContactJson } from '@/lib/server/applyUserIdentityToContactJson';

/** قراءة دفتر العناوين للواجهة — بدون كاش متصفح حتى تنعكس التعديلات فوراً بين المستخدم والجهات */
const CACHE_ADDRESS_BOOK_GET_NO_STORE = 'private, no-store, must-revalidate';

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

    /** أي صف مربوط بحساب — نطبّق هوية User الحالية كما في linked-contact حتى لا يظهر دفتر العناوين باسم/هاتف قديم */
    const identityUserIds = new Set<string>();
    for (const r of keptRows) {
      const d = (r.data as Record<string, unknown>) || {};
      const fromLinked = typeof r.linkedUserId === 'string' ? r.linkedUserId.trim() : '';
      const fromJson = typeof d.userId === 'string' ? String(d.userId).trim() : '';
      const uid = fromLinked || fromJson;
      if (uid) identityUserIds.add(uid);
    }
    const identityUsers =
      identityUserIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: [...identityUserIds] } },
            select: { id: true, serialNumber: true, name: true, email: true, phone: true },
          })
        : [];
    const userById = new Map(identityUsers.map((u) => [u.id, u]));

    const contacts = keptRows
      .map((r) => {
        const c = { ...((r.data as Record<string, unknown>) ?? {}) };
        const cid = String(r.contactId || '').trim();
        if (typeof (c as { id?: string }).id !== 'string' || !String((c as { id?: string }).id).trim()) {
          (c as { id: string }).id = cid;
        }
        if (!cid) return null;
        const fromLinked = typeof r.linkedUserId === 'string' ? r.linkedUserId.trim() : '';
        const fromJson = typeof c.userId === 'string' ? String(c.userId).trim() : '';
        const identityUid = fromLinked || fromJson;
        const dbUser = identityUid ? userById.get(identityUid) : undefined;
        if (dbUser) {
          applyUserIdentityToContactJson(c, dbUser);
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
        'Cache-Control': CACHE_ADDRESS_BOOK_GET_NO_STORE,
        Vary: HTTP_CACHE_VARY_AUTH,
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

    if (bodyUserId) {
      const allowed = await assertUserSyncFromContactAllowed(bodyUserId, raw);
      if (!allowed.ok) {
        return NextResponse.json(
          { error: allowed.message, code: allowed.code },
          { status: allowed.status }
        );
      }
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

    if (linkedUserId) {
      try {
        await syncUserTableFromAddressBookContact(linkedUserId, raw);
      } catch (e) {
        console.error('syncUserTableFromAddressBookContact:', e);
      }
    }

    return NextResponse.json(raw);
  } catch (e) {
    console.error('Address book POST error:', e);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
