import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LayoutWrapper from '@/components/LayoutWrapper';
import Analytics from '@/components/Analytics';
import { WebVitals } from '@/components/WebVitals';
import { PageViewTracker } from '@/components/PageViewTracker';
import { OrganizationJsonLd } from '@/components/JsonLd';
import PropertyStorageMigration from '@/components/PropertyStorageMigration';
import { Cairo, Inter } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'بن حمود للتطوير | BIN HAMOOD DEVELOPMENT SPC',
  description: 'شركة متخصصة في التطوير العقاري والاستثمار في سلطنة عمان',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params?: Promise<{ locale: string }> | { locale: string };
}) {
  const resolvedParams = params != null
    ? (params instanceof Promise ? await params : params)
    : { locale: routing.defaultLocale };
  const { locale } = resolvedParams;

  if (!locale || !routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${locale === 'ar' ? cairo.variable : inter.variable} font-sans antialiased`}>
      <OrganizationJsonLd />
      <PropertyStorageMigration />
      <Analytics />
      <WebVitals />
      <PageViewTracker />
      <NextIntlClientProvider messages={messages}>
        <LayoutWrapper header={<Header locale={locale} />} footer={<Footer locale={locale} />}>
          {children}
        </LayoutWrapper>
      </NextIntlClientProvider>
    </div>
  );
}
