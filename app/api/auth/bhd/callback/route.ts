import { NextRequest, NextResponse } from 'next/server';
import {
  BHD_OAUTH_STATE_COOKIE,
  exchangeAuthorizationCode,
  isSafeNextPath,
  oauthStateCookieOptions,
  parseOAuthState,
  readVerifiedIdentityProfile,
} from '@/lib/bhd/identity';
import {
  encodeProductSessionToken,
  nextAuthCookieName,
  nextAuthCookieOptions,
} from '@/lib/bhd/nextAuthCookie';
import { upsertOfficeUserFromIdentity } from '@/lib/server/bhdOidcUser';

export const runtime = 'nodejs';

function loginError(origin: string, reason: string) {
  const response = NextResponse.redirect(
    new URL(`/ar/login?error=sso&reason=${encodeURIComponent(reason)}`, origin)
  );
  response.cookies.set(BHD_OAUTH_STATE_COOKIE, '', { ...oauthStateCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const saved = parseOAuthState(request.cookies.get(BHD_OAUTH_STATE_COOKIE)?.value);

  if (error) return loginError(origin, error);
  if (!saved || saved.state !== state || !code) return loginError(origin, 'state');

  let idToken = '';
  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: saved.redirectUri,
      codeVerifier: saved.verifier,
    });
    idToken = tokens.idToken;
  } catch {
    return loginError(origin, 'identity');
  }

  let profile;
  try {
    profile = readVerifiedIdentityProfile(idToken, saved.nonce);
  } catch {
    return loginError(origin, 'claims');
  }

  let user;
  try {
    user = await upsertOfficeUserFromIdentity(profile);
  } catch (e) {
    console.error('bhd oidc upsert', e);
    return loginError(origin, 'upsert');
  }

  const dest = isSafeNextPath(saved.returnTo) ? saved.returnTo : '/ar/admin';
  const jwt = await encodeProductSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    serialNumber: user.serialNumber,
    role: user.role,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
    adminPermissions: user.adminPermissions,
    organizationId: user.organizationId,
    picture: profile.picture,
  });

  const response = NextResponse.redirect(new URL(dest, origin));
  response.cookies.set(BHD_OAUTH_STATE_COOKIE, '', { ...oauthStateCookieOptions(), maxAge: 0 });
  // امسح أي جلسة منتج سابقة قبل ضبط الكوكي الجديدة (§0.2 / §0.7)
  const wipe = { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax' as const };
  response.cookies.set('next-auth.session-token', '', wipe);
  response.cookies.set('__Secure-next-auth.session-token', '', { ...wipe, secure: true });
  response.cookies.set(nextAuthCookieName(), jwt, nextAuthCookieOptions());
  return response;
}
