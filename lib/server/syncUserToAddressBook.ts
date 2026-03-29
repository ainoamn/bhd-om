/**
 * العثور على جهة الاتصال المرتبطة بمستخدم وتحديثها عند تعديل المستخدم من لوحة الإدارة
 */

import { prisma } from '@/lib/prisma';

export async function findAddressBookRowByUserId(userId: string) {
  const byCol = await prisma.addressBookContact.findFirst({
    where: { linkedUserId: userId },
  });
  if (byCol) return byCol;
  const rows = await prisma.addressBookContact.findMany();
  return rows.find((r) => (r.data as { userId?: string }).userId === userId) ?? null;
}

/** دمج اسم المستخدم وهاتفه وبريده ورقمه المتسلسل في JSON جهة الاتصال المرتبطة */
export async function syncLinkedAddressBookFromUserUpdate(userId: string, fields: { name: string; email: string; phone: string | null; serialNumber: string }): Promise<void> {
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
    let digits = fields.phone.replace(/\D/g, '');
    if (digits.length === 8 && digits.startsWith('9')) digits = '968' + digits;
    else if (!digits.startsWith('968') && digits.length >= 8) digits = '968' + digits.replace(/^0+/, '');
    d.phone = digits;
  }
  d.serialNumber = fields.serialNumber;
  d.userId = userId;
  d.updatedAt = new Date().toISOString();

  await prisma.addressBookContact.update({
    where: { contactId: row.contactId },
    data: {
      linkedUserId: userId,
      data: d as object,
      updatedAt: new Date(),
    },
  });
}
