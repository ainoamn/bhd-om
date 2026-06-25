import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__bhdPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__bhdPrisma = prisma;
}

/**
 * تشغيل عملية داخل سياق شركة — يفعّل RLS في PostgreSQL.
 */
export async function withCompanyContext(companyId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_company_id', $1, true)`,
      companyId
    );
    return fn(tx);
  });
}
