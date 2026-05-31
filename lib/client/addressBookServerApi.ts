'use client';

import type { Contact, ContactCategory } from '@/lib/data/addressBook';
import { generateContactSerialNumberFromList, newContactId } from '@/lib/data/addressBook';

export type AddressBookSaveErrorCode =
  | 'DUPLICATE_PHONE'
  | 'DUPLICATE_CIVIL_ID'
  | 'DUPLICATE_PASSPORT'
  | 'DUPLICATE_SERIAL'
  | 'DUPLICATE_COMMERCIAL_REGISTRATION'
  | 'NETWORK'
  | 'UNKNOWN';

export class AddressBookSaveError extends Error {
  code: AddressBookSaveErrorCode;

  constructor(code: AddressBookSaveErrorCode, message?: string) {
    super(message || code);
    this.name = 'AddressBookSaveError';
    this.code = code;
  }
}

function mapServerCode(code: string | undefined): AddressBookSaveErrorCode {
  if (code === 'DUPLICATE_CIVIL_ID') return 'DUPLICATE_CIVIL_ID';
  if (code === 'DUPLICATE_PASSPORT') return 'DUPLICATE_PASSPORT';
  if (code === 'DUPLICATE_SERIAL') return 'DUPLICATE_SERIAL';
  return 'UNKNOWN';
}

/** رفع جهة اتصال إلى الخادم — المصدر الوحيد للحفظ في لوحة الإدارة */
export async function saveContactToServer(contact: Contact): Promise<Contact> {
  try {
    const res = await fetch('/api/address-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(contact),
    });
    if (res.ok) {
      const saved = (await res.json()) as Contact;
      return saved?.id ? saved : contact;
    }
    let code: string | undefined;
    let errorText: string | undefined;
    try {
      const j = (await res.json()) as { error?: string; code?: string };
      code = j.code;
      errorText = j.error;
    } catch {
      /* ignore */
    }
    if (res.status === 409 && code) {
      throw new AddressBookSaveError(mapServerCode(code), errorText);
    }
    throw new AddressBookSaveError('UNKNOWN', errorText || `HTTP ${res.status}`);
  } catch (e) {
    if (e instanceof AddressBookSaveError) throw e;
    throw new AddressBookSaveError('NETWORK', e instanceof Error ? e.message : 'network');
  }
}

export function buildNewContactForServer(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  existingContacts: Contact[],
  options?: { userSerialNumber?: string }
): Contact {
  const now = new Date().toISOString();
  const userSerial = options?.userSerialNumber?.trim();
  const serialNumber =
    userSerial || generateContactSerialNumberFromList(data.category ?? 'OTHER', existingContacts);
  return {
    ...data,
    id: newContactId(),
    serialNumber,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyContactUpdateOnServer(current: Contact, updates: Partial<Contact>): Contact {
  const merged = { ...current, ...updates };
  const categoryChangeHistory = [...(current.categoryChangeHistory || [])];
  if (updates.category != null && updates.category !== current.category) {
    categoryChangeHistory.push({
      date: new Date().toISOString(),
      from: current.category,
      to: updates.category,
    });
  }
  return { ...merged, categoryChangeHistory, updatedAt: new Date().toISOString() };
}

export function setContactArchivedOnServer(contact: Contact, archived: boolean): Contact {
  const now = new Date().toISOString();
  if (archived) {
    return { ...contact, archived: true, archivedAt: now, updatedAt: now };
  }
  const { archived: _a, archivedAt: _at, ...rest } = contact;
  return { ...rest, updatedAt: now };
}
