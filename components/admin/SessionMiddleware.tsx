/**
 * Session Middleware Component
 * يقرأ userSession و isSwitchingUser من localStorage ويضبط الجلسة الوهمية فوراً (أثناء الـ render)
 * حتى تظهر لوحة المستخدم مباشرة بعد "فتح حساب" دون انتظار.
 */

'use client';

interface SessionMiddlewareProps {
  children: React.ReactNode;
}

/** يطبّق الجلسة الوهمية عند وجود "فتح حساب" في localStorage — يعمل عند التحديث والتنقل دون اشتراط isSwitchingUser */
function applyImpersonationSession() {
  if (typeof window === 'undefined') return;
  try {
    const userSession = localStorage.getItem('userSession');
    if (!userSession) return;
    const session = JSON.parse(userSession) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; role?: string; serialNumber?: string; adminId?: string };
    if (!session.loginAsUser || !session.id) return;

    const mockUser = {
      id: session.id,
      name: session.name ?? '',
      email: session.email ?? '',
      role: session.role ?? 'CLIENT',
      serialNumber: session.serialNumber ?? '',
    };
    (window as any).currentUser = mockUser;
    (window as any).isLoginAsUser = true;
    (window as any).originalAdminId = session.adminId;
    (window as any).mockNextAuthSession = {
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    if (localStorage.getItem('isSwitchingUser') === 'true') localStorage.removeItem('isSwitchingUser');
  } catch {
    try {
      localStorage.removeItem('userSession');
      localStorage.removeItem('isSwitchingUser');
    } catch {}
  }
}

export default function SessionMiddleware({ children }: SessionMiddlewareProps) {
  applyImpersonationSession();
  return <>{children}</>;
}
