/**
 * جهة الاتصال المرتبطة بالمستخدم الحالي — مصدر موحّد مع جدول User (الاسم، البريد، الهاتف، الرقم المتسلسل)
 * GET: جلب JSON الجهة من الخادم (أو null)
 * PATCH: دمج الحقول + تحديث User + upsert دفتر العناوين
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAuthSubFromRequest } from '@/lib/auth/getAuthSubFromRequest';
import { prisma } from '@/lib/prisma';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import { deleteOtherAddressBookRowsForUser, deleteOtherPersonalRowsSamePhone } from '@/lib/server/addressBookDedupe';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';
import { upsertAddressBookContactFallback } from '@/lib/server/addressBookContactUpsert';
import { HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';

/** لا نخزّن استجابة «حسابي» في المتصفح — يُظهر بيانات قديمة بعد الحفظ */
const NO_STORE_LINKED_CONTACT = 'private, no-store, must-revalidate';

/** إزالة undefined بشكل عميق + ضمان قابلية تخزين الحقل Json في PostgreSQL */
function toJsonSafeRecord(input: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  } catch {
    return input;
  }
}

function normalizeDigitsPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

export async function GET(req: NextRequest) {
  try {
    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, serialNumber: true, name: true, email: true, phone: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let row = await findAddressBookRowByUserId(sub);
    if (!row) {
      await ensureAddressBookContactForUser({
        userId: user.id,
        serialNumber: user.serialNumber,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      });
      row = await findAddressBookRowByUserId(sub);
    }
    if (!row) {
      return NextResponse.json(null, {
        headers: { 'Cache-Control': NO_STORE_LINKED_CONTACT, Vary: HTTP_CACHE_VARY_AUTH },
      });
    }

    const data = { ...((row.data as Record<string, unknown>) || {}) };
    /** يجب أن يكون id دائماً معرّف الجهة (CNT-…) — بدونها تفشل شاشات «حجوزاتي» ودفتر العناوين */
    const cid = String(row.contactId || '').trim();
    if (typeof data.id !== 'string' || !String(data.id).trim()) {
      data.id = cid;
    }
    data.serialNumber = user.serialNumber;
    data.userId = sub;
    data.linkedUserId = (row as { linkedUserId?: string | null }).linkedUserId ?? sub;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': NO_STORE_LINKED_CONTACT, Vary: HTTP_CACHE_VARY_AUTH },
    });
  } catch (e) {
    console.error('linked-contact GET error:', e);
    return NextResponse.json({ error: 'Failed to load contact' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, serialNumber: true, name: true, email: true, phone: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch = await req.json();
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const row = await findAddressBookRowByUserId(sub);
    let contactId: string;
    let base: Record<string, unknown>;

    if (!row) {
      contactId = `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date().toISOString();
      base = {
        id: contactId,
        contactType: 'PERSONAL',
        category: 'CLIENT',
        nationality: 'عماني',
        gender: 'MALE',
        createdAt: now,
        userId: sub,
      };
    } else {
      contactId = row.contactId;
      base = { ...((row.data as Record<string, unknown>) || {}) };
    }

    const patchClean = JSON.parse(JSON.stringify(patch)) as Record<string, unknown>;
    delete patchClean.id;
    delete patchClean.userId;
    delete patchClean.serialNumber;
    delete patchClean.createdAt;

    const merged: Record<string, unknown> = {
      ...base,
      ...patchClean,
      id: contactId,
      userId: sub,
      serialNumber: user.serialNumber,
    };
    merged.updatedAt = new Date().toISOString();

    const mergedSafe = toJsonSafeRecord(merged);

    await deleteOtherAddressBookRowsForUser(contactId, sub);

    const first = String(merged.firstName || '').trim();
    const second = String(merged.secondName || '').trim();
    const third = String(merged.thirdName || '').trim();
    const family = String(merged.familyName || '').trim();
    const displayName = [first, second, third, family].filter(Boolean).join(' ') || user.name;

    const emailRaw = String(merged.email || '').trim().toLowerCase();
    let nextEmail = user.email;
    if (emailRaw && !emailRaw.includes('@nologin')) {
      const taken = await prisma.user.findFirst({
        where: { email: emailRaw, NOT: { id: sub } },
      });
      if (taken) {
        return NextResponse.json({ error: 'Email already in use', code: 'DUPLICATE_EMAIL' }, { status: 409 });
      }
      nextEmail = emailRaw;
    }

    let nextPhone: string | null = user.phone;
    if (typeof merged.phone === 'string' && merged.phone.replace(/\D/g, '').length >= 8) {
      nextPhone = normalizeDigitsPhone(merged.phone);
    }

    const ident = await assertAddressBookIdentityUnique(mergedSafe, contactId);
    if (!ident.ok) {
      return NextResponse.json({ error: ident.message, code: ident.code }, { status: 409 });
    }

    try {
      await prisma.addressBookContact.updateMany({
        where: { linkedUserId: sub, NOT: { contactId } },
        data: { linkedUserId: null },
      });
    } catch {
      /* عمود linkedUserId غير موجود في القاعدة حتى تُنفَّذ prisma migrate deploy */
    }

    await prisma.user.update({
      where: { id: sub },
      data: { name: displayName, email: nextEmail, phone: nextPhone },
    });

    try {
      await prisma.addressBookContact.upsert({
        where: { contactId },
        create: {
          contactId,
          linkedUserId: sub,
          data: mergedSafe as object,
        },
        update: {
          linkedUserId: sub,
          data: mergedSafe as object,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isMissingLinkedColumn =
        (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') ||
        msg.includes('does not exist') ||
        msg.includes('not available');
      if (!isMissingLinkedColumn) throw e;
      mergedSafe.userId = sub;
      try {
        await prisma.addressBookContact.upsert({
          where: { contactId },
          create: {
            contactId,
            data: mergedSafe as object,
          },
          update: {
            data: mergedSafe as object,
            updatedAt: new Date(),
          },
        });
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2);
        const isSchemaDrift =
          (e2 instanceof Prisma.PrismaClientKnownRequestError && e2.code === 'P2022') ||
          msg2.includes('does not exist') ||
          msg2.includes('not available');
        if (!isSchemaDrift) throw e2;
        await upsertAddressBookContactFallback({
          contactId,
          linkedUserId: sub,
          data: mergedSafe,
        });
      }
    }

    await deleteOtherPersonalRowsSamePhone(contactId, mergedSafe.phone);

    const savedRow = await prisma.addressBookContact.findUnique({
      where: { contactId },
      select: { contactId: true, data: true, linkedUserId: true },
    });
    const freshUser = await prisma.user.findUnique({
      where: { id: sub },
      select: { serialNumber: true },
    });
    if (savedRow) {
      const payload = { ...((savedRow.data as Record<string, unknown>) || {}) };
      const cidOut = String(savedRow.contactId || '').trim();
      if (typeof payload.id !== 'string' || !String(payload.id).trim()) {
        payload.id = cidOut;
      }
      payload.serialNumber = freshUser?.serialNumber ?? user.serialNumber;
      payload.userId = sub;
      payload.linkedUserId = savedRow.linkedUserId ?? sub;
      return NextResponse.json(toJsonSafeRecord(payload), {
        headers: { 'Cache-Control': NO_STORE_LINKED_CONTACT, Vary: HTTP_CACHE_VARY_AUTH },
      });
    }

    mergedSafe.serialNumber = freshUser?.serialNumber ?? user.serialNumber;
    mergedSafe.linkedUserId = sub;
    return NextResponse.json(mergedSafe, {
      headers: { 'Cache-Control': NO_STORE_LINKED_CONTACT, Vary: HTTP_CACHE_VARY_AUTH },
    });
  } catch (e) {
    console.error('linked-contact PATCH error:', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = e.meta as { target?: string[] } | undefined;
      const target = Array.isArray(meta?.target) ? meta.target.join(', ') : '';
      let message = e.message;
      if (e.code === 'P2002') {
        message =
          'تعارض فريد في قاعدة البيانات (ربما ربط جهة أخرى بنفس الحساب). حدّث الصفحة وحاول مرة أخرى، أو تواصل مع الدعم.';
      }
      return NextResponse.json(
        {
          error: 'Failed to save contact',
          code: e.code,
          message,
          target: target || undefined,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to save contact',
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
