import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseUrlForRuntime } from '@/lib/env/databaseUrl';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const connectionString = getDatabaseUrlForRuntime();

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL غير معرّف. في Vercel: أضف DATABASE_URL أو فعّل Vercel Postgres (يُحقن POSTGRES_PRISMA_URL / POSTGRES_URL). Settings → Environment Variables.'
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    /** بردّ بارد على Vercel + Neon قد يتجاوز 10 ثوانٍ أحياناً */
    connectionTimeoutMillis: 25_000,
    idleTimeoutMillis: 60_000,
    /** تجمع 1 لكل دالة serverless — يقلّل استنفاد اتصالات Neon/Vercel Postgres */
    max: process.env.VERCEL ? 1 : 10,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

/** إبقاء عميل واحد لكل عملية Vercel/serverless يقلّل إعادة اتصال Neon والبطء (10s+ على البرد) */
globalForPrisma.prisma = prisma;
