import type { NextRequest } from 'next/server';

/** في الإنتاج: يرفض الطلبات من خارج نطاق الموقع (رفع الملفات العام). */
export function isAllowedBrowserOrigin(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!host) return false;
  const origin = req.headers.get('origin')?.toLowerCase();
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.hostname === host) return true;
    } catch {
      /* ignore */
    }
  }
  const referer = req.headers.get('referer')?.toLowerCase();
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.hostname === host) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
