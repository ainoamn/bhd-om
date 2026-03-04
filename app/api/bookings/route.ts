/**
 * تخزين واسترجاع الحجوزات على الخادم حتى تظهر في لوحة الإدارة والمحاسبة
 * بغض النظر عن متصفح/جهة العميل.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.bookingStorage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const bookings = rows.map((r) => {
      try {
        return JSON.parse(r.data) as unknown;
      } catch {
        return null;
      }
    }).filter(Boolean);
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
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('Bookings POST error:', e);
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
  }
}
