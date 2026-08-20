import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Safe admin landing — BHD-UNIFIED §4.9 / §0.7.
 * Never send admins to `?local=1` password login; same identity session opens product `/admin`.
 */
function adminReturnTo(request: Request): string {
  const url = new URL(request.url);
  const raw = (url.searchParams.get('next') || url.searchParams.get('returnTo') || '').trim();
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://') && !raw.includes('\\')) {
    return raw;
  }
  return '/ar/admin';
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const returnTo = adminReturnTo(request);
  return NextResponse.redirect(
    new URL(`/api/auth/bhd/start?returnTo=${encodeURIComponent(returnTo)}`, origin)
  );
}
