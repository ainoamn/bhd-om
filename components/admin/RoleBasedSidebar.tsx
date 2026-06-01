'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import Icon from '@/components/icons/Icon';
import { siteConfig } from '@/config/site';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import AdminThemeToggle from '@/components/admin/AdminThemeToggle';
import { getEffectiveDashboardConfig, loadDashboardSettingsFromServer, DASHBOARD_SETTINGS_EVENT } from '@/lib/data/dashboardSettings';
import type { RoleKey, DashboardType } from '@/lib/config/dashboardRoles';

/** صلاحيات الباقة للمستخدم (من لوحة الاشتراكات) — المعيار الأول لفتح خصائص لوحة التحكم */
const EMPTY_PLAN_IDS: string[] = [];

const DASHBOARD_TYPE_LABEL_KEYS: Record<string, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
  AUTHORIZED_REP: 'categoryAuthorizedRep',
  COMPANY: 'categoryCompany',
  OTHER: 'categoryOther',
};

interface RoleBasedSidebarProps {
  role: RoleKey;
  locale: string;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  /** تصنيف جهة الاتصال المرتبطة - يحدد لوحة التحكم عند توفره */
  contactDashboardType?: DashboardType;
  /** اسم المستخدم للعرض في الشريط الجانبي */
  userDisplayName?: string | null;
}

export default function RoleBasedSidebar({
  role,
  locale,
  sidebarOpen,
  sidebarCollapsed,
  onClose,
  onToggleCollapse,
  contactDashboardType,
  userDisplayName,
}: RoleBasedSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');
  const tAddr = useTranslations('addressBook');
  const [, setSettingsVersion] = useState(0);
  const [planPermissionIds, setPlanPermissionIds] = useState<string[] | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (role !== 'CLIENT' && role !== 'OWNER') {
      setUnreadNotifications(0);
      return;
    }
    let cancelled = false;
    fetch('/api/me/notifications?limit=1', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { unreadCount?: number } | null) => {
        if (!cancelled && typeof data?.unreadCount === 'number') setUnreadNotifications(data.unreadCount);
      })
      .catch(() => {
        if (!cancelled) setUnreadNotifications(0);
      });
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  useEffect(() => {
    const handler = () => setSettingsVersion((v) => v + 1);
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_SETTINGS_EVENT, handler);
  }, []);

  useEffect(() => {
    if (role === 'CLIENT' || role === 'OWNER') {
      loadDashboardSettingsFromServer();
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'CLIENT' && role !== 'OWNER') {
      setPlanPermissionIds(null);
      return;
    }
    let cancelled = false;
    fetch('/api/subscriptions/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { permissionIds?: string[] } | null) => {
        if (!cancelled && Array.isArray(data?.permissionIds)) setPlanPermissionIds(data.permissionIds);
        else if (!cancelled) setPlanPermissionIds(EMPTY_PLAN_IDS);
      })
      .catch(() => {
        if (!cancelled) setPlanPermissionIds(EMPTY_PLAN_IDS);
      });
    return () => { cancelled = true; };
  }, [role]);

  const config = getEffectiveDashboardConfig(role, contactDashboardType, planPermissionIds ?? undefined);

  const subtitle =
    contactDashboardType && DASHBOARD_TYPE_LABEL_KEYS[contactDashboardType]
      ? tAddr(DASHBOARD_TYPE_LABEL_KEYS[contactDashboardType])
      : role === 'CLIENT'
        ? t('roleClient')
        : role === 'OWNER'
          ? t('roleOwner')
          : t('adminPanel');

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={onClose}
          aria-label={t('closeMenu')}
        />
      )}
      <aside
        className={`admin-sidebar ${!sidebarOpen ? 'admin-sidebar--closed' : ''} ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}
        data-collapsed={sidebarCollapsed}
      >
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
              <p className="admin-sidebar-subtitle">{subtitle}</p>
            </div>
          </Link>
          {!sidebarCollapsed && (
            <div className="mt-3 flex flex-col gap-2">
              {userDisplayName && (
                <p className="text-xs font-medium text-gray-600 truncate" title={userDisplayName}>
                  {userDisplayName}
                </p>
              )}
              <div className="admin-sidebar-meta-actions">
                <AdminThemeToggle locale={locale} variant="pill" />
                <div className="admin-sidebar-lang">
                  <LanguageSwitcher currentLocale={locale} />
                </div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="admin-sidebar-meta admin-sidebar-meta--collapsed">
              <AdminThemeToggle locale={locale} variant="pill" compact />
            </div>
          )}
        </div>

        <nav className="admin-nav" aria-label="Main navigation">
          <div className="admin-nav-group">
            <ul className="admin-nav-list" role="list">
              {config.navItems.map((item) => {
                const href = (item.href === '/admin/subscriptions' && role !== 'ADMIN') ? '/subscriptions' : item.href;
                const fullHref = `/${locale}${href}`;
                const isActive = pathname === fullHref || (href !== '/admin' && pathname?.startsWith(fullHref));
                const isNotifications = item.section === 'notifications';
                return (
                  <li key={item.href}>
                    <Link
                      href={fullHref}
                      className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
                      onClick={onClose}
                      title={sidebarCollapsed ? t(item.labelKey) : undefined}
                    >
                      <Icon name={item.icon as keyof typeof import('@/lib/icons').icons} className="admin-nav-icon" aria-hidden />
                      <span className="admin-nav-link-text">{t(item.labelKey)}</span>
                      {isNotifications && unreadNotifications > 0 && (
                        <span
                          className="ms-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                          aria-label={locale === 'ar' ? `${unreadNotifications} غير مقروء` : `${unreadNotifications} unread`}
                        >
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="admin-nav-link admin-nav-link--collapse w-full justify-center hidden lg:flex"
            title={sidebarCollapsed ? (locale === 'ar' ? 'توسيع القائمة' : 'Expand') : (locale === 'ar' ? 'طي القائمة' : 'Collapse')}
          >
            <Icon name={locale === 'ar' ? (sidebarCollapsed ? 'chevronLeft' : 'chevronRight') : (sidebarCollapsed ? 'chevronRight' : 'chevronLeft')} className="admin-nav-icon" aria-hidden />
            <span className="admin-nav-link-text">{sidebarCollapsed ? (locale === 'ar' ? 'توسيع' : 'Expand') : (locale === 'ar' ? 'طي' : 'Collapse')}</span>
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="admin-nav-link admin-nav-link--external w-full justify-start lg:justify-center"
            title={locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          >
            <Icon name="arrowRightOnRectangle" className="admin-nav-icon" aria-hidden />
            <span className="admin-nav-link-text">{locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
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
    </>
  );
}
