/**
 * عند إنشاء مستخدم جديد (تسجيل أو إضافة من الإدارة): ضمان وجود صف في دفتر العناوين مربوط بالحساب.
 */

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteOtherAddressBookRowsForUser } from '@/lib/server/addressBookDedupe';
import { upsertAddressBookContactFallback } from '@/lib/server/addressBookContactUpsert';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';

/** إزالة التكرار لا يجب أن تُسقط ضمان الصف — فشل SQL نادر (صلاحيات/لهجة DB) */
async function safeDeleteOtherAddressBookRowsForUser(keepContactId: string, userId: string): Promise<void> {
  try {
    await deleteOtherAddressBookRowsForUser(keepContactId, userId);
  } catch (e) {
    console.error('safeDeleteOtherAddressBookRowsForUser:', keepContactId, userId, e);
  }
}

function normalizeDigitsPhone(raw: string | null | undefined): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

function sanitizeJsonForPrisma(input: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  } catch {
    return input;
  }
}

/** P2022 = عمود غير موجود في القاعدة؛ رسائل قديمة تستخدم (not available) */
function isPrismaSchemaDriftError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') return true;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes('does not exist') ||
    msg.includes('not available') ||
    msg.includes('Unknown arg') ||
    msg.includes('Unknown field')
  );
}

/** إنشاء صف دون عمود linkedUserId ثم SQL خام إن لزم — للإنتاج قبل migrate */
async function createAddressBookRowWithoutLinkedUserIdColumn(params: {
  contactId: string;
  userId: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const { contactId, userId, data } = params;
  try {
    await prisma.addressBookContact.create({
      data: { contactId, data: data as object },
    });
  } catch (e2) {
    const msg = e2 instanceof Error ? e2.message : String(e2);
    if (!isPrismaSchemaDriftError(e2) && !msg.includes('Unique constraint')) throw e2;
    await upsertAddressBookContactFallback({ contactId, linkedUserId: userId, data });
  }
}

function namePartsFromFullName(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '—',
    secondName: parts.length > 3 ? parts[1] : undefined,
    thirdName: parts.length > 4 ? parts[2] : undefined,
    familyName: parts.length > 1 ? parts[parts.length - 1]! : parts[0] || '',
  };
}

export type EnsureAddressBookUserInput = {
  userId: string;
  serialNumber: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  /** عند إنشاء المستخدم من سجل موجود في دفتر العناوين */
  contactIdFromSource?: string | null;
};

/**
 * ينشئ أو يحدّث صف AddressBookContact ويربطه بـ linkedUserId عند توفر العمود.
 */
export async function ensureAddressBookContactForUser(input: EnsureAddressBookUserInput): Promise<void> {
  const { userId, serialNumber, name, email, phone, role, contactIdFromSource } = input;
  const category = role === 'OWNER' ? 'LANDLORD' : 'CLIENT';
  const emailLower = (email || '').toLowerCase().trim();
  const publicEmail = emailLower.includes('@nologin.bhd') ? undefined : emailLower;
  let phoneDigits = normalizeDigitsPhone(phone);
  if (!phoneDigits || phoneDigits.replace(/\D/g, '').length < 8) {
    phoneDigits = '968' + String(Date.now()).slice(-7);
  }
  const np = namePartsFromFullName(name);
  const now = new Date().toISOString();

  try {
    const cid = (contactIdFromSource || '').trim();
    if (cid) {
      const row = await prisma.addressBookContact.findUnique({ where: { contactId: cid } });
      if (row) {
        const data = { ...((row.data as Record<string, unknown>) || {}) };
        data.id = cid;
        data.userId = userId;
        data.serialNumber = serialNumber;
        data.name = name;
        data.firstName = np.firstName;
        data.secondName = np.secondName;
        data.thirdName = np.thirdName;
        data.familyName = np.familyName;
        data.email = publicEmail;
        data.phone = phoneDigits;
        data.category = category;
        data.contactType = (data.contactType as string) || 'PERSONAL';
        data.updatedAt = now;
        const dataSafe = sanitizeJsonForPrisma(data);
        try {
          await prisma.addressBookContact.update({
            where: { contactId: cid },
            data: {
              linkedUserId: userId,
              data: dataSafe as object,
              updatedAt: new Date(),
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
          await prisma.addressBookContact.update({
            where: { contactId: cid },
            data: { data: dataSafe as object, updatedAt: new Date() },
          });
        }
        await safeDeleteOtherAddressBookRowsForUser(cid, userId);
        return;
      }
    }

    const existing = await findAddressBookRowByUserId(userId);
    if (existing) {
      const data = { ...((existing.data as Record<string, unknown>) || {}) };
      data.id = existing.contactId;
      data.userId = userId;
      data.serialNumber = serialNumber;
      data.name = name;
      data.firstName = np.firstName;
      data.secondName = np.secondName;
      data.thirdName = np.thirdName;
      data.familyName = np.familyName;
      data.email = publicEmail;
      data.phone = phoneDigits;
      data.category = category;
      data.updatedAt = now;
      const dataExistingSafe = sanitizeJsonForPrisma(data);
      try {
        await prisma.addressBookContact.update({
          where: { contactId: existing.contactId },
          data: {
            linkedUserId: userId,
            data: dataExistingSafe as object,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
        await prisma.addressBookContact.update({
          where: { contactId: existing.contactId },
          data: { data: dataExistingSafe as object, updatedAt: new Date() },
        });
      }
      await safeDeleteOtherAddressBookRowsForUser(existing.contactId, userId);
      return;
    }

    /** إذا وُجد صف بـ linkedUserId ولم يُعثر عليه findAddressBookRowByUserId (تعارض/هجرة جزئية) */
    try {
      const byLink = await prisma.addressBookContact.findUnique({
        where: { linkedUserId: userId },
      });
      if (byLink) {
        const data = { ...((byLink.data as Record<string, unknown>) || {}) };
        data.id = byLink.contactId;
        data.userId = userId;
        data.serialNumber = serialNumber;
        data.name = name;
        data.firstName = np.firstName;
        data.secondName = np.secondName;
        data.thirdName = np.thirdName;
        data.familyName = np.familyName;
        data.email = publicEmail;
        data.phone = phoneDigits;
        data.category = category;
        data.updatedAt = now;
        const dataByLinkSafe = sanitizeJsonForPrisma(data);
        try {
          await prisma.addressBookContact.update({
            where: { contactId: byLink.contactId },
            data: {
              linkedUserId: userId,
              data: dataByLinkSafe as object,
              updatedAt: new Date(),
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
          await prisma.addressBookContact.update({
            where: { contactId: byLink.contactId },
            data: { data: dataByLinkSafe as object, updatedAt: new Date() },
          });
        }
        await safeDeleteOtherAddressBookRowsForUser(byLink.contactId, userId);
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
    }

    const contactId = `CNT-${randomUUID()}`;
    const data: Record<string, unknown> = {
      id: contactId,
      contactType: 'PERSONAL',
      category,
      nationality: 'عماني',
      gender: 'MALE',
      name,
      email: publicEmail,
      phone: phoneDigits,
      firstName: np.firstName,
      secondName: np.secondName,
      thirdName: np.thirdName,
      familyName: np.familyName,
      address: { fullAddress: '—', fullAddressEn: '—' },
      userId,
      serialNumber,
      createdAt: now,
      updatedAt: now,
    };
    const dataCreateSafe = sanitizeJsonForPrisma(data);

    try {
      await prisma.addressBookContact.create({
        data: {
          contactId,
          linkedUserId: userId,
          data: dataCreateSafe as object,
        },
      });
    } catch (e) {
      /** P2002 = تفرد (linkedUserId أو contactId) — نحدّث الصف الموجود */
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        let row:
          | Awaited<ReturnType<typeof prisma.addressBookContact.findFirst>>
          | Awaited<ReturnType<typeof findAddressBookRowByUserId>> = null;
        try {
          row = await prisma.addressBookContact.findFirst({
            where: { linkedUserId: userId },
          });
        } catch (lookupErr) {
          const lm = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
          if (!lm.includes('does not exist') && !lm.includes('not available')) {
            console.error('ensureAddressBookContactForUser P2002 linkedUserId lookup:', lookupErr);
          }
          row = await findAddressBookRowByUserId(userId);
        }
        if (row) {
          const merged = { ...((row.data as Record<string, unknown>) || {}) };
          merged.id = row.contactId;
          merged.userId = userId;
          merged.serialNumber = serialNumber;
          merged.name = name;
          merged.firstName = np.firstName;
          merged.secondName = np.secondName;
          merged.thirdName = np.thirdName;
          merged.familyName = np.familyName;
          merged.email = publicEmail;
          merged.phone = phoneDigits;
          merged.category = category;
          merged.updatedAt = now;
          const mergedSafe = sanitizeJsonForPrisma(merged);
          try {
            await prisma.addressBookContact.update({
              where: { contactId: row.contactId },
              data: {
                linkedUserId: userId,
                data: mergedSafe as object,
                updatedAt: new Date(),
              },
            });
          } catch (inner) {
            const im = inner instanceof Error ? inner.message : String(inner);
            if (!im.includes('does not exist') && !im.includes('not available')) throw inner;
            await prisma.addressBookContact.update({
              where: { contactId: row.contactId },
              data: { data: mergedSafe as object, updatedAt: new Date() },
            });
          }
          await safeDeleteOtherAddressBookRowsForUser(row.contactId, userId);
          return;
        }
      }

      /** P2022 = عمود غير موجود (غالباً linkedUserId قبل migrate) — إنشاء بدون العمود + SQL خام */
      if (isPrismaSchemaDriftError(e)) {
        await createAddressBookRowWithoutLinkedUserIdColumn({
          contactId,
          userId,
          data: dataCreateSafe,
        });
        await safeDeleteOtherAddressBookRowsForUser(contactId, userId);
        return;
      }

      throw e;
    }
    await safeDeleteOtherAddressBookRowsForUser(contactId, userId);
  } catch (err) {
    console.error('ensureAddressBookContactForUser:', err);
    throw err;
  }
}
