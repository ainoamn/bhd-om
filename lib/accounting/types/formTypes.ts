import type { DocumentType } from '@/lib/data/accounting';

export type DocFormLineItem = {
  descriptionAr: string;
  quantity: number;
  unitPrice: string;
  accountId: string;
};

export type AccountingDocFormState = {
  type: DocumentType;
  serialNumber: string;
  amount: string;
  contactId: string;
  bankAccountId: string;
  propertyId: string;
  projectId: string;
  descriptionAr: string;
  descriptionEn: string;
  date: string;
  dueDate: string;
  currency: string;
  useLineItems: boolean;
  vatRate: number;
  purchaseOrder: string;
  reference: string;
  branch: string;
  attachments: { url: string; name: string }[];
  items: DocFormLineItem[];
};

export type ChequeFormState = {
  chequeNumber: string;
  amount: string;
  dueDate: string;
  bankName: string;
  descriptionAr: string;
  contactId: string;
  propertyId: string;
  projectId: string;
  contractId: string;
  date: string;
};

export type JournalLineFormState = {
  accountId: string;
  debit: string;
  credit: string;
  desc: string;
};

export type JournalFormState = {
  date: string;
  descriptionAr: string;
  descriptionEn: string;
  lines: JournalLineFormState[];
};
