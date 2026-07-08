import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { rateLimitRequest } from '@/lib/rate-limit';

export interface StatsData {
  properties: number;
  users: number;
  bookings: number;
  contracts: number;
}

const CACHE_KEY = 'bhd-stats';
const CACHE_TTL = 60;

const getStatsFromDb = unstable_cache(
  async (): Promise<StatsData> => {
    const [properties, users, bookings, contracts] = await Promise.all([
      prisma.property.count(),
      prisma.user.count(),
      prisma.bookingStorage.count(),
      prisma.contractStorage.count(),
    ]);
    return { properties, users, bookings, contracts };
  },
  [CACHE_KEY],
  { revalidate: CACHE_TTL, tags: ['stats'] }
);

export async function GET(req: NextRequest): Promise<NextResponse<StatsData>> {
  const limited = await rateLimitRequest(req, 'stats', 60, 60);
  if (limited) return limited as NextResponse<StatsData>;

  try {
    const stats = await getStatsFromDb();
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=300`,
      },
    });
  } catch (error) {
    console.error('[API /stats]', error);
    return NextResponse.json(
      { properties: 0, users: 0, bookings: 0, contracts: 0 },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const preferredRegion = 'home';
