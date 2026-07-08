import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { restoreEntity, getRestoreLogs } from '@/lib/archive';

const ARCHIVE_ROLES = new Set(['ADMIN', 'ORG_MANAGER', 'SUPER_ADMIN']);

function hasArchiveAccess(role: string | undefined): boolean {
  return ARCHIVE_ROLES.has((role || '').toUpperCase());
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasArchiveAccess(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const archiveId = searchParams.get('archiveId') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const result = await getRestoreLogs(archiveId, page);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasArchiveAccess(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { archiveId } = await req.json();
  const userRole = (token.role as string)?.toUpperCase() as 'ADMIN' | 'ORG_MANAGER';

  const result = await restoreEntity(archiveId, token.sub as string, userRole);
  return NextResponse.json(result, { status: result.success ? 200 : 403 });
}
