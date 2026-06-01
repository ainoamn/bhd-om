import type { DocumentType } from '@/lib/data/accounting';

export const SALES_MODULES = [
  { id: 'quotes', labelAr: 'عروض أسعار وفواتير مبدئية', labelEn: 'Quotes & Proforma Invoices', icon: 'documentText' as const },
  { id: 'invoices', labelAr: 'فواتير بيع', labelEn: 'Sales Invoices', icon: 'archive' as const },
  { id: 'receipts', labelAr: 'سندات العملاء', labelEn: 'Customer Receipts', icon: 'archive' as const },
  { id: 'scheduled', labelAr: 'فواتير مجدولة', labelEn: 'Scheduled Invoices', icon: 'calendar' as const },
  { id: 'credit-notes', labelAr: 'إشعارات دائنة', labelEn: 'Credit Notes', icon: 'documentText' as const },
  { id: 'cash-inv', labelAr: 'فواتير نقدية', labelEn: 'Cash Invoices', icon: 'archive' as const },
  { id: 'delivery', labelAr: 'إشعارات تسليم', labelEn: 'Delivery Notes', icon: 'documentText' as const },
  { id: 'api-inv', labelAr: 'فواتير بيع من ال API', labelEn: 'Sales Invoices from API', icon: 'cog' as const },
];

export const PURCHASES_MODULES = [
  { id: 'purch-inv', labelAr: 'فواتير مشتريات', labelEn: 'Purchase Invoices', icon: 'archive' as const },
  { id: 'supp-receipts', labelAr: 'سندات الموردين', labelEn: 'Supplier Receipts', icon: 'archive' as const },
  { id: 'cash-exp', labelAr: 'مصروفات نقدية', labelEn: 'Cash Expenses', icon: 'archive' as const },
  { id: 'debit-notes', labelAr: 'إشعارات مدينة', labelEn: 'Debit Notes', icon: 'documentText' as const },
  { id: 'po', labelAr: 'أوامر شراء', labelEn: 'Purchase Orders', icon: 'documentText' as const },
];

export function salesModuleDocType(id: string): DocumentType | null {
  const map: Record<string, DocumentType> = {
    quotes: 'QUOTE',
    invoices: 'INVOICE',
    receipts: 'RECEIPT',
    scheduled: 'INVOICE',
    'credit-notes': 'CREDIT_NOTE',
    'cash-inv': 'INVOICE',
    delivery: 'OTHER',
    'api-inv': 'INVOICE',
  };
  return map[id] ?? null;
}

export function purchasesModuleDocType(id: string): DocumentType | null {
  const map: Record<string, DocumentType> = {
    'purch-inv': 'PURCHASE_INV',
    'supp-receipts': 'PAYMENT',
    'cash-exp': 'PAYMENT',
    'debit-notes': 'DEBIT_NOTE',
    po: 'PURCHASE_ORDER',
  };
  return map[id] ?? null;
}

export function salesModulePreset(id: string): { descriptionAr?: string; descriptionEn?: string } {
  if (id === 'delivery') return { descriptionAr: 'إشعار تسليم', descriptionEn: 'Delivery note' };
  if (id === 'scheduled') return { descriptionAr: 'فاتورة مجدولة', descriptionEn: 'Scheduled invoice' };
  if (id === 'cash-inv') return { descriptionAr: 'فاتورة نقدية', descriptionEn: 'Cash invoice' };
  if (id === 'api-inv') return { descriptionAr: 'فاتورة بيع API', descriptionEn: 'API sales invoice' };
  if (id === 'credit-notes') return { descriptionAr: 'إشعار دائن', descriptionEn: 'Credit note' };
  return {};
}
