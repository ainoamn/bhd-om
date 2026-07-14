'use client';

import { useAccountingHubController } from '@/lib/accounting/hooks/useAccountingHubController';
import AccountingHubShell from './accounting/AccountingHubShell';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';

export type { AccountingInitialData };

export default function AccountingSection(props: { initialData?: AccountingInitialData }) {
  const controller = useAccountingHubController(props.initialData);
  return <AccountingHubShell {...controller} />;
}
