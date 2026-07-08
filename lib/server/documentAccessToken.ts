import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthSecret } from '@/lib/server/authSecret';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 أيام

function signingKey(): string {
  return process.env.ENCRYPTION_MASTER_KEY?.trim() || getAuthSecret();
}

/** توقيع رابط تنزيل مستند — يُضاف كـ ?token= */
export function createDocumentServeToken(documentId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${documentId}:${exp}`;
  const sig = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyDocumentServeToken(documentId: string, token: string | null): boolean {
  if (!token) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return false;
  }
  const expectedSig = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;
  const [id, expStr] = payload.split(':');
  if (id !== documentId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}

export function documentServeUrl(documentId: string): string {
  const token = createDocumentServeToken(documentId);
  return `/api/upload/booking-documents/serve/${documentId}?token=${encodeURIComponent(token)}`;
}
