import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseUrlForRuntime } from '@/lib/env/databaseUrl';
import { addressBookCryptoExtension } from '@/lib/server/prismaAddressBookExtension';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const connectionString = getDatabaseUrlForRuntime();

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL غير معرّف. في Vercel: أضف DATABASE_URL أو فعّل Vercel Postgres (يُحقن POSTGRES_PRISMA_URL / POSTGRES_URL). Settings → Environment Variables.'
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 25_000,
    idleTimeoutMillis: 60_000,
    max: process.env.VERCEL ? 1 : 10,
  });

  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return base.$extends(addressBookCryptoExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
