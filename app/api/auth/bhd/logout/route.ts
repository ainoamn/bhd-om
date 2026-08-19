import { NextRequest, NextResponse } from 'next/server';
import { identityIssuer, oauthClientId, oauthStateCookieOptions } from '@/lib/bhd/identity';
import { nextAuthCookieName } from '@/lib/bhd/nextAuthCookie';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const issuer = identityIssuer();
  const postLogout = `${origin}/`;
  const endSession = new URL('/oauth/end-session', issuer);
  endSession.searchParams.set('post_logout_redirect_uri', postLogout);
  endSession.searchParams.set('client_id', oauthClientId());

  const response = NextResponse.redirect(endSession);
  const clear = { ...oauthStateCookieOptions(0), maxAge: 0 };
  response.cookies.set(nextAuthCookieName(), '', clear);
  response.cookies.set('next-auth.session-token', '', clear);
  response.cookies.set('__Secure-next-auth.session-token', '', { ...clear, secure: true });
  response.cookies.set('bhd_oauth_state', '', clear);
  return response;
}
