/**
 * دفتر العناوين: إصلاح تلقائي عند غياب عمود linkedUserId على الإنتاج (P2022)
 * — يطبّق DDL idempotent ثم يعيد المحاولة؛ أو قراءة SQL قديمة بدون العمود.
 */
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export type AddressBookContactRow = {
  id: string;
  contactId: string;
  linkedUserId: string | null;
  data: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export async function applyAddressBookLinkedUserIdColumn(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(
    `ALTER TABLE "AddressBookContact" ADD COLUMN IF NOT EXISTS "linkedUserId" TEXT`
  );
  await client.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AddressBookContact_linkedUserId_key" ON "AddressBookContact"("linkedUserId")`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AddressBookContact_linkedUserId_idx" ON "AddressBookContact"("linkedUserId")`
  );
}

async function findManyAddressBookLegacySql(client: PrismaClient): Promise<AddressBookContactRow[]> {
  const raw = await client.$queryRaw<
    Array<{
      id: string;
      contactId: string;
      data: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }>
  >(Prisma.sql`
    SELECT id, "contactId", data, "createdAt", "updatedAt"
    FROM "AddressBookContact"
    ORDER BY "updatedAt" DESC
  `);
  return raw.map((r) => ({
    ...r,
    linkedUserId: null,
  }));
}

/**
 * findMany كامل؛ عند P2022 (عمود ناقص) يُطبَّق العمود على القاعدة ثم يُعاد المحاولة،
 * أو قراءة قديمة إن فشل الإصلاح.
 */
export async function findManyAddressBookContactsOrHeal(
  client: PrismaClient
): Promise<AddressBookContactRow[]> {
  try {
    return await client.addressBookContact.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2022') {
      throw e;
    }
    console.warn('addressBookDbCompat: P2022 — attempting linkedUserId column + indexes');
    try {
      await applyAddressBookLinkedUserIdColumn(client);
      return await client.addressBookContact.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    } catch (healErr) {
      console.warn('addressBookDbCompat: DDL failed, legacy SELECT without linkedUserId:', healErr);
      return findManyAddressBookLegacySql(client);
    }
  }
}

/**
 * تنفيذ دالة تستخدم Prisma على AddressBookContact؛ عند P2022 يُصلَح المخطط ثم تُعاد المحاولة مرة.
 */
export async function withAddressBookSchemaHeal<T>(
  client: PrismaClient,
  run: () => Promise<T>
): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2022') {
      throw e;
    }
    console.warn('addressBookDbCompat: P2022 in mutation — applying linkedUserId column');
    await applyAddressBookLinkedUserIdColumn(client);
    return await run();
  }
}
