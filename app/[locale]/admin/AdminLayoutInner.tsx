'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import RoleBasedSidebar from '@/components/admin/RoleBasedSidebar';
import { getContactForUser } from '@/lib/data/addressBook';
import { ALL_DASHBOARD_TYPES } from '@/lib/config/dashboardRoles';
import { getAdminNavGroupsConfig } from '@/lib/config/adminNav';
import { siteConfig } from '@/config/site';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import DraftBanner from '@/components/admin/DraftBanner';
import { useUserBar } from '@/components/UserBarContext';
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

/** القائمة الجانبية للأدمن - مُستمد من السجل المركزي (adminNav)، الصفحات الجديدة تُضاف تلقائياً */
const navGroupsConfig = getAdminNavGroupsConfig() as { groupKey: string; items: ContentItem[] }[];

/** جلسة الانتحال من localStorage — مصدر واحد للحقيقة عند "فتح حساب" لئلا تظهر بيانات الأدمن */
function getImpersonationSessionFromStorage(): { user: { id: string; name?: string; email?: string; phone?: string; role: string; serialNumber?: string } } | null {
  if (typeof window === 'undefined') return null;
  try {
    const us = localStorage.getItem('userSession');
    if (!us) return null;
    const p = JSON.parse(us) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; phone?: string; role?: string; serialNumber?: string };
    if (!p.loginAsUser || !p.id) return null;
    return {
      user: {
        id: p.id,
        name: p.name ?? undefined,
        email: p.email ?? undefined,
        phone: p.phone ?? undefined,
        role: p.role || 'CLIENT',
        serialNumber: p.serialNumber ?? undefined,
      },
    };
  } catch {
    return null;
  }
}

export default function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session, status } = useSession();

  // مصدر واحد: عند وجود "فتح حساب" في localStorage نعتمدها فقط — لا نعرض أبداً بيانات الأدمن أو قائمة الأدمن
  const impersonationSession = getImpersonationSessionFromStorage();
  const isImpersonating = !!impersonationSession;

  // آخر جلسة معروفة (للحالات غير الانتحال). لا نمسحها فوراً عند unauthenticated —
  // NextAuth قد يعرض unauthenticated لحظياً أثناء إعادة الجلب (مثلاً بعد التركيز أو التحديث).
  const lastKnownSessionRef = useRef<typeof session>(null);
  /** في المتصفح يعيد setTimeout رقم المعرف؛ تجنب تعارض أنواع Node/DOM */
  const clearStaleSessionTimeoutRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);

  if (session?.user) {
    lastKnownSessionRef.current = session;
    if (typeof window !== 'undefined' && clearStaleSessionTimeoutRef.current) {
      window.clearTimeout(clearStaleSessionTimeoutRef.current);
      clearStaleSessionTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status === 'authenticated' && session?.user) signingOutRef.current = false;
  }, [status, session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'unauthenticated') return;
    if (signingOutRef.current) {
      lastKnownSessionRef.current = null;
      return;
    }
    // عند unauthenticated قد يضيّق TypeScript نوع الجلسة؛ نتحقق بشكل صريح
    if (session && typeof session === 'object' && 'user' in session && (session as { user?: unknown }).user) return;
    if (clearStaleSessionTimeoutRef.current) window.clearTimeout(clearStaleSessionTimeoutRef.current);
    clearStaleSessionTimeoutRef.current = window.setTimeout(() => {
      lastKnownSessionRef.current = null;
      clearStaleSessionTimeoutRef.current = null;
    }, 750) as number;
    return () => {
      if (clearStaleSessionTimeoutRef.current) {
        window.clearTimeout(clearStaleSessionTimeoutRef.current);
        clearStaleSessionTimeoutRef.current = null;
      }
    };
  }, [status, session]);

  const mockSession = typeof window !== 'undefined' ? (window as any)?.mockNextAuthSession : undefined;
  const fallbackSession = mockSession || session || lastKnownSessionRef.current;

  // الجلسة الفعالة: إن كنا في وضع "فتح حساب" نعتمد localStorage فقط؛ وإلا الجلسة العادية
  const currentSession = isImpersonating ? impersonationSession : fallbackSession;

  const { tab: currentTab, action: currentAction } = useAccountingTab();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('admin.nav');
  const { hasUserBar } = useUserBar();
  const userRole = (currentSession?.user as { role?: string })?.role as 'ADMIN' | 'CLIENT' | 'OWNER' | undefined;
  const isNonAdmin = userRole === 'CLIENT' || userRole === 'OWNER';
  const isAdminConfirmed = !isImpersonating && status === 'authenticated' && userRole === 'ADMIN';
  const userName = (currentSession?.user as { name?: string })?.name || (currentSession?.user as { serialNumber?: string })?.serialNumber || (currentSession?.user as { email?: string })?.email || (currentSession?.user as { phone?: string })?.phone || '—';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
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
    if (typeof window === 'undefined') return;
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
    if (pathname?.includes('/admin/projects')) setProjectsOpen(true);
  }, [pathname]);

  const router = useRouter();
  const allowedPathsForNonAdmin = [
    '/admin',
    '/admin/my-bookings',
    '/admin/my-contracts',
    '/admin/my-invoices',
    '/admin/my-receipts',
    '/admin/my-properties',
    '/admin/notifications',
    '/admin/my-account',
    '/admin/address-book',
    '/admin/bank-details',
    '/admin/company-data',
    '/admin/document-templates',
    '/admin/site',
    '/admin/accounting',
    '/admin/properties',
    '/admin/bookings',
    '/admin/contracts',
    '/admin/maintenance',
    '/admin/data',
    '/admin/projects',
    '/admin/services',
    '/admin/contact',
    '/admin/submissions',
    '/admin/backup',
  ];
  useEffect(() => {
    const isLoginAsUser = (window as any)?.isLoginAsUser;
    const mockSession = (window as any)?.mockNextAuthSession;
    const currentUser = (window as any)?.currentUser;

    if (isLoginAsUser && (mockSession || currentUser)) return;
    if (status !== 'authenticated' || !isNonAdmin || !pathname) return;
    const base = (pathname || '').replace(/^\/[a-z]{2}/, '') || pathname;
    const isAllowed = allowedPathsForNonAdmin.some((p) => base === p || base.startsWith(p + '/') || base.startsWith(p + '?'));
    if (!isAllowed) {
      router.replace(`/${locale}/admin`);
    }
  }, [status, isNonAdmin, pathname, locale, router]);

  const effectiveRole = userRole && (userRole === 'ADMIN' || userRole === 'CLIENT' || userRole === 'OWNER') ? userRole : 'CLIENT';

  const contactDashboardType = useMemo(() => {
    if (!currentSession?.user || effectiveRole === 'ADMIN') return undefined;
    const explicit = (currentSession.user as { dashboardType?: string | null }).dashboardType;
    if (explicit && ALL_DASHBOARD_TYPES.includes(explicit as any)) return explicit as any;
    try {
      const contact = getContactForUser({ id: (currentSession.user as { id: string }).id });
      return (contact as any)?.category;
    } catch {
      return undefined;
    }
  }, [currentSession?.user, effectiveRole]);

  const isAdminPath = pathname?.includes('/admin');

  const handleSignOut = () => {
    signingOutRef.current = true;
    lastKnownSessionRef.current = null;
    if (typeof window !== 'undefined' && clearStaleSessionTimeoutRef.current) {
      window.clearTimeout(clearStaleSessionTimeoutRef.current);
      clearStaleSessionTimeoutRef.current = null;
    }
    void signOut({ callbackUrl: `/${locale}/login` });
  };

  // أثناء جلب الجلسة الأولى لا نعرض شاشة الدخول (تجنب وميض بعد F5).
  const showSessionLoading =
    isAdminPath && !isImpersonating && !mockSession && !currentSession && status === 'loading';

  // عدم حجب الواجهة أبداً — عرض اللوحة والمحتوى فوراً (سرعة التنقل). نعرض "يجب تسجيل الدخول" فقط عند التأكد من عدم المصادقة.
  const showLoginRequired = !currentSession && status === 'unauthenticated' && isAdminPath;

  if (showSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center gap-4 text-neutral-600">
          <div className="h-10 w-10 rounded-full border-2 border-[#8B6F47] border-t-transparent animate-spin" aria-hidden />
          <p className="text-sm font-medium">{locale === 'ar' ? 'جاري التحميل…' : 'Loading…'}</p>
        </div>
      </div>
    );
  }

  if (showLoginRequired) {
    const loginUrl = `/${locale}/login?callbackUrl=${encodeURIComponent(pathname || `/${locale}/admin`)}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md px-6">
          <div className="mb-6">
            <Image src="/logo-bhd.png" alt="BHD" width={64} height={64} className="mx-auto opacity-90" />
          </div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">
            {locale === 'ar' ? 'يجب تسجيل الدخول' : 'Login required'}
          </h1>
          <p className="text-neutral-600 mb-6">
            {locale === 'ar' ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم.' : 'You need to sign in to access the admin panel.'}
          </p>
          <Link
            href={loginUrl}
            className="inline-block px-8 py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #8B6F47 0%, #6B5535 100%)' }}
          >
            {locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-root ${sidebarCollapsed ? 'admin-root--sidebar-collapsed' : ''} ${hasUserBar ? 'admin-root--has-user-bar' : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {!isAdminConfirmed ? (
        <RoleBasedSidebar
          role={effectiveRole}
          locale={locale}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
          onToggleCollapse={toggleCollapse}
          contactDashboardType={contactDashboardType}
          userDisplayName={userName}
        />
      ) : (
      <>
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
                width={28}
                height={28}
                className="object-contain opacity-90"
                style={{ filter: 'sepia(30%) saturate(200%) hue-rotate(-10deg)' }}
              />
            </div>
            <div className="admin-sidebar-brand-text">
              <h1 className="admin-sidebar-title">{locale === 'ar' ? siteConfig.company.nameAr : siteConfig.company.nameEn}</h1>
            </div>
          </Link>
          {!sidebarCollapsed && (
            <div className="admin-sidebar-meta">
              {currentSession?.user && (
                <p className="admin-sidebar-user" title={userName}>{userName}</p>
              )}
              <div className="admin-sidebar-lang">
                <LanguageSwitcher currentLocale={locale} />
              </div>
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
                    const isProjects = item.groupKey === 'projects';
                    const subOpen = isDashboard ? dashboardOpen : isAccounting ? accountingOpen : isProjects ? projectsOpen : propertiesOpen;
                    const toggleOpen = () => {
                      if (isDashboard) setDashboardOpen((o) => !o);
                      else if (isAccounting) setAccountingOpen((o) => !o);
                      else if (isProjects) setProjectsOpen((o) => !o);
                      else setPropertiesOpen((o) => !o);
                    };
                    const groupIcon = isDashboard ? 'dashboard' : isAccounting ? 'archive' : isProjects ? 'projects' : 'building';
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
                              else if (isProjects) setProjectsOpen(true);
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
                          <ul className="admin-nav-sublist" role="list">
                            {item.subItems.map((sub) => {
                              const subItem = sub as NavItem & { isHeader?: boolean };
                              if (subItem.isHeader) {
                                return (
                                  <li key={subItem.labelKey} className="admin-nav-subheader">
                                    <span>{t(subItem.labelKey)}</span>
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
          <div className="admin-sidebar-footer-actions">
            <button
              type="button"
              onClick={handleSignOut}
              className="admin-nav-link admin-nav-link--external flex-1 min-w-0 justify-center"
              title={locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
            >
              <Icon name="arrowRightOnRectangle" className="admin-nav-icon" aria-hidden />
              <span className="admin-nav-link-text">{locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
            </button>
            <Link
              href={`/${locale}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-nav-link admin-nav-link--external flex-1 min-w-0 justify-center"
              title={t('viewSite')}
            >
              <Icon name="externalLink" className="admin-nav-icon" aria-hidden />
              <span className="admin-nav-link-text">{t('viewSite')}</span>
            </Link>
          </div>
        </div>
      </aside>
      </>
      )}

      <main className="admin-main">
        <DraftBanner />
        <header className="admin-mobile-header">
          <button
            type="button"
            onClick={toggleSidebar}
            className="admin-menu-trigger"
            aria-label={t('openMenu')}
            aria-expanded={sidebarOpen}
          >
            <Icon name="menu" className="w-6 h-6 text-gray-700 shrink-0" aria-hidden />
            <span className="text-sm font-semibold">
              {locale === 'ar' ? 'القائمة' : 'Menu'}
            </span>
          </button>
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2 overflow-hidden">
            <span className="font-semibold text-gray-900 truncate text-sm sm:text-base">
              {currentSession?.user ? (
                <>
                  {isAdminConfirmed
                    ? (locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel')
                    : userRole === 'OWNER'
                      ? (locale === 'ar' ? 'لوحة المالك' : 'Owner Panel')
                      : (locale === 'ar' ? 'لوحتي' : 'My Panel')}
                </>
              ) : (
                isAdminConfirmed
                  ? (locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel')
                  : (locale === 'ar' ? 'لوحتي' : 'My Panel')
              )}
            </span>
            {currentSession?.user && (
              <span className="text-xs text-gray-500 truncate sm:border-s sm:border-gray-200 sm:ps-2 mt-0.5 sm:mt-0">
                {(currentSession.user as { name?: string }).name || (currentSession.user as { serialNumber?: string }).serialNumber || (currentSession.user as { email?: string }).email || (currentSession.user as { phone?: string }).phone || '—'}
              </span>
            )}
          </div>
          <div className="w-8 sm:w-10 shrink-0" aria-hidden />
        </header>
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  );
}
