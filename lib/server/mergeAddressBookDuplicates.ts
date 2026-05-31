import { prisma } from '@/lib/prisma';
import type { Contact } from '@/lib/data/addressBook';
import {
  findDuplicateContactGroupsFromList,
  mergeContactGroup,
} from '@/lib/addressBook/contactDuplicates';
import { withAddressBookSchemaHeal, findManyAddressBookContactsOrHeal } from '@/lib/server/addressBookDbCompat';

function rowsToContacts(
  rows: Array<{ contactId: string; linkedUserId: string | null; data: unknown }>
): Contact[] {
  return rows
    .map((r) => {
      const d = { ...((r.data as Record<string, unknown>) || {}) };
      const id = String(r.contactId || d.id || '').trim();
      if (!id) return null;
      (d as { id: string }).id = id;
      if (r.linkedUserId) (d as { linkedUserId?: string | null }).linkedUserId = r.linkedUserId;
      return d as unknown as Contact;
    })
    .filter((c): c is Contact => c != null);
}

export async function getAddressBookDuplicateSummary() {
  const rows = await findManyAddressBookContactsOrHeal(prisma);
  const contacts = rowsToContacts(rows);
  const groups = findDuplicateContactGroupsFromList(contacts);
  const duplicateRowCount = groups.reduce((sum, g) => sum + Math.max(0, g.length - 1), 0);
  return { groupCount: groups.length, duplicateRowCount, totalContacts: contacts.length };
}

/** دمج كل مجموعات التكرار في DB */
export async function mergeAllAddressBookDuplicatesServer() {
  const rows = await findManyAddressBookContactsOrHeal(prisma);
  const contacts = rowsToContacts(rows);
  const groups = findDuplicateContactGroupsFromList(contacts);
  let merged = 0;

  for (const group of groups) {
    const result = mergeContactGroup(group);
    if (!result) continue;
    const { merged: mergedContact, removeIds } = result;
    const keepId = mergedContact.id;
    const keepRow = rows.find((r) => r.contactId === keepId);
    const linkedUserId =
      keepRow?.linkedUserId ||
      (typeof mergedContact.userId === 'string' && mergedContact.userId.trim() ? mergedContact.userId.trim() : null);

    await withAddressBookSchemaHeal(prisma, async () => {
      await prisma.addressBookContact.update({
        where: { contactId: keepId },
        data: {
          data: mergedContact as object,
          updatedAt: new Date(),
          ...(linkedUserId ? { linkedUserId } : {}),
        },
      });
      if (removeIds.length > 0) {
        await prisma.addressBookContact.deleteMany({
          where: { contactId: { in: removeIds } },
        });
      }
    });
    merged += removeIds.length;
  }

  return { merged, groups: groups.length };
}
