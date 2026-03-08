/**
 * Session Middleware Component
 * يقرأ userSession و isSwitchingUser من localStorage ويضبط الجلسة الوهمية فوراً (أثناء الـ render)
 * حتى تظهر لوحة المستخدم مباشرة بعد "فتح حساب" دون انتظار.
 */

'use client';

interface SessionMiddlewareProps {
  children: React.ReactNode;
}

function applyImpersonationSession() {
  if (typeof window === 'undefined') return;
  try {
    const userSession = localStorage.getItem('userSession');
    const isSwitchingUser = localStorage.getItem('isSwitchingUser');
    if (!userSession || isSwitchingUser !== 'true') return;
    const session = JSON.parse(userSession);
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
    localStorage.removeItem('isSwitchingUser');
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
