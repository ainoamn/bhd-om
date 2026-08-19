import { NextRequest, NextResponse } from 'next/server';
import {
  BHD_OAUTH_STATE_COOKIE,
  identityIssuer,
  isSafeNextPath,
  oauthClientId,
  oauthRedirectUri,
  oauthStateCookieOptions,
  randomUrlToken,
  sha256Base64Url,
} from '@/lib/bhd/identity';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const issuer = identityIssuer();
  const clientId = oauthClientId();
  const redirectUri = oauthRedirectUri(origin);

  const state = randomUrlToken();
  const nonce = randomUrlToken();
  const verifier = randomUrlToken(48);
  const challenge = sha256Base64Url(verifier);
  const returnToRaw = url.searchParams.get('returnTo') || '/';
  const returnTo = isSafeNextPath(returnToRaw) ? returnToRaw : '/';

  const authorize = new URL('/oauth/authorize', issuer);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid profile email');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authorize);
  response.cookies.set(
    BHD_OAUTH_STATE_COOKIE,
    JSON.stringify({ state, nonce, verifier, returnTo, redirectUri }),
    oauthStateCookieOptions()
  );
  return response;
}
