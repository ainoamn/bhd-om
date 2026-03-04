'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export interface ImpersonationUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

const ImpersonationContext = createContext<{
  impersonationUser: ImpersonationUser | null;
  isImpersonating: boolean;
  clearImpersonation: () => void;
}>({ impersonationUser: null, isImpersonating: false, clearImpersonation: () => {} });

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const asParam = searchParams?.get('as');
  const [impersonationUser, setImpersonationUser] = useState<ImpersonationUser | null>(null);

  const clearImpersonation = useCallback(() => {
    setImpersonationUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('impersonate');
      const url = new URL(window.location.href);
      url.searchParams.delete('as');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = sessionStorage.getItem('impersonate');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ImpersonationUser;
        setImpersonationUser(parsed);
      } catch {
        sessionStorage.removeItem('impersonate');
        setImpersonationUser(null);
      }
    }

    if (!asParam) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${asParam}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const userData: ImpersonationUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          role: data.role,
        };
        setImpersonationUser(userData);
        sessionStorage.setItem('impersonate', JSON.stringify(userData));
      } catch {
        if (!cancelled) setImpersonationUser(null);
      }
    })();
    return () => { cancelled = true; };
  }, [asParam]);

  const value = useMemo(
    () => ({
      impersonationUser,
      isImpersonating: !!impersonationUser,
      clearImpersonation,
    }),
    [impersonationUser, clearImpersonation]
  );

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

/** يُستدعى من الصفحات التي تحتاج بيانات "خاصتي" — يُرجع المستخدم المعاين إن وُجد وإلا null (يُستخدم session.user) */
export function useEffectiveUser(): ImpersonationUser | null {
  const { impersonationUser, isImpersonating } = useImpersonation();
  return isImpersonating && impersonationUser ? impersonationUser : null;
}
