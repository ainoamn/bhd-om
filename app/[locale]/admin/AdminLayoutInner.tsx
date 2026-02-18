'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { siteConfig } from '@/config/site';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import './admin.css';

/** قراءة tab و action من الرابط - useSearchParams يتفاعل مع تغيير query string */
function useAccountingTab() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') || 'dashboard';
  const action = searchParams?.get('action') || null;
  return { tab, action };
}

type NavItem = {
  href: string;
  labelKey: string;
  icon: keyof typeof import('@/lib/icons').icons;
  comingSoon?: boolean;
};
type NavItemWithSub = { groupKey: string; subItems: NavItem[] };
type ContentItem = NavItem | NavItemWithSub;
const isSubGroup = (x: ContentItem): x is NavItemWithSub => 'subItems' in x;

const accountingSubItems: (NavItem & { isHeader?: boolean })[] = [
  { href: '/admin/accounting?tab=dashboard', labelKey: 'accountingHome', icon: 'dashboard' as const },
  { href: '/admin/accounting?tab=sales', labelKey: 'accountingSales', icon: 'archive' as const },
  { href: '/admin/accounting?tab=purchases', labelKey: 'accountingPurchases', icon: 'archive' as const },
  { href: '/admin/accounting?tab=journal', labelKey: 'accountingJournal', icon: 'documentText' as const },
  { href: '/admin/accounting?tab=documents', labelKey: 'accountingDocuments', icon: 'archive' as const },
  { href: '/admin/accounting?tab=accounts', labelKey: 'accountingAccounts', icon: 'archive' as const },
  { href: '/admin/accounting?tab=reports', labelKey: 'accountingReports', icon: 'chartBar' as const },
  { href: '/admin/accounting?tab=claims', labelKey: 'accountingClaims', icon: 'inbox' as const },
  { href: '/admin/accounting?tab=cheques', labelKey: 'accountingCheques', icon: 'archive' as const },
  { href: '/admin/accounting?tab=payments', labelKey: 'accountingPayments', icon: 'archive' as const },
  { href: '/admin/accounting?tab=periods', labelKey: 'accountingPeriods', icon: 'calendar' as const },
  { href: '/admin/accounting?tab=audit', labelKey: 'accountingAudit', icon: 'shieldCheck' as const },
  { href: '/admin/accounting?tab=settings', labelKey: 'accountingSettings', icon: 'cog' as const },
  { href: '#', labelKey: 'accountingQuickActions', icon: 'cog' as const, isHeader: true },
  { href: '/admin/accounting?tab=journal&action=add', labelKey: 'accountingAddJournal', icon: 'documentText' as const },
  { href: '/admin/accounting?tab=accounts&action=add', labelKey: 'accountingAddAccount', icon: 'plus' as const },
  { href: '/admin/accounting?tab=documents&action=add', labelKey: 'accountingAddDocument', icon: 'plus' as const },
  { href: '/admin/accounting?tab=cheques&action=add', labelKey: 'accountingAddCheque', icon: 'plus' as const },
];

const navGroupsConfig = [
  { groupKey: 'general', items: [
    { groupKey: 'dashboard', subItems: [
      { href: '/admin/address-book', labelKey: 'addressBook', icon: 'users' as const },
      { href: '/admin/bank-details', labelKey: 'bankDetails', icon: 'archive' as const },
      { href: '/admin/company-data', labelKey: 'companyData', icon: 'building' as const },
      { href: '/admin/document-templates', labelKey: 'documentTemplates', icon: 'documentText' as const },
      { href: '/admin/site', labelKey: 'site', icon: 'globe' as const },
    ]},
    { groupKey: 'accounting', subItems: accountingSubItems },
  ] as ContentItem[]},
  { groupKey: 'content', items: [
    { groupKey: 'properties', subItems: [
      { href: '/admin/properties', labelKey: 'propertiesManage', icon: 'building' as const },
      { href: '/admin/bookings', labelKey: 'bookingsManage', icon: 'calendar' as const },
      { href: '/admin/contracts', labelKey: 'contractsManage', icon: 'archive' as const, comingSoon: true },
      { href: '/admin/maintenance', labelKey: 'maintenanceManage', icon: 'wrench' as const, comingSoon: true },
      { href: '/admin/data', labelKey: 'dataManage', icon: 'database' as const, comingSoon: true },
    ]},
    { href: '/admin/projects', labelKey: 'projects', icon: 'projects' as const },
    { href: '/admin/services', labelKey: 'services', icon: 'cog' as const },
  ] as ContentItem[]},
  { groupKey: 'communication', items: [
    { href: '/admin/contact', labelKey: 'contact', icon: 'mail' as const },
    { href: '/admin/submissions', labelKey: 'submissions', icon: 'inbox' as const },
  ]},
  { groupKey: 'system', items: [
    { href: '/admin/users', labelKey: 'users', icon: 'users' as const },
    { href: '/admin/serial-history', labelKey: 'serialHistory', icon: 'archive' as const },
    { href: '/admin/backup', labelKey: 'backup', icon: 'database' as const },
  ]},
];

export default function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { tab: currentTab, action: currentAction } = useAccountingTab();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('admin.nav');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((o) => !o);
  const toggleCollapse = () => {
    setSidebarCollapsed((c) => !c);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin-sidebar-collapsed', String(!sidebarCollapsed));
      } catch {}
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('admin-sidebar-collapsed');
        if (stored === 'true') setSidebarCollapsed(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (pathname?.includes('/admin/address-book') || pathname?.includes('/admin/bank-details') || pathname?.includes('/admin/company-data') || pathname?.includes('/admin/document-templates') || pathname?.includes('/admin/site')) {
      setDashboardOpen(true);
    }
    if (pathname?.includes('/admin/accounting')) setAccountingOpen(true);
  }, [pathname]);

  return (
    <div className={`admin-root ${sidebarCollapsed ? 'admin-root--sidebar-collapsed' : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={closeSidebar}
          aria-label={t('closeMenu')}
        />
      )}
      <aside className={`admin-sidebar ${!sidebarOpen ? 'admin-sidebar--closed' : ''} ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`} data-collapsed={sidebarCollapsed}>
        <div className="admin-sidebar-brand">
          <Link href={`/${locale}/admin`} className="admin-sidebar-brand-link" title={locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}>
            <div className="admin-sidebar-logo">
              <Image
                src="/logo-bhd.png"
                alt={siteConfig.company.nameAr}
                width={32}
                height={32}
                className="object-contain opacity-90"
                style={{ filter: 'sepia(30%) saturate(200%) hue-rotate(-10deg)' }}
              />
            </div>
            <div className="admin-sidebar-brand-text">
              <h1 className="admin-sidebar-title">{locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}</h1>
              <p className="admin-sidebar-subtitle">{t('adminPanel')}</p>
            </div>
          </Link>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center gap-2">
              <LanguageSwitcher currentLocale={locale} />
            </div>
          )}
        </div>

        <nav className="admin-nav" aria-label="Main navigation">
          {navGroupsConfig.map((group) => (
            <div key={group.groupKey} className="admin-nav-group">
              <span className="admin-nav-group-label">{t(`groups.${group.groupKey}`)}</span>
              <ul className="admin-nav-list" role="list">
                {group.items.map((item) => {
                  if (isSubGroup(item)) {
                    const subHrefs = item.groupKey === 'accounting'
                      ? ['/admin/accounting']
                      : item.subItems.map((s) => (s as NavItem).href).filter((h) => h && !h.startsWith('#'));
                    const isGroupActive = item.groupKey === 'accounting'
                      ? pathname?.includes('/admin/accounting')
                      : subHrefs.some((h) => pathname === `/${locale}${h}` || (pathname.startsWith(`/${locale}${h}`) && h !== '/admin'));
                    const isDashboard = item.groupKey === 'dashboard';
                    const isAccounting = item.groupKey === 'accounting';
                    const subOpen = isDashboard ? dashboardOpen : isAccounting ? accountingOpen : propertiesOpen;
                    const toggleOpen = () => {
                      if (isDashboard) setDashboardOpen((o) => !o);
                      else if (isAccounting) setAccountingOpen((o) => !o);
                      else setPropertiesOpen((o) => !o);
                    };
                    const groupIcon = isDashboard ? 'dashboard' : isAccounting ? 'archive' : 'building';
                    return (
                      <li key={item.groupKey} className="admin-nav-dropdown">
                        <button
                          type="button"
                          onClick={() => {
                          if (sidebarCollapsed) {
                            setSidebarCollapsed(false);
                            if (!subOpen) {
                              if (isDashboard) setDashboardOpen(true);
                              else if (isAccounting) setAccountingOpen(true);
                              else setPropertiesOpen(true);
                            }
                          } else {
                            toggleOpen();
                          }
                        }}
                          className={`admin-nav-link admin-nav-link--dropdown w-full justify-between ${subOpen ? 'admin-nav-dropdown--open' : ''} ${isGroupActive ? 'admin-nav-link--active' : ''}`}
                          title={sidebarCollapsed ? t(item.groupKey) : undefined}
                          aria-expanded={subOpen}
                        >
                          <span className="flex items-center gap-3">
                            <Icon name={groupIcon} className="admin-nav-icon" aria-hidden />
                            <span className="admin-nav-link-text">{t(item.groupKey)}</span>
                          </span>
                          {!sidebarCollapsed && (
                            <Icon name={locale === 'ar' ? 'chevronLeft' : 'chevronRight'} className={`admin-nav-icon transition-transform ${subOpen ? 'rotate-90' : ''}`} aria-hidden />
                          )}
                        </button>
                        {subOpen && !sidebarCollapsed && (
                          <ul className={`admin-nav-sublist ${isAccounting ? 'pr-4' : ''}`} role="list">
                            {item.subItems.map((sub) => {
                              const subItem = sub as NavItem & { isHeader?: boolean };
                              if (subItem.isHeader) {
                                return (
                                  <li key={subItem.labelKey} className="mt-3 pt-2 border-t border-gray-100 first:mt-0 first:pt-0 first:border-0">
                                    <span className="px-4 py-1.5 text-xs font-semibold text-gray-500">{t(subItem.labelKey)}</span>
                                  </li>
                                );
                              }
                              if (isAccounting) {
                                const accHref = subItem.href.startsWith('/') ? subItem.href : `/admin/accounting?tab=${subItem.href}`;
                                const fullHref = `/${locale}${accHref}`;
                                const accParams = new URLSearchParams(accHref.split('?')[1] || '');
                                const itemTab = accParams.get('tab');
                                const itemAction = accParams.get('action');
                                const isActive = pathname?.includes('/admin/accounting') && currentTab === itemTab && (!itemAction || currentAction === itemAction);
                                return (
                                  <li key={subItem.href}>
                                    <Link
                                      href={fullHref}
                                      className={`admin-nav-sublink ${isActive ? 'admin-nav-sublink--active' : ''}`}
                                      aria-current={isActive ? 'page' : undefined}
                                      onClick={closeSidebar}
                                      title={sidebarCollapsed ? t(subItem.labelKey) : undefined}
                                    >
                                      <Icon name={subItem.icon} className="admin-nav-icon" aria-hidden />
                                      <span>{t(subItem.labelKey)}</span>
                                    </Link>
                                  </li>
                                );
                              }
                              const isActive = pathname === `/${locale}${subItem.href}` || (pathname.startsWith(`/${locale}${subItem.href}`) && subItem.href !== '/admin');
                              return (
                                <li key={subItem.href}>
                                  <Link
                                    href={`/${locale}${subItem.href}`}
                                    className={`admin-nav-sublink ${isActive ? 'admin-nav-sublink--active' : ''} ${subItem.comingSoon ? 'opacity-75' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={closeSidebar}
                                    title={sidebarCollapsed ? t(subItem.labelKey) : undefined}
                                  >
                                    <Icon name={subItem.icon} className="admin-nav-icon" aria-hidden />
                                    <span>{t(subItem.labelKey)}</span>
                                    {subItem.comingSoon && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{locale === 'ar' ? 'قريباً' : 'Soon'}</span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }
                  const navItem = item as NavItem;
                  const isActive =
                    pathname === `/${locale}${navItem.href}` ||
                    (navItem.href === '/admin' && pathname === `/${locale}/admin`);
                  return (
                    <li key={navItem.href}>
                      <Link
                        href={`/${locale}${navItem.href}`}
                        className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={closeSidebar}
                        title={sidebarCollapsed ? t(navItem.labelKey) : undefined}
                      >
                        <Icon name={navItem.icon} className="admin-nav-icon" aria-hidden />
                        <span className="admin-nav-link-text">{t(navItem.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={toggleCollapse}
            className="admin-nav-link admin-nav-link--collapse w-full justify-center hidden lg:flex"
            title={sidebarCollapsed ? (locale === 'ar' ? 'توسيع القائمة' : 'Expand sidebar') : (locale === 'ar' ? 'طي القائمة' : 'Collapse sidebar')}
            aria-label={sidebarCollapsed ? (locale === 'ar' ? 'توسيع القائمة' : 'Expand sidebar') : (locale === 'ar' ? 'طي القائمة' : 'Collapse sidebar')}
          >
            <Icon name={locale === 'ar' ? (sidebarCollapsed ? 'chevronLeft' : 'chevronRight') : (sidebarCollapsed ? 'chevronRight' : 'chevronLeft')} className="admin-nav-icon" aria-hidden />
            <span className="admin-nav-link-text">{sidebarCollapsed ? (locale === 'ar' ? 'توسيع' : 'Expand') : (locale === 'ar' ? 'طي' : 'Collapse')}</span>
          </button>
          <Link
            href={`/${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-nav-link admin-nav-link--external"
            title={t('viewSite')}
          >
            <Icon name="externalLink" className="admin-nav-icon" aria-hidden />
            <span className="admin-nav-link-text">{t('viewSite')}</span>
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-mobile-header">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label={t('openMenu')}
          >
            <Icon name="menu" className="w-6 h-6 text-gray-700" aria-hidden />
          </button>
          <span className="font-semibold text-gray-900 truncate">
            {locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}
          </span>
          <div className="w-10" aria-hidden />
        </header>
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  );
}
