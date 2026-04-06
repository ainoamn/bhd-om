'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LayoutWrapper from '@/components/LayoutWrapper';
import { UserBarContext } from '@/components/UserBarContext';

/**
 * لا يُعرض شريط المستخدم الذهبي العلوي — كان يُزيح التخطيط ويُخفي الشريط عند التمرير.
 * لوحة التحكم تستخدم الشريط الجانبي فقط؛ الرأس العام يبقى top-0 دون إزاحة.
 */
export default function SessionAwareLayout({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <UserBarContext.Provider value={{ hasUserBar: false, barVisible: false, setBarVisible: () => {} }}>
      <LayoutWrapper header={<Header locale={locale} hasUserBar={false} />} footer={<Footer locale={locale} />}>
        {children}
      </LayoutWrapper>
    </UserBarContext.Provider>
  );
}
