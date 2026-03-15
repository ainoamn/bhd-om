/**
 * GET مستند محاسبي بالمعرف — للأدمن أو من لديه صلاحية REPORT_VIEW.
 * PATCH لتحديث ربط المستند بجهة اتصال (contactId) — للبيانات القديمة.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdFromDb, updateDocumentContactInDb } from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission(request, 'REPORT_VIEW');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 });
  }
  try {
    const doc = await getDocumentByIdFromDb(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (err) {
    console.error('GET /api/accounting/documents/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission(request, 'DOCUMENT_CREATE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const contactId = body.contactId === undefined ? undefined : (body.contactId === null || body.contactId === '' ? null : String(body.contactId));
    if (contactId === undefined) {
      return NextResponse.json({ error: 'contactId required in body' }, { status: 400 });
    }
    await updateDocumentContactInDb(id, contactId);
    const doc = await getDocumentByIdFromDb(id);
    return NextResponse.json(doc ?? { id, contactId });
  } catch (err) {
    console.error('PATCH /api/accounting/documents/[id]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update document' },
      { status: 500 }
    );
  }
}
