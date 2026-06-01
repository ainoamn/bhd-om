import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentsPageFromDb,
  createDocumentInDb,
  updateDocumentInDb,
} from '@/lib/accounting/data/dbService';
import { postDocumentToDb } from '@/lib/accounting/rules/dbPostingRules';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { CACHE_ACCOUNTING_DOCUMENTS_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';

export async function GET(request: NextRequest) {
  const { getAccountingRoleFromRequest } = await import('@/lib/accounting/rbac/apiAuth');
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const type = searchParams.get('type') || undefined;
    const limitRaw = Number(searchParams.get('limit') || '0');
    const offsetRaw = Number(searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 50;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const page = await getDocumentsPageFromDb({ fromDate, toDate, type, limit, offset });
    return NextResponse.json(page.items, {
      headers: {
        'Cache-Control': CACHE_ACCOUNTING_DOCUMENTS_GET,
        Vary: HTTP_CACHE_VARY_AUTH,
        'X-Total-Count': String(page.total),
        'X-Limit': String(page.limit),
        'X-Offset': String(page.offset),
      },
    });
  } catch (err) {
    console.error('Accounting documents GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const perm = await requirePermission(request, 'DOCUMENT_CREATE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const body = await request.json();
    const doc = await createDocumentInDb({
      type: body.type,
      status: body.status || 'APPROVED',
      date: body.date,
      serialNumber: body.serialNumber,
      dueDate: body.dueDate,
      contactId: body.contactId,
      bankAccountId: body.bankAccountId,
      propertyId: body.propertyId,
      projectId: body.projectId != null ? String(body.projectId) : undefined,
      amount: body.amount,
      currency: body.currency || 'OMR',
      vatRate: body.vatRate,
      vatAmount: body.vatAmount,
      totalAmount: body.totalAmount,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      items: body.items,
      attachments: body.attachments,
      purchaseOrder: body.purchaseOrder,
      reference: body.reference,
      branch: body.branch,
    });

    let journalEntryId: string | undefined;
    if (doc.status === 'APPROVED' || doc.status === 'PAID') {
      const entry = await postDocumentToDb({
        ...doc,
        items: body.items,
        paymentMethod: body.paymentMethod,
      });
      if (entry) {
        await updateDocumentInDb(doc.id, { journalEntryId: entry.id });
        journalEntryId = entry.id;
      }
    }

    return NextResponse.json({ ...doc, journalEntryId });
  } catch (err) {
    console.error('Accounting documents POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create document' },
      { status: 400 }
    );
  }
}
