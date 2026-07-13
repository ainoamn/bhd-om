'use client';

import Link from 'next/link';
import type { RealEstateDashboardStats } from '@/lib/real-estate/dashboardStats';

const LEGACY_BASE = '/api/admin/legacy-real-estate/bhd-real-estate.html';

type Props = {
  locale: string;
  stats: RealEstateDashboardStats | null;
};

type HubItem = {
  titleAr: string;
  titleEn: string;
  href: string;
  badge?: number;
  external?: boolean;
};

export default function RealEstateModuleHub({ locale, stats }: Props) {
  const ar = locale === 'ar';
  const badges = stats?.moduleBadges;

  const items: HubItem[] = [
    {
      titleAr: 'العقود',
      titleEn: 'Contracts',
      href: `/${locale}/admin/real-estate-contracts`,
    },
    {
      titleAr: 'الحجوزات',
      titleEn: 'Reservations',
      href: `${LEGACY_BASE}?mode=reservations&locale=${locale}`,
      external: true,
    },
    {
      titleAr: 'المحاسبة',
      titleEn: 'Accounting',
      href: `/${locale}/admin/accounting`,
      badge: badges?.accountingPending,
    },
    {
      titleAr: 'الصيانة',
      titleEn: 'Maintenance',
      href: `${LEGACY_BASE}?mode=maintenance&locale=${locale}`,
      badge: badges?.maintenanceOpen,
      external: true,
    },
    {
      titleAr: 'المهام',
      titleEn: 'Tasks',
      href: `${LEGACY_BASE}?mode=dashboard&locale=${locale}`,
      badge: badges?.tasksOpen,
      external: true,
    },
    {
      titleAr: 'دفتر العناوين',
      titleEn: 'Address book',
      href: `/${locale}/admin/address-book`,
    },
    {
      titleAr: 'النظام الكامل (legacy)',
      titleEn: 'Full system (legacy)',
      href: `${LEGACY_BASE}?locale=${locale}`,
      external: true,
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 opacity-80">{ar ? 'الوحدات التشغيلية' : 'Operations'}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const className =
            'admin-card block p-4 hover:shadow-md transition-shadow border border-[var(--admin-border)] rounded-xl';
          const content = (
            <>
              <div className="font-semibold text-sm">
                {ar ? item.titleAr : item.titleEn}
                {item.badge != null && item.badge > 0 ? (
                  <span className="ms-2 inline-flex min-w-[1.25rem] justify-center rounded-full bg-[#8B0000] px-1.5 py-0.5 text-[10px] text-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </>
          );
          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            );
          }
          return (
            <Link key={item.href} href={item.href} prefetch className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
