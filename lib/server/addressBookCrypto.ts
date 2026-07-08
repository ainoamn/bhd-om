/**
 * تشفير at-rest لحقل AddressBookContact.data (JSON — PII جهات الاتصال).
 */
import type { Prisma } from '@prisma/client';
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/security';

export const ADDR_ENC_KEY = '__addrEncV1';
const PREFIX = 'addr:enc:v1:';

export function isEncryptedAddressBookData(data: Prisma.JsonValue): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    typeof (data as Record<string, unknown>)[ADDR_ENC_KEY] === 'string'
  );
}

export function serializeAddressBookContactData(
  payload: Record<string, unknown>
): Prisma.InputJsonValue {
  if (process.env.DISABLE_ADDRESS_BOOK_ENCRYPTION === 'true') {
    return payload as Prisma.InputJsonValue;
  }
  try {
    const enc = PREFIX + encryptSensitiveData(JSON.stringify(payload));
    return { [ADDR_ENC_KEY]: enc } as Prisma.InputJsonValue;
  } catch {
    return payload as Prisma.InputJsonValue;
  }
}

export function parseAddressBookContactData(data: Prisma.JsonValue): Record<string, unknown> {
  if (data === null || data === undefined) return {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }
  const obj = data as Record<string, unknown>;
  const enc = obj[ADDR_ENC_KEY];
  if (typeof enc === 'string' && enc.startsWith(PREFIX)) {
    try {
      return JSON.parse(decryptSensitiveData(enc.slice(PREFIX.length))) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return obj;
}

export function decryptAddressBookRow<T extends { data: Prisma.JsonValue }>(row: T): T {
  return { ...row, data: parseAddressBookContactData(row.data) as Prisma.JsonValue };
}
