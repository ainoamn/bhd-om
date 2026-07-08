/**
 * TOTP 2FA للمديرين — يُخزَّن السر مشفّراً في AppSetting.
 */
import { authenticator } from 'otplib';
import { prisma } from '@/lib/prisma';
import { encryptAtRest, decryptAtRest } from '@/lib/server/piiField';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function secretKey(userId: string): string {
  return `user_totp_secret:${userId}`;
}

function enabledKey(userId: string): string {
  return `user_totp_enabled:${userId}`;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.has(String(role || '').toUpperCase());
}

export async function isTotpEnabled(userId: string): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: enabledKey(userId) } });
  return row?.value === 'true';
}

export async function requiresAdminTotp(userId: string, role: string): Promise<boolean> {
  if (!isAdminRole(role)) return false;
  return isTotpEnabled(userId);
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'BHD-OM Admin', secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const token = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  return authenticator.verify({ token, secret });
}

export async function savePendingTotpSecret(userId: string, secret: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: secretKey(userId) },
    create: { key: secretKey(userId), value: encryptAtRest(secret) },
    update: { value: encryptAtRest(secret) },
  });
}

export async function getTotpSecret(userId: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: secretKey(userId) } });
  if (!row?.value) return null;
  return decryptAtRest(row.value);
}

export async function enableTotp(userId: string, secret: string, code: string): Promise<boolean> {
  if (!verifyTotpCode(secret, code)) return false;
  await savePendingTotpSecret(userId, secret);
  await prisma.appSetting.upsert({
    where: { key: enabledKey(userId) },
    create: { key: enabledKey(userId), value: 'true' },
    update: { value: 'true' },
  });
  return true;
}

export async function verifyUserTotp(userId: string, code: string): Promise<boolean> {
  const secret = await getTotpSecret(userId);
  if (!secret) return false;
  return verifyTotpCode(secret, code);
}

export async function disableTotp(userId: string): Promise<void> {
  await prisma.appSetting.deleteMany({
    where: { key: { in: [secretKey(userId), enabledKey(userId)] } },
  });
}
