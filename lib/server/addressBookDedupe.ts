/**
 * دفتر العناوين — إزالة التكرار على الخادم + حذف صفوف مرتبطة بنفس المستخدم
 */

import { prisma } from '@/lib/prisma';
import {
  getDuplicateDropContactIds,
  normPhoneForDedupe,
  type AddressBookDedupeRow,
} from '@/lib/data/addressBookDedupeShared';

export type AddressBookRowMinimal = AddressBookDedupeRow;

export function getDuplicateDropContactIdsFromDbRows(
  rows: Array<{ contactId: string; linkedUserId: string | null; data: unknown; updatedAt: Date }>
): Set<string> {
  const minimal: AddressBookDedupeRow[] = rows.map((r) => ({
    contactId: r.contactId,
    linkedUserId: r.linkedUserId,
    data: r.data,
    updatedAt: r.updatedAt,
  }));
  return getDuplicateDropContactIds(minimal);
}

export async function deleteOtherAddressBookRowsForUser(keepContactId: string, userId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "AddressBookContact"
    WHERE "contactId" <> ${keepContactId}
    AND (
      "linkedUserId" = ${userId}
      OR (data->>'userId') = ${userId}
    )
  `;
}

/** يحذف جهات شخصية أخرى بنفس الهاتف المطبَّع (نسخ قديمة بلا userId) */
export async function deleteOtherPersonalRowsSamePhone(keepContactId: string, phone: unknown): Promise<void> {
  const norm = normPhoneForDedupe(phone);
  if (norm.length < 8) return;
  const all = await prisma.addressBookContact.findMany({ select: { contactId: true, data: true } });
  const toDelete = all
    .filter((r) => r.contactId !== keepContactId)
    .filter((r) => {
      const d = (r.data as Record<string, unknown>) || {};
      if (d.contactType === 'COMPANY' || d.companyData != null) return false;
      return normPhoneForDedupe(d.phone) === norm;
    })
    .map((r) => r.contactId);
  if (toDelete.length === 0) return;
  await prisma.addressBookContact.deleteMany({ where: { contactId: { in: toDelete } } });
}
