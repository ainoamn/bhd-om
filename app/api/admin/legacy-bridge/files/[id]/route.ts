import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type FileRow = {
  fileName: string;
  mimeType: string | null;
  blobUrl: string | null;
  content: Uint8Array | Buffer | null;
};

function serveFileRow(row: FileRow): NextResponse {
  if (row.blobUrl) {
    return NextResponse.redirect(row.blobUrl, { status: 302 });
  }
  if (!row.content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const contentType = row.mimeType || 'application/octet-stream';
  const body = Buffer.from(row.content);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.fileName)}"`,
      'Cache-Control': 'private, max-age=31536000',
    },
  });
}

/** تقديم ملف مرفق من LegacyStoredFile أو AddressBookContactFile */
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

    const legacyRow = await prisma.legacyStoredFile.findUnique({ where: { id } });
    if (legacyRow) return serveFileRow(legacyRow);

    const abRow = await prisma.addressBookContactFile.findUnique({ where: { id } });
    if (abRow) return serveFileRow(abRow);

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('legacy file serve error', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
