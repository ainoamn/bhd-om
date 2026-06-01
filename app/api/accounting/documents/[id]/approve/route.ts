import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import {
  getDocumentByIdFromDb,
  updateDocumentStatusInDb,
  updateDocumentInDb,
} from '@/lib/accounting/data/dbService';
import { postDocumentToDb } from '@/lib/accounting/rules/dbPostingRules';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission(_req, 'JOURNAL_APPROVE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    const doc = await getDocumentByIdFromDb(id);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    if (doc.status === 'APPROVED' || doc.status === 'PAID') {
      return NextResponse.json(doc);
    }

    const updatedDoc = await updateDocumentStatusInDb(id, 'APPROVED');
    const entry = await postDocumentToDb(updatedDoc);
    if (entry) {
      await updateDocumentInDb(updatedDoc.id, { journalEntryId: entry.id });
      return NextResponse.json({ ...updatedDoc, journalEntryId: entry.id });
    }

    return NextResponse.json(updatedDoc);
  } catch (err) {
    console.error('Document approve error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to approve document' },
      { status: 400 }
    );
  }
}
