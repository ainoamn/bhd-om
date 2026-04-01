/**
 * ربط المالك بالمبنى - مرة واحدة لكل عقار
 * يُخزّن في localStorage
 */

import { getContactById, getContactDisplayName } from './addressBook';

const STORAGE_KEY = 'bhd_property_landlords';
const API_URL = '/api/settings/property-landlords';
let didHydrateFromServer = false;
let hydratingFromServer = false;
let landlordStore: Record<string, string> = {};

function getStored(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  if (!didHydrateFromServer && !hydratingFromServer) {
    hydratingFromServer = true;
    fetch(API_URL, { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!payload || typeof payload !== 'object') return;
        landlordStore = payload as Record<string, string>;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        didHydrateFromServer = true;
      })
      .catch(() => {})
      .finally(() => {
        hydratingFromServer = false;
      });
  }
  return landlordStore;
}

function save(data: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    landlordStore = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      didHydrateFromServer = false;
      void getStored();
    }
  });
}

/** هل العقار مرتبط بمالك؟ */
export function hasPropertyLandlord(propertyId: number): boolean {
  const cid = getStored()[String(propertyId)];
  return !!(cid && cid.trim());
}

/** الحصول على معرف جهة الاتصال (المالك) المرتبطة بالعقار */
export function getPropertyLandlordContactId(propertyId: number): string | null {
  const cid = getStored()[String(propertyId)];
  return cid?.trim() || null;
}

/** الحصول على بيانات المالك للعقد */
export function getLandlordForContract(propertyId: number, locale = 'ar'): { landlordName: string; landlordEmail?: string; landlordPhone?: string } {
  const cid = getPropertyLandlordContactId(propertyId);
  if (!cid) return { landlordName: '' };
  const c = getContactById(cid);
  if (!c) return { landlordName: '' };
  return {
    landlordName: getContactDisplayName(c, locale),
    landlordEmail: c.email?.trim() || undefined,
    landlordPhone: c.phone?.trim() || undefined,
  };
}

/** ربط المالك بالعقار */
export function setPropertyLandlord(propertyId: number, contactId: string): void {
  const data = getStored();
  data[String(propertyId)] = contactId.trim();
  save(data);
}

/** العقارات المرتبطة بمالك (contactId) */
export function getPropertyIdsForLandlord(contactId: string): number[] {
  if (!contactId?.trim()) return [];
  const data = getStored();
  return Object.entries(data)
    .filter(([, cid]) => (cid || '').trim() === contactId.trim())
    .map(([pid]) => parseInt(pid, 10))
    .filter((n) => !isNaN(n));
}
