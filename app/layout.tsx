import type { ReactNode } from 'react';
import SetLocaleAttributes from '@/components/SetLocaleAttributes';

/**
 * Root layout - مطلوب من Next.js ويجب أن يحتوي على html و body
 */
type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <SetLocaleAttributes />
        {children}
      </body>
    </html>
  );
}
