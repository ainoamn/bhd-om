'use client';

import DraftBanner from '@/components/admin/DraftBanner';
import AccountingHubFilterBar from '@/components/admin/accounting/AccountingHubFilterBar';
import AccountingHubTabs from '@/components/admin/accounting/AccountingHubTabs';
import AccountingHubModals from '@/components/admin/accounting/AccountingHubModals';
import type { AccountingHubController } from '@/lib/accounting/hooks/useAccountingHubController';

export default function AccountingHubShell(props: AccountingHubController) {
  const {
    ar,
    locale,
    activeTab,
    setTab,
    contacts,
    hub,
    analytics,
    forms,
    reportsProps,
    mounted,
    fiscalForm,
    setFiscalForm,
    onReceiptConfirmed,
    onLockPeriod,
    onSaveSettings,
  } = props;

  return (
    <div className="space-y-6" data-testid="accounting-hub">
      <DraftBanner />
      <AccountingHubFilterBar
        ar={ar}
        locale={locale}
        activeTab={activeTab}
        searchQuery={hub.searchQuery}
        setSearchQuery={hub.setSearchQuery}
        filterFromDate={hub.filterFromDate}
        setFilterFromDate={hub.setFilterFromDate}
        filterToDate={hub.filterToDate}
        setFilterToDate={hub.setFilterToDate}
        filterContactId={hub.filterContactId}
        setFilterContactId={hub.setFilterContactId}
        filterBankId={hub.filterBankId}
        setFilterBankId={hub.setFilterBankId}
        filterPropertyId={hub.filterPropertyId}
        setFilterPropertyId={hub.setFilterPropertyId}
        filterProjectId={hub.filterProjectId}
        setFilterProjectId={hub.setFilterProjectId}
        filterDocType={hub.filterDocType}
        setFilterDocType={hub.setFilterDocType}
        contacts={contacts}
        bankAccounts={hub.bankAccounts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
      />

      <AccountingHubTabs
        ar={ar}
        locale={locale}
        activeTab={activeTab}
        mounted={mounted}
        setTab={setTab}
        contacts={contacts}
        hub={hub}
        analytics={analytics}
        forms={forms}
        reports={reportsProps}
        fiscalForm={fiscalForm}
        setFiscalForm={setFiscalForm}
        onReceiptConfirmed={onReceiptConfirmed}
        onLockPeriod={onLockPeriod}
        onSaveSettings={onSaveSettings}
      />

      <AccountingHubModals ar={ar} locale={locale} contacts={contacts} setTab={setTab} hub={hub} forms={forms} />
    </div>
  );
}
