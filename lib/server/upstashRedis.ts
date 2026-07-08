import { Redis } from '@upstash/redis';

let redis: Redis | null | undefined;

/** Upstash Redis — اختياري؛ يُفعَّل عند تعريف UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN */
export function getUpstashRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redis = null;
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

export function isUpstashConfigured(): boolean {
  return getUpstashRedis() !== null;
}
