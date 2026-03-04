/**
 * Session Middleware Component
 * مكون وسيط للجلسات
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SessionMiddlewareProps {
  children: React.ReactNode;
}

export default function SessionMiddleware({ children }: SessionMiddlewareProps) {
  const router = useRouter();

  useEffect(() => {
    // Check for user session in localStorage immediately
    const userSession = localStorage.getItem('userSession');
    const isSwitchingUser = localStorage.getItem('isSwitchingUser');
    
    console.log('SessionMiddleware - Checking sessions:', { userSession: !!userSession, isSwitchingUser });
    
    if (userSession && isSwitchingUser === 'true') {
      try {
        const session = JSON.parse(userSession);
        
        // If we have a user session, create mock session immediately
        if (session.loginAsUser && session.id) {
          console.log('SessionMiddleware: Creating mock session for user:', session.serialNumber);
          
          // Create a mock session for the user
          const mockUser = {
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
            serialNumber: session.serialNumber
          };
          
          // Store in window for other components to access
          (window as any).currentUser = mockUser;
          (window as any).isLoginAsUser = true;
          (window as any).originalAdminId = session.adminId;
          
          // Override next-auth session temporarily
          // This helps with components that check for session
          (window as any).mockNextAuthSession = {
            user: mockUser,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          // CRITICAL: Override useSession hooks immediately
          if (typeof window !== 'undefined') {
            (window as any).useSession = () => ({
              data: mockUser,
              status: 'authenticated',
              update: async () => mockUser
            });
            
            // Override next-auth/react useSession
            const nextAuthReact = (window as any).nextAuthReact;
            if (nextAuthReact && nextAuthReact.useSession) {
              nextAuthReact.useSession = () => ({
                data: mockUser,
                status: 'authenticated',
                update: async () => mockUser
              });
            }
            
            // Also override SessionProvider to prevent it from overriding our mock session
            (window as any).SessionProvider = ({ children }: any) => {
              // Store the mock session in context
              const mockContext = {
                value: {
                  data: mockUser,
                  status: 'authenticated',
                  update: async () => mockUser
                }
              };
              return children;
            };
          }
          
          // Clear the switching flag after successful setup
          localStorage.removeItem('isSwitchingUser');
          console.log('SessionMiddleware: Mock session setup complete');
        }
      } catch (error) {
        console.error('SessionMiddleware: Error parsing user session:', error);
        // Clear invalid session
        localStorage.removeItem('userSession');
        localStorage.removeItem('isSwitchingUser');
      }
    }
  }, [router]);

  return <>{children}</>;
}
