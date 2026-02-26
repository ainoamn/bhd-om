import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { compare } from 'bcryptjs';
  // OAuth - يُفعّل عند إضافة GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في .env
import { prisma } from '@/lib/prisma';

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
        if (!credentials?.email || !credentials?.password) return null;

        const input = (credentials.email || '').trim();
        if (!input) return null;

        // اسم المستخدم (USR-C-2025-0001) أو البريد الإلكتروني
        const isEmail = input.includes('@');
        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: input.toLowerCase() } })
          : await prisma.user.findUnique({ where: { serialNumber: input.toUpperCase() } });

        if (!user || !user.password) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          serialNumber: user.serialNumber,
          role: user.role,
          dashboardType: (user as { dashboardType?: string | null }).dashboardType ?? undefined,
          phone: user.phone ?? undefined,
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
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.dashboardType = (user as { dashboardType?: string }).dashboardType;
        token.phone = (user as { phone?: string }).phone;
        token.serialNumber = (user as { serialNumber?: string }).serialNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { dashboardType?: string }).dashboardType = token.dashboardType as string | undefined;
        (session.user as { phone?: string }).phone = token.phone as string | undefined;
        (session.user as { serialNumber?: string }).serialNumber = token.serialNumber as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};
