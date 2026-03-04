/**
 * Mock Session Provider Component
 * مكون مزود جلسة وهمية
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';

interface MockSessionContextType {
  user: any;
  status: 'authenticated' | 'unauthenticated' | 'loading';
  update: (data?: any) => Promise<any>;
}

const MockSessionContext = createContext<MockSessionContextType | null>(null);

export function useMockSession() {
  const context = useContext(MockSessionContext);
  if (!context) {
    throw new Error('useMockSession must be used within MockSessionProvider');
  }
  return context;
}

interface MockSessionProviderProps {
  children: ReactNode;
  user: any;
}

export default function MockSessionProvider({ children, user }: MockSessionProviderProps) {
  const sessionValue: MockSessionContextType = {
    user,
    status: 'authenticated',
    update: async () => user
  };

  return (
    <MockSessionContext.Provider value={sessionValue}>
      {children}
    </MockSessionContext.Provider>
  );
}
