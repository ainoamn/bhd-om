import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createImpersonateToken } from '@/lib/impersonate';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: userId } = await params;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const token = createImpersonateToken(target.id);
    const base = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    let locale = 'ar';
    try {
      const body = await req.json();
      if (body?.locale && (body.locale === 'ar' || body.locale === 'en')) locale = body.locale;
    } catch {
      // ignore
    }
    const url = `${base}/${locale}/impersonate?t=${encodeURIComponent(token)}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error('Impersonate error:', e);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
