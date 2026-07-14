'use client';

import InvoicePrint from '@/components/admin/InvoicePrint';
import DocumentPrintModal from '@/components/admin/DocumentPrintModal';
import AccountingAddAccountModal from '@/components/admin/accounting/AccountingAddAccountModal';
import AccountingAddDocumentModal from '@/components/admin/accounting/AccountingAddDocumentModal';
import AccountingAddJournalModal from '@/components/admin/accounting/AccountingAddJournalModal';
import AccountingAddChequeModal from '@/components/admin/accounting/AccountingAddChequeModal';
import AccountingInvoiceScanModal from '@/components/admin/accounting/AccountingInvoiceScanModal';
import type { AccountingHubTabId } from '@/components/admin/accounting/AccountingHubFilterBar';
import type { Contact } from '@/lib/data/addressBook';
import type { useAccountingHub } from '@/lib/accounting/hooks/useAccountingHub';
import type { useAccountingHubForms } from '@/lib/accounting/hooks/useAccountingHubForms';

export type AccountingHubModalsProps = {
  ar: boolean;
  locale: string;
  contacts: Contact[];
  setTab: (tab: AccountingHubTabId) => void;
  hub: ReturnType<typeof useAccountingHub>;
  forms: ReturnType<typeof useAccountingHubForms>;
};

export default function AccountingHubModals(props: AccountingHubModalsProps) {
  const { ar, locale, contacts, setTab, hub, forms } = props;

  return (
    <>
      <AccountingAddDocumentModal
        ar={ar}
        locale={locale}
        open={forms.showAddDocument}
        onClose={() => forms.setShowAddDocument(false)}
        docForm={forms.docForm}
        setDocForm={forms.setDocForm}
        contacts={contacts}
        accounts={hub.accounts}
        bankAccounts={hub.bankAccounts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
        useDb={hub.useDb}
        onCreated={hub.loadData}
      />

      <AccountingAddChequeModal
        ar={ar}
        locale={locale}
        open={forms.showAddCheque}
        onClose={() => forms.setShowAddCheque(false)}
        chequeForm={forms.chequeForm}
        setChequeForm={forms.setChequeForm}
        contacts={contacts}
        mergedProperties={hub.mergedProperties}
        projectsList={hub.projectsList}
        getPropertyDisplay={hub.getPropertyDisplay}
        getProjectDisplay={hub.getProjectDisplay}
        useDb={hub.useDb}
        onCreated={async () => {
          await hub.loadData();
          setTab('cheques');
        }}
      />

      <AccountingAddJournalModal
        ar={ar}
        locale={locale}
        open={forms.showAddJournal}
        onClose={() => forms.setShowAddJournal(false)}
        journalForm={forms.journalForm}
        setJournalForm={forms.setJournalForm}
        accounts={hub.accounts}
        useDb={hub.useDb}
        onCreated={hub.loadData}
      />

      {forms.printDocument && (
        <DocumentPrintModal onClose={() => forms.setPrintDocument(null)} ar={ar}>
          <InvoicePrint
            doc={forms.printDocument}
            contact={
              forms.printDocument.contactId
                ? contacts.find((c) => c.id === forms.printDocument!.contactId) ?? null
                : null
            }
            locale={locale}
            onClose={() => forms.setPrintDocument(null)}
          />
        </DocumentPrintModal>
      )}

      <AccountingAddAccountModal
        ar={ar}
        open={forms.showAddAccount}
        onClose={() => forms.setShowAddAccount(false)}
        accountForm={forms.accountForm}
        setAccountForm={forms.setAccountForm}
        onCreated={hub.loadData}
      />

      <AccountingInvoiceScanModal
        ar={ar}
        open={forms.showInvoiceScan}
        onClose={() => forms.setShowInvoiceScan(false)}
        onApply={forms.applyInvoiceScan}
      />
    </>
  );
}
