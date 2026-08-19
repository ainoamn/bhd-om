import { createHash, randomBytes } from 'crypto';
import { BHD_IDENTITY_ISSUER_DEFAULT, BHD_OFFICE_CLIENT_ID } from '@/lib/bhd/session';

export const BHD_OAUTH_STATE_COOKIE = 'bhd_oauth_state';

export const IDENTITY_ISSUER_ALIASES = [
  'https://id.bhd-om.com',
  'https://one-bhd.vercel.app',
];

export type BhdOAuthState = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  redirectUri: string;
};

export function identityIssuer(): string {
  const configured = process.env.BHD_IDENTITY_ISSUER?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return BHD_IDENTITY_ISSUER_DEFAULT;
}

export function oauthClientId(): string {
  return process.env.BHD_OAUTH_CLIENT_ID?.trim() || BHD_OFFICE_CLIENT_ID;
}

export function oauthClientSecret(): string {
  return process.env.BHD_OAUTH_CLIENT_SECRET?.trim() || '';
}

export function oauthRedirectUri(origin: string): string {
  const configured = process.env.BHD_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${origin.replace(/\/$/, '')}/api/auth/bhd/callback`;
}

export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

export function isSafeNextPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.includes('\\')) return false;
  if (value.includes('://')) return false;
  return true;
}

export function oauthStateCookieOptions(maxAge = 5 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function parseOAuthState(raw: string | undefined): BhdOAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BhdOAuthState;
    if (!parsed?.state || !parsed?.nonce || !parsed?.verifier || !parsed?.redirectUri) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ idToken: string; accessToken: string }> {
  const issuer = identityIssuer();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: oauthClientId(),
    code_verifier: input.codeVerifier,
  });
  const secret = oauthClientSecret();
  if (secret) body.set('client_secret', secret);

  const tokenRes = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    throw new Error(`token_exchange_${tokenRes.status}`);
  }
  const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };
  if (!tokens.id_token || !tokens.access_token) {
    throw new Error('token_exchange_empty');
  }
  return { idToken: tokens.id_token, accessToken: tokens.access_token };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function allowedIssuers(): string[] {
  return [...new Set([identityIssuer(), ...IDENTITY_ISSUER_ALIASES.map((v) => v.replace(/\/$/, ''))])];
}

export type IdentityProfile = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  phone: string | null;
};

export function readVerifiedIdentityProfile(idToken: string, nonce: string): IdentityProfile {
  const payload = decodeJwtPayload(idToken);
  if (!payload) throw new Error('invalid_id_token');
  const iss = typeof payload.iss === 'string' ? payload.iss.replace(/\/$/, '') : '';
  if (!allowedIssuers().includes(iss)) throw new Error('invalid_issuer');
  const aud = payload.aud;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(oauthClientId())) throw new Error('invalid_audience');
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp + 60 < Math.floor(Date.now() / 1000)) throw new Error('id_token_expired');
  if (payload.nonce !== nonce) throw new Error('invalid_nonce');
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('email_not_verified');
  }
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!sub || !email) throw new Error('invalid_claims');
  return {
    sub,
    email,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : email,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
    phone: typeof payload.phone_number === 'string' ? payload.phone_number : null,
  };
}
