import { prisma } from '@/lib/prisma';
import type { BookingDocument } from '@/lib/data/bookingDocuments';
import {
  backfillAllBookingCheckStorageFromLegacy,
  type ChecksStoreEntry,
} from '@/lib/server/repositories/bookingCheckStorageRepo';
import {
  backfillAllBookingDocumentStorageFromLegacy,
} from '@/lib/server/repositories/bookingDocumentStorageRepo';
import { deleteJsonSetting, getJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

export const LEGACY_BOOKING_DOCUMENTS_KEY = 'booking_documents_settings';
export const LEGACY_BOOKING_CHECKS_KEY = 'booking_checks_settings';
export const PURGE_LEGACY_BOOKING_SETTINGS_CONFIRM = 'PURGE-LEGACY-BOOKING-SETTINGS';

export type LegacyBookingSettingsStatus = {
  legacyDocumentsKey: string;
  legacyChecksKey: string;
  legacyDocumentCount: number;
  legacyCheckBookingCount: number;
  legacyCheckRowCount: number;
  tableDocumentCount: number;
  tableCheckCount: number;
  legacyDocumentsPresent: boolean;
  legacyChecksPresent: boolean;
  fullyMigrated: boolean;
};

async function countLegacyDocuments(): Promise<number> {
  const legacy = await getJsonSetting<unknown>(LEGACY_BOOKING_DOCUMENTS_KEY, []);
  return Array.isArray(legacy) ? legacy.length : 0;
}

async function countLegacyChecks(): Promise<{ bookings: number; rows: number }> {
  const legacy = await getJsonSetting<unknown>(LEGACY_BOOKING_CHECKS_KEY, []);
  if (!Array.isArray(legacy)) return { bookings: 0, rows: 0 };
  const entries = legacy as ChecksStoreEntry[];
  const rows = entries.reduce((n, e) => n + (Array.isArray(e.checks) ? e.checks.length : 0), 0);
  return { bookings: entries.length, rows };
}

export async function getLegacyBookingSettingsStatus(): Promise<LegacyBookingSettingsStatus> {
  const [legacyDocumentCount, legacyChecks, tableDocumentCount, tableCheckCount] = await Promise.all([
    countLegacyDocuments(),
    countLegacyChecks(),
    prisma.bookingDocumentStorage.count(),
    prisma.bookingCheckStorage.count(),
  ]);

  const legacyDocsRow = await prisma.appSetting.findUnique({ where: { key: LEGACY_BOOKING_DOCUMENTS_KEY } });
  const legacyChecksRow = await prisma.appSetting.findUnique({ where: { key: LEGACY_BOOKING_CHECKS_KEY } });

  const verify = await verifyLegacyBookingSettingsFullyMigrated();

  return {
    legacyDocumentsKey: LEGACY_BOOKING_DOCUMENTS_KEY,
    legacyChecksKey: LEGACY_BOOKING_CHECKS_KEY,
    legacyDocumentCount,
    legacyCheckBookingCount: legacyChecks.bookings,
    legacyCheckRowCount: legacyChecks.rows,
    tableDocumentCount,
    tableCheckCount,
    legacyDocumentsPresent: !!legacyDocsRow,
    legacyChecksPresent: !!legacyChecksRow,
    fullyMigrated: verify.ok,
  };
}

export async function runFullLegacyBookingSettingsBackfill(): Promise<{
  documentsMigrated: number;
  checksMigrated: number;
}> {
  const [documentsMigrated, checksMigrated] = await Promise.all([
    backfillAllBookingDocumentStorageFromLegacy(),
    backfillAllBookingCheckStorageFromLegacy(),
  ]);
  return { documentsMigrated, checksMigrated };
}

export async function verifyLegacyBookingSettingsFullyMigrated(): Promise<
  | { ok: true }
  | { ok: false; missingDocuments: number; missingChecks: number }
> {
  const docsLegacy = await getJsonSetting<unknown>(LEGACY_BOOKING_DOCUMENTS_KEY, []);
  const checksLegacy = await getJsonSetting<unknown>(LEGACY_BOOKING_CHECKS_KEY, []);

  let missingDocuments = 0;
  if (Array.isArray(docsLegacy)) {
    for (const item of docsLegacy) {
      const doc = item as BookingDocument;
      const documentId = String(doc?.id || '').trim();
      if (!documentId) continue;
      const row = await prisma.bookingDocumentStorage.findUnique({ where: { documentId } });
      if (!row) missingDocuments++;
    }
  }

  let missingChecks = 0;
  if (Array.isArray(checksLegacy)) {
    for (const item of checksLegacy) {
      const entry = item as ChecksStoreEntry;
      const bookingId = String(entry?.bookingId || '').trim();
      if (!bookingId || !Array.isArray(entry.checks)) continue;
      for (const check of entry.checks) {
        const checkTypeId = String(check?.checkTypeId || '').trim();
        if (!checkTypeId) continue;
        const row = await prisma.bookingCheckStorage.findUnique({
          where: { bookingId_checkTypeId: { bookingId, checkTypeId } },
        });
        if (!row) missingChecks++;
      }
    }
  }

  if (missingDocuments === 0 && missingChecks === 0) return { ok: true };
  return { ok: false, missingDocuments, missingChecks };
}

export async function purgeLegacyBookingSettingsKeys(): Promise<{
  ok: true;
  removed: string[];
}> {
  const verify = await verifyLegacyBookingSettingsFullyMigrated();
  if (!verify.ok) {
    throw new Error(
      `Legacy not fully migrated: missingDocuments=${verify.missingDocuments}, missingChecks=${verify.missingChecks}`
    );
  }

  const removed: string[] = [];
  if (await deleteJsonSetting(LEGACY_BOOKING_DOCUMENTS_KEY)) {
    removed.push(LEGACY_BOOKING_DOCUMENTS_KEY);
  }
  if (await deleteJsonSetting(LEGACY_BOOKING_CHECKS_KEY)) {
    removed.push(LEGACY_BOOKING_CHECKS_KEY);
  }
  return { ok: true, removed };
}
