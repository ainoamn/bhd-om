'use client';

import InvoicePrint from '@/components/admin/InvoicePrint';
import DocumentPrintModal from '@/components/admin/DocumentPrintModal';
import AccountingAddAccountModal from '@/components/admin/accounting/AccountingAddAccountModal';
import AccountingAddDocumentModal from '@/components/admin/accounting/AccountingAddDocumentModal';
import AccountingAddJournalModal from '@/components/admin/accounting/AccountingAddJournalModal';
import AccountingAddChequeModal from '@/components/admin/accounting/AccountingAddChequeModal';
import AccountingInvoiceScanModal from '@/components/admin/accounting/AccountingInvoiceScanModal';
import type { AccountingHubTabId } from '@/components/admin/accounting/AccountingHubFilterBar';
import type { ChartAccount, AccountingDocument } from '@/lib/data/accounting';
import type { Contact } from '@/lib/data/addressBook';
import type { BankAccount } from '@/lib/data/bankAccounts';
import type { Property } from '@/lib/data/properties';
import type {
  AccountingDocFormState,
  ChequeFormState,
  JournalFormState,
} from '@/lib/accounting/types/formTypes';
import type { AccountFormState, InvoiceScanDraft } from '@/lib/accounting/forms/formFactories';

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

export type AccountingHubModalsProps = {
  ar: boolean;
  locale: string;
  useDb: boolean;
  contacts: Contact[];
  accounts: ChartAccount[];
  bankAccounts: BankAccount[];
  mergedProperties: Property[];
  projectsList: ProjectListItem[];
  getPropertyDisplay: (p: Property) => string;
  getProjectDisplay: (p: ProjectListItem) => string;
  loadData: () => void | Promise<void>;
  setTab: (tab: AccountingHubTabId) => void;
  showAddDocument: boolean;
  setShowAddDocument: (open: boolean) => void;
  showAddJournal: boolean;
  setShowAddJournal: (open: boolean) => void;
  showAddAccount: boolean;
  setShowAddAccount: (open: boolean) => void;
  showAddCheque: boolean;
  setShowAddCheque: (open: boolean) => void;
  showInvoiceScan: boolean;
  setShowInvoiceScan: (open: boolean) => void;
  printDocument: AccountingDocument | null;
  setPrintDocument: (doc: AccountingDocument | null) => void;
  accountForm: AccountFormState;
  setAccountForm: React.Dispatch<React.SetStateAction<AccountFormState>>;
  journalForm: JournalFormState;
  setJournalForm: React.Dispatch<React.SetStateAction<JournalFormState>>;
  docForm: AccountingDocFormState;
  setDocForm: React.Dispatch<React.SetStateAction<AccountingDocFormState>>;
  chequeForm: ChequeFormState;
  setChequeForm: React.Dispatch<React.SetStateAction<ChequeFormState>>;
  applyInvoiceScan: (draft: InvoiceScanDraft) => void;
};

export default function AccountingHubModals(props: AccountingHubModalsProps) {
  const {
    ar,
    locale,
    useDb,
    contacts,
    accounts,
    bankAccounts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    loadData,
    setTab,
    showAddDocument,
    setShowAddDocument,
    showAddJournal,
    setShowAddJournal,
    showAddAccount,
    setShowAddAccount,
    showAddCheque,
    setShowAddCheque,
    showInvoiceScan,
    setShowInvoiceScan,
    printDocument,
    setPrintDocument,
    accountForm,
    setAccountForm,
    journalForm,
    setJournalForm,
    docForm,
    setDocForm,
    chequeForm,
    setChequeForm,
    applyInvoiceScan,
  } = props;

  return (
    <>
      <AccountingAddDocumentModal
        ar={ar}
        locale={locale}
        open={showAddDocument}
        onClose={() => setShowAddDocument(false)}
        docForm={docForm}
        setDocForm={setDocForm}
        contacts={contacts}
        accounts={accounts}
        bankAccounts={bankAccounts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
        useDb={useDb}
        onCreated={loadData}
      />

      <AccountingAddChequeModal
        ar={ar}
        locale={locale}
        open={showAddCheque}
        onClose={() => setShowAddCheque(false)}
        chequeForm={chequeForm}
        setChequeForm={setChequeForm}
        contacts={contacts}
        mergedProperties={mergedProperties}
        projectsList={projectsList}
        getPropertyDisplay={getPropertyDisplay}
        getProjectDisplay={getProjectDisplay}
        useDb={useDb}
        onCreated={async () => {
          await loadData();
          setTab('cheques');
        }}
      />

      <AccountingAddJournalModal
        ar={ar}
        locale={locale}
        open={showAddJournal}
        onClose={() => setShowAddJournal(false)}
        journalForm={journalForm}
        setJournalForm={setJournalForm}
        accounts={accounts}
        useDb={useDb}
        onCreated={loadData}
      />

      {printDocument && (
        <DocumentPrintModal onClose={() => setPrintDocument(null)} ar={ar}>
          <InvoicePrint
            doc={printDocument}
            contact={printDocument.contactId ? contacts.find((c) => c.id === printDocument.contactId) ?? null : null}
            locale={locale}
            onClose={() => setPrintDocument(null)}
          />
        </DocumentPrintModal>
      )}

      <AccountingAddAccountModal
        ar={ar}
        open={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        onCreated={loadData}
      />

      <AccountingInvoiceScanModal
        ar={ar}
        open={showInvoiceScan}
        onClose={() => setShowInvoiceScan(false)}
        onApply={applyInvoiceScan}
      />
    </>
  );
}
