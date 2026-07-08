import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { verifyDocumentServeToken } from '@/lib/server/documentAccessToken';

/** تقديم ملف — يتطلب token موقّع أو جلسة مصادقة */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tokenParam = req.nextUrl.searchParams.get('token');
    const session = await getToken({ req, secret: getAuthSecret() });
    const hasSession = Boolean(session?.sub);
    const hasValidToken = verifyDocumentServeToken(id, tokenParam);

    if (!hasSession && !hasValidToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await prisma.bookingDocumentFile.findUnique({
      where: { id },
    });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const contentType = row.mimeType || 'application/octet-stream';
    return new NextResponse(row.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error('Booking document serve error:', e);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
