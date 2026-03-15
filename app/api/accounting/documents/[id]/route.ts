/**
 * GET مستند محاسبي بالمعرف — للأدمن أو من لديه صلاحية REPORT_VIEW (عرض التقارير يشمل المستندات).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByIdFromDb } from '@/lib/accounting/data/dbService';
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
