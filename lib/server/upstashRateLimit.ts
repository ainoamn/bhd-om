import { Ratelimit } from '@upstash/ratelimit';
import { getUpstashRedis } from '@/lib/server/upstashRedis';

const upstashLimiters = new Map<string, Ratelimit>();

function limiterKey(name: string, points: number, durationSec: number): string {
  return `${name}:${points}:${durationSec}`;
}

function getUpstashLimiter(name: string, points: number, durationSec: number): Ratelimit | null {
  const redis = getUpstashRedis();
  if (!redis) return null;

  const key = limiterKey(name, points, durationSec);
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      prefix: `bhd:rl:${name}`,
      limiter: Ratelimit.slidingWindow(points, `${durationSec} s`),
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

export async function checkUpstashRateLimit(
  identifier: string,
  name: string,
  points: number,
  durationSec: number
): Promise<{ allowed: boolean; remaining: number; resetTime?: Date } | null> {
  const limiter = getUpstashLimiter(name, points, durationSec);
  if (!limiter) return null;

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: new Date(result.reset),
    };
  } catch (error) {
    console.error('[upstashRateLimit]', name, error);
    return null;
  }
}
