'use client';

import { useSession } from 'next-auth/react';
import { BhdAppSwitcher } from '@/components/bhd/BhdAppSwitcher';
import { SessionKeepAlive } from '@/components/auth/SessionKeepAlive';

export default function BhdAccountChrome() {
  const { data: session, status } = useSession();
  if (status !== 'authenticated' || !session?.user) return null;

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isSuperAdmin?: boolean;
  };

  return (
    <>
      <SessionKeepAlive />
      <BhdAppSwitcher
        user={{
          name: user.name?.trim() || user.email || 'BHD',
          email: user.email || '',
          picture: user.image || null,
        }}
        platformAdmin={user.isSuperAdmin === true}
        onSignOut={() => {
          window.location.assign('/api/auth/bhd/logout');
        }}
      />
    </>
  );
}
