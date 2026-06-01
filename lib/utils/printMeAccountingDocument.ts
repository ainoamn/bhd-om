import { openReceiptPrintWindow, type ReceiptRow } from '@/lib/utils/receiptPrint';

export type MeAccountingDocument = {
  id: string;
  serialNumber?: string;
  type?: string;
  status?: string;
  date?: string;
  totalAmount?: number;
  netAmount?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  reference?: string;
};

const DOC_TITLES: Record<string, { ar: string; en: string }> = {
  INVOICE: { ar: 'فاتورة', en: 'Invoice' },
  RECEIPT: { ar: 'إيصال', en: 'Receipt' },
  QUOTE: { ar: 'عرض سعر', en: 'Quote' },
  PAYMENT: { ar: 'دفعة', en: 'Payment' },
  DEPOSIT: { ar: 'عربون', en: 'Deposit' },
};

export function printMeAccountingDocument(
  doc: MeAccountingDocument,
  locale: string,
  docType: 'INVOICE' | 'RECEIPT'
): void {
  const ar = locale === 'ar';
  const titles = DOC_TITLES[docType] || DOC_TITLES.RECEIPT;
  const date = doc.date ? new Date(doc.date) : new Date();
  const amount = doc.totalAmount ?? doc.netAmount;
  const desc = ar ? doc.descriptionAr : doc.descriptionEn || doc.descriptionAr;

  const rows: ReceiptRow[] = [
    {
      labelAr: 'الوصف',
      labelEn: 'Description',
      value: desc || '—',
    },
  ];
  if (amount != null) {
    rows.push({
      labelAr: 'المبلغ',
      labelEn: 'Amount',
      value: `${Number(amount).toLocaleString('en-US')} OMR`,
    });
  }
  if (doc.reference) {
    rows.push({
      labelAr: 'المرجع',
      labelEn: 'Reference',
      value: doc.reference,
    });
  }
  rows.push({
    labelAr: 'التاريخ',
    labelEn: 'Date',
    value: date.toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' }),
  });
  if (doc.status) {
    rows.push({
      labelAr: 'الحالة',
      labelEn: 'Status',
      value: doc.status,
    });
  }

  openReceiptPrintWindow({
    docTitleAr: titles.ar,
    docTitleEn: titles.en,
    serialNumber: doc.serialNumber,
    date,
    locale,
    rows,
    autoPrint: true,
  });
}

export async function fetchAndPrintMeAccountingDocument(
  documentId: string,
  locale: string,
  docType: 'INVOICE' | 'RECEIPT'
): Promise<boolean> {
  const res = await fetch(`/api/me/accounting-documents/${encodeURIComponent(documentId)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const doc = (await res.json()) as MeAccountingDocument;
  if (!doc?.id) return false;
  printMeAccountingDocument(doc, locale, docType);
  return true;
}
