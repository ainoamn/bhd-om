import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { CACHE_CONTRACTS_LIST_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import { assertAccountantConfirmedForContract, parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import { parsePaginationParams, paginationResponseHeaders, slicePage } from '@/lib/server/pagination';
import { listBookingStorageRows, parseBookingStorageData } from '@/lib/server/repositories/bookingStorageRepo';

function parseBookingRow(row: { bookingId: string; data: string }) {
  return parseBookingStorageRow(row.data);
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
    const pagination = parsePaginationParams(url, { maxLimit: 500 });

    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { rows } = await listBookingStorageRows({ ...pagination, unlimited: true });
    const list = rows
      .map((r) => parseBookingStorageData(r))
      .filter(Boolean)
      .map((b) => toContractFromBooking(b as Record<string, unknown>))
      .filter(Boolean);
    const paged = slicePage(list, pagination);
    return NextResponse.json(paged, {
      headers: {
        'Cache-Control': CACHE_CONTRACTS_LIST_GET,
        Vary: HTTP_CACHE_VARY_AUTH,
        ...paginationResponseHeaders(list.length, pagination),
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
    const gate = assertAccountantConfirmedForContract(prev || {});
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, message: 'Accountant must confirm payment before creating a contract.' },
        { status: 403 }
      );
    }
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
