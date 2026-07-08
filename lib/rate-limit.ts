import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { getClientIp } from '@/lib/server/clientIp';
import { checkUpstashRateLimit } from '@/lib/server/upstashRateLimit';

const limiters: Record<string, RateLimiterMemory> = {};

export function getLimiter(name: string, points: number = 100, duration: number = 60): RateLimiterMemory {
  const key = `${name}_${points}_${duration}`;
  if (!limiters[key]) {
    limiters[key] = new RateLimiterMemory({ keyPrefix: name, points, duration });
  }
  return limiters[key];
}

export async function checkRateLimit(identifier: string, name: string = 'api', points?: number, duration?: number): Promise<{ allowed: boolean; remaining: number; resetTime?: Date }> {
  const pts = points ?? 100;
  const dur = duration ?? 60;

  const upstash = await checkUpstashRateLimit(identifier, name, pts, dur);
  if (upstash) return upstash;

  const limiter = getLimiter(name, pts, dur);
  try {
    const res = await limiter.consume(identifier, 1);
    return { allowed: true, remaining: res.remainingPoints };
  } catch (rejRes: unknown) {
    const ms = typeof rejRes === 'object' && rejRes !== null && 'msBeforeNext' in rejRes
      ? Number((rejRes as { msBeforeNext?: number }).msBeforeNext)
      : undefined;
    return { allowed: false, remaining: 0, resetTime: ms ? new Date(Date.now() + ms) : undefined };
  }
}

/** rate limit لطلب HTTP — يُرجع 429 أو null */
export async function rateLimitRequest(
  req: NextRequest,
  name: string,
  points: number,
  durationSec: number
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await checkRateLimit(`${name}:${ip}`, name, points, durationSec);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: result.resetTime?.toISOString() },
      { status: 429, headers: result.resetTime ? { 'Retry-After': String(Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)) } : {} }
    );
  }
  return null;
}
