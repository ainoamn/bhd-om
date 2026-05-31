import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import { withAddressBookSchemaHeal } from '@/lib/server/addressBookDbCompat';
import { normalizePublicPhone } from '@/lib/server/publicContractAccess';

type ContactRow = { contactId: string; data: Record<string, unknown> };

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '—',
    familyName: parts.length > 1 ? parts[parts.length - 1] : parts[0] || '—',
  };
}

function buildContactIndex(rows: ContactRow[]) {
  const byEmail = new Map<string, ContactRow>();
  const byPhone = new Map<string, ContactRow>();
  for (const row of rows) {
    const email = String(row.data.email || '')
      .trim()
      .toLowerCase();
    if (email.length >= 3 && !byEmail.has(email)) byEmail.set(email, row);
    const phone = normalizePublicPhone(String(row.data.phone || ''));
    if (phone.length >= 6 && !byPhone.has(phone)) byPhone.set(phone, row);
  }
  return { byEmail, byPhone };
}

function findInIndex(
  index: ReturnType<typeof buildContactIndex>,
  phone: string,
  email: string
): ContactRow | null {
  const emailNorm = email.trim().toLowerCase();
  if (emailNorm.length >= 3) {
    const hit = index.byEmail.get(emailNorm);
    if (hit) return hit;
  }
  const phoneNorm = normalizePublicPhone(phone);
  if (phoneNorm.length >= 6) {
    const hit = index.byPhone.get(phoneNorm);
    if (hit) return hit;
  }
  return null;
}

/** مزامنة جهات اتصال من BookingStorage — بدون localStorage */
export async function syncBookingsToAddressBookServer(opts?: { limit?: number }) {
  const limit = Math.min(Math.max(opts?.limit ?? 2000, 1), 5000);
  const bookingRows = await prisma.bookingStorage.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  const contactRows = (
    await prisma.addressBookContact.findMany({
      select: { contactId: true, data: true },
    })
  ).map((r) => ({ contactId: r.contactId, data: (r.data as Record<string, unknown>) || {} }));

  const index = buildContactIndex(contactRows);
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of bookingRows) {
    const b = parseBookingStorageRow(row.data);
    if (!b) {
      skipped += 1;
      continue;
    }
    if (String(b.status || '') === 'CANCELLED') {
      skipped += 1;
      continue;
    }

    const phone = String(b.phone || '');
    const email = String(b.email || '');
    const name = String(b.name || '');
    if (!phone.trim() && !email.trim()) {
      skipped += 1;
      continue;
    }

    const propertyId = Number(b.propertyId);
    const unitKey = b.unitKey ? String(b.unitKey) : undefined;
    const unitDisplay = String(b.propertyTitleAr || b.unitDisplay || '');
    const now = new Date().toISOString();
    const existing = findInIndex(index, phone, email);

    if (existing) {
      const d = existing.data;
      const needsUnit = !d.linkedUnitDisplay && !d.linkedPropertyId && !!unitDisplay;
      if (!needsUnit) {
        skipped += 1;
        continue;
      }
      const merged: Record<string, unknown> = {
        ...d,
        linkedPropertyId: Number.isFinite(propertyId) ? propertyId : d.linkedPropertyId,
        linkedUnitKey: unitKey,
        linkedUnitDisplay: unitDisplay,
        updatedAt: now,
      };
      await withAddressBookSchemaHeal(prisma, async () => {
        await prisma.addressBookContact.update({
          where: { contactId: existing.contactId },
          data: { data: merged as object, updatedAt: new Date() },
        });
      });
      existing.data = merged;
      updated += 1;
      continue;
    }

    const { firstName, familyName } = splitName(name);
    const contactId = `CNT-${randomUUID()}`;
    const contact: Record<string, unknown> = {
      id: contactId,
      firstName,
      familyName,
      name: name || firstName,
      phone: phone || '',
      email: email || undefined,
      nationality: '',
      gender: 'MALE',
      category: 'CLIENT',
      contactType: 'PERSONAL',
      civilId: b.civilId ? String(b.civilId) : undefined,
      passportNumber: b.passportNumber ? String(b.passportNumber) : undefined,
      linkedPropertyId: Number.isFinite(propertyId) ? propertyId : undefined,
      linkedUnitKey: unitKey,
      linkedUnitDisplay: unitDisplay || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const ident = await assertAddressBookIdentityUnique(contact, contactId);
    if (!ident.ok) {
      skipped += 1;
      continue;
    }

    await withAddressBookSchemaHeal(prisma, async () => {
      await prisma.addressBookContact.create({
        data: { contactId, linkedUserId: null, data: contact as object },
      });
    });

    const created: ContactRow = { contactId, data: contact };
    const emailNorm = email.trim().toLowerCase();
    if (emailNorm.length >= 3) index.byEmail.set(emailNorm, created);
    const phoneNorm = normalizePublicPhone(phone);
    if (phoneNorm.length >= 6) index.byPhone.set(phoneNorm, created);
    added += 1;
  }

  return { added, updated, skipped, total: bookingRows.length };
}
