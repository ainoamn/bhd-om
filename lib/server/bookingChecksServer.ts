import type { BookingCheckEntry } from '@/lib/data/bookingChecks';
import {
  getChecksForBookingFromDb as getChecksFromRepo,
  listAllBookingChecksEntriesFromDb,
  saveAllBookingChecksEntriesToDb,
  saveChecksForBookingToDb as saveChecksToRepo,
  type ChecksStoreEntry,
} from '@/lib/server/repositories/bookingCheckStorageRepo';

export type { ChecksStoreEntry };

export async function getChecksForBookingFromDb(bookingId: string): Promise<BookingCheckEntry[]> {
  return getChecksFromRepo(bookingId);
}

export async function saveChecksForBookingToDb(
  bookingId: string,
  checks: BookingCheckEntry[]
): Promise<void> {
  await saveChecksToRepo(bookingId, checks);
}

export async function listAllBookingChecksFromDb(): Promise<ChecksStoreEntry[]> {
  return listAllBookingChecksEntriesFromDb();
}

export async function saveAllBookingChecksToDb(entries: ChecksStoreEntry[]): Promise<void> {
  await saveAllBookingChecksEntriesToDb(entries);
}
