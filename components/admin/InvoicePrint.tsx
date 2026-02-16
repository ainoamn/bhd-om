'use client';

import { useRef } from 'react';
import type { AccountingDocument } from '@/lib/data/accounting';
import { getContactDisplayFull } from '@/lib/data/addressBook';
import { getAccountById } from '@/lib/data/accounting';
import type { Contact } from '@/lib/data/addressBook';

const DOC_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  INVOICE: { ar: 'فاتورة بيع', en: 'Sales Invoice' },
  RECEIPT: { ar: 'إيصال استلام', en: 'Receipt' },
  QUOTE: { ar: 'عرض سعر', en: 'Quote' },
  DEPOSIT: { ar: 'إيصال عربون', en: 'Deposit Receipt' },
  PAYMENT: { ar: 'إيصال دفعة', en: 'Payment Receipt' },
  PURCHASE_INV: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
  PURCHASE_ORDER: { ar: 'أمر شراء', en: 'Purchase Order' },
};

interface InvoicePrintProps {
  doc: AccountingDocument;
  contact?: Contact | null;
  locale: string;
  companyName?: string;
  onClose?: () => void;
}

export default function InvoicePrint({ doc, contact, locale, companyName = 'شركة', onClose }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const ar = locale === 'ar';

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${ar ? 'rtl' : 'ltr'}" lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <title>${ar ? DOC_TYPE_LABELS[doc.type]?.ar : DOC_TYPE_LABELS[doc.type]?.en} ${doc.serialNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: #1f2937; }
          .container { max-width: 700px; margin: 0 auto; }
          .header { border-bottom: 2px solid #8B6F47; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; color: #8B6F47; }
          .header .serial { font-size: 18px; font-weight: bold; margin-top: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .box { padding: 12px; background: #f9fafb; border-radius: 8px; }
          .box h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
          .box p { font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          th, td { padding: 10px 12px; text-align: ${ar ? 'right' : 'left'}; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-size: 12px; color: #6b7280; }
          .text-end { text-align: ${ar ? 'left' : 'right'} !important; }
          .totals { margin-top: 24px; }
          .totals-row { display: flex; justify-content: ${ar ? 'flex-start' : 'flex-end'}; gap: 24px; padding: 8px 0; }
          .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #8B6F47; margin-top: 8px; padding-top: 12px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const typeLabel = DOC_TYPE_LABELS[doc.type] || { ar: doc.type, en: doc.type };
  const contactName = contact ? getContactDisplayFull(contact, locale) : '—';

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">{ar ? typeLabel.ar : typeLabel.en} - {doc.serialNumber}</h3>
        <div className="flex gap-2">
          {onClose && (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              {ar ? 'إغلاق' : 'Close'}
            </button>
          )}
          <button type="button" onClick={handlePrint} className="px-4 py-2 rounded-lg font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] flex items-center gap-1">
            🖨️ {ar ? 'طباعة' : 'Print'}
          </button>
        </div>
      </div>
      <div ref={printRef} className="p-6">
        <div className="header">
          <h1>{companyName}</h1>
          <p className="serial">{ar ? typeLabel.ar : typeLabel.en} رقم: {doc.serialNumber}</p>
          <p className="text-sm text-gray-500 mt-1">{new Date(doc.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' })}</p>
        </div>
        <div className="grid">
          <div className="box">
            <h3>{(doc.type === 'PURCHASE_INV' || doc.type === 'PURCHASE_ORDER') ? (ar ? 'المورد' : 'Supplier') : (ar ? 'العميل / المستلم' : 'Customer / Payee')}</h3>
            <p>{contactName}</p>
          </div>
          <div className="box">
            <h3>{ar ? 'التاريخ' : 'Date'}</h3>
            <p>{new Date(doc.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</p>
          </div>
          {doc.dueDate && (
            <div className="box">
              <h3>{ar ? 'تاريخ الاستحقاق' : 'Due date'}</h3>
              <p>{new Date(doc.dueDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</p>
            </div>
          )}
          {doc.purchaseOrder && (
            <div className="box">
              <h3>{ar ? 'أمر شراء' : 'Purchase order'}</h3>
              <p>{doc.purchaseOrder}</p>
            </div>
          )}
          {doc.reference && (
            <div className="box">
              <h3>{ar ? 'المرجع' : 'Reference'}</h3>
              <p>{doc.reference}</p>
            </div>
          )}
          {doc.branch && (
            <div className="box">
              <h3>{ar ? 'الفرع' : 'Branch'}</h3>
              <p>{doc.branch}</p>
            </div>
          )}
        </div>
        {doc.items && doc.items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{ar ? 'الوصف' : 'Description'}</th>
                {doc.items.some((i) => i.accountId) && <th>{ar ? 'الحساب' : 'Account'}</th>}
                <th>{ar ? 'الكمية' : 'Qty'}</th>
                <th className="text-end">{ar ? 'السعر' : 'Price'}</th>
                <th className="text-end">{ar ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, i) => {
                const acc = item.accountId ? getAccountById(item.accountId) : null;
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{ar ? item.descriptionAr : item.descriptionEn || item.descriptionAr}</td>
                    {doc.items!.some((x) => x.accountId) && (
                      <td>{acc ? (ar ? acc.nameAr : acc.nameEn || acc.nameAr) : '—'}</td>
                    )}
                    <td>{item.quantity}</td>
                    <td className="text-end">{item.unitPrice.toLocaleString()} {doc.currency || 'ر.ع'}</td>
                    <td className="text-end">{item.amount.toLocaleString()} {doc.currency || 'ر.ع'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-4">
            <p className="text-gray-700">{ar ? doc.descriptionAr : doc.descriptionEn || doc.descriptionAr || '—'}</p>
          </div>
        )}
        <div className="totals">
          {doc.vatRate && doc.vatRate > 0 && (
            <>
              <div className="totals-row">
                <span>{ar ? 'المجموع الفرعي' : 'Subtotal'}:</span>
                <span>{doc.amount.toLocaleString()} {doc.currency || 'ر.ع'}</span>
              </div>
              <div className="totals-row">
                <span>{ar ? `إجمالي ضريبة القيمة المضافة` : `Total VAT`}:</span>
                <span>{doc.vatAmount!.toLocaleString()} {doc.currency || 'ر.ع'}</span>
              </div>
            </>
          )}
          <div className="totals-row grand">
            <span>{ar ? 'المجموع' : 'Total'}:</span>
            <span>{doc.totalAmount.toLocaleString()} {doc.currency || 'ر.ع'}</span>
          </div>
        </div>
        {doc.attachments && doc.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">{ar ? 'مرفقات' : 'Attachments'}</h4>
            <ul className="space-y-1">
              {doc.attachments.map((att, i) => (
                <li key={i}>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] hover:underline">{att.name}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="footer">
          {ar ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}
        </div>
      </div>
    </div>
  );
}
