/**
 * تشفير at-rest لحقل ContractStorage.data (JSON — بيانات عقود وحجوزات).
 */
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/security';

const PREFIX = 'cnt:enc:v1:';

export function serializeContractStorageData(payload: Record<string, unknown>): string {
  const plain = JSON.stringify(payload);
  if (process.env.DISABLE_CONTRACT_ENCRYPTION === 'true') return plain;
  try {
    return PREFIX + encryptSensitiveData(plain);
  } catch {
    return plain;
  }
}

export function deserializeContractStorageRaw(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    return decryptSensitiveData(stored.slice(PREFIX.length));
  } catch {
    return stored;
  }
}

export function isEncryptedContractStorage(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
