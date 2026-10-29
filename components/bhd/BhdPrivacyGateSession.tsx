'use client';

import { useSession } from 'next-auth/react';
import { BhdPrivacyGate } from '@/components/bhd/BhdPrivacyGate';

export function BhdPrivacyGateSession() {
  const { data: session, status } = useSession();
  if (status !== 'authenticated' || !session?.user) return null;
  const user = session.user as { email?: string | null; bhdSub?: string | null; id?: string };
  const productSub = user.bhdSub || user.id;
  if (!productSub) return null;
  return <BhdPrivacyGate productSub={productSub} productEmail={user.email} />;
}
