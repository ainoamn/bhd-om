import { encode } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { identitySessionMaxAgeSecCached } from '@/lib/bhd/runtime';
import { SESSION_IDLE_MAX_AGE_SEC } from '@/lib/bhd/session';

export type ProductSessionUser = {
  id: string;
  email: string;
  name: string;
  serialNumber?: string | null;
  role?: string;
  phone?: string | null;
  isSuperAdmin?: boolean;
  adminPermissions?: string | null;
  organizationId?: string | null;
  picture?: string | null;
  bhdSub?: string | null;
};

export function nextAuthCookieName(): string {
  const url = process.env.NEXTAUTH_URL || '';
  const useSecure = url.startsWith('https://') || process.env.NODE_ENV === 'production';
  return useSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
}

export function nextAuthCookieOptions(maxAge = identitySessionMaxAgeSecCached()) {
  const url = process.env.NEXTAUTH_URL || '';
  const useSecure = url.startsWith('https://') || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function encodeProductSessionToken(user: ProductSessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      serialNumber: user.serialNumber ?? undefined,
      phone: user.phone ?? undefined,
      isSuperAdmin: user.isSuperAdmin,
      adminPermissions: user.adminPermissions ?? undefined,
      organizationId: user.organizationId ?? undefined,
      picture: user.picture ?? undefined,
      bhdSub: user.bhdSub ?? undefined,
      lastActivity: now,
      userCheckedAt: now,
    },
    secret: getAuthSecret(),
    maxAge: identitySessionMaxAgeSecCached(),
  });
}
