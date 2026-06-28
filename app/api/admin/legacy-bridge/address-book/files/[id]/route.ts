import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** تقديم مرفق دفتر العناوين من PostgreSQL (أو إعادة توجيه إلى Vercel Blob) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const row = await prisma.addressBookContactFile.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (row.blobUrl) {
      return NextResponse.redirect(row.blobUrl, { status: 302 });
    }

    if (!row.content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contentType = row.mimeType || 'application/octet-stream';
    return new NextResponse(Buffer.from(row.content), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(row.fileName)}"`,
        'Cache-Control': 'private, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('address-book file serve error', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
