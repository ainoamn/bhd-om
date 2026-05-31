import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import { withAddressBookSchemaHeal } from '@/lib/server/addressBookDbCompat';
import {
  normalizePublicCivilId,
  normalizePublicPhone,
  updatePublicContractBooking,
  verifyPublicContractTenant,
} from '@/lib/server/publicContractAccess';

const PUBLIC_CONTACT_KEYS = [
  'firstName',
  'secondName',
  'thirdName',
  'familyName',
  'name',
  'nameEn',
  'nationality',
  'gender',
  'phone',
  'phoneSecondary',
  'email',
  'civilId',
  'civilIdExpiry',
  'passportNumber',
  'passportExpiry',
  'workplace',
  'workplaceEn',
  'address',
  'notes',
  'notesEn',
  'tags',
  'linkedPropertyId',
  'linkedUnitKey',
  'linkedUnitDisplay',
  'contactType',
  'companyData',
] as const;

function pickPublicContactUpdates(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_CONTACT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== undefined) {
      out[key] = raw[key];
    }
  }
  return out;
}

async function findContactRowForVerifiedBooking(booking: Record<string, unknown>): Promise<{
  contactId: string;
  data: Record<string, unknown>;
} | null> {
  const bookingContactId = String(booking.contactId || '').trim();
  if (bookingContactId) {
    const row = await prisma.addressBookContact.findUnique({
      where: { contactId: bookingContactId },
      select: { contactId: true, data: true },
    });
    if (row) return { contactId: row.contactId, data: (row.data as Record<string, unknown>) || {} };
  }

  const emailNorm = String(booking.email || '').trim().toLowerCase();
  const phoneNorm = normalizePublicPhone(String(booking.phone || ''));
  const civilNorm = normalizePublicCivilId(String(booking.civilId || ''));
  const passNorm = normalizePublicCivilId(String(booking.passportNumber || ''));

  if (emailNorm.length < 3 && phoneNorm.length < 6 && civilNorm.length < 4 && passNorm.length < 4) {
    return null;
  }

  const rows = await prisma.addressBookContact.findMany({
    select: { contactId: true, data: true },
    orderBy: { updatedAt: 'desc' },
    take: 400,
  });

  for (const row of rows) {
    const d = (row.data as Record<string, unknown>) || {};
    if (emailNorm.length >= 3 && String(d.email || '').trim().toLowerCase() === emailNorm) {
      return { contactId: row.contactId, data: d };
    }
    if (phoneNorm.length >= 6 && normalizePublicPhone(String(d.phone || '')) === phoneNorm) {
      return { contactId: row.contactId, data: d };
    }
    if (civilNorm.length >= 4 && normalizePublicCivilId(String(d.civilId || '')) === civilNorm) {
      return { contactId: row.contactId, data: d };
    }
    if (passNorm.length >= 4 && normalizePublicCivilId(String(d.passportNumber || '')) === passNorm) {
      return { contactId: row.contactId, data: d };
    }
  }
  return null;
}

/** مزامنة جهة اتصال المستأجر من صفحة شروط العقد — بدون login */
export async function syncPublicContractContact(opts: {
  bookingId: string;
  email?: string;
  phone?: string;
  civilId?: string;
  contactId?: string;
  contact: Record<string, unknown>;
}): Promise<
  | { ok: true; contactId: string; contact: Record<string, unknown> }
  | { ok: false; error: string; code?: string }
> {
  const verified = await verifyPublicContractTenant(opts);
  if (!verified) return { ok: false, error: 'BOOKING_NOT_FOUND' };

  const updates = pickPublicContactUpdates(opts.contact || {});
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'EMPTY_CONTACT' };
  }

  const requestedContactId = String(opts.contactId || updates.id || '').trim();
  let existing = await findContactRowForVerifiedBooking(verified);
  if (requestedContactId) {
    if (existing && existing.contactId !== requestedContactId) {
      return { ok: false, error: 'CONTACT_MISMATCH' };
    }
    if (!existing) {
      const row = await prisma.addressBookContact.findUnique({
        where: { contactId: requestedContactId },
        select: { contactId: true, data: true },
      });
      if (row) existing = { contactId: row.contactId, data: (row.data as Record<string, unknown>) || {} };
    }
  }

  const now = new Date().toISOString();
  const contactId = existing?.contactId || requestedContactId || `CNT-${randomUUID()}`;
  const merged: Record<string, unknown> = {
    ...(existing?.data || {}),
    ...updates,
    id: contactId,
    contactType: updates.contactType || existing?.data?.contactType || 'PERSONAL',
    category: existing?.data?.category === 'TENANT' ? 'TENANT' : 'CLIENT',
    updatedAt: now,
    createdAt: typeof existing?.data?.createdAt === 'string' ? existing.data.createdAt : now,
  };

  if (!merged.firstName && typeof merged.name === 'string') {
    const parts = String(merged.name).trim().split(/\s+/).filter(Boolean);
    merged.firstName = parts[0] || merged.name;
    merged.familyName = parts.length > 1 ? parts[parts.length - 1] : merged.firstName;
  }
  if (!merged.familyName) merged.familyName = merged.firstName || '—';
  if (!merged.nationality) merged.nationality = '';
  if (!merged.gender) merged.gender = 'MALE';
  if (!merged.phone) merged.phone = String(verified.phone || '');

  const ident = await assertAddressBookIdentityUnique(merged, contactId);
  if (!ident.ok) {
    return { ok: false, error: ident.message, code: ident.code };
  }

  await withAddressBookSchemaHeal(prisma, async () => {
    await prisma.addressBookContact.upsert({
      where: { contactId },
      create: { contactId, linkedUserId: null, data: merged as object },
      update: { data: merged as object, updatedAt: new Date() },
    });
  });

  const bookingContactId = String(verified.contactId || '').trim();
  if (bookingContactId !== contactId) {
    await updatePublicContractBooking({
      bookingId: opts.bookingId,
      email: opts.email,
      phone: opts.phone,
      civilId: opts.civilId,
      updates: { contactId },
    });
  }

  return { ok: true, contactId, contact: merged };
}
