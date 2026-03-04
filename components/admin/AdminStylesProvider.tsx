'use client';

import { useEffect } from 'react';
import { log } from '@/lib/logger';

interface AdminStylesProviderProps {
  children: React.ReactNode;
}

/**
 * مزود أنماط الإدارة - يقوم بتحميل الأنماط المحسّنة ديناميكياً
 * Admin Styles Provider - Dynamically loads optimized styles
 */
export default function AdminStylesProvider({ children }: AdminStylesProviderProps) {
  useEffect(() => {
    // تحميل أنماط الإدارة المحسّنة
    const loadAdminStyles = async () => {
      try {
        // تحميل أنماط التخطيط الرئيسية
        const adminCSSResponse = await fetch('/styles/admin.css');
        const adminCSS = await adminCSSResponse.text();
        
        // تحميل أنماط المكونات
        const componentsCSSResponse = await fetch('/styles/admin-components.css');
        const componentsCSS = await componentsCSSResponse.text();
        
        // تطبيق الأنماط على الصفحة
        const adminStyle = document.createElement('style');
        adminStyle.textContent = adminCSS;
        adminStyle.setAttribute('data-admin-styles', 'layout');
        document.head.appendChild(adminStyle);
        
        const componentsStyle = document.createElement('style');
        componentsStyle.textContent = componentsCSS;
        componentsStyle.setAttribute('data-admin-styles', 'components');
        document.head.appendChild(componentsStyle);
        
        log.info('Admin styles loaded successfully');
      } catch (error) {
        log.error('Failed to load admin styles', { error });
      }
    };

    // تحميل الأنماط فقط في صفحات الإدارة
    if (window.location.pathname.includes('/admin')) {
      loadAdminStyles();
    }

    // تنظيف الأنماط عند مغادرة صفحة الإدارة
    return () => {
      const adminStyles = document.querySelectorAll('[data-admin-styles]');
      adminStyles.forEach(style => style.remove());
    };
  }, []);

  return <>{children}</>;
}
