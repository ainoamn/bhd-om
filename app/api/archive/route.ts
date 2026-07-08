import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { archiveEntity, searchArchive } from '@/lib/archive';
import type { ArchiveEntityType } from '@/lib/archive';

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
  const entityType = searchParams.get('entityType') as ArchiveEntityType | undefined;
  const query = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

  const result = await searchArchive(entityType, query, page, pageSize);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasArchiveAccess(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { entityType, entityId, entityTitle, dataSnapshot, reason, notes } = body;
  const userRole = (token.role as string)?.toUpperCase() as 'ADMIN' | 'ORG_MANAGER';

  const result = await archiveEntity(
    entityType, entityId, entityTitle, dataSnapshot,
    token.sub as string, userRole, { reason, notes }
  );

  return NextResponse.json(result, { status: result.success ? 200 : 403 });
}
