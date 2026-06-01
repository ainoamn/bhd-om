import { NextRequest, NextResponse } from 'next/server';
import {
  getJournalEntriesPageFromDb,
  createJournalEntryInDb,
} from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';
import { CACHE_ACCOUNTING_JOURNAL_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';

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
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 50;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const page = await getJournalEntriesPageFromDb({ fromDate, toDate, limit, offset });
    return NextResponse.json(page.items, {
      headers: {
        'Cache-Control': CACHE_ACCOUNTING_JOURNAL_GET,
        Vary: HTTP_CACHE_VARY_AUTH,
        'X-Total-Count': String(page.total),
        'X-Limit': String(page.limit),
        'X-Offset': String(page.offset),
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
