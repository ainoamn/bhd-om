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

export async function GET(req: NextRequest) {
  try {
    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.addressBookContact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const contacts = rows.map((r) => (r.data as Record<string, unknown>) ?? {}).filter((c) => c && (c as { id?: string }).id);
    return NextResponse.json(contacts);
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

    return NextResponse.json(raw);
  } catch (e) {
    console.error('Address book POST error:', e);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
