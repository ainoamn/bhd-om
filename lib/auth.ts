import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import type { JWT } from 'next-auth/jwt';
import { compare } from 'bcryptjs';
import { verifyImpersonateToken } from '@/lib/impersonate';
  // OAuth - يُفعّل عند إضافة GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في .env
import { prisma } from '@/lib/prisma';

/** إعادة التحقق من وجود المستخدم في DB — أطول = أقل استعلامات وتأخير أقل على /api/auth/session */
const TOKEN_DB_REVALIDATE_SECONDS = 180;

function markTokenExpired(token: JWT): JWT {
  const past = Math.floor(Date.now() / 1000) - 10;
  return {
    ...token,
    exp: past,
    id: '',
    role: undefined,
    dashboardType: undefined,
    phone: undefined,
    serialNumber: undefined,
    isSuperAdmin: undefined,
    adminPermissions: undefined,
    organizationId: undefined,
    email: '',
    name: '',
    sub: '',
    userCheckedAt: past,
  } as JWT;
}

const providers: NextAuthOptions['providers'] = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
    ? [
        AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          tenantId: process.env.AZURE_AD_TENANT_ID,
        }),
      ]
    : []),
  CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const raw = credentials as Record<string, string> | undefined;
        const emailOrUser = (raw?.email ?? raw?.['emailOrUsername'] ?? raw?.['username'] ?? '').toString().trim();
        const password = (raw?.password ?? '').toString().trim();
        if (!emailOrUser || !password) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[auth] authorize: missing email or password', { hasEmail: !!emailOrUser, hasPassword: !!password, keys: raw ? Object.keys(raw) : [] });
          }
          return null;
        }

        const input = emailOrUser;
        if (!input) return null;

        // تمثيل المستخدم من لوحة المدير (رابط لمرة واحدة)
        if (input === '__impersonate__') {
          const verified = verifyImpersonateToken(password);
          if (!verified) return null;
          const user = await prisma.user.findUnique({ where: { id: verified.userId } });
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            serialNumber: user.serialNumber,
            role: user.role,
            dashboardType: (user as { dashboardType?: string | null }).dashboardType ?? undefined,
            phone: user.phone ?? undefined,
            isSuperAdmin: (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false,
            adminPermissions: (user as { adminPermissions?: string | null }).adminPermissions ?? undefined,
            organizationId: (user as { organizationId?: string | null }).organizationId ?? undefined,
          };
        }

        // اسم المستخدم (USR-C-2025-0001) أو البريد الإلكتروني
        const isEmail = input.includes('@');
        let user;
        try {
          user = isEmail
            ? await prisma.user.findUnique({ where: { email: input.toLowerCase() } })
            : await prisma.user.findUnique({ where: { serialNumber: input.toUpperCase() } });
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[auth] authorize: prisma error', err);
          }
          return null;
        }

        if (!user || !user.password) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[auth] authorize: user not found or no password', { input: input.substring(0, 20), found: !!user });
          }
          return null;
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[auth] authorize: password mismatch for', user.email);
          }
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          serialNumber: user.serialNumber,
          role: user.role,
          dashboardType: (user as { dashboardType?: string | null }).dashboardType ?? undefined,
          phone: user.phone ?? undefined,
          isSuperAdmin: (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false,
          adminPermissions: (user as { adminPermissions?: string | null }).adminPermissions ?? undefined,
          organizationId: (user as { organizationId?: string | null }).organizationId ?? undefined,
        };
      },
    }),
];

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 ساعة
  },
  pages: {
    signIn: '/ar/login',
    error: '/ar/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      const mutable = token as JWT;
      if (user) {
        mutable.id = user.id;
        mutable.sub = user.id;
        mutable.role = (user as { role?: string }).role;
        mutable.dashboardType = (user as { dashboardType?: string }).dashboardType;
        mutable.phone = (user as { phone?: string }).phone;
        mutable.serialNumber = (user as { serialNumber?: string }).serialNumber;
        mutable.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin;
        mutable.adminPermissions = (user as { adminPermissions?: string }).adminPermissions;
        mutable.organizationId = (user as { organizationId?: string }).organizationId;
        mutable.userCheckedAt = Math.floor(Date.now() / 1000);
        return mutable;
      }

      // تحقق دوري: إن كان المستخدم قد حُذف من DB (مثل بعد التصفير) نُبطل الجلسة فوراً.
      const tokenUserId = String(mutable.id || mutable.sub || '').trim();
      if (!tokenUserId) return mutable;
      const nowSec = Math.floor(Date.now() / 1000);
      const lastChecked = Number(mutable.userCheckedAt || 0);
      if (Number.isFinite(lastChecked) && nowSec - lastChecked < TOKEN_DB_REVALIDATE_SECONDS) {
        return mutable;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            serialNumber: true,
            isSuperAdmin: true,
            adminPermissions: true,
            organizationId: true,
          },
        });
        if (!dbUser) {
          return markTokenExpired(mutable);
        }
        mutable.id = dbUser.id;
        mutable.sub = dbUser.id;
        mutable.email = dbUser.email;
        mutable.name = dbUser.name;
        mutable.role = dbUser.role;
        mutable.phone = dbUser.phone ?? undefined;
        mutable.serialNumber = dbUser.serialNumber;
        mutable.isSuperAdmin = dbUser.isSuperAdmin;
        mutable.adminPermissions = dbUser.adminPermissions ?? undefined;
        mutable.organizationId = dbUser.organizationId ?? undefined;
        mutable.userCheckedAt = nowSec;
        return mutable;
      } catch {
        // عند فشل DB نُبقي الجلسة الحالية بدل قطع المستخدمين بدون داعٍ.
        return mutable;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { dashboardType?: string }).dashboardType = token.dashboardType as string | undefined;
        (session.user as { phone?: string }).phone = token.phone as string | undefined;
        (session.user as { serialNumber?: string }).serialNumber = token.serialNumber as string | undefined;
        (session.user as { isSuperAdmin?: boolean }).isSuperAdmin = token.isSuperAdmin as boolean | undefined;
        (session.user as { adminPermissions?: string }).adminPermissions = token.adminPermissions as string | undefined;
        (session.user as { organizationId?: string }).organizationId = token.organizationId as string | undefined;
      }
      return session;
    },
  },
  // في الإنتاج يجب تعيين NEXTAUTH_SECRET في Vercel (Environment Variables). محلياً يُستخدم مفتاح تطوير إن لم يُعرّف.
  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
  debug: process.env.NODE_ENV === 'development',
};
