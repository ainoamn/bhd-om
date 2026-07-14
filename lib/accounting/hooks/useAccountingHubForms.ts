'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountingDocument, DocumentType } from '@/lib/data/accounting';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';
import { isAccountingHubModalActionTab } from '@/lib/accounting/ui/hubTabIds';
import {
  createEmptyAccountForm,
  createEmptyChequeForm,
  createEmptyDocForm,
  createEmptyJournalForm,
  docFormFromInvoiceScan,
  type InvoiceScanDraft,
} from '@/lib/accounting/forms/formFactories';
import type {
  AccountingDocFormState,
  ChequeFormState,
  JournalFormState,
} from '@/lib/accounting/types/formTypes';
import type { AccountFormState } from '@/lib/accounting/forms/formFactories';
import { clearDraft } from '@/lib/utils/draftStorage';
import { ACCOUNTING_DRAFT_KEYS } from '@/lib/accounting/ui/draftKeys';

type UseAccountingHubFormsOptions = {
  navigate: (tab: AccountingHubTabId) => void;
  tabFromUrl: AccountingHubTabId;
  actionFromUrl: string | null;
  urlPropertyId: string;
  urlProjectId: string;
  urlContractId: string;
};

export function useAccountingHubForms(opts: UseAccountingHubFormsOptions) {
  const { navigate, tabFromUrl, actionFromUrl, urlPropertyId, urlProjectId, urlContractId } = opts;

  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCheque, setShowAddCheque] = useState(false);
  const [showInvoiceScan, setShowInvoiceScan] = useState(false);
  const [printDocument, setPrintDocument] = useState<AccountingDocument | null>(null);

  const [accountForm, setAccountForm] = useState<AccountFormState>(() => createEmptyAccountForm());
  const [journalForm, setJournalForm] = useState<JournalFormState>(() => createEmptyJournalForm());
  const [docForm, setDocForm] = useState<AccountingDocFormState>(() => createEmptyDocForm());
  const [chequeForm, setChequeForm] = useState<ChequeFormState>(() => createEmptyChequeForm());

  const openDocumentModule = useCallback(
    (docType: DocumentType, preset?: { descriptionAr?: string; descriptionEn?: string }) => {
      clearDraft(ACCOUNTING_DRAFT_KEYS.document);
      setDocForm(createEmptyDocForm(docType, preset));
      setShowAddDocument(true);
      navigate('documents');
    },
    [navigate]
  );

  const applyInvoiceScan = useCallback(
    (draft: InvoiceScanDraft) => {
      clearDraft(ACCOUNTING_DRAFT_KEYS.document);
      setDocForm(docFormFromInvoiceScan(draft));
      setShowAddDocument(true);
      navigate('documents');
    },
    [navigate]
  );

  const openAddDocument = useCallback(() => {
    setDocForm(createEmptyDocForm('RECEIPT'));
    setShowAddDocument(true);
  }, []);

  const openAddJournal = useCallback(() => {
    setJournalForm(createEmptyJournalForm());
    setShowAddJournal(true);
  }, []);

  const openAddAccount = useCallback(() => {
    setAccountForm(createEmptyAccountForm());
    setShowAddAccount(true);
  }, []);

  const openAddCheque = useCallback((overrides?: Parameters<typeof createEmptyChequeForm>[0]) => {
    setChequeForm(createEmptyChequeForm(overrides));
    setShowAddCheque(true);
  }, []);

  useEffect(() => {
    if (actionFromUrl !== 'add') return;
    if (!isAccountingHubModalActionTab(tabFromUrl)) return;
    if (tabFromUrl === 'journal') setShowAddJournal(true);
    else if (tabFromUrl === 'accounts') setShowAddAccount(true);
    else if (tabFromUrl === 'documents') setShowAddDocument(true);
    else if (tabFromUrl === 'cheques') {
      setChequeForm(
        createEmptyChequeForm({
          propertyId: urlPropertyId,
          projectId: urlProjectId,
          contractId: urlContractId,
        })
      );
      setShowAddCheque(true);
    }
  }, [actionFromUrl, tabFromUrl, urlPropertyId, urlProjectId, urlContractId]);

  return {
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
    openDocumentModule,
    applyInvoiceScan,
    openAddDocument,
    openAddJournal,
    openAddAccount,
    openAddCheque,
  };
}
