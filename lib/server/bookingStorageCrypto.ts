/**
 * تشفير at-rest لحقل BookingStorage.data (JSON — قد يحتوي صور هوية base64).
 */
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/security';

const PREFIX = 'bkg:enc:v1:';

export function serializeBookingStorageData(payload: Record<string, unknown>): string {
  const plain = JSON.stringify(payload);
  if (process.env.DISABLE_BOOKING_ENCRYPTION === 'true') return plain;
  try {
    return PREFIX + encryptSensitiveData(plain);
  } catch {
    return plain;
  }
}

export function deserializeBookingStorageRaw(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    return decryptSensitiveData(stored.slice(PREFIX.length));
  } catch {
    return stored;
  }
}

export function isEncryptedBookingStorage(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
