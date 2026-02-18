/**
 * Global Intelligent Accounting & ERP Platform
 * Domain Types - IFRS / Accrual / Double Entry
 * لا عملية بدون قيد | لا قيد بدون مستند | لا تعديل بدون أثر تدقيقي
 */

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE';

export type DocumentType =
  | 'INVOICE'
  | 'RECEIPT'
  | 'QUOTE'
  | 'DEPOSIT'
  | 'PAYMENT'
  | 'JOURNAL'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PURCHASE_INV'
  | 'PURCHASE_ORDER'
  | 'OTHER';

export type DocumentCategory = 'SALES' | 'PURCHASE';

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'PAID'
  | 'CANCELLED';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'REVERSE'
  | 'PERIOD_CLOSE'
  | 'PERIOD_LOCK';

export interface ChartAccount {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  type: AccountType;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface JournalEntry {
  id: string;
  version: number;
  serialNumber: string;
  date: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  descriptionAr?: string;
  descriptionEn?: string;
  documentType?: DocumentType;
  documentId?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  bookingId?: string;
  contractId?: string;
  status: DocumentStatus;
  replacedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingDocument {
  id: string;
  serialNumber: string;
  type: DocumentType;
  category?: DocumentCategory;
  status: DocumentStatus;
  date: string;
  dueDate?: string;
  contactId?: string;
  bankAccountId?: string;
  propertyId?: number;
  projectId?: number;
  bookingId?: string;
  contractId?: string;
  amount: number;
  currency: string;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  descriptionAr?: string;
  descriptionEn?: string;
  items?: DocumentItem[];
  journalEntryId?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentReference?: string;
  chequeNumber?: string;
  chequeDueDate?: string;
  chequeBankName?: string;
  notes?: string;
  attachments?: { url: string; name: string }[];
  purchaseOrder?: string;
  reference?: string;
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  descriptionAr: string;
  descriptionEn?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountId?: string;
}

export interface FiscalPeriod {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: 'ACCOUNT' | 'JOURNAL_ENTRY' | 'DOCUMENT' | 'PERIOD';
  entityId: string;
  userId?: string;
  reason?: string;
  previousState?: string;
  newState?: string;
}
