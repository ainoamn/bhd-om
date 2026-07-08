import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  decryptUserPhone,
  hashUserPhoneForLookup,
  isEncryptedUserPhone,
  normalizeUserPhone,
  prepareUserPhoneWrite,
} from '@/lib/server/userPhoneCrypto';

type JsonRecord = Record<string, unknown>;

function patchUserPhoneFields(block: JsonRecord): void {
  if (!('phone' in block)) return;
  const raw = block.phone;
  if (raw === null || raw === undefined || raw === '') {
    block.phone = null;
    block.phoneHash = null;
    return;
  }
  if (typeof raw === 'string' && isEncryptedUserPhone(raw)) return;
  const prepared = prepareUserPhoneWrite(typeof raw === 'string' ? raw : String(raw));
  block.phone = prepared.phone;
  block.phoneHash = prepared.phoneHash;
}

function patchUserWriteArgs(args: Record<string, unknown>): void {
  if (args.data && typeof args.data === 'object' && !Array.isArray(args.data)) {
    patchUserPhoneFields(args.data as JsonRecord);
  }
  for (const key of ['create', 'update'] as const) {
    const block = args[key];
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      patchUserPhoneFields(block as JsonRecord);
    }
  }
}

function decryptUserResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((row) => decryptUserRow(row));
  }
  return decryptUserRow(result);
}

function decryptUserRow(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  const r = row as { phone?: string | null };
  if (!r.phone) return row;
  return { ...r, phone: decryptUserPhone(r.phone) };
}

/** Prisma extension — تشفير User.phone + phoneHash للبحث */
export const userPhoneCryptoExtension = Prisma.defineExtension({
  query: {
    user: {
      async $allOperations({ args, query }) {
        patchUserWriteArgs(args as Record<string, unknown>);
        const result = await query(args);
        return decryptUserResult(result);
      },
    },
  },
});

/** البحث عن مستخدم بالهاتف — يدعم الصفوف القديمة والجديدة */
export async function findUserByPhone(rawPhone: string) {
  const normalized = normalizeUserPhone(rawPhone);
  if (normalized.replace(/\D/g, '').length < 8) return null;
  const phoneHash = hashUserPhoneForLookup(normalized);
  return prisma.user.findFirst({
    where: {
      OR: [{ phoneHash }, { phone: normalized }],
    },
  });
}

/** هل الهاتف مسجّل لمستخدم آخر؟ */
export async function isPhoneTakenByOther(rawPhone: string, excludeUserId?: string): Promise<boolean> {
  const normalized = normalizeUserPhone(rawPhone);
  if (normalized.replace(/\D/g, '').length < 8) return false;
  const phoneHash = hashUserPhoneForLookup(normalized);
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phoneHash }, { phone: normalized }],
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}
