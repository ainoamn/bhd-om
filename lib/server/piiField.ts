/**
 * مساعدات تشفير PII — للحقول الحسensitive في JSON blobs ورسائل التواصل.
 */
import { encryptField, decryptField, type EncryptedField } from '@/lib/encryption';
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/security';

const PII_PREFIX = 'pii:v1:';
const ENC_PREFIX = 'enc:rest:';

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

/** تشفير نص at-rest (رسائل تواصل، ملاحظات) */
export function encryptAtRest(value: string): string {
  if (!value || value.startsWith(ENC_PREFIX)) return value;
  try {
    return ENC_PREFIX + encryptSensitiveData(value);
  } catch {
    return value;
  }
}

export function decryptAtRest(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    return decryptSensitiveData(stored.slice(ENC_PREFIX.length));
  } catch {
    return stored;
  }
}

/** تشفير حقول ContactSubmission (name, email, phone, message) */
export function encryptContactSubmissionFields(fields: {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}): { name: string; email: string; phone: string | null; message: string | null } {
  return {
    name: encryptAtRest(fields.name),
    email: encryptAtRest(fields.email),
    phone: fields.phone ? encryptAtRest(fields.phone) : null,
    message: fields.message ? encryptAtRest(fields.message) : null,
  };
}

/** فك تشفير حقول ContactSubmission للعرض في لوحة الإدارة */
export function decryptContactSubmissionFields(row: {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}): { name: string; email: string; phone: string | null; message: string | null } {
  return {
    name: decryptAtRest(row.name) ?? row.name,
    email: decryptAtRest(row.email) ?? row.email,
    phone: row.phone ? (decryptAtRest(row.phone) ?? row.phone) : null,
    message: decryptAtRest(row.message),
  };
}
