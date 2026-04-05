/**
 * عند إنشاء مستخدم جديد (تسجيل أو إضافة من الإدارة): ضمان وجود صف في دفتر العناوين مربوط بالحساب.
 */

import { prisma } from '@/lib/prisma';
import { deleteOtherAddressBookRowsForUser } from '@/lib/server/addressBookDedupe';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';

function normalizeDigitsPhone(raw: string | null | undefined): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

function namePartsFromFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
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
        data.firstName = np.firstName;
        data.secondName = np.secondName;
        data.thirdName = np.thirdName;
        data.familyName = np.familyName;
        data.email = publicEmail;
        data.phone = phoneDigits;
        data.category = category;
        data.contactType = (data.contactType as string) || 'PERSONAL';
        data.updatedAt = now;
        try {
          await prisma.addressBookContact.update({
            where: { contactId: cid },
            data: {
              linkedUserId: userId,
              data: data as object,
              updatedAt: new Date(),
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
          await prisma.addressBookContact.update({
            where: { contactId: cid },
            data: { data: data as object, updatedAt: new Date() },
          });
        }
        await deleteOtherAddressBookRowsForUser(cid, userId);
        return;
      }
    }

    const existing = await findAddressBookRowByUserId(userId);
    if (existing) {
      const data = { ...((existing.data as Record<string, unknown>) || {}) };
      data.id = existing.contactId;
      data.userId = userId;
      data.serialNumber = serialNumber;
      data.firstName = np.firstName;
      data.secondName = np.secondName;
      data.thirdName = np.thirdName;
      data.familyName = np.familyName;
      data.email = publicEmail;
      data.phone = phoneDigits;
      data.category = category;
      data.updatedAt = now;
      try {
        await prisma.addressBookContact.update({
          where: { contactId: existing.contactId },
          data: {
            linkedUserId: userId,
            data: data as object,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
        await prisma.addressBookContact.update({
          where: { contactId: existing.contactId },
          data: { data: data as object, updatedAt: new Date() },
        });
      }
      await deleteOtherAddressBookRowsForUser(existing.contactId, userId);
      return;
    }

    const contactId = `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const data: Record<string, unknown> = {
      id: contactId,
      contactType: 'PERSONAL',
      category,
      nationality: 'عماني',
      gender: 'MALE',
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

    try {
      await prisma.addressBookContact.create({
        data: {
          contactId,
          linkedUserId: userId,
          data: data as object,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('does not exist') && !msg.includes('not available')) throw e;
      await prisma.addressBookContact.create({
        data: {
          contactId,
          data: data as object,
        },
      });
    }
    await deleteOtherAddressBookRowsForUser(contactId, userId);
  } catch (err) {
    console.error('ensureAddressBookContactForUser:', err);
  }
}
