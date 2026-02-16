import { NextRequest, NextResponse } from 'next/server';
import {
  getJournalEntriesFromDb,
  createJournalEntryInDb,
} from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const entries = await getJournalEntriesFromDb({ fromDate, toDate });
    return NextResponse.json(entries);
  } catch (err) {
    console.error('Accounting journal GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch journal' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const perm = requirePermission(request, 'JOURNAL_CREATE');
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
