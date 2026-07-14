import { getNextDocumentSerial, type AccountType, type DocumentType } from '@/lib/data/accounting';
import type {
  AccountingDocFormState,
  ChequeFormState,
  JournalFormState,
} from '@/lib/accounting/types/formTypes';

export type InvoiceScanDraft = {
  type: DocumentType;
  date?: string;
  dueDate?: string;
  amount?: string;
  vatRate?: number;
  reference?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  attachments?: { url: string; name: string }[];
};

export type AccountFormState = {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
};

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function docTypeUsesLineItems(docType: DocumentType): boolean {
  return ['INVOICE', 'QUOTE', 'PURCHASE_INV', 'PURCHASE_ORDER', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(docType);
}

export function createEmptyDocForm(
  docType: DocumentType = 'RECEIPT',
  preset?: { descriptionAr?: string; descriptionEn?: string },
  now = new Date()
): AccountingDocFormState {
  const today = todayIso(now);
  return {
    type: docType,
    serialNumber: getNextDocumentSerial(docType),
    amount: '',
    contactId: '',
    bankAccountId: '',
    propertyId: '',
    projectId: '',
    descriptionAr: preset?.descriptionAr ?? '',
    descriptionEn: preset?.descriptionEn ?? '',
    date: today,
    dueDate: today,
    currency: 'OMR',
    useLineItems: docTypeUsesLineItems(docType),
    vatRate: 0,
    purchaseOrder: '',
    reference: '',
    branch: '',
    attachments: [],
    items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }],
  };
}

export function docFormFromInvoiceScan(draft: InvoiceScanDraft, now = new Date()): AccountingDocFormState {
  const today = todayIso(now);
  const docType = draft.type;
  return {
    type: docType,
    serialNumber: getNextDocumentSerial(docType),
    amount: draft.amount || '',
    contactId: '',
    bankAccountId: '',
    propertyId: '',
    projectId: '',
    descriptionAr: draft.descriptionAr ?? '',
    descriptionEn: draft.descriptionEn ?? '',
    date: draft.date || today,
    dueDate: draft.dueDate || draft.date || today,
    currency: 'OMR',
    useLineItems: docTypeUsesLineItems(docType),
    vatRate: draft.vatRate ?? 0,
    purchaseOrder: '',
    reference: draft.reference || '',
    branch: '',
    attachments: draft.attachments ?? [],
    items: [{ descriptionAr: draft.descriptionAr || '', quantity: 1, unitPrice: draft.amount || '', accountId: '' }],
  };
}

export function createEmptyJournalForm(now = new Date()): JournalFormState {
  return {
    date: todayIso(now),
    descriptionAr: '',
    descriptionEn: '',
    lines: [{ accountId: '', debit: '', credit: '', desc: '' }],
  };
}

export function createEmptyAccountForm(type: AccountType = 'EXPENSE'): AccountFormState {
  return { code: '', nameAr: '', nameEn: '', type };
}

export function createEmptyChequeForm(
  overrides?: Partial<Pick<ChequeFormState, 'propertyId' | 'projectId' | 'contractId'>>,
  now = new Date()
): ChequeFormState {
  const today = todayIso(now);
  return {
    chequeNumber: '',
    amount: '',
    dueDate: today,
    bankName: '',
    descriptionAr: '',
    contactId: '',
    propertyId: overrides?.propertyId ?? '',
    projectId: overrides?.projectId ?? '',
    contractId: overrides?.contractId ?? '',
    date: today,
  };
}
