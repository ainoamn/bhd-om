/**
 * GET إيصال اشتراك للمستخدم الحالي فقط — للتحقق أن المستند مرتبط باشتراكه ثم إرجاعه للطباعة.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDocumentByIdFromDb } from '@/lib/accounting/data/dbService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
  });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = token.sub as string;
  const { documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { receiptDocumentId: true },
  }).catch(() => null);
  if (sub?.receiptDocumentId === documentId) {
    const doc = await getDocumentByIdFromDb(documentId);
    if (doc) return NextResponse.json(doc);
  }

  const historyRow = await prisma.subscriptionHistory.findFirst({
    where: { userId, receiptDocumentId: documentId },
  }).catch(() => null);
  if (historyRow) {
    const doc = await getDocumentByIdFromDb(documentId);
    if (doc) return NextResponse.json(doc);
  }

  return NextResponse.json({ error: 'Receipt not found or access denied' }, { status: 404 });
}
