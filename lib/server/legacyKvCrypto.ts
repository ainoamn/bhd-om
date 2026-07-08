/**
 * تشفير at-rest لحقل LegacyAppKvStore.data (JSON/HTML legacy blobs).
 */
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/security';

const PREFIX = 'kv:enc:v1:';

export function serializeLegacyKvData(plain: string): string {
  if (!plain || process.env.DISABLE_LEGACY_KV_ENCRYPTION === 'true') return plain;
  if (plain.startsWith(PREFIX)) return plain;
  try {
    return PREFIX + encryptSensitiveData(plain);
  } catch {
    return plain;
  }
}

export function deserializeLegacyKvData(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    return decryptSensitiveData(stored.slice(PREFIX.length));
  } catch {
    return stored;
  }
}

export function isEncryptedLegacyKvData(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
