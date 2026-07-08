import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { searchArchive } from '@/lib/archive';
import type { ArchiveEntityType } from '@/lib/archive';

const ARCHIVE_ROLES = new Set(['ADMIN', 'ORG_MANAGER', 'SUPER_ADMIN']);

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (token.role as string)?.toUpperCase();
  if (!role || !ARCHIVE_ROLES.has(role)) {
    return NextResponse.json({ error: 'ليس لديك صلاحية الوصول' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('type') as ArchiveEntityType | null;
  const query = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

  const result = await searchArchive(entityType || undefined, query, page, pageSize);
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (token.role as string)?.toUpperCase();
  if (!role || !ARCHIVE_ROLES.has(role)) {
    return NextResponse.json({ error: 'ليس لديك صلاحية الوصول' }, { status: 403 });
  }

  const body = await req.json();
  const entityType = body.entityTypes?.[0] as ArchiveEntityType | undefined;
  const query = body.searchTerm as string | undefined;
  const page = parseInt(String(body.page || '1'), 10);
  const pageSize = Math.min(parseInt(String(body.pageSize || '20'), 10), 100);

  const result = await searchArchive(entityType, query, page, pageSize);
  return NextResponse.json({ success: true, data: result });
}
