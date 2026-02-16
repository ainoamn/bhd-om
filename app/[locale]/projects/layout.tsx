import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Footer from '@/components/Footer';

export default async function ProjectsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const { locale } = resolvedParams;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <Footer locale={locale} />
    </NextIntlClientProvider>
  );
}
