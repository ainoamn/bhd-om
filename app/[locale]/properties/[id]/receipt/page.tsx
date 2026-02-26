'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { searchDocuments } from '@/lib/data/accounting';
import { getAllBookings, getBookingDisplayName } from '@/lib/data/bookings';
import { getContactById } from '@/lib/data/addressBook';
import type { AccountingDocument } from '@/lib/data/accounting';
import type { Contact } from '@/lib/data/addressBook';
import InvoicePrint from '@/components/admin/InvoicePrint';
import PageHero from '@/components/shared/PageHero';

export default function PropertyReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const bookingId = searchParams?.get('booking') ?? '';
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [doc, setDoc] = useState<AccountingDocument | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactFallback, setContactFallback] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !bookingId) return;
    const docs = searchDocuments({ bookingId });
    const receipt = docs.find((d) => ['RECEIPT', 'DEPOSIT', 'PAYMENT'].includes(d.type)) || docs[0];
    if (receipt) {
      setDoc(receipt);
      const c = receipt.contactId ? getContactById(receipt.contactId) : null;
      setContact(c || null);
      if (!c) {
        const booking = getAllBookings().find((b) => b.id === bookingId);
        setContactFallback(booking ? `${getBookingDisplayName(booking, locale)}${booking.phone ? ` · ${booking.phone}` : ''}` : '');
      } else {
        setContactFallback('');
      }
    }
    setLoaded(true);
  }, [mounted, bookingId]);

  if (!mounted) return null;

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">📄</div>
          <p className="text-white/80 mb-6 text-lg">{ar ? 'لم يُحدد رقم الحجز' : 'Booking ID not specified'}</p>
          <Link href={`/${locale}/properties/${id}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
            {ar ? 'العودة للعقار' : 'Back to Property'}
          </Link>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12">
          <div className="animate-spin w-12 h-12 border-2 border-[#8B6F47] border-t-transparent rounded-full mx-auto mb-6" />
          <p className="text-white/70">{ar ? 'جاري تحميل الإيصال...' : 'Loading receipt...'}</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">🔍</div>
          <p className="text-white/80 mb-6 text-lg">{ar ? 'لم يُعثر على إيصال لهذا الحجز' : 'No receipt found for this booking'}</p>
          <Link href={`/${locale}/properties/${id}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
            {ar ? 'العودة للعقار' : 'Back to Property'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHero
        title={ar ? 'إيصال استلام الدفع' : 'Payment Receipt'}
        subtitle={ar ? `رقم الإيصال: ${doc.serialNumber}` : `Receipt #${doc.serialNumber}`}
        compact
      />
      <section className="relative py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Link
              href={`/${locale}/properties/${id}`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>{ar ? 'العودة لصفحة العقار' : 'Back to property'}</span>
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden bg-white shadow-2xl">
            <InvoicePrint
              doc={doc}
              contact={contact}
              contactDisplayFallback={contactFallback || undefined}
              locale={locale}
              adminOnlyOptions={false}
            />
          </div>
          <p className="mt-6 text-center text-white/60 text-sm">
            {ar
              ? 'يمكنك طباعة الإيصال أو تنزيله كـ PDF باستخدام الأزرار أعلاه. الإيصال مُصمم وفق النماذج المُعدّة في إعدادات الوثائق.'
              : 'You can print the receipt or download it as PDF using the buttons above. The receipt follows the templates configured in document settings.'}
          </p>
        </div>
      </section>
    </div>
  );
}
