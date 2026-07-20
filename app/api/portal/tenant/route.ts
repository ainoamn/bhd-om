/**
 * API Route: بيانات المستأجر (v1)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { findContractsForTenantUser, normalizePortalEmail } from '@/lib/portal/contractsForUser';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const contracts = await findContractsForTenantUser(userId, 50);
    const emailNorm = normalizePortalEmail(user.email);
    const bookings = emailNorm
      ? await prisma.bookingStorage.findMany({
          where: { emailNorm },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        })
      : [];

    return NextResponse.json(
      { user, contracts, bookings },
      {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    console.error('[Portal/Tenant] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
