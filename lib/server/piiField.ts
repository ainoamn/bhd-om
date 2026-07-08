/**
 * مساعدات تشفير PII — للحقول الحساسة في JSON blobs (AddressBook, BookingStorage).
 * استخدم encryptPiiField / decryptPiiField عند الكتابة/القراءة تدريجياً.
 */
import { encryptField, decryptField, type EncryptedField } from '@/lib/encryption';

const PII_PREFIX = 'pii:v1:';

export function encryptPiiField(value: string): string {
  const enc = encryptField(value);
  return PII_PREFIX + JSON.stringify(enc);
}

export function decryptPiiField(stored: string): string {
  if (!stored.startsWith(PII_PREFIX)) return stored;
  try {
    const enc = JSON.parse(stored.slice(PII_PREFIX.length)) as EncryptedField;
    return decryptField(enc);
  } catch {
    return stored;
  }
}

export function isEncryptedPii(stored: string): boolean {
  return stored.startsWith(PII_PREFIX);
}
