import { NextRequest, NextResponse, after } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { CACHE_CONTRACTS_LIST_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';
import { assertAccountantConfirmedForContract } from '@/lib/server/bookingContractGate';
import { parsePaginationParams, paginationResponseHeaders, slicePage } from '@/lib/server/pagination';
import {
  listBookingStorageRows,
  parseBookingStorageData,
} from '@/lib/server/repositories/bookingStorageRepo';
import {
  backfillContractStorageFromBookingsBatch,
  contractFromBookingJson,
  listContractStorageRows,
  parseContractStorageData,
  upsertContractStorageRow,
} from '@/lib/server/repositories/contractStorageRepo';
import { syncContractIntoBookingStorage } from '@/lib/server/syncContractBookingStorage';
import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';

function parseContractListFilters(url: URL) {
  const filters: {
    propertyId?: number;
    status?: string;
    contractKind?: string;
    bookingId?: string;
  } = {};
  const propertyIdRaw = url.searchParams.get('propertyId');
  const status = url.searchParams.get('status')?.trim();
  const contractKind =
    url.searchParams.get('contractKind')?.trim() || url.searchParams.get('kind')?.trim();
  const bookingId = url.searchParams.get('bookingId')?.trim();
  if (propertyIdRaw && Number.isFinite(Number(propertyIdRaw))) {
    filters.propertyId = Number(propertyIdRaw);
  }
  if (status) filters.status = status;
  if (contractKind) filters.contractKind = contractKind;
  if (bookingId) filters.bookingId = bookingId;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 500 });
    const filters = parseContractListFilters(url);

    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { total: rowTotal, rows } = await listContractStorageRows({ ...pagination, filters });
    let list = rows
      .map((r) => parseContractStorageData(r))
      .filter(Boolean) as Record<string, unknown>[];

    /** انتقالي: إن لم يُترحَّل بعد، اقرأ من BookingStorage */
    if (rowTotal === 0 && !filters) {
      const { rows: bookingRows } = await listBookingStorageRows({ ...pagination, unlimited: true });
      list = bookingRows
        .map((r) => parseBookingStorageData(r))
        .filter(Boolean)
        .map((b) => contractFromBookingJson(b as Record<string, unknown>))
        .filter(Boolean) as Record<string, unknown>[];
    }

    after(async () => {
      try {
        await backfillContractStorageFromBookingsBatch(50);
      } catch {
        /* ignore */
      }
    });

    const paged = rowTotal > 0 ? list : slicePage(list, pagination);
    const totalCount = rowTotal > 0 ? rowTotal : list.length;

    return NextResponse.json(paged, {
      headers: {
        'Cache-Control': CACHE_CONTRACTS_LIST_GET,
        Vary: HTTP_CACHE_VARY_AUTH,
        ...paginationResponseHeaders(totalCount, pagination),
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
    const prev = existing ? parseBookingStorageRow(existing.data) : {};
    const gate = assertAccountantConfirmedForContract(prev || {});
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, message: 'Accountant must confirm payment before creating a contract.' },
        { status: 403 }
      );
    }

    const status = String(body.status || (prev as Record<string, unknown> | undefined)?.contractStage || 'DRAFT');
    const contractPayload = {
      ...(body || {}),
      id,
      bookingId,
      status,
      updatedAt: now,
      createdAt: String(body.createdAt || (prev as Record<string, unknown> | undefined)?.createdAt || now),
    };

    await upsertContractStorageRow({ contractId: id, bookingId, payload: contractPayload });
    await syncContractIntoBookingStorage(bookingId, id, contractPayload, status);

    return NextResponse.json({ ok: true, id, bookingId });
  } catch (e) {
    console.error('POST /api/contracts', e);
    return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
  }
}
