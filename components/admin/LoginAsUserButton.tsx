/**
 * Login as User Button Component
 * مكون زر تسجيل الدخول كمستخدم آخر
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';

interface LoginAsUserButtonProps {
  userId: string;
  userName: string;
  userEmail?: string;
  userSerialNumber?: string;
  userRole: string;
  className?: string;
}

export default function LoginAsUserButton({ 
  userId, 
  userName, 
  userEmail, 
  userSerialNumber,
  userRole,
  className = "" 
}: LoginAsUserButtonProps) {
  const params = useParams();
  const { data: session } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLoginAsUser = async () => {
    if (!session?.user?.id) {
      alert(ar ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in first');
      return;
    }

    setLoading(true);
    
    try {
      // Get one-time return token first (while still admin) for "عودة للأدمن"
      try {
        const tokenRes = await fetch('/api/admin/return-token', { credentials: 'include' });
        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          if (token) sessionStorage.setItem('adminReturnToken', token);
        }
      } catch {
        // continue without return token
      }

      // إنشاء جلسة حقيقية (كوكي) للمستخدم المختار حتى تبقى الجلسة عند الانتقال للرئيسية والعقارات وغيرها
      const impRes = await fetch('/api/admin/impersonate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (!impRes.ok) {
        const err = await impRes.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to switch session');
      }

      // تخزين بيانات المستخدم المُختار (للعرض في لوحة التحكم) — SessionMiddleware يقرأ isSwitchingUser و userSession
      localStorage.setItem('userSession', JSON.stringify({
        id: userId,
        loginAsUser: true,
        adminId: session.user.id,
        name: userName,
        email: userEmail,
        serialNumber: userSerialNumber ?? '',
        role: userRole,
      }));
      localStorage.setItem('isSwitchingUser', 'true');

      // إعطاء المتصفح وقتاً لتسجيل الكوكي ثم الانتقال للوحة المستخدم
      await new Promise((r) => setTimeout(r, 200));
      window.location.replace(`/${locale}/admin`);
      
    } catch (error) {
      console.error('Login as user error:', error);
      alert(ar ? 'حدث خطأ أثناء تبديل المستخدم' : 'An error occurred while switching users');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // Don't show button for current user
  if (session?.user?.id === userId) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium ${className}`}
        title={ar ? `تسجيل الدخول كمستخدم: ${userName}` : `Login as user: ${userName}`}
      >
        <Icon name="users" className="h-4 w-4" />
        {ar ? 'فتح حساب' : 'Open Account'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="users" className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {ar ? 'تأكيد تسجيل الدخول كمستخدم' : 'Confirm Login as User'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {ar ? 'هل تريد تسجيل الدخول بحساب المستخدم التالي؟' : 'Do you want to login with the following user account?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">{ar ? 'الاسم:' : 'Name:'}</span>
                  <span className="text-sm font-semibold text-gray-900">{userName}</span>
                </div>
                {userEmail && !userEmail.includes('@nologin.bhd') && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">{ar ? 'البريد:' : 'Email:'}</span>
                    <span className="text-sm font-semibold text-gray-900">{userEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">{ar ? 'الدور:' : 'Role:'}</span>
                  <span className="text-sm font-semibold text-gray-900">{userRole}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong className="block mb-1">
                  {ar ? 'ملاحظة هامة:' : 'Important Note:'}
                </strong>
                {ar 
                  ? 'سيتم تسجيل خروج حساب الأدمن الحالي وفتح حساب المستخدم المحدد. يمكنك العودة لحساب الأدمن من صفحة تسجيل الخروج.'
                  : 'The current admin account will be logged out and the specified user account will be opened. You can return to the admin account from the logout page.'
                }
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleLoginAsUser}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {ar ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                  </>
                ) : (
                  <>
                    <Icon name="users" className="h-4 w-4" />
                    {ar ? 'تسجيل الدخول' : 'Login'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
