import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { routing } from './i18n/routing';
import { canAccessRoute } from '@/lib/auth/permissions';

const intlMiddleware = createMiddleware(routing);
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

function isPublicPath(pathname: string): boolean {
  const noLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || pathname;
  if (noLocale === '/' || noLocale === '') return true;
  if (noLocale.startsWith('/login') || noLocale.startsWith('/register') || noLocale.startsWith('/forgot-password')) return true;
  if (noLocale.startsWith('/properties') || noLocale.startsWith('/projects') || noLocale.startsWith('/services') || noLocale.startsWith('/about') || noLocale.startsWith('/contact')) return true;
  if (noLocale.startsWith('/api/auth')) return true;
  return false;
}

function localeFromPath(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m?.[1] || routing.defaultLocale || 'ar';
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    const needsApiAuth = pathname.startsWith('/api/admin') || pathname.startsWith('/api/accounting');
    if (!needsApiAuth) return NextResponse.next();
  }
  if (isPublicPath(pathname)) {
    return intlMiddleware(req);
  }

  const needsAuth = pathname.includes('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/accounting');
  if (!needsAuth) {
    return intlMiddleware(req);
  }

  const token = await getToken({ req, secret: authSecret });
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const locale = localeFromPath(pathname);
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  if (!canAccessRoute(token.role, pathname)) {
    void fetch(new URL('/api/audit/log', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        targetType: 'Route',
        targetId: pathname,
      }),
    }).catch(() => {});

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const locale = localeFromPath(pathname);
    return NextResponse.redirect(new URL(`/${locale}/admin`, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
