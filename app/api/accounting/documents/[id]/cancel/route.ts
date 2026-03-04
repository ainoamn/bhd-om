import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { updateDocumentStatusInDb } from '@/lib/accounting/data/dbService';

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
    if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    const doc = await updateDocumentStatusInDb(id, 'CANCELLED');
    return NextResponse.json(doc);
  } catch (err) {
    console.error('Document cancel error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel document' },
      { status: 400 }
    );
  }
}
