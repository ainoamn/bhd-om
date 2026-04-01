import { NextRequest, NextResponse } from 'next/server';
import {
  getJournalEntriesFromDb,
  createJournalEntryInDb,
} from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';

const READ_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=20, stale-while-revalidate=90',
  Vary: 'Cookie, Authorization',
};

export async function GET(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const limitRaw = Number(searchParams.get('limit') || '0');
    const offsetRaw = Number(searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 0;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const entries = await getJournalEntriesFromDb({ fromDate, toDate });
    const totalCount = entries.length;
    const paged = limit > 0 ? entries.slice(offset, offset + limit) : entries;
    return NextResponse.json(paged, {
      headers: {
        ...READ_CACHE_HEADERS,
        'X-Total-Count': String(totalCount),
        'X-Limit': String(limit || totalCount),
        'X-Offset': String(offset),
      },
    });
  } catch (err) {
    console.error('Accounting journal GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch journal' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const perm = await requirePermission(request, 'JOURNAL_CREATE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const body = await request.json();
    const entry = await createJournalEntryInDb({
      date: body.date,
      lines: body.lines,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      documentType: body.documentType,
      documentId: body.documentId,
      contactId: body.contactId,
      bankAccountId: body.bankAccountId,
      propertyId: body.propertyId,
      projectId: body.projectId,
      status: body.status || 'APPROVED',
    });
    return NextResponse.json(entry);
  } catch (err) {
    console.error('Accounting journal POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create entry' },
      { status: 400 }
    );
  }
}
