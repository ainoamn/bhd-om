import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiters: Record<string, RateLimiterMemory> = {};

export function getLimiter(name: string, points: number = 100, duration: number = 60): RateLimiterMemory {
  const key = `${name}_${points}_${duration}`;
  if (!limiters[key]) {
    limiters[key] = new RateLimiterMemory({ keyPrefix: name, points, duration });
  }
  return limiters[key];
}

export async function checkRateLimit(identifier: string, name: string = 'api', points?: number, duration?: number): Promise<{ allowed: boolean; remaining: number; resetTime?: Date }> {
  const limiter = getLimiter(name, points, duration);
  try {
    const res = await limiter.consume(identifier, 1);
    return { allowed: true, remaining: res.remainingPoints };
  } catch (rejRes: any) {
    return { allowed: false, remaining: 0, resetTime: rejRes.msBeforeNext ? new Date(Date.now() + rejRes.msBeforeNext) : undefined };
  }
}
