/**
 * ربط جهات الاتصال بالحجوزات والعقود - للعرض في سجل جهة الاتصال
 */

import type { Contact, ContactCategory } from './addressBook';
import { normalizePhoneForComparison } from './addressBook';
import { getAllBookings, type PropertyBooking } from './bookings';
import { getAllContracts, type RentalContract } from './contracts';
import { searchDocuments } from './accounting';
import { getPropertyById, getPropertyDataOverrides } from './properties';
import { getUnitDisplayFromProperty } from './bookings';
import { getDocumentsByBooking, type BookingDocument } from './bookingDocuments';

export type ContractDisplayStatus = 'ACTIVE' | 'ENDED' | 'RENEWED' | 'CANCELLED' | 'DRAFT';

export interface ContactLinkedBooking {
  id: string;
  bookingId: string;
  date: string;
  propertyId: number;
  propertyTitleAr: string;
  propertyTitleEn: string;
  unitKey?: string;
  unitDisplay?: string;
  status: PropertyBooking['status'];
  contractId?: string;
  hasFinancialClaims: boolean;
  /** آخر 4 أرقام البطاقة (عند الدفع ببطاقة) */
  cardLast4?: string;
  cardExpiry?: string;
  cardholderName?: string;
}

export interface ContactLinkedContract {
  id: string;
  contractId: string;
  bookingId?: string;
  date: string;
  propertyId: number;
  propertyTitleAr: string;
  propertyTitleEn: string;
  unitKey?: string;
  unitDisplay?: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  status: ContractDisplayStatus;
  hasFinancialClaims: boolean;
  /** دور جهة الاتصال في العقد: مستأجر أو مالك */
  role?: 'tenant' | 'landlord';
}

function normEmail(e: string) {
  return (e || '').trim().toLowerCase();
}

function isContractEnded(c: RentalContract): boolean {
  try {
    return new Date(c.endDate) < new Date();
  } catch {
    return false;
  }
}

/** الحجوزات المرتبطة بجهة الاتصال (مطابقة الهاتف أو البريد) */
export function getContactLinkedBookings(contact: Contact): ContactLinkedBooking[] {
  const list = getAllBookings();
  const cPhone = normalizePhoneForComparison(contact.phone || '');
  const cEmail = normEmail(contact.email || '');
  const matches = list.filter((b) => {
    const bPhone = normalizePhoneForComparison(b.phone || '');
    const matchPhone = cPhone.length >= 6 && bPhone.length >= 6 && cPhone === bPhone;
    const matchEmail = cEmail.length >= 3 && normEmail(b.email) === cEmail;
    return matchPhone || matchEmail;
  });
  const overrides = getPropertyDataOverrides();
  return matches.map((b) => {
    const prop = getPropertyById(b.propertyId, overrides);
    const unitPart = b.unitKey && prop ? getUnitDisplayFromProperty(prop, b.unitKey, true) : null;
    const unitDisplay = unitPart ? `${b.propertyTitleAr} - ${unitPart}` : b.propertyTitleAr;
    const docs = typeof window !== 'undefined' ? searchDocuments({ bookingId: b.id }) : [];
    const hasFinancialClaims = docs.some((d) => d.status === 'PENDING' || d.status === 'DRAFT');
    return {
      id: b.id,
      bookingId: b.id,
      date: b.createdAt,
      propertyId: b.propertyId,
      propertyTitleAr: b.propertyTitleAr,
      propertyTitleEn: b.propertyTitleEn,
      unitKey: b.unitKey,
      unitDisplay,
      status: b.status,
      contractId: b.contractId,
      hasFinancialClaims,
      cardLast4: b.cardLast4,
      cardExpiry: b.cardExpiry,
      cardholderName: b.cardholderName,
    };
  });
}

/** العقود المرتبطة بجهة الاتصال (مستأجر أو مالك - مطابقة الهاتف أو البريد) */
export function getContactLinkedContracts(contact: Contact): ContactLinkedContract[] {
  const list = getAllContracts();
  const cPhone = normalizePhoneForComparison(contact.phone || '');
  const cEmail = normEmail(contact.email || '');
  const matches = list.filter((c) => {
    const tPhone = normalizePhoneForComparison(c.tenantPhone || '');
    const lPhone = c.landlordPhone ? normalizePhoneForComparison(c.landlordPhone) : '';
    const asTenant = (cPhone.length >= 6 && tPhone.length >= 6 && cPhone === tPhone) || (cEmail.length >= 3 && normEmail(c.tenantEmail) === cEmail);
    const asLandlord = (cPhone.length >= 6 && lPhone.length >= 6 && cPhone === lPhone) || (cEmail.length >= 3 && c.landlordEmail && normEmail(c.landlordEmail) === cEmail);
    return asTenant || asLandlord;
  });
  const overrides = getPropertyDataOverrides();
  return matches.map((c) => {
    const ended = isContractEnded(c);
    let status: ContractDisplayStatus = c.status === 'DRAFT' ? 'DRAFT' : ended ? 'ENDED' : 'ACTIVE';
    const docs = typeof window !== 'undefined' ? searchDocuments({ contractId: c.id }) : [];
    const hasFinancialClaims = docs.some((d) => d.status === 'PENDING' || d.status === 'DRAFT');
    const tPhone = normalizePhoneForComparison(c.tenantPhone || '');
    const asTenant = (cPhone.length >= 6 && tPhone.length >= 6 && cPhone === tPhone) || (cEmail.length >= 3 && normEmail(c.tenantEmail) === cEmail);
    const role: 'tenant' | 'landlord' = asTenant ? 'tenant' : 'landlord';
    const prop = getPropertyById(c.propertyId, overrides);
    const unitPart = c.unitKey && prop ? getUnitDisplayFromProperty(prop, c.unitKey, true) : null;
    const unitDisplay = unitPart ? `${c.propertyTitleAr} - ${unitPart}` : c.propertyTitleAr;
    return {
      id: c.id,
      contractId: c.id,
      bookingId: c.bookingId,
      date: c.createdAt,
      propertyId: c.propertyId,
      propertyTitleAr: c.propertyTitleAr,
      propertyTitleEn: c.propertyTitleEn,
      unitKey: c.unitKey,
      unitDisplay,
      landlordName: c.landlordName,
      startDate: c.startDate,
      endDate: c.endDate,
      status,
      hasFinancialClaims,
      role,
    };
  });
}

/** المستندات المرفوعة في توثيق العقد - مرتبطة بجهة الاتصال عبر حجوزاتها */
export function getContactLinkedBookingDocuments(contact: Contact): Array<BookingDocument & { bookingDate?: string; propertyTitleAr?: string; propertyTitleEn?: string; unitDisplay?: string }> {
  const bookings = getContactLinkedBookings(contact);
  const overrides = getPropertyDataOverrides();
  const result: Array<BookingDocument & { bookingDate?: string; propertyTitleAr?: string; propertyTitleEn?: string; unitDisplay?: string }> = [];
  for (const b of bookings) {
    const docs = getDocumentsByBooking(b.bookingId);
    const prop = getPropertyById(b.propertyId, overrides);
    const unitPart = b.unitKey && prop ? getUnitDisplayFromProperty(prop, b.unitKey, true) : null;
    const unitDisplay = unitPart ? `${b.propertyTitleAr} - ${unitPart}` : b.propertyTitleAr;
    for (const d of docs) {
      result.push({
        ...d,
        bookingDate: b.date,
        propertyTitleAr: b.propertyTitleAr,
        propertyTitleEn: b.propertyTitleEn,
        unitDisplay,
      });
    }
  }
  return result.sort((a, b) => (b.uploadedAt || b.createdAt || '').localeCompare(a.uploadedAt || a.createdAt || ''));
}

/** التصنيفات المستمدة من نشاط الجهة (حجز = عميل، عقد كمستأجر = مستأجر، عقد كمالك = مالك) */
export function getContactDerivedCategories(contact: Contact): ContactCategory[] {
  const bookings = getContactLinkedBookings(contact);
  const contracts = getContactLinkedContracts(contact);
  const cats: ContactCategory[] = [];
  if (bookings.length > 0) cats.push('CLIENT');
  const asTenant = contracts.filter((c) => c.role === 'tenant');
  const asLandlord = contracts.filter((c) => c.role === 'landlord');
  if (asTenant.length > 0) cats.push('TENANT');
  if (asLandlord.length > 0) cats.push('LANDLORD');
  return [...new Set(cats)];
}

/** هل جهة الاتصال مرتبطة بأي سجل (حجز، عقد، مستند مالي)؟ لا يُسمح بحذفها */
export function isContactLinked(contact: Contact): { linked: boolean; bookings: number; contracts: number; documents: number } {
  const bookings = getContactLinkedBookings(contact);
  const contracts = getContactLinkedContracts(contact);
  const docs = typeof window !== 'undefined' ? searchDocuments({ contactId: contact.id }) : [];
  return {
    linked: bookings.length > 0 || contracts.length > 0 || docs.length > 0,
    bookings: bookings.length,
    contracts: contracts.length,
    documents: docs.length,
  };
}
