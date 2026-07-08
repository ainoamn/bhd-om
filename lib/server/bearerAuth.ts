import { timingSafeCompare } from '@/lib/security';

/** مقارنة آمنة لـ Bearer token */
export function verifyBearerSecret(authHeader: string | null, secret: string): boolean {
  if (!secret || secret.length < 8) return false;
  const expected = `Bearer ${secret}`;
  const received = authHeader?.trim() ?? '';
  if (received.length !== expected.length) return false;
  return timingSafeCompare(received, expected);
}
