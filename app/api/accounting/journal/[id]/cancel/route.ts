import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { updateJournalStatusInDb } from '@/lib/accounting/data/dbService';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission(_req, 'JOURNAL_CANCEL');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    const entry = await updateJournalStatusInDb(id, 'CANCELLED');
    return NextResponse.json(entry);
  } catch (err) {
    console.error('Journal cancel error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel entry' },
      { status: 400 }
    );
  }
}
