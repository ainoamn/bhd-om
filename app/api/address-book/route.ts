/**
 * دفتر العناوين على الخادم — مزامنة جهات الاتصال مع قاعدة البيانات
 * GET: استرجاع كل الجهات (لتحميل الصفحة وعرضها)
 * POST: إضافة جهة اتصال جديدة (من صفحة البيانات الإضافية أو دفتر العناوين)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.sub) {
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
    const token = await getToken({ req, secret });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const contactId = typeof (body as { id?: string }).id === 'string' ? (body as { id: string }).id : null;
    if (!contactId) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });
    }

    await prisma.addressBookContact.upsert({
      where: { contactId },
      create: { contactId, data: body as object },
      update: { data: body as object, updatedAt: new Date() },
    });

    return NextResponse.json(body);
  } catch (e) {
    console.error('Address book POST error:', e);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
