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
  if (code === 'DUPLICATE_PHONE') return 'DUPLICATE_PHONE';
  if (code === 'DUPLICATE_CIVIL_ID') return 'DUPLICATE_CIVIL_ID';
  if (code === 'DUPLICATE_PASSPORT') return 'DUPLICATE_PASSPORT';
  if (code === 'DUPLICATE_SERIAL') return 'DUPLICATE_SERIAL';
  if (code === 'DUPLICATE_EMAIL') return 'UNKNOWN';
  return 'UNKNOWN';
}

/** جلب قائمة دفتر العناوين — GET /api/address-book */
export async function fetchAddressBookListFromServer(limit = 500): Promise<Contact[]> {
  try {
    const res = await fetch(`/api/address-book?limit=${Math.min(500, Math.max(1, limit))}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as Contact[]) : [];
  } catch {
    return [];
  }
}

/** جلب جهة المستخدم المرتبطة — GET /api/user/linked-contact */
export async function fetchLinkedContactFromServer(): Promise<Contact | null> {
  const res = await fetch('/api/user/linked-contact', { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || typeof data !== 'object') return null;
  const id = typeof (data as { id?: string }).id === 'string' ? String((data as { id: string }).id).trim() : '';
  return id ? (data as Contact) : null;
}

/** حفظ/تحديث جهة المستخدم — PATCH /api/user/linked-contact (ينشئ صفاً إن لم يوجد) */
export async function patchLinkedContactOnServer(patch: Partial<Contact>): Promise<Contact> {
  try {
    const res = await fetch('/api/user/linked-contact', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      return (await res.json()) as Contact;
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
