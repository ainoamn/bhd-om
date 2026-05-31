import type { BookingCheckEntry } from '@/lib/data/bookingChecks';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const CHECKS_KEY = 'booking_checks_settings';

type ChecksStoreEntry = { bookingId: string; checks: BookingCheckEntry[] };

async function loadAllChecksEntries(): Promise<ChecksStoreEntry[]> {
  const value = await getJsonSetting<unknown>(CHECKS_KEY, []);
  return Array.isArray(value) ? (value as ChecksStoreEntry[]) : [];
}

async function saveAllChecksEntries(entries: ChecksStoreEntry[]): Promise<void> {
  await upsertJsonSetting(CHECKS_KEY, entries);
}

export async function getChecksForBookingFromDb(bookingId: string): Promise<BookingCheckEntry[]> {
  const all = await loadAllChecksEntries();
  return all.find((e) => e.bookingId === bookingId)?.checks ?? [];
}

export async function saveChecksForBookingToDb(
  bookingId: string,
  checks: BookingCheckEntry[]
): Promise<void> {
  const all = await loadAllChecksEntries();
  const idx = all.findIndex((e) => e.bookingId === bookingId);
  const entry = { bookingId, checks };
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await saveAllChecksEntries(all);
}
