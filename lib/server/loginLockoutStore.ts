import { SECURITY_CONFIG } from '@/lib/security';
import { getUpstashRedis } from '@/lib/server/upstashRedis';

const KEY_PREFIX = 'bhd:login:';

export type LoginAttemptResult = {
  allowed: boolean;
  remainingAttempts: number;
  lockoutTime?: number;
};

/** قفل محاولات الدخول عبر Upstash — null إذا غير مُفعَّل */
export async function recordLoginAttemptRedis(identifier: string): Promise<LoginAttemptResult | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;

  const lockKey = `${KEY_PREFIX}lock:${identifier}`;
  const countKey = `${KEY_PREFIX}count:${identifier}`;

  try {
    const lockedUntil = await redis.get<number>(lockKey);
    const now = Date.now();
    if (typeof lockedUntil === 'number' && lockedUntil > now) {
      return { allowed: false, remainingAttempts: 0, lockoutTime: lockedUntil - now };
    }

    const count = await redis.incr(countKey);
    if (count === 1) {
      await redis.pexpire(countKey, SECURITY_CONFIG.LOGIN_ATTEMPTS.ATTEMPT_WINDOW);
    }

    if (count >= SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS) {
      const until = now + SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION;
      await redis.set(lockKey, until, { px: SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION });
      await redis.del(countKey);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION,
      };
    }

    return {
      allowed: true,
      remainingAttempts: SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS - count,
    };
  } catch (error) {
    console.error('[loginLockoutRedis]', error);
    return null;
  }
}

export async function clearLoginAttemptsRedis(identifier: string): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.del(`${KEY_PREFIX}lock:${identifier}`, `${KEY_PREFIX}count:${identifier}`);
  } catch (error) {
    console.error('[loginLockoutRedis] clear', error);
  }
}

export async function recordLoginAttempt(identifier: string): Promise<LoginAttemptResult> {
  const distributed = await recordLoginAttemptRedis(identifier);
  if (distributed) return distributed;

  const { loginTracker } = await import('@/lib/security');
  return loginTracker.recordAttempt(identifier);
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  await clearLoginAttemptsRedis(identifier);
  const { loginTracker } = await import('@/lib/security');
  loginTracker.clearAttempts(identifier);
}
