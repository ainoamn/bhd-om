/**
 * إضافة طلبات مستندات الهوية (نفس منطق صفحة الحجز) للحجوزات المخزّنة مسبقاً
 * دون حذف أو استبدال ما وُجد — يعتمد على addMissingDocumentRequests.
 */

import type { PropertyBooking } from '@/lib/data/bookings';
import { isCompanyBooking } from '@/lib/data/bookings';
import { addMissingDocumentRequests, getDocumentsByBooking } from '@/lib/data/bookingDocuments';
import { getPreBookingIdentityRequirementsPersonal, buildCompanyDocRequirementsFromTerms } from '@/lib/data/bookingTerms';
import { getContactById, findContactByPhoneOrEmail, isOmaniNationality, type Contact } from '@/lib/data/addressBook';

function inferPersonalOmani(b: PropertyBooking, contact: Contact | null | undefined): boolean {
  if (contact?.nationality?.trim()) return isOmaniNationality(contact.nationality);
  const c = (b.civilId || '').trim();
  const p = (b.passportNumber || '').trim();
  if (p && !c) return false;
  if (c && !p) return true;
  if (c && p) return false;
  return true;
}

function companyContactFromBooking(b: PropertyBooking): Contact | null {
  if (!isCompanyBooking(b) || !b.companyData?.companyNameAr || !(b.companyData.authorizedRepresentatives?.length ?? 0)) {
    return null;
  }
  return {
    id: b.contactId || 'migrate-temp',
    contactType: 'COMPANY',
    firstName: b.companyData.companyNameAr,
    familyName: '',
    nationality: '',
    gender: 'MALE',
    phone: b.phone,
    email: b.email,
    category: 'CLIENT',
    companyData: b.companyData,
    address: { fullAddress: '—', fullAddressEn: '—' },
  } as Contact;
}

export function migrateLegacyBookingIdentityDocumentsForBookings(bookings: PropertyBooking[]): {
  processed: number;
  bookingsUpdated: number;
  documentsAdded: number;
} {
  if (typeof window === 'undefined') {
    return { processed: 0, bookingsUpdated: 0, documentsAdded: 0 };
  }

  let processed = 0;
  let bookingsUpdated = 0;
  let documentsAdded = 0;

  for (const b of bookings) {
    if (b.type !== 'BOOKING' || b.status === 'CANCELLED') continue;
    processed++;

    const beforeCount = getDocumentsByBooking(b.id).length;

    let requirements: { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[] = [];

    const companyC = companyContactFromBooking(b);
    if (companyC) {
      requirements = buildCompanyDocRequirementsFromTerms(companyC).map((r) => ({
        docTypeId: r.docTypeId,
        labelAr: r.labelAr ?? '',
        labelEn: r.labelEn ?? '',
        isRequired: r.isRequired,
      }));
    } else {
      const contact = b.contactId ? getContactById(b.contactId) : findContactByPhoneOrEmail(b.phone, b.email);
      const omani = inferPersonalOmani(b, contact ?? undefined);
      requirements = getPreBookingIdentityRequirementsPersonal(omani).map((r) => ({
        docTypeId: r.docTypeId,
        labelAr: r.labelAr ?? '',
        labelEn: r.labelEn ?? '',
        isRequired: r.isRequired,
      }));
    }

    if (requirements.length === 0) continue;

    addMissingDocumentRequests(b.id, b.propertyId, requirements);

    const afterCount = getDocumentsByBooking(b.id).length;
    if (afterCount > beforeCount) {
      bookingsUpdated++;
      documentsAdded += afterCount - beforeCount;
    }
  }

  return { processed, bookingsUpdated, documentsAdded };
}
