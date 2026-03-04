'use client';

import { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { log } from '@/lib/logger';

interface NavigationItem {
  id: string;
  label: string;
  icon: keyof typeof import('@/lib/icons').icons;
  href: string;
  badge?: number;
  children?: NavigationItem[];
  isActive?: boolean;
}

export default function ModernAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();
  const t = useTranslations('admin');
  const locale = (params?.locale as string) || 'ar';
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(5);

  const navigation: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: 'dashboard',
      href: `/${locale}/admin`,
    },
    {
      id: 'analytics',
      label: 'التحليلات',
      icon: 'chartBar',
      href: `/${locale}/admin/analytics`,
      badge: 3,
    },
    {
      id: 'properties',
      label: 'العقارات',
      icon: 'building',
      href: `/${locale}/admin/properties`,
      children: [
        { id: 'all-properties', label: 'جميع العقارات', icon: 'building', href: `/${locale}/admin/properties` },
        { id: 'add-property', label: 'إضافة عقار', icon: 'plus', href: `/${locale}/admin/properties/new` },
        { id: 'property-analytics', label: 'تحليلات العقارات', icon: 'chartBar', href: `/${locale}/admin/properties/analytics` },
      ],
    },
    {
      id: 'projects',
      label: 'المشاريع',
      icon: 'projects',
      href: `/${locale}/admin/projects`,
      children: [
        { id: 'all-projects', label: 'جميع المشاريع', icon: 'projects', href: `/${locale}/admin/projects` },
        { id: 'add-project', label: 'إضافة مشروع', icon: 'plus', href: `/${locale}/admin/projects/new` },
        { id: 'project-timeline', label: 'جدول المشاريع', icon: 'calendar', href: `/${locale}/admin/projects/timeline` },
      ],
    },
    {
      id: 'accounting',
      label: 'المحاسبة',
      icon: 'database',
      href: `/${locale}/admin/accounting`,
      children: [
        { id: 'dashboard', label: 'لوحة المحاسبة', icon: 'dashboard', href: `/${locale}/admin/accounting` },
        { id: 'transactions', label: 'القيود', icon: 'documentText', href: `/${locale}/admin/accounting/journal` },
        { id: 'invoices', label: 'الفواتير', icon: 'documentText', href: `/${locale}/admin/accounting/invoices` },
        { id: 'reports', label: 'التقارير', icon: 'chartBar', href: `/${locale}/admin/accounting/reports` },
      ],
    },
    {
      id: 'users',
      label: 'المستخدمون',
      icon: 'users',
      href: `/${locale}/admin/users`,
      badge: 2,
    },
    {
      id: 'bookings',
      label: 'الحجوزات',
      icon: 'inbox',
      href: `/${locale}/admin/bookings`,
    },
    {
      id: 'security',
      label: 'الأمان',
      icon: 'shieldCheck',
      href: `/${locale}/admin/security`,
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: 'cog',
      href: `/${locale}/admin/settings`,
      children: [
        { id: 'general', label: 'إعدادات عامة', icon: 'cog', href: `/${locale}/admin/settings/general` },
        { id: 'backup', label: 'النسخ الاحتياطي', icon: 'archive', href: `/${locale}/admin/backup` },
        { id: 'logs', label: 'السجلات', icon: 'documentText', href: `/${locale}/admin/logs` },
      ],
    },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const filteredNavigation = navigation.filter(item => {
    if (!searchQuery) return true;
    return item.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="navigation-item">
        <Link
          href={item.href}
          className={`navigation-link ${active ? 'active' : ''} ${level > 0 ? 'sub-item' : ''}`}
          onClick={() => {
            if (hasChildren) {
              // Toggle children visibility
            }
            log.userAction('navigation_click', { item: item.id, level });
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name={item.icon} className="w-5 h-5" />
              {!collapsed && (
                <span className="navigation-text">{item.label}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="navigation-badge">{item.badge}</span>
                )}
                {hasChildren && (
                  <Icon name="chevronDown" className="w-4 h-4" />
                )}
              </div>
            )}
          </div>
        </Link>
        
        {hasChildren && !collapsed && (
          <div className="navigation-children">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`modern-admin-layout ${collapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar */}
      <aside className="modern-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo">
              <img src="/logo-bhd.png" alt="BHD" className="w-8 h-8" />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <h1 className="logo-title">بن حمود</h1>
                <p className="logo-subtitle">لوحة التحكم المتقدمة</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="sidebar-search">
            <div className="search-input-wrapper">
              <Icon name="magnifyingGlass" className="search-icon" />
              <input
                type="text"
                placeholder="بحث في القائمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="navigation-section">
            <h3 className="section-title">الرئيسية</h3>
            {filteredNavigation.slice(0, 3).map(item => renderNavigationItem(item))}
          </div>
          
          <div className="navigation-section">
            <h3 className="section-title">الإدارة</h3>
            {filteredNavigation.slice(3).map(item => renderNavigationItem(item))}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-info">
              <div className="user-avatar">
                <img 
                  src={session?.user?.image || '/default-avatar.png'} 
                  alt="User" 
                  className="w-8 h-8 rounded-full"
                />
              </div>
              <div className="user-details">
                <p className="user-name">{session?.user?.name || 'المسؤول'}</p>
                <p className="user-role">{session?.user?.role || 'ADMIN'}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="modern-main">
        {/* Top Bar */}
        <header className="modern-header">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-btn"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
            
            <div className="breadcrumb">
              <span className="breadcrumb-item">لوحة التحكم</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item current">الرئيسية</span>
            </div>
          </div>

          <div className="header-right">
            {/* Notifications */}
            <button className="header-btn notification-btn">
              <Icon name="inbox" className="w-5 h-5" />
              {notifications > 0 && (
                <span className="notification-badge">{notifications}</span>
              )}
            </button>

            {/* User Menu */}
            <div className="user-menu">
              <button className="user-menu-btn">
                <img 
                  src={session?.user?.image || '/default-avatar.png'} 
                  alt="User" 
                  className="w-8 h-8 rounded-full"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        .modern-admin-layout {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .modern-sidebar {
          width: 280px;
          background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          right: auto;
          left: 0;
          height: 100vh;
          z-index: 40;
          transition: all 0.3s ease;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
        }

        [dir="rtl"] .modern-sidebar {
          right: 0;
          left: auto;
        }

        .sidebar-collapsed .modern-sidebar {
          width: 80px;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .logo {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .logo-text {
          flex: 1;
        }

        .logo-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
          color: white;
        }

        .logo-subtitle {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .collapse-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .collapse-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .sidebar-search {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.5);
          w: 4;
          h: 4;
        }

        .search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .search-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.15);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }

        .navigation-section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0 1.5rem;
          margin-bottom: 0.5rem;
        }

        .navigation-item {
          margin-bottom: 0.25rem;
        }

        .navigation-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
        }

        .navigation-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .navigation-link.active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border-right: 3px solid #8B6F47;
        }

        [dir="rtl"] .navigation-link.active {
          border-right: none;
          border-left: 3px solid #8B6F47;
        }

        .navigation-text {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .navigation-badge {
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          min-width: 1.25rem;
          text-align: center;
        }

        .navigation-children {
          background: rgba(0, 0, 0, 0.2);
        }

        .navigation-link.sub-item {
          padding-left: 3rem;
          font-size: 0.813rem;
        }

        [dir="rtl"] .navigation-link.sub-item {
          padding-left: 1.5rem;
          padding-right: 3rem;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .user-role {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 30;
          display: none;
        }

        .sidebar-open .sidebar-overlay {
          display: block;
        }

        .modern-main {
          flex: 1;
          margin-right: 280px;
          transition: margin-right 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        [dir="rtl"] .modern-main {
          margin-right: 0;
          margin-left: 280px;
        }

        .sidebar-collapsed .modern-main {
          margin-right: 80px;
        }

        [dir="rtl"] .sidebar-collapsed .modern-main {
          margin-right: 0;
          margin-left: 80px;
        }

        .modern-header {
          height: 64px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #374151;
          padding: 0.5rem;
          border-radius: 6px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .breadcrumb-item.current {
          color: #111827;
          font-weight: 500;
        }

        .breadcrumb-separator {
          color: #d1d5db;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-btn {
          background: none;
          border: none;
          color: #374151;
          padding: 0.5rem;
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-btn:hover {
          background: #f3f4f6;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          min-width: 1.25rem;
          text-align: center;
        }

        .user-menu-btn {
          background: none;
          border: 2px solid #e5e7eb;
          padding: 0.125rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-menu-btn:hover {
          border-color: #8B6F47;
        }

        .page-content {
          flex: 1;
          padding: 2rem;
          background: #f9fafb;
          min-height: calc(100vh - 64px);
        }

        /* Mobile Responsive */
        @media (max-width: 1023px) {
          .modern-sidebar {
            transform: translateX(-100%);
          }

          [dir="rtl"] .modern-sidebar {
            transform: translateX(100%);
          }

          .sidebar-open .modern-sidebar {
            transform: translateX(0);
          }

          .modern-main {
            margin: 0;
          }

          .mobile-menu-btn {
            display: block;
          }

          .page-content {
            padding: 1rem;
          }
        }

        @media (max-width: 640px) {
          .sidebar-collapsed .modern-sidebar {
            width: 280px;
          }

          .sidebar-collapsed .logo-text,
          .sidebar-collapsed .sidebar-search,
          .sidebar-collapsed .navigation-text,
          .sidebar-collapsed .user-details {
            display: block;
          }

          .page-content {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
