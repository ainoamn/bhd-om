import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import {
  LEGACY_KV_ALL_KEYS,
  LEGACY_KV_SITE_AUTHORITATIVE_KEYS,
  LEGACY_KV_CONTRACT_KEYS,
  LEGACY_KV_PROPERTY_KEYS,
  LEGACY_KV_SYSTEM_KEYS,
} from '@/lib/server/legacyKvKeys';

export const dynamic = 'force-dynamic';

/** صحة بيانات Neon — عدد المفاتيح والجداول المربوطة */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      kvRows,
      kvByCategory,
      storedFiles,
      addressBookContacts,
      addressBookFiles,
      users,
      maintenanceRequests,
      bookingStorage,
      contractStorage,
      accountingAccounts,
      accountingJournalEntries,
    ] = await Promise.all([
      prisma.legacyAppKvStore.findMany({
        select: { kvKey: true, category: true, updatedAt: true },
        orderBy: { kvKey: 'asc' },
      }),
      prisma.legacyAppKvStore.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      prisma.legacyStoredFile.count(),
      prisma.addressBookContact.count(),
      prisma.addressBookContactFile.count(),
      prisma.user.count(),
      prisma.maintenanceRequest.count(),
      prisma.bookingStorage.count(),
      prisma.contractStorage.count(),
      prisma.accountingAccount.count(),
      prisma.accountingJournalEntry.count(),
    ]);

    const presentKeys = new Set(kvRows.map((r) => r.kvKey));
    const missingAuthoritative = LEGACY_KV_SITE_AUTHORITATIVE_KEYS.filter((k) => !presentKeys.has(k));

    return NextResponse.json(
      {
        source: 'neon-postgresql',
        policy: 'server-first',
        kv: {
          totalKeysInDb: kvRows.length,
          expectedAuthoritativeKeys: LEGACY_KV_SITE_AUTHORITATIVE_KEYS.length,
          missingAuthoritativeKeys: missingAuthoritative,
          byCategory: kvByCategory.map((g) => ({
            category: g.category,
            count: g._count._all,
          })),
          keys: kvRows.map((r) => ({
            key: r.kvKey,
            category: r.category,
            updatedAt: r.updatedAt.toISOString(),
          })),
        },
        catalog: {
          allLegacyKvKeys: LEGACY_KV_ALL_KEYS.length,
          contractKeys: LEGACY_KV_CONTRACT_KEYS.length,
          propertyKeys: LEGACY_KV_PROPERTY_KEYS.length,
          systemKeys: LEGACY_KV_SYSTEM_KEYS.length,
        },
        tables: {
          users,
          addressBookContacts,
          addressBookFiles,
          legacyStoredFiles: storedFiles,
          maintenanceRequests,
          bookingStorage,
          contractStorage,
          accountingAccounts,
          accountingJournalEntries,
        },
      },
      {
        headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('legacy data-health GET error', error);
    return NextResponse.json({ error: 'Failed to read data health' }, { status: 500 });
  }
}
