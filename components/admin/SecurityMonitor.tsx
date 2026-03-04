'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { log } from '@/lib/logger';
import { 
  validatePasswordStrength, 
  auditSecurityEvent, 
  cleanupSecurityData,
  validateIPAddress,
  isSuspiciousUserAgent
} from '@/lib/security';

interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export default function SecurityMonitor() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedLogins: 0,
    suspiciousIPs: 0,
    weakPasswords: 0,
  });

  useEffect(() => {
    loadSecurityData();
    startSecurityMonitoring();
    
    return () => {
      // تنظيف عند مغادرة المكون
    };
  }, []);

  const loadSecurityData = () => {
    try {
      const auditLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      const failedLogins = auditLogs.filter((log: any) => log.type === 'LOGIN_FAILURE').length;
      
      // التحقق من IPs مشبوهة
      const suspiciousIPs = new Set();
      auditLogs.forEach((log: any) => {
        if (log.ip && validateIPAddress(log.ip)) {
          suspiciousIPs.add(log.ip);
        }
      });

      setStats({
        totalEvents: auditLogs.length,
        failedLogins,
        suspiciousIPs: suspiciousIPs.size,
        weakPasswords: 0, // سيتم تحديثه لاحقاً
      });

      // إنشاء تنبيهات بناءً على البيانات
      generateSecurityAlerts(auditLogs);
    } catch (error) {
      log.error('Failed to load security data', { error });
    }
  };

  const generateSecurityAlerts = (auditLogs: any[]) => {
    const newAlerts: SecurityAlert[] = [];
    const now = new Date();

    // تنبيه محاولات تسجيل الدخول الفاشلة المتكررة
    const recentFailures = auditLogs.filter((log: any) => 
      log.type === 'LOGIN_FAILURE' && 
      new Date(log.timestamp) > new Date(now.getTime() - 60 * 60 * 1000) // آخر ساعة
    );

    if (recentFailures.length >= 5) {
      newAlerts.push({
        id: 'high-failed-logins',
        type: 'error',
        message: `تم اكتشاف ${recentFailures.length} محاولة تسجيل دخول فاشلة في الساعة الماضية`,
        timestamp: now,
        details: { count: recentFailures.length }
      });
    }

    // تنبيه User Agent مشبوه
    const suspiciousUA = isSuspiciousUserAgent(navigator.userAgent);
    if (suspiciousUA) {
      newAlerts.push({
        id: 'suspicious-ua',
        type: 'warning',
        message: 'تم اكتشاف User Agent مشبوه',
        timestamp: now,
        details: { userAgent: navigator.userAgent }
      });
    }

    setAlerts(newAlerts);
  };

  const startSecurityMonitoring = () => {
    // مراقبة أحداث الأمان
    const originalLog = console.log;
    console.log = (...args) => {
      // التحقق من رسائل الأمان
      const message = args.join(' ');
      if (message.includes('LOGIN_FAILURE') || message.includes('SECURITY')) {
        log.warn('Security event detected', { message, args });
      }
      originalLog(...args);
    };

    // مراقبة تغييرات localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      // تسجيل التغييرات على البيانات الحساسة
      const sensitiveKeys = ['password', 'token', 'secret', 'key'];
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        auditSecurityEvent({
          type: 'PERMISSION_DENIED',
          details: { action: 'localStorage_write', key }
        });
      }
      originalSetItem.call(localStorage, key, value);
    };
  };

  const handleTestPassword = (password: string) => {
    const validation = validatePasswordStrength(password);
    
    if (!validation.isValid) {
      auditSecurityEvent({
        type: 'PASSWORD_CHANGE',
        details: { 
          strength: validation.score,
          issues: validation.feedback,
          tested: true
        }
      });
    }

    return validation;
  };

  const handleCleanup = () => {
    try {
      cleanupSecurityData();
      log.info('Security data cleaned up successfully');
      loadSecurityData(); // إعادة تحميل البيانات
    } catch (error) {
      log.error('Failed to cleanup security data', { error });
    }
  };

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'error': return 'x';
      case 'warning': return 'information';
      case 'info': return 'information';
      default: return 'information';
    }
  };

  const getAlertColor = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ar-OM');
  };

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title={ar ? 'الأمان' : 'Security'}
        subtitle={ar ? 'مراقبة الأمان والتنبيهات واختبار قوة كلمات المرور' : 'Security monitoring, alerts and password strength testing'}
      />

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
              <Icon name="shieldCheck" className="w-5 h-5 text-[#8B6F47]" />
            </span>
            <div>
              <p className="text-sm text-gray-600">{ar ? 'إجمالي الأحداث' : 'Total events'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Icon name="x" className="w-5 h-5 text-red-600" />
            </span>
            <div>
              <p className="text-sm text-gray-600">{ar ? 'محاولات الدخول الفاشلة' : 'Failed logins'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.failedLogins}</p>
            </div>
          </div>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Icon name="information" className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="text-sm text-gray-600">{ar ? 'IPs مشبوهة' : 'Suspicious IPs'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.suspiciousIPs}</p>
            </div>
          </div>
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Icon name="check" className="w-5 h-5 text-emerald-600" />
            </span>
            <div>
              <p className="text-sm text-gray-600">{ar ? 'كلمات مرور ضعيفة' : 'Weak passwords'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.weakPasswords}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      <div className="admin-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
              <Icon name="shieldCheck" className="w-5 h-5 text-[#8B6F47]" />
            </span>
            {ar ? 'تنبيهات الأمان' : 'Security alerts'}
          </h3>
          <button
            onClick={handleCleanup}
            className="px-4 py-2 rounded-xl font-semibold bg-white border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47]/5 transition-colors text-sm"
          >
            {ar ? 'تنظيف البيانات' : 'Clean data'}
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon name="check" className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
            <p>{ar ? 'لا توجد تنبيهات أمان حالية' : 'No security alerts at the moment'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon name={getAlertIcon(alert.type)} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(alert.timestamp)}
                    </p>
                    {alert.details && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-gray-600">{ar ? 'التفاصيل' : 'Details'}</summary>
                        <pre className="text-xs mt-2 bg-gray-100 p-2 rounded-lg overflow-auto">
                          {JSON.stringify(alert.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Strength Tester */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
            <Icon name="cog" className="w-5 h-5 text-[#8B6F47]" />
          </span>
          {ar ? 'اختبار قوة كلمة المرور' : 'Password strength test'}
        </h3>
        
        <div className="space-y-4">
          <input
            type="password"
            placeholder={ar ? 'أدخل كلمة مرور لاختبار قوتها' : 'Enter a password to test its strength'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
            onChange={(e) => handleTestPassword(e.target.value)}
          />
          
          <div className="text-sm text-gray-600 space-y-1">
            <p>✓ {ar ? '8 أحرف على الأقل' : 'At least 8 characters'}</p>
            <p>✓ {ar ? 'أحرف كبيرة وصغيرة' : 'Upper and lower case'}</p>
            <p>✓ {ar ? 'أرقام ورموز' : 'Numbers and symbols'}</p>
            <p>✓ {ar ? 'تجنب الكلمات الشائعة' : 'Avoid common words'}</p>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="admin-card p-6 bg-[#8B6F47]/5 border-[#8B6F47]/20">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
            <Icon name="information" className="w-5 h-5 text-[#8B6F47]" />
          </span>
          {ar ? 'توصيات الأمان' : 'Security recommendations'}
        </h3>
        
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'قم بتفعيل المصادقة الثنائية (2FA) لجميع الحسابات الإدارية' : 'Enable two-factor authentication (2FA) for all admin accounts'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'استخدم كلمات مرور قوية وفريدة لكل حساب' : 'Use strong, unique passwords for each account'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'قم بتحديث كلمات المرور بانتظام (كل 90 يوم)' : 'Update passwords regularly (every 90 days)'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'راقب سجلات الأمان بانتظام للكشف عن الأنشطة المشبوهة' : 'Monitor security logs regularly for suspicious activity'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'احتفظ بنسخ احتياطية منتظمة للبيانات الحساسة' : 'Keep regular backups of sensitive data'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
