import { createHmac } from 'crypto';
import { getAuthSecret } from '@/lib/server/authSecret';
import { decryptAtRest, encryptAtRest } from '@/lib/server/piiField';

const ENC_PREFIX = 'enc:rest:';

export function normalizeUserPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

function phoneHashKey(): string {
  return process.env.ENCRYPTION_MASTER_KEY?.trim() || getAuthSecret();
}

export function hashUserPhoneForLookup(normalizedPhone: string): string {
  return createHmac('sha256', phoneHashKey())
    .update(`bhd:user:phone:${normalizedPhone}`)
    .digest('hex');
}

export function encryptUserPhone(normalizedPhone: string): string {
  return encryptAtRest(normalizedPhone);
}

export function decryptUserPhone(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  return decryptAtRest(stored);
}

export function isEncryptedUserPhone(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith(ENC_PREFIX));
}

export function prepareUserPhoneWrite(phone: string | null | undefined): {
  phone: string | null;
  phoneHash: string | null;
} {
  if (phone === null || phone === undefined || !String(phone).trim()) {
    return { phone: null, phoneHash: null };
  }
  if (isEncryptedUserPhone(phone)) {
    return { phone, phoneHash: null };
  }
  const normalized = normalizeUserPhone(String(phone).trim());
  if (normalized.replace(/\D/g, '').length < 8) {
    return { phone: null, phoneHash: null };
  }
  return {
    phone: encryptUserPhone(normalized),
    phoneHash: hashUserPhoneForLookup(normalized),
  };
}

export function phoneHashFromRaw(rawPhone: string): string {
  return hashUserPhoneForLookup(normalizeUserPhone(rawPhone));
}
