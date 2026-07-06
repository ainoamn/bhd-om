import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { archiveEntity, searchArchive } from '@/lib/archive';
import type { ArchiveEntityType } from '@/lib/archive';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType') as ArchiveEntityType | undefined;
  const query = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const result = await searchArchive(entityType, query, page, pageSize);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { entityType, entityId, entityTitle, dataSnapshot, reason, notes } = body;
  const userRole = (token.role as string)?.toUpperCase() as any;

  const result = await archiveEntity(
    entityType, entityId, entityTitle, dataSnapshot,
    token.sub as string, userRole, { reason, notes }
  );

  return NextResponse.json(result, { status: result.success ? 200 : 403 });
}
