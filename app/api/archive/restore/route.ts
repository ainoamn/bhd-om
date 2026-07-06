import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { restoreEntity, getRestoreLogs } from '@/lib/archive';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const archiveId = searchParams.get('archiveId') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const result = await getRestoreLogs(archiveId, page);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { archiveId } = await req.json();
  const userRole = (token.role as string)?.toUpperCase() as any;

  const result = await restoreEntity(archiveId, token.sub as string, userRole);
  return NextResponse.json(result, { status: result.success ? 200 : 403 });
}
