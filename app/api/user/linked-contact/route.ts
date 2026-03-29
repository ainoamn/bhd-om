/**
 * جهة الاتصال المرتبطة بالمستخدم الحالي — مصدر موحّد مع جدول User (الاسم، البريد، الهاتف، الرقم المتسلسل)
 * GET: جلب JSON الجهة من الخادم (أو null)
 * PATCH: دمج الحقول + تحديث User + upsert دفتر العناوين
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSubFromRequest } from '@/lib/auth/getAuthSubFromRequest';
import { prisma } from '@/lib/prisma';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import { deleteOtherAddressBookRowsForUser } from '@/lib/server/addressBookDedupe';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';

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
      select: { serialNumber: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await findAddressBookRowByUserId(sub);
    if (!row) {
      return NextResponse.json(null);
    }

    const data = { ...((row.data as Record<string, unknown>) || {}) };
    data.serialNumber = user.serialNumber;
    data.userId = sub;
    return NextResponse.json(data);
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

    const ident = await assertAddressBookIdentityUnique(merged, contactId);
    if (!ident.ok) {
      return NextResponse.json({ error: ident.message, code: ident.code }, { status: 409 });
    }

    await prisma.addressBookContact.updateMany({
      where: { linkedUserId: sub, NOT: { contactId } },
      data: { linkedUserId: null },
    });

    await prisma.user.update({
      where: { id: sub },
      data: { name: displayName, email: nextEmail, phone: nextPhone },
    });

    await prisma.addressBookContact.upsert({
      where: { contactId },
      create: {
        contactId,
        linkedUserId: sub,
        data: merged as object,
      },
      update: {
        linkedUserId: sub,
        data: merged as object,
        updatedAt: new Date(),
      },
    });

    merged.serialNumber = user.serialNumber;
    return NextResponse.json(merged);
  } catch (e) {
    console.error('linked-contact PATCH error:', e);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
