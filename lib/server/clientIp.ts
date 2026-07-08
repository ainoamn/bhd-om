import type { NextRequest } from 'next/server';

/** عنوان IP للعميل — يدعم Vercel / reverse proxies */
export function getClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}
