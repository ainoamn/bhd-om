/**
 * ربط جهات الاتصال بالحجوزات والعقود - للعرض في سجل جهة الاتصال
 */

import type { Contact, ContactCategory } from './addressBook';
import { normalizePhoneForComparison } from './addressBook';
import {
  bookingMatchesOwnerPropertyPortfolio,
  contractDataMatchesLandlord,
  type LandlordMatchContext,
} from './ownerLandlordMatch';
import { type PropertyBooking } from './bookings';
import type { RentalContract } from './contracts';
import { searchDocuments } from './accounting';
import type { AccountingDocument } from './accounting';
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

/** @deprecated استخدم getContactLinkedBookingsFromServerBookings — لا fallback محلي */
export function getContactLinkedBookings(_contact: Contact): ContactLinkedBooking[] {
  return [];
}

/** ربط الحجوزات من قائمة خادم جاهزة (server-first) */
export function getContactLinkedBookingsFromServerBookings(
  contact: Contact,
  serverBookings: PropertyBooking[],
  serverDocuments?: AccountingDocument[]
): ContactLinkedBooking[] {
  const cId = String(contact.id || '').trim();
  const cPhone = normalizePhoneForComparison(contact.phone || '');
  const cEmail = normEmail(contact.email || '');
  const matches = (Array.isArray(serverBookings) ? serverBookings : []).filter((b) => {
    const bContactId = String((b as PropertyBooking & { contactId?: unknown }).contactId || '').trim();
    if (cId && bContactId && cId === bContactId) return true;
    const bPhone = normalizePhoneForComparison(String((b as PropertyBooking & { phone?: unknown }).phone || ''));
    const bEmail = normEmail(String((b as PropertyBooking & { email?: unknown }).email || ''));
    const matchPhone = cPhone.length >= 6 && bPhone.length >= 6 && cPhone === bPhone;
    const matchEmail = cEmail.length >= 3 && cEmail === bEmail;
    return matchPhone || matchEmail;
  });
  return matches.map((b) => {
    const hasFinancialClaims = (serverDocuments || []).some((d) =>
      String(d.bookingId || '') === String(b.id) && (d.status === 'PENDING' || d.status === 'DRAFT')
    );
    return {
    id: String(b.id),
    bookingId: String(b.id),
    date: String(b.createdAt || ''),
    propertyId: Number(b.propertyId),
    propertyTitleAr: String(b.propertyTitleAr || ''),
    propertyTitleEn: String(b.propertyTitleEn || ''),
    unitKey: b.unitKey ? String(b.unitKey) : undefined,
    unitDisplay: String((b as PropertyBooking & { unitDisplay?: unknown }).unitDisplay || ''),
    status: b.status,
    contractId: b.contractId ? String(b.contractId) : undefined,
    hasFinancialClaims,
    cardLast4: (b as PropertyBooking & { cardLast4?: string }).cardLast4,
    cardExpiry: (b as PropertyBooking & { cardExpiry?: string }).cardExpiry,
    cardholderName: (b as PropertyBooking & { cardholderName?: string }).cardholderName,
    };
  });
}

function mapContactLinkedContractRow(
  contact: Contact,
  c: RentalContract,
  serverDocuments?: AccountingDocument[]
): ContactLinkedContract | null {
  const cPhone = normalizePhoneForComparison(contact.phone || '');
  const cEmail = normEmail(contact.email || '');
  const tPhone = normalizePhoneForComparison(c.tenantPhone || '');
  const lPhone = c.landlordPhone ? normalizePhoneForComparison(c.landlordPhone) : '';
  const asTenant =
    (cPhone.length >= 6 && tPhone.length >= 6 && cPhone === tPhone) ||
    (cEmail.length >= 3 && normEmail(c.tenantEmail) === cEmail);
  const asLandlord =
    (cPhone.length >= 6 && lPhone.length >= 6 && cPhone === lPhone) ||
    (cEmail.length >= 3 && !!c.landlordEmail && normEmail(c.landlordEmail) === cEmail);
  if (!asTenant && !asLandlord) return null;

  const ended = isContractEnded(c);
  let status: ContractDisplayStatus = c.status === 'DRAFT' ? 'DRAFT' : ended ? 'ENDED' : 'ACTIVE';
  const hasFinancialClaims = serverDocuments
    ? serverDocuments.some(
        (d) => String(d.contractId || '') === String(c.id) && (d.status === 'PENDING' || d.status === 'DRAFT')
      )
    : typeof window !== 'undefined'
      ? searchDocuments({ contractId: c.id }).some((d) => d.status === 'PENDING' || d.status === 'DRAFT')
      : false;
  const role: 'tenant' | 'landlord' = asTenant ? 'tenant' : 'landlord';
  const overrides = getPropertyDataOverrides();
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
}

/** العقود المرتبطة بجهة الاتصال من قائمة خادم جاهزة */
export function getContactLinkedContractsFromServerContracts(
  contact: Contact,
  serverContracts: RentalContract[],
  serverDocuments?: AccountingDocument[]
): ContactLinkedContract[] {
  const list = Array.isArray(serverContracts) ? serverContracts : [];
  return list
    .map((c) => mapContactLinkedContractRow(contact, c, serverDocuments))
    .filter((row): row is ContactLinkedContract => row !== null);
}

/** دمج عقود ContractStorage + contractData من الحجوزات + عقود المالك */
export function getContactLinkedContractsFromServer(
  contact: Contact,
  serverBookings: PropertyBooking[],
  serverContracts: RentalContract[],
  serverDocuments?: AccountingDocument[],
  ownerPortfolioSerials?: Set<string> | null
): ContactLinkedContract[] {
  const ctx: LandlordMatchContext = {
    contactId: contact.id,
    userEmail: contact.email,
    userPhone: contact.phone,
  };
  const byContract = getContactLinkedContractsFromServerContracts(contact, serverContracts, serverDocuments);
  const byBookingTenant = getContactLinkedContractsFromServerBookings(contact, serverBookings, serverDocuments);
  const byLandlord = getLandlordContractsFromServerBookings(serverBookings, ctx, ownerPortfolioSerials);
  const seen = new Set<string>();
  const out: ContactLinkedContract[] = [];
  for (const item of [...byContract, ...byBookingTenant, ...byLandlord]) {
    const key = String(item.contractId || item.bookingId || item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** @deprecated استخدم getContactLinkedContractsFromServer — لا fallback محلي */
export function getContactLinkedContracts(_contact: Contact): ContactLinkedContract[] {
  return [];
}

/** ربط العقود من بيانات الحجوزات القادمة من الخادم (contractData داخل booking) */
export function getContactLinkedContractsFromServerBookings(
  contact: Contact,
  serverBookings: PropertyBooking[],
  serverDocuments?: AccountingDocument[]
): ContactLinkedContract[] {
  const linkedBookingIds = new Set(
    getContactLinkedBookingsFromServerBookings(contact, serverBookings, serverDocuments).map((x) => String(x.bookingId))
  );
  const out: ContactLinkedContract[] = [];
  for (const b of serverBookings) {
    if (!linkedBookingIds.has(String(b.id))) continue;
    const hasCd = !!((b as PropertyBooking & { contractData?: unknown }).contractData);
    if (!hasCd) continue;
    const cd = ((b as PropertyBooking & { contractData?: Record<string, unknown> }).contractData || {}) as Record<string, unknown>;
    out.push({
      id: `booking-contract-${String(b.id)}`,
      contractId: String((b as PropertyBooking & { contractId?: unknown }).contractId || b.id),
      bookingId: String(b.id),
      date: String(b.createdAt || ''),
      propertyId: Number(b.propertyId),
      propertyTitleAr: String(b.propertyTitleAr || ''),
      propertyTitleEn: String(b.propertyTitleEn || ''),
      unitKey: b.unitKey ? String(b.unitKey) : undefined,
      unitDisplay: String((b as PropertyBooking & { unitDisplay?: unknown }).unitDisplay || ''),
      landlordName: String(cd.landlordName || ''),
      startDate: String(cd.startDate || b.createdAt || ''),
      endDate: String(cd.endDate || b.createdAt || ''),
      status: (String((b as PropertyBooking & { contractStage?: unknown }).contractStage || '') === 'APPROVED' ? 'ACTIVE' : 'DRAFT') as ContactLinkedContract['status'],
      hasFinancialClaims: (serverDocuments || []).some((d) =>
        (String(d.contractId || '') === String((b as PropertyBooking & { contractId?: unknown }).contractId || b.id) ||
          String(d.bookingId || '') === String(b.id)) &&
        (d.status === 'PENDING' || d.status === 'DRAFT')
      ),
      role: 'tenant',
    });
  }
  return out;
}

/**
 * عقود المالك المستمدة من حجوزات الخادم (contractData) عندما لا تُنسَّخ بعد إلى localStorage.
 */
export function getLandlordContractsFromServerBookings(
  bookings: PropertyBooking[],
  ctx: LandlordMatchContext,
  ownerPortfolioSerials?: Set<string> | null
): ContactLinkedContract[] {
  const overrides = getPropertyDataOverrides();
  const out: ContactLinkedContract[] = [];
  for (const b of bookings) {
    const cdRaw = b.contractData;
    const byContact = contractDataMatchesLandlord(cdRaw as Record<string, unknown> | null | undefined, ctx);
    const byPortfolio =
      !!ownerPortfolioSerials &&
      bookingMatchesOwnerPropertyPortfolio(b as unknown as Record<string, unknown>, ownerPortfolioSerials);
    if (!byContact && !byPortfolio) continue;
    const cd = (cdRaw || {}) as RentalContract;
    const propertyId = Number(b.propertyId);
    if (!Number.isFinite(propertyId)) continue;
    const prop = getPropertyById(propertyId, overrides);
    const unitKey = b.unitKey;
    const unitPart = unitKey && prop ? getUnitDisplayFromProperty(prop, unitKey, true) : null;
    const titleAr = b.propertyTitleAr || prop?.titleAr || '';
    const titleEn = b.propertyTitleEn || prop?.titleEn || '';
    const unitDisplay = unitPart ? `${titleAr} - ${unitPart}` : titleAr;
    const stage = b.contractStage;
    let status: ContactLinkedContract['status'] = 'DRAFT';
    if (b.status === 'CANCELLED') status = 'CANCELLED';
    else if (stage === 'APPROVED' || cd.status === 'APPROVED') status = 'ACTIVE';
    else if (cd.startDate && cd.endDate && new Date(cd.endDate) < new Date()) status = 'ENDED';
    else if (cd.status === 'DRAFT' || !stage || stage === 'DRAFT') status = 'DRAFT';
    else status = 'ACTIVE';
    out.push({
      id: `booking-contract-${b.id}`,
      contractId: String(b.contractId || b.id),
      bookingId: String(b.id),
      date: b.createdAt,
      propertyId,
      propertyTitleAr: titleAr,
      propertyTitleEn: titleEn,
      unitKey,
      unitDisplay,
      landlordName: String(cd.landlordName || ''),
      startDate: String(cd.startDate || ''),
      endDate: String(cd.endDate || ''),
      status,
      hasFinancialClaims: false,
      role: 'landlord',
    });
  }
  return out;
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

/** مستندات توثيق مرتبطة بجهة الاتصال من حجوزات خادم جاهزة */
export function getContactLinkedBookingDocumentsFromServerBookings(
  contact: Contact,
  serverBookings: PropertyBooking[]
): Array<BookingDocument & { bookingDate?: string; propertyTitleAr?: string; propertyTitleEn?: string; unitDisplay?: string }> {
  const bookings = getContactLinkedBookingsFromServerBookings(contact, serverBookings);
  const result: Array<BookingDocument & { bookingDate?: string; propertyTitleAr?: string; propertyTitleEn?: string; unitDisplay?: string }> = [];
  for (const b of bookings) {
    const docs = getDocumentsByBooking(b.bookingId);
    for (const d of docs) {
      result.push({
        ...d,
        bookingDate: b.date,
        propertyTitleAr: b.propertyTitleAr,
        propertyTitleEn: b.propertyTitleEn,
        unitDisplay: b.unitDisplay,
      });
    }
  }
  return result.sort((a, b) => (b.uploadedAt || b.createdAt || '').localeCompare(a.uploadedAt || a.createdAt || ''));
}

export function deriveContactCategoriesFromLinks(
  linkedBookings: ContactLinkedBooking[],
  linkedContracts: ContactLinkedContract[]
): ContactCategory[] {
  const cats: ContactCategory[] = [];
  if (linkedBookings.length > 0) cats.push('CLIENT');
  if (linkedContracts.some((c) => c.role === 'tenant')) cats.push('TENANT');
  if (linkedContracts.some((c) => c.role === 'landlord')) cats.push('LANDLORD');
  return [...new Set(cats)];
}

/** التصنيفات المستمدة من نشاط الجهة (حجز = عميل، عقد كمستأجر = مستأجر، عقد كمالك = مالك) */
export function getContactDerivedCategories(contact: Contact): ContactCategory[] {
  return deriveContactCategoriesFromLinks(getContactLinkedBookings(contact), getContactLinkedContracts(contact));
}

/** تصنيفات مستمدة من بيانات خادم جاهزة */
export function getContactDerivedCategoriesFromServer(
  contact: Contact,
  serverBookings: PropertyBooking[],
  serverContracts: RentalContract[],
  serverDocuments?: AccountingDocument[],
  ownerPortfolioSerials?: Set<string> | null
): ContactCategory[] {
  const bookings = getContactLinkedBookingsFromServerBookings(contact, serverBookings, serverDocuments);
  const contracts = getContactLinkedContractsFromServer(
    contact,
    serverBookings,
    serverContracts,
    serverDocuments,
    ownerPortfolioSerials
  );
  return deriveContactCategoriesFromLinks(bookings, contracts);
}

/** @deprecated استخدم isContactLinkedFromServer مع بيانات الخادم */
export function isContactLinked(contact: Contact): { linked: boolean; bookings: number; contracts: number; documents: number } {
  return { linked: false, bookings: 0, contracts: 0, documents: 0 };
}

/** هل جهة الاتصال مرتبطة — من بيانات خادم جاهزة */
export function isContactLinkedFromServer(
  contact: Contact,
  serverBookings: PropertyBooking[],
  serverContracts: RentalContract[],
  serverDocuments?: AccountingDocument[],
  ownerPortfolioSerials?: Set<string> | null
): { linked: boolean; bookings: number; contracts: number; documents: number } {
  const bookings = getContactLinkedBookingsFromServerBookings(contact, serverBookings, serverDocuments);
  const contracts = getContactLinkedContractsFromServer(
    contact,
    serverBookings,
    serverContracts,
    serverDocuments,
    ownerPortfolioSerials
  );
  const docs = (serverDocuments || []).filter((d) => String(d.contactId || '') === String(contact.id));
  return {
    linked: bookings.length > 0 || contracts.length > 0 || docs.length > 0,
    bookings: bookings.length,
    contracts: contracts.length,
    documents: docs.length,
  };
}
