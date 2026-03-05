import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const raw = process.env.DATABASE_URL?.trim();
  const connectionString =
    raw && (raw.startsWith('postgresql://') || raw.startsWith('postgres://'))
      ? raw
      : process.env.NODE_ENV === 'production'
        ? '' // في الإنتاج لا نستخدم localhost — يجب تعيين DATABASE_URL في Vercel
        : 'postgresql://postgres:postgres@127.0.0.1:5432/bhd_om';

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL غير معرّف. أضفه في Vercel: Settings → Environment Variables (رابط PostgreSQL من Neon أو Vercel Postgres).'
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 60_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
