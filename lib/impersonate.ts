import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthSecret } from '@/lib/server/authSecret';

const IMPERSONATE_PREFIX = 'bhd-imp:';

function getImpersonateSecret(): string {
  return getAuthSecret();
}

export function createImpersonateToken(userId: string): string {
  const secret = getImpersonateSecret();
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = JSON.stringify({ userId, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return IMPERSONATE_PREFIX + payloadB64 + '.' + sig;
}

function safeSigEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyImpersonateToken(token: string): { userId: string } | null {
  if (!token.startsWith(IMPERSONATE_PREFIX)) return null;
  const rest = token.slice(IMPERSONATE_PREFIX.length);
  const [payloadB64, sig] = rest.split('.');
  if (!payloadB64 || !sig) return null;
  const secret = getImpersonateSecret();
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (!safeSigEqual(expectedSig, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
