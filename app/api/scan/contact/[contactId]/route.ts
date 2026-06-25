import { NextResponse } from 'next/server';
import type { Contact } from '@/lib/data/addressBook';
import { getContactDisplayName, isCompanyContact } from '@/lib/data/addressBook';
import { prisma } from '@/lib/prisma';
import { withAddressBookSchemaHeal } from '@/lib/server/addressBookDbCompat';

/** API عامة لعرض بيانات جهة الاتصال عند مسح الباركود — لا تتطلب تسجيل دخول */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });

    const row = await withAddressBookSchemaHeal(prisma, () =>
      prisma.addressBookContact.findFirst({
        where: { OR: [{ contactId }, { id: contactId }] },
      })
    );

    if (!row) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const contact = row.data as unknown as Contact;
    if (!contact || typeof contact !== 'object') {
      return NextResponse.json({ error: 'Invalid contact data' }, { status: 404 });
    }
    if (contact.archived) {
      return NextResponse.json({ error: 'Contact archived' }, { status: 404 });
    }

    const linkedUserId = row.linkedUserId || contact.userId || contact.linkedUserId || null;
    let userSerial: string | null = null;
    if (linkedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: linkedUserId },
        select: { serialNumber: true },
      });
      userSerial = user?.serialNumber || null;
    }

    const isCompany = isCompanyContact(contact);
    const safeEmail = contact.email?.includes('@nologin.bhd') ? null : contact.email || null;

    return NextResponse.json({
      id: contact.id,
      serialNumber: userSerial || contact.serialNumber || null,
      nameAr: getContactDisplayName(contact, 'ar'),
      nameEn: getContactDisplayName(contact, 'en'),
      contactType: contact.contactType || 'PERSONAL',
      category: contact.category,
      phone: contact.phone || null,
      phoneSecondary: contact.phoneSecondary || null,
      email: safeEmail,
      nationality: contact.nationality || null,
      civilId: contact.civilId || null,
      commercialRegistrationNumber: isCompany
        ? contact.companyData?.commercialRegistrationNumber || null
        : null,
      linkedUserId,
      createdAt: contact.createdAt || row.createdAt?.toISOString?.() || null,
    });
  } catch (e) {
    console.error('Scan contact API error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
