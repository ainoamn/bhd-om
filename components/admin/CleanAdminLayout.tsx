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

export default function CleanAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();
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
      id: 'tools',
      label: 'الأدوات',
      icon: 'cog',
      href: `/${locale}/admin/tools`,
      children: [
        { id: 'reports', label: 'التقارير', icon: 'documentText', href: `/${locale}/admin/reports` },
        { id: 'backup', label: 'النسخ الاحتياطي', icon: 'archive', href: `/${locale}/admin/backup` },
        { id: 'security', label: 'الأمان', icon: 'shieldCheck', href: `/${locale}/admin/security` },
        { id: 'settings', label: 'الإعدادات', icon: 'cog', href: `/${locale}/admin/settings` },
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
      <div key={item.id} className="nav-item">
        <Link
          href={item.href}
          className={`nav-link ${active ? 'active' : ''} ${level > 0 ? 'sub-item' : ''}`}
          onClick={() => {
            log.userAction('navigation_click', { item: item.id, level });
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name={item.icon} className="w-5 h-5" />
              {!collapsed && (
                <span className="nav-text">{item.label}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
                {hasChildren && (
                  <Icon name="chevronDown" className="w-4 h-4" />
                )}
              </div>
            )}
          </div>
        </Link>
        
        {hasChildren && !collapsed && (
          <div className="nav-children">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`clean-admin-layout ${collapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo">
              <img src="/logo-bhd.png" alt="BHD" className="w-8 h-8" />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <h1 className="logo-title">بن حمود</h1>
                <p className="logo-subtitle">لوحة التحكم</p>
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
            <div className="search-wrapper">
              <Icon name="magnifyingGlass" className="search-icon" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">الرئيسية</h3>
            {filteredNavigation.slice(0, 3).map(item => renderNavigationItem(item))}
          </div>
          
          <div className="nav-section">
            <h3 className="nav-section-title">الإدارة</h3>
            {filteredNavigation.slice(3, 6).map(item => renderNavigationItem(item))}
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">الأدوات</h3>
            {filteredNavigation.slice(6).map(item => renderNavigationItem(item))}
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
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-btn"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
            
            <div className="breadcrumb">
              <span className="breadcrumb-item">لوحة التحكم</span>
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
        .clean-admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .sidebar {
          width: 280px;
          background: #1e293b;
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

        [dir="rtl"] .sidebar {
          right: 0;
          left: auto;
        }

        .sidebar-collapsed .sidebar {
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

        .search-wrapper {
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

        .nav-section {
          margin-bottom: 2rem;
        }

        .nav-section-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0 1.5rem;
          margin-bottom: 0.5rem;
        }

        .nav-item {
          margin-bottom: 0.25rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .nav-link.active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border-right: 3px solid #8B6F47;
        }

        [dir="rtl"] .nav-link.active {
          border-right: none;
          border-left: 3px solid #8B6F47;
        }

        .nav-text {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .nav-badge {
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          min-width: 1.25rem;
          text-align: center;
        }

        .nav-children {
          background: rgba(0, 0, 0, 0.2);
        }

        .nav-link.sub-item {
          padding-left: 3rem;
          font-size: 0.813rem;
        }

        [dir="rtl"] .nav-link.sub-item {
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

        .main-content {
          flex: 1;
          margin-right: 280px;
          transition: margin-right 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        [dir="rtl"] .main-content {
          margin-right: 0;
          margin-left: 280px;
        }

        .sidebar-collapsed .main-content {
          margin-right: 80px;
        }

        [dir="rtl"] .sidebar-collapsed .main-content {
          margin-right: 0;
          margin-left: 80px;
        }

        .top-bar {
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
          .sidebar {
            transform: translateX(-100%);
          }

          [dir="rtl"] .sidebar {
            transform: translateX(100%);
          }

          .sidebar-open .sidebar {
            transform: translateX(0);
          }

          .main-content {
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
          .sidebar-collapsed .sidebar {
            width: 280px;
          }

          .sidebar-collapsed .logo-text,
          .sidebar-collapsed .sidebar-search,
          .sidebar-collapsed .nav-text,
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
