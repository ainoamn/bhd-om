import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDocumentsFromDb } from '@/lib/accounting/data/dbService';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret:
        process.env.NEXTAUTH_SECRET ||
        (process.env.NODE_ENV === 'development'
          ? 'bhd-dev-secret-not-for-production'
          : undefined),
    });
    const sub = String(token?.sub || '').trim();
    if (!sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = (req.nextUrl.searchParams.get('type') || '').trim().toUpperCase();
    const allowedType =
      type === 'INVOICE' || type === 'RECEIPT' || type === 'QUOTE' || type === 'PAYMENT' || type === 'DEPOSIT'
        ? type
        : undefined;

    const row = await findAddressBookRowByUserId(sub);
    const contactId = row?.contactId || null;
    if (!contactId) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
      });
    }

    const docs = await getDocumentsFromDb({ type: allowedType });
    const mine = docs.filter((d) => String((d as { contactId?: string | null }).contactId || '') === contactId);
    return NextResponse.json(mine, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
    });
  } catch (e) {
    console.error('GET /api/me/accounting-documents:', e);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

