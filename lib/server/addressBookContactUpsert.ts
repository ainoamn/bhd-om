/**
 * احتياط عندما يفشل prisma.addressBookContact.upsert بسبب تباين بين المخطط وقاعدة الإنتاج
 * (أعمدة ناقصة / رسالة Prisma "column (not available) does not exist").
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

function isDriftMessage(msg: string): boolean {
  return (
    msg.includes('does not exist') ||
    msg.includes('not available') ||
    msg.includes('Unknown arg') ||
    msg.includes('column')
  );
}

/**
 * INSERT ... ON CONFLICT("contactId") مع محاولات متدرجة للأعمدة.
 */
export async function upsertAddressBookContactFallback(params: {
  contactId: string;
  linkedUserId: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const { contactId, linkedUserId, data } = params;
  const jsonStr = JSON.stringify(data);
  let lastErr: unknown;

  const attempts: Array<() => Promise<number>> = [
    async () =>
      prisma.$executeRaw`
        INSERT INTO "AddressBookContact" ("id", "contactId", "linkedUserId", "data", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${contactId}, ${linkedUserId}, ${jsonStr}::jsonb, NOW(), NOW())
        ON CONFLICT ("contactId") DO UPDATE SET
          "linkedUserId" = EXCLUDED."linkedUserId",
          "data" = EXCLUDED."data",
          "updatedAt" = NOW()
      `,
    async () =>
      prisma.$executeRaw`
        INSERT INTO "AddressBookContact" ("id", "contactId", "data", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${contactId}, ${jsonStr}::jsonb, NOW(), NOW())
        ON CONFLICT ("contactId") DO UPDATE SET
          "data" = EXCLUDED."data",
          "updatedAt" = NOW()
      `,
    async () =>
      prisma.$executeRaw`
        INSERT INTO "AddressBookContact" ("id", "contactId", "data", "createdAt")
        VALUES (${randomUUID()}, ${contactId}, ${jsonStr}::jsonb, NOW())
        ON CONFLICT ("contactId") DO UPDATE SET
          "data" = EXCLUDED."data"
      `,
  ];

  for (const run of attempts) {
    try {
      await run();
      return;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!isDriftMessage(msg)) throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
