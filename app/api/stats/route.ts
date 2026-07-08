import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { rateLimitRequest } from '@/lib/rate-limit';
import { getSiteStats, type SiteStats } from '@/lib/server/siteStats';
import { MARKETING_STATS } from '@/lib/siteStatsConstants';

export type StatsData = SiteStats;

const CACHE_KEY = 'bhd-stats';
const CACHE_TTL = 60;

const getStatsFromDb = unstable_cache(
  async (): Promise<StatsData> => getSiteStats(),
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
    return NextResponse.json(MARKETING_STATS, { status: 200 });
  }
}

export const runtime = 'nodejs';
export const preferredRegion = 'home';
