import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';

const READ_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=20, stale-while-revalidate=90',
  Vary: 'Cookie, Authorization',
};

function parseBookingRow(row: { bookingId: string; data: string }) {
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function toContractFromBooking(booking: Record<string, unknown>) {
  const contractId = String(booking.contractId || booking.id || '');
  const contractData = ((booking.contractData as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  if (!contractId) return null;
  if (!Object.keys(contractData).length) return null;
  return {
    ...contractData,
    id: contractId,
    bookingId: String(booking.id || ''),
    status: String(booking.contractStage || contractData.status || 'DRAFT'),
    updatedAt: String(booking.updatedAt || contractData.updatedAt || new Date().toISOString()),
    createdAt: String(booking.createdAt || contractData.createdAt || new Date().toISOString()),
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get('limit') || 0);
    const offsetParam = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 0;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
    const list = rows
      .map((r) => parseBookingRow({ bookingId: r.bookingId, data: r.data }))
      .filter(Boolean)
      .map((b) => toContractFromBooking(b as Record<string, unknown>))
      .filter(Boolean);
    const paged = limit > 0 ? list.slice(offset, offset + limit) : list;
    return NextResponse.json(paged, {
      headers: {
        ...READ_CACHE_HEADERS,
        'X-Total-Count': String(list.length),
        'X-Limit': String(limit || list.length),
        'X-Offset': String(offset),
      },
    });
  } catch (e) {
    console.error('GET /api/contracts', e);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id || '').trim();
    const bookingId = String(body.bookingId || '').trim();
    if (!id || !bookingId) {
      return NextResponse.json({ error: 'id and bookingId are required' }, { status: 400 });
    }

    const existing = await prisma.bookingStorage.findUnique({ where: { bookingId } });
    const now = new Date().toISOString();
    const prev = existing ? parseBookingRow({ bookingId, data: existing.data }) : {};
    const merged = {
      ...(prev || {}),
      id: bookingId,
      contractId: id,
      contractStage: String(body.status || (prev as Record<string, unknown> | undefined)?.contractStage || 'DRAFT'),
      contractData: { ...(body || {}), id, bookingId, updatedAt: now },
      updatedAt: now,
    };

    await prisma.bookingStorage.upsert({
      where: { bookingId },
      create: { bookingId, data: JSON.stringify(merged) },
      update: { data: JSON.stringify(merged), updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, id, bookingId });
  } catch (e) {
    console.error('POST /api/contracts', e);
    return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
  }
}
