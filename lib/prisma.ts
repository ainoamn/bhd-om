import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbFile = rawUrl.replace(/^file:/, '');
const url = path.isAbsolute(dbFile) || /^[A-Za-z]:/.test(dbFile)
  ? rawUrl
  : `file:${path.join(process.cwd(), dbFile.replace(/^\.\//, ''))}`;

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
