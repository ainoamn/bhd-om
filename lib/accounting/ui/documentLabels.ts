import type { DocumentType } from '@/lib/data/accounting';

/** Document type labels — shared by accounting UI */
export const DOC_TYPE_LABELS: Record<DocumentType, { ar: string; en: string }> = {
  INVOICE: { ar: 'فاتورة', en: 'Invoice' },
  RECEIPT: { ar: 'إيصال', en: 'Receipt' },
  QUOTE: { ar: 'عرض سعر', en: 'Quote' },
  DEPOSIT: { ar: 'عربون', en: 'Deposit' },
  PAYMENT: { ar: 'دفعة', en: 'Payment' },
  JOURNAL: { ar: 'قيد', en: 'Journal' },
  CREDIT_NOTE: { ar: 'إشعار دائن', en: 'Credit Note' },
  DEBIT_NOTE: { ar: 'إشعار مدين', en: 'Debit Note' },
  PURCHASE_INV: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
  PURCHASE_ORDER: { ar: 'أمر شراء', en: 'Purchase Order' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};
