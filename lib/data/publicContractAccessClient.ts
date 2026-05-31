import type { PropertyBooking } from '@/lib/data/bookings';
import { mergeBookingsFromServer } from '@/lib/data/bookings';
import type { BookingDocument } from '@/lib/data/bookingDocuments';
import { applyDocumentsSnapshot } from '@/lib/data/bookingDocuments';
import type { BookingCheckEntry } from '@/lib/data/bookingChecks';
import { applyChecksSnapshot } from '@/lib/data/bookingChecks';

export type PublicContractBundle = {
  bookings: PropertyBooking[];
  documents: BookingDocument[];
  checks: BookingCheckEntry[];
};

export async function fetchPublicContractBundle(opts: {
  propertyId?: number;
  bookingId?: string;
  email?: string;
  phone?: string;
  civilId?: string;
}): Promise<PublicContractBundle> {
  if (typeof window === 'undefined') return { bookings: [], documents: [], checks: [] };
  const qs = new URLSearchParams();
  if (opts.propertyId != null) qs.set('propertyId', String(opts.propertyId));
  if (opts.bookingId) qs.set('bookingId', opts.bookingId);
  if (opts.email) qs.set('email', opts.email);
  if (opts.phone) qs.set('phone', opts.phone);
  if (opts.civilId) qs.set('civilId', opts.civilId);
  try {
    const res = await fetch(`/api/bookings/public-contract-access?${qs.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { bookings: [], documents: [], checks: [] };
    const data = (await res.json()) as PublicContractBundle;
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    const documents = Array.isArray(data.documents) ? data.documents : [];
    const checks = Array.isArray(data.checks) ? data.checks : [];
    if (bookings.length > 0) mergeBookingsFromServer(bookings);
    if (documents.length > 0) applyDocumentsSnapshot(documents);
    const checksBookingId = opts.bookingId || bookings[0]?.id;
    if (checks.length > 0 && checksBookingId) applyChecksSnapshot(checksBookingId, checks);
    return { bookings, documents, checks };
  } catch {
    return { bookings: [], documents: [], checks: [] };
  }
}

export async function patchPublicContractAccess(body: {
  action: 'syncDocuments' | 'saveChecks' | 'updateBooking' | 'syncContact';
  bookingId: string;
  email?: string;
  phone?: string;
  civilId?: string;
  contactId?: string;
  documents?: BookingDocument[];
  checks?: BookingCheckEntry[];
  updates?: Partial<PropertyBooking>;
  contact?: Record<string, unknown>;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/bookings/public-contract-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    if (body.action === 'updateBooking') {
      const data = (await res.json()) as { booking?: PropertyBooking };
      if (data.booking) mergeBookingsFromServer([data.booking]);
    }
    return true;
  } catch {
    return false;
  }
}

export async function persistPublicContractContact(opts: {
  bookingId: string;
  email?: string;
  phone?: string;
  civilId?: string;
  contactId: string;
  contact: Record<string, unknown>;
}): Promise<Record<string, unknown> | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/bookings/public-contract-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncContact',
        bookingId: opts.bookingId,
        email: opts.email,
        phone: opts.phone,
        civilId: opts.civilId,
        contactId: opts.contactId,
        contact: opts.contact,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { contact?: Record<string, unknown> };
    return data.contact ?? null;
  } catch {
    return null;
  }
}

export async function persistPublicDocumentUpload(opts: {
  bookingId: string;
  email: string;
  docId: string;
  fileUrl: string;
  fileName: string;
  action: 'upload' | 'replace';
  oldFileUrl?: string;
}): Promise<BookingDocument | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/bookings/public-upload-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: opts.action,
        bookingId: opts.bookingId,
        email: opts.email.trim(),
        docId: opts.docId,
        fileUrl: opts.fileUrl,
        fileName: opts.fileName,
        ...(opts.oldFileUrl ? { oldFileUrl: opts.oldFileUrl } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { document?: BookingDocument };
    if (data.document) applyDocumentsSnapshot([data.document]);
    return data.document ?? null;
  } catch {
    return null;
  }
}
