/**
 * نظام التشفير — BHD-OM
 * ======================
 * تم تجميع جميع وحدات التشفير في ملف واحد لتسهيل الصيانة
 * 
 * الدوال المتاحة:
 * - encrypt(plaintext) → ciphertext          تشفير نص
 * - decrypt(ciphertext) → plaintext          فك تشفير نص
 * - encryptField(value) → EncryptedField     تشفير حقل مع هاش للبحث
 * - decryptField(encrypted) → value          فك تشفير حقل
 * - hashSearch(data) → hash                  هاش للبحث
 * - createChecksum(data) → checksum          تحقق من سلامة البيانات
 * - getActiveKey() → { keyId, keyHash }      المفتاح النشط
 * - createNewKey() → { keyId, keyHash }      إنشاء مفتاح جديد
 * - rotateKey() → void                       تدوير المفاتيح
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// ──────────────────────────────────────────
// الثوابت
// ──────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm' as const;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ──────────────────────────────────────────
// أخطاء مخصصة
// ──────────────────────────────────────────
export class EncryptionError extends Error {
  constructor(message: string) { super(message); this.name = 'EncryptionError'; }
}
export class DecryptionError extends Error {
  constructor(message: string) { super(message); this.name = 'DecryptionError'; }
}

// ──────────────────────────────────────────
// المفتاح الرئيسي
// ──────────────────────────────────────────
function getMasterKey(): Buffer {
  const encKey = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (encKey) {
    return crypto.scryptSync(encKey, 'bhd-om-salt', KEY_LENGTH);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new EncryptionError('ENCRYPTION_MASTER_KEY is required in production');
  }
  const fallback = process.env.NEXTAUTH_SECRET?.trim();
  if (!fallback) throw new EncryptionError('ENCRYPTION_MASTER_KEY or NEXTAUTH_SECRET must be set');
  return crypto.scryptSync(fallback, 'bhd-om-salt', KEY_LENGTH);
}

// ──────────────────────────────────────────
// محرك التشفير الأساسي
// ──────────────────────────────────────────

/** تشفير نص باستخدام AES-256-GCM */
export function encrypt(plaintext: string): string {
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc}`;
  } catch (e) {
    throw new EncryptionError(`Encryption failed: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}

/** فك تشفير نص */
export function decrypt(ciphertext: string): string {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new DecryptionError('Invalid format');
    const key = getMasterKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(parts[2], 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {
    if (e instanceof DecryptionError) throw e;
    throw new DecryptionError(`Decryption failed: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}

/** هاش SHA-256 للبحث (بدون فك التشفير) */
export function hashSearch(data: string, pepper?: string): string {
  const input = pepper ? `${data}:${pepper}` : data;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** إنشاء checksum للتحقق من سلامة البيانات */
export function createChecksum(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ──────────────────────────────────────────
// تشفير الحقول
// ──────────────────────────────────────────

export interface EncryptedField {
  ciphertext: string;
  searchHash: string;
}

/** تشفير حقل + إنشاء هاش للبحث */
export function encryptField(value: string): EncryptedField {
  return { ciphertext: encrypt(value), searchHash: hashSearch(value.toLowerCase()) };
}

/** فك تشفير حقل */
export function decryptField(encrypted: EncryptedField): string {
  return decrypt(encrypted.ciphertext);
}

/** مطابقة قيمة مع هاش */
export function matchFieldHash(value: string, hash: string): boolean {
  return hashSearch(value.toLowerCase()) === hash;
}

// ──────────────────────────────────────────
// إدارة المفاتيح
// ──────────────────────────────────────────

/** الحصول على المفتاح النشط */
export async function getActiveKey(): Promise<{ keyId: string; keyHash: string }> {
  const key = await prisma.encryptionKey.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (key) return { keyId: key.keyId, keyHash: key.keyHash };
  return createNewKey();
}

/** إنشاء مفتاح جديد */
export async function createNewKey(): Promise<{ keyId: string; keyHash: string }> {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyId = `key_${Date.now()}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await prisma.encryptionKey.create({ data: { keyId, keyHash, status: 'ACTIVE' } });
  return { keyId, keyHash };
}

/** تدوير المفاتيح (إبطال القديم + إنشاء جديد) */
export async function rotateKey(): Promise<void> {
  const current = await prisma.encryptionKey.findFirst({ where: { status: 'ACTIVE' } });
  if (current) {
    await prisma.encryptionKey.update({
      where: { id: current.id },
      data: { status: 'ROTATED', rotatedAt: new Date() },
    });
  }
  await createNewKey();
}
