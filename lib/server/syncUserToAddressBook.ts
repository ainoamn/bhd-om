/**
 * العثور على جهة الاتصال المرتبطة بمستخدم وتحديثها عند تعديل المستخدم من لوحة الإدارة
 * + مزامنة User ← دفتر العناوين عند حفظ جهة مربوطة بحساب
 */

import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function normalizeDigitsPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

/** صف دفتر العناوين بحد أدنى من الأعمدة — يعمل حتى قبل تطبيق هجرة linkedUserId على قاعدة الإنتاج */
async function findAddressBookRowByUserIdFallback(userId: string) {
  const rows = await prisma.addressBookContact.findMany({
    select: { id: true, contactId: true, data: true, createdAt: true, updatedAt: true },
  });
  return rows.find((r) => (r.data as { userId?: string }).userId === userId) ?? null;
}

export async function findAddressBookRowByUserId(userId: string) {
  try {
    const byCol = await prisma.addressBookContact.findFirst({
      where: { linkedUserId: userId },
    });
    if (byCol) return byCol;
  } catch {
    /* عمود linkedUserId غير موجود حتى تُنفَّذ prisma migrate deploy */
  }

  try {
    const byJson = await prisma.addressBookContact.findFirst({
      where: {
        data: { path: ['userId'], equals: userId },
      },
      select: {
        id: true,
        contactId: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (byJson) return byJson;
  } catch {
    /* فلتر JSON أو عمود data — آخر مسار */
  }

  return findAddressBookRowByUserIdFallback(userId);
}

/** دمج اسم المستخدم وهاتفه وبريده ورقمه المتسلسل في JSON جهة الاتصال المرتبطة */
export async function syncLinkedAddressBookFromUserUpdate(
  userId: string,
  fields: { name: string; email: string; phone: string | null; serialNumber: string; role?: UserRole }
): Promise<void> {
  const row = await findAddressBookRowByUserId(userId);
  if (!row) return;

  const d = { ...((row.data as Record<string, unknown>) || {}) };
  const nameParts = fields.name.trim().split(/\s+/).filter(Boolean);
  d.firstName = nameParts[0] || fields.name;
  d.familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1]! : nameParts[0] || '';
  if (nameParts.length > 3) {
    d.secondName = nameParts[1];
    d.thirdName = nameParts[2];
  } else if (nameParts.length === 3) {
    d.secondName = nameParts[1];
    d.thirdName = undefined;
  }
  d.email = fields.email.includes('@nologin.bhd') ? undefined : fields.email;
  if (fields.phone?.trim()) {
    d.phone = normalizeDigitsPhone(fields.phone);
  }
  d.serialNumber = fields.serialNumber;
  d.userId = userId;
  if (fields.role) {
    d.category = fields.role === 'OWNER' ? 'LANDLORD' : 'CLIENT';
  }
  d.updatedAt = new Date().toISOString();

  try {
    await prisma.addressBookContact.update({
      where: { contactId: row.contactId },
      data: {
        linkedUserId: userId,
        data: d as object,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
    await prisma.addressBookContact.update({
      where: { contactId: row.contactId },
      data: {
        data: d as object,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * قبل حفظ جهة مربوطة بحساب: التحقق من عدم تعارض البريد مع مستخدم آخر.
 */
export async function assertUserSyncFromContactAllowed(
  userId: string,
  merged: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; status: number; code?: string; message: string }> {
  const contactType = String(merged.contactType || '').toUpperCase();
  if (contactType === 'COMPANY') return { ok: true };

  const emailRaw = String(merged.email || '')
    .trim()
    .toLowerCase();
  if (emailRaw && !emailRaw.includes('@nologin')) {
    const taken = await prisma.user.findFirst({
      where: { email: emailRaw, NOT: { id: userId } },
    });
    if (taken) {
      return { ok: false, status: 409, code: 'DUPLICATE_EMAIL', message: 'Email already in use' };
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, status: 400, message: 'User not found for userId' };
  }
  return { ok: true };
}

/**
 * بعد حفظ صف دفتر العناوين لجهة مربوطة بحساب: تحديث الاسم الظاهر والبريد والهاتف في جدول User
 * (نفس منطق PATCH /api/user/linked-contact للحقول الأساسية).
 */
export async function syncUserTableFromAddressBookContact(userId: string, merged: Record<string, unknown>): Promise<void> {
  const contactType = String(merged.contactType || '').toUpperCase();
  if (contactType === 'COMPANY') return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const first = String(merged.firstName || '').trim();
  const second = String(merged.secondName || '').trim();
  const third = String(merged.thirdName || '').trim();
  const family = String(merged.familyName || '').trim();
  const displayName = [first, second, third, family].filter(Boolean).join(' ') || user.name;

  const emailRaw = String(merged.email || '')
    .trim()
    .toLowerCase();
  let nextEmail = user.email;
  if (emailRaw && !emailRaw.includes('@nologin')) {
    nextEmail = emailRaw;
  }

  let nextPhone: string | null = user.phone;
  if (typeof merged.phone === 'string' && merged.phone.replace(/\D/g, '').length >= 8) {
    nextPhone = normalizeDigitsPhone(merged.phone);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: displayName, email: nextEmail, phone: nextPhone },
  });
}
