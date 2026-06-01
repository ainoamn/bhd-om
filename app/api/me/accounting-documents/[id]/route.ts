import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';
import { getDocumentByIdFromDb } from '@/lib/accounting/data/dbService';
import { getAuthSubFromRequest } from '@/lib/auth/getAuthSubFromRequest';
import { NextRequest, NextResponse } from 'next/server';
import { CACHE_ME_ACCOUNTING_DOCS_GET, HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sub = await getAuthSubFromRequest(req);
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Document id required' }, { status: 400 });
    }

    const row = await findAddressBookRowByUserId(sub);
    const contactId = row?.contactId || null;
    if (!contactId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const doc = await getDocumentByIdFromDb(id.trim());
    if (!doc || doc.contactId !== contactId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(doc, {
      headers: { 'Cache-Control': CACHE_ME_ACCOUNTING_DOCS_GET, Vary: HTTP_CACHE_VARY_AUTH },
    });
  } catch (e) {
    console.error('GET /api/me/accounting-documents/[id]:', e);
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 });
  }
}
