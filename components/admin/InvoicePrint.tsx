'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccountingDocument } from '@/lib/data/accounting';
import { getContactDisplayByLevel } from '@/lib/data/addressBook';
import { getAccountById, getAccountDisplayByLevel } from '@/lib/data/accounting';
import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate, getTemplateTypeForDocType } from '@/lib/data/documentTemplates';
import { SIGNATURE_SIZE, STAMP_SIZE, LOGO_SIZE_DEFAULT } from '@/lib/data/documentTemplateConstants';
import type { Contact } from '@/lib/data/addressBook';
import { getPropertyById, getPropertyDisplayByLevel } from '@/lib/data/properties';
import { getStoredPrintOptions, savePrintOptions, type ContactDisplayLevel, type PropertyDisplayLevel, type AccountDisplayLevel } from '@/lib/data/printOptions';

const DOC_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  INVOICE: { ar: 'فاتورة بيع', en: 'Sales Invoice' },
  RECEIPT: { ar: 'إيصال استلام', en: 'Receipt' },
  QUOTE: { ar: 'عرض سعر', en: 'Quote' },
  DEPOSIT: { ar: 'إيصال عربون', en: 'Deposit Receipt' },
  PAYMENT: { ar: 'إيصال دفعة', en: 'Payment Receipt' },
  CREDIT_NOTE: { ar: 'إشعار دائن', en: 'Credit Note' },
  DEBIT_NOTE: { ar: 'إشعار مدين', en: 'Debit Note' },
  PURCHASE_INV: { ar: 'فاتورة مشتريات', en: 'Purchase Invoice' },
  PURCHASE_ORDER: { ar: 'أمر شراء', en: 'Purchase Order' },
};

interface InvoicePrintProps {
  doc: AccountingDocument;
  contact?: Contact | null;
  /** عند غياب جهة الاتصال - يُستخدم للعرض (مثل اسم العميل من الحجز) */
  contactDisplayFallback?: string;
  locale: string;
  companyName?: string;
  onClose?: () => void;
  /** عند false: إخفاء خيارات التصدير والعرض (رأس، تذييل، توقيع، بيانات العميل/العقار/الحساب) - للعميل والمستأجر */
  adminOnlyOptions?: boolean;
}

function buildPrintHtml(
  doc: AccountingDocument,
  contactName: string,
  propertyDisplayStr: string,
  company: ReturnType<typeof getCompanyData> | null,
  opts: { includeHeader: boolean; includeFooter: boolean; includeSignature: boolean; accountDisplay: AccountDisplayLevel },
  ar: boolean,
  baseUrl: string,
  template: ReturnType<typeof getDefaultTemplate> | null,
) {
  const typeLabel = DOC_TYPE_LABELS[doc.type] || { ar: doc.type, en: doc.type };
  const displayName = company?.nameAr || company?.nameEn || (ar ? 'شركة' : 'Company');
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const tableBordered = template?.style === 'bordered';
  const bilingual = !!template?.bilingual;
  const borderCls = tableBordered ? 'border:1px solid #d1d5db;' : 'border-bottom:1px solid #e5e7eb;';

  /** الرأس: شعار الشركة + اسم الشركة + نوع المستند ورقمه وتاريخه */
  let headerHtml = '';
  if (opts.includeHeader) {
    const logoSize = template?.logoSize ?? LOGO_SIZE_DEFAULT;
    const logoUrl = company?.logoUrl?.trim();
    const logoSrc = logoUrl ? (logoUrl.startsWith('/') ? baseUrl + logoUrl : logoUrl) : '';
    const logoHtml = logoSrc
      ? `<div style="display:flex;justify-content:center;margin-bottom:4px;"><img src="${logoSrc}" alt="Logo" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;" /></div>`
      : '';
    const companyNameHtml = company
      ? `<h1 style="font-size:${textFontSize + 2}pt;font-weight:700;color:${titleColor};margin:0 0 8px 0;">${ar ? (company.nameAr || company.nameEn || displayName) : (company.nameEn || company.nameAr || displayName)}</h1>`
      : '';
    headerHtml = `
    <div class="doc-header" style="border-bottom:2px solid ${titleColor};padding-bottom:12px;margin-bottom:16px;text-align:center;">
      ${logoHtml}
      ${companyNameHtml}
      <p style="font-size:${textFontSize}pt;font-weight:600;color:${textColor};margin:0;">${ar ? typeLabel.ar : typeLabel.en} ${bilingual ? `| ${ar ? typeLabel.en : typeLabel.ar}` : ''} رقم: ${doc.serialNumber} · ${new Date(doc.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</p>
    </div>`;
  }

  const isReceiptType = ['RECEIPT', 'PAYMENT', 'DEPOSIT'].includes(doc.type);
  const custLabel = (doc.type === 'PURCHASE_INV' || doc.type === 'PURCHASE_ORDER')
    ? (bilingual ? (ar ? 'المورد Supplier' : 'Supplier المورد') : (ar ? 'المورد' : 'Supplier'))
    : (bilingual ? (ar ? 'العميل Customer' : 'Customer العميل') : (ar ? 'العميل' : 'Customer'));
  const dateLabel = bilingual ? (ar ? 'التاريخ Date' : 'Date التاريخ') : (ar ? 'التاريخ' : 'Date');
  const dueLabel = bilingual ? (ar ? 'الاستحقاق Due' : 'Due الاستحقاق') : (ar ? 'الاستحقاق' : 'Due');
  const refLabel = bilingual ? (ar ? 'المرجع Ref' : 'Ref المرجع') : (ar ? 'المرجع' : 'Ref');
  const amountLabel = bilingual ? (ar ? 'المبلغ Amount' : 'Amount المبلغ') : (ar ? 'المبلغ' : 'Amount');
  const descLabel = bilingual ? (ar ? 'الوصف Description' : 'Description الوصف') : (ar ? 'الوصف' : 'Description');

  let infoHtml: string;
  if (isReceiptType) {
    const align = ar ? 'right' : 'left';
    const tdLabel = `padding:6px 12px;font-weight:600;color:${titleColor};width:140px;vertical-align:top;font-size:${textFontSize}pt;text-align:${align};`;
    const tdVal = `padding:6px 12px;color:${textColor};font-size:${textFontSize}pt;text-align:${align};`;
    const rows: string[] = [
      `<tr><td style="${tdLabel}">${custLabel}</td><td style="${tdVal}">${contactName}</td></tr>`,
      `<tr><td style="${tdLabel}">${dateLabel}</td><td style="${tdVal}">${new Date(doc.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td></tr>`,
      ...(doc.paymentMethod === 'CHEQUE' ? [`<tr><td style="${tdLabel}">${ar ? 'رقم الشيك' : 'Cheque #'}</td><td style="${tdVal}">${doc.chequeNumber || doc.paymentReference || '—'}</td></tr>`] : []),
      ...(doc.paymentMethod === 'CHEQUE' && (doc.chequeDueDate || doc.dueDate) ? [`<tr><td style="${tdLabel}">${ar ? 'تاريخ استحقاق الشيك' : 'Cheque Due Date'}</td><td style="${tdVal}">${new Date(doc.chequeDueDate || doc.dueDate!).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td></tr>`] : []),
      ...(doc.paymentMethod === 'CHEQUE' && doc.chequeBankName ? [`<tr><td style="${tdLabel}">${ar ? 'البنك' : 'Bank'}</td><td style="${tdVal}">${doc.chequeBankName}</td></tr>`] : []),
      ...(doc.reference ? [`<tr><td style="${tdLabel}">${refLabel}</td><td style="${tdVal}">${doc.reference}</td></tr>`] : []),
      ...(propertyDisplayStr && propertyDisplayStr !== '—' ? [`<tr><td style="${tdLabel}">${ar ? 'العقار' : 'Property'}</td><td style="${tdVal}">${propertyDisplayStr}</td></tr>`] : []),
    ];
    infoHtml = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:${textFontSize}pt;" cellpadding="0" cellspacing="0">
      <tbody>${rows.join('')}</tbody>
    </table>`;
  } else {
    const infoParts = [
      custLabel + ': ' + contactName,
      dateLabel + ': ' + new Date(doc.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
      ...(doc.dueDate ? [dueLabel + ': ' + new Date(doc.dueDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')] : []),
      ...(doc.paymentMethod === 'CHEQUE' ? [(ar ? 'رقم الشيك' : 'Cheque #') + ': ' + (doc.chequeNumber || doc.paymentReference || '—')] : []),
      ...(doc.reference ? [refLabel + ': ' + doc.reference] : []),
      ...(propertyDisplayStr && propertyDisplayStr !== '—' ? [(ar ? 'العقار' : 'Property') + ': ' + propertyDisplayStr] : []),
    ];
    infoHtml = `<div style="font-size:${textFontSize}pt;color:${textColor};margin-bottom:16px;">${infoParts.join(' | ')}</div>`;
  }

  let tableHtml = '';
  if (doc.items && doc.items.length > 0) {
    const thStyle = `padding:10px 12px;text-align:${ar ? 'right' : 'left'};background:#f3f4f6;font-size:12px;color:#6b7280;${borderCls}`;
    const thEndStyle = `padding:10px 12px;text-align:right;background:#f3f4f6;font-size:12px;color:#6b7280;${borderCls}`;
    const tdStyle = `padding:10px 12px;text-align:${ar ? 'right' : 'left'};${borderCls}`;
    const tdEndStyle = `padding:10px 12px;text-align:right;${borderCls}`;
    const rows = doc.items.map((item, i) => {
      const acc = item.accountId ? getAccountById(item.accountId) : null;
      const accStr = getAccountDisplayByLevel(acc, opts.accountDisplay, ar);
      const accCol = doc.items!.some((x) => x.accountId) ? `<td style="${tdStyle}">${accStr}</td>` : '';
      return `<tr><td style="${tdStyle}">${i + 1}</td><td style="${tdStyle}">${ar ? item.descriptionAr : item.descriptionEn || item.descriptionAr}</td>${accCol}<td style="${tdStyle}">${item.quantity}</td><td style="${tdEndStyle}">${item.unitPrice.toLocaleString()} ${doc.currency || 'ر.ع'}</td><td style="${tdEndStyle}">${item.amount.toLocaleString()} ${doc.currency || 'ر.ع'}</td></tr>`;
    }).join('');
    const descCol = bilingual ? (ar ? 'الوصف Description' : 'Description الوصف') : (ar ? 'الوصف' : 'Description');
    const accColLabel = bilingual ? (ar ? 'الحساب Account' : 'Account الحساب') : (ar ? 'الحساب' : 'Account');
    const qtyCol = bilingual ? (ar ? 'الكمية Qty' : 'Qty الكمية') : (ar ? 'الكمية' : 'Qty');
    const priceCol = bilingual ? (ar ? 'السعر Price' : 'Price السعر') : (ar ? 'السعر' : 'Price');
    const amountCol = bilingual ? (ar ? 'المبلغ Amount' : 'Amount المبلغ') : (ar ? 'المبلغ' : 'Amount');
    const accHeader = doc.items.some((i) => i.accountId) ? `<th style="${thStyle}">${accColLabel}</th>` : '';
    tableHtml = `
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:${textFontSize}pt;color:${textColor};${tableBordered ? 'border:1px solid #d1d5db;' : ''}">
        <thead><tr>
          <th style="${thStyle}">#</th>
          <th style="${thStyle}">${descCol}</th>
          ${accHeader}
          <th style="${thStyle}">${qtyCol}</th>
          <th style="${thEndStyle}">${priceCol}</th>
          <th style="${thEndStyle}">${amountCol}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } else {
    const desc = ar ? doc.descriptionAr : doc.descriptionEn || doc.descriptionAr || '—';
    if (isReceiptType) {
      tableHtml = `
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="font-weight:600;color:${titleColor};font-size:${textFontSize}pt;margin-bottom:8px;">${descLabel}</p>
        <p style="color:${textColor};font-size:${textFontSize}pt;line-height:1.6;">${desc}</p>
      </div>`;
    } else {
      tableHtml = `<div style="padding:16px 0;"><p style="color:${textColor};font-size:${textFontSize}pt;">${desc}</p></div>`;
    }
  }

  let totalsHtml: string;
  if (isReceiptType) {
    totalsHtml = `
    <div style="margin-top:28px;padding:20px;background:#f8fafc;border:2px solid ${titleColor};border-radius:8px;text-align:center;">
      <p style="font-size:${textFontSize}pt;font-weight:600;color:${titleColor};margin-bottom:8px;">${amountLabel}</p>
      <p style="font-size:24px;font-weight:700;color:${titleColor};">${doc.totalAmount.toLocaleString()} ${doc.currency || 'ر.ع'}</p>
      ${doc.vatRate && doc.vatRate > 0 ? `<p style="font-size:${textFontSize - 1}pt;color:#6b7280;margin-top:8px;">${ar ? 'شامل ضريبة القيمة المضافة' : 'Including VAT'}</p>` : ''}
    </div>`;
  } else {
    totalsHtml = `
    <div style="margin-top:24px;">
      ${doc.vatRate && doc.vatRate > 0 ? `
        <div style="display:flex;justify-content:${ar ? 'flex-start' : 'flex-end'};gap:24px;padding:8px 0;"><span>${ar ? 'المجموع الفرعي' : 'Subtotal'}:</span><span>${doc.amount.toLocaleString()} ${doc.currency || 'ر.ع'}</span></div>
        <div style="display:flex;justify-content:${ar ? 'flex-start' : 'flex-end'};gap:24px;padding:8px 0;"><span>${ar ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT'}:</span><span>${doc.vatAmount!.toLocaleString()} ${doc.currency || 'ر.ع'}</span></div>
      ` : ''}
      <div style="display:flex;justify-content:${ar ? 'flex-start' : 'flex-end'};gap:24px;font-size:18px;font-weight:700;border-top:2px solid ${titleColor};margin-top:8px;padding-top:12px;">
        <span>${ar ? 'المجموع' : 'Total'}:</span>
        <span>${doc.totalAmount.toLocaleString()} ${doc.currency || 'ر.ع'}</span>
      </div>
    </div>`;
  }

  let notesHtml = '';
  if (doc.notes || (company?.signatureType === 'electronic' && (company?.signatoryName || company?.signatoryNameEn))) {
    notesHtml = `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      ${doc.notes ? `<h4 style="font-size:14px;font-weight:600;color:#6b7280;margin-bottom:8px;">${ar ? 'ملاحظات' : 'Notes'}</h4><p style="font-size:14px;color:#374151;">${doc.notes}</p>` : ''}
      ${company?.signatureType === 'electronic' && (company?.signatoryName || company?.signatoryNameEn) ? `<p style="font-size:12px;font-style:italic;margin-top:12px;padding-top:12px;border-top:1px solid #f3f4f6;">${ar ? `هذا المستند تم توقيعه إلكترونياً من قبل ${company.signatoryName || company.signatoryNameEn} (${company.signatoryPosition || company.signatoryPositionEn || 'المفوض بالتوقيع'}) عن الشركة ${company.nameAr || company.nameEn}` : `This document was electronically signed by ${company.signatoryNameEn || company.signatoryName} (${company.signatoryPositionEn || company.signatoryPosition || 'Authorized signatory'}) on behalf of ${company.nameEn || company.nameAr}`}</p>` : ''}
    </div>`;
  }

  let footerHtml = '';
  if (opts.includeFooter) {
    let sigHtml = '';
    if (opts.includeSignature && company?.signatureType !== 'electronic' && (company?.signatorySignatureUrl || company?.signatoryName || company?.companyStampUrl)) {
      sigHtml = `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-top:16px;flex-wrap:wrap;">
        ${(company?.signatorySignatureUrl || company?.signatoryName) ? `<div style="text-align:center;"><div style="width:${SIGNATURE_SIZE.width}px;height:${SIGNATURE_SIZE.height}px;margin:0 auto 4px;overflow:hidden;">${company?.signatorySignatureUrl ? `<img src="${company.signatorySignatureUrl.startsWith('/') ? baseUrl + company.signatorySignatureUrl : company.signatorySignatureUrl}" alt="Signature" style="width:100%;height:100%;object-fit:contain;" />` : ''}</div><p style="font-size:12px;font-weight:500;color:#6b7280;">${company?.signatoryName || company?.signatoryNameEn || (ar ? 'المفوض بالتوقيع' : 'Authorized signatory')}</p></div>` : ''}
        ${company?.companyStampUrl ? `<div style="width:${STAMP_SIZE.width}px;height:${STAMP_SIZE.height}px;overflow:hidden;"><img src="${company.companyStampUrl.startsWith('/') ? baseUrl + company.companyStampUrl : company.companyStampUrl}" alt="Stamp" style="width:100%;height:100%;object-fit:contain;" /></div>` : ''}
      </div>`;
    }
    const details = [company?.addressAr || company?.addressEn, company?.phone, company?.email, company?.crNumber && (ar ? `سجل: ${company.crNumber}` : `CR: ${company.crNumber}`), company?.vatNumber && (ar ? `ضريبة: ${company.vatNumber}` : `VAT: ${company.vatNumber}`)].filter(Boolean);
    footerHtml = `<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">${sigHtml}<p style="margin-top:16px;">${ar ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'} - ${displayName}</p><p style="margin-top:8px;">${details.join(' · ')}</p></div>`;
  }

  return headerHtml + infoHtml + tableHtml + totalsHtml + notesHtml + footerHtml;
}

/** إعدادات افتراضية للعميل/المستأجر - إخفاء بيانات إدارية (شعار، تذييل، توقيع/ختم، تفاصيل العميل/العقار/الحساب) */
const CLIENT_DEFAULTS = {
  includeHeader: true,
  includeFooter: false,
  includeSignature: false,
  accountDisplay: 'codeThenName' as const,
  contactDisplay: 'nameOnly' as const,
  propertyDisplay: 'numberOnly' as const,
};

export default function InvoicePrint({ doc, contact, contactDisplayFallback, locale, companyName, onClose, adminOnlyOptions = true }: InvoicePrintProps) {
  const t = useTranslations('documentTemplates');
  const printRef = useRef<HTMLDivElement>(null);
  const ar = locale === 'ar';
  const company = typeof window !== 'undefined' ? getCompanyData() : null;
  const docOpts = typeof window !== 'undefined' ? getStoredPrintOptions() : { contactDisplay: 'namePhone' as ContactDisplayLevel, propertyDisplay: 'fullAddress' as PropertyDisplayLevel, accountDisplay: 'codeThenName' as AccountDisplayLevel };
  const [printOpts, setPrintOpts] = useState({
    includeHeader: adminOnlyOptions ? true : CLIENT_DEFAULTS.includeHeader,
    includeFooter: adminOnlyOptions ? true : CLIENT_DEFAULTS.includeFooter,
    includeSignature: adminOnlyOptions ? true : CLIENT_DEFAULTS.includeSignature,
    accountDisplay: adminOnlyOptions ? docOpts.accountDisplay : CLIENT_DEFAULTS.accountDisplay,
  });
  const [displayOpts, setDisplayOpts] = useState({
    contactDisplay: adminOnlyOptions ? docOpts.contactDisplay : CLIENT_DEFAULTS.contactDisplay,
    propertyDisplay: adminOnlyOptions ? docOpts.propertyDisplay : CLIENT_DEFAULTS.propertyDisplay,
  });
  const displayName = company?.nameAr || company?.nameEn || companyName || (ar ? 'شركة' : 'Company');
  const templateType = getTemplateTypeForDocType(doc.type);
  const template = typeof window !== 'undefined' ? getDefaultTemplate(templateType) : null;

  const typeLabel = DOC_TYPE_LABELS[doc.type] || { ar: doc.type, en: doc.type };
  const contactName = contact ? getContactDisplayByLevel(contact, displayOpts.contactDisplay, locale) : (contactDisplayFallback || '—');
  const prop = doc.propertyId ? getPropertyById(doc.propertyId) : null;
  const propertyDisplayStr = prop ? getPropertyDisplayByLevel(prop, displayOpts.propertyDisplay) : '';

  const openPrintWindow = (mode: 'print' | 'pdf') => {
    savePrintOptions({ contactDisplay: displayOpts.contactDisplay, propertyDisplay: displayOpts.propertyDisplay, accountDisplay: printOpts.accountDisplay });
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const docHtml = buildPrintHtml(doc, contactName, propertyDisplayStr, company, printOpts, ar, baseUrl, template);
    const title = `${ar ? typeLabel.ar : typeLabel.en} ${doc.serialNumber}`;
    const mTop = template?.marginTop ?? 15;
    const mBottom = template?.marginBottom ?? 20;
    const mLeft = template?.marginLeft ?? 10;
    const mRight = template?.marginRight ?? 10;
    const textColor = template?.textColor ?? '#374151';
    const textFontSize = template?.textFontSize ?? 9;
    const variant = template?.variant || 'classic';
    const win = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${ar ? 'rtl' : 'ltr'}" lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}/">
        <title>${title}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:${textFontSize}pt;color:${textColor};line-height:1.5;padding:${mTop}px ${mRight}px ${mBottom}px ${mLeft}px;max-width:210mm;margin:0 auto;}
          .doc-content{width:100%;}
          .document-template--professional table{border-collapse:separate;border-spacing:0;}
          .document-template--professional thead th{background:#f8fafc;font-weight:600;}
          .document-template--modern{letter-spacing:0.02em;}
          .document-template--modern thead th{font-weight:600;text-transform:uppercase;font-size:0.9em;}
          .document-template--compact table{font-size:0.95em;}
          .document-template--compact th,.document-template--compact td{padding:6px 10px !important;}
          .document-template--bilingual table{font-size:0.95em;}
          .no-print{display:flex;gap:12px;margin-bottom:16px;padding:12px;background:#f3f4f6;border-radius:8px;flex-wrap:wrap;}
          .no-print button{padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;border:none;}
          .btn-print{background:#8B6F47;color:white;}
          .btn-print:hover{background:#6B5535;}
          .btn-close{background:#e5e7eb;color:#374151;}
          .btn-close:hover{background:#d1d5db;}
          .pdf-hint{font-size:12px;color:#6b7280;margin-top:8px;}
          @media print{.no-print{display:none !important;} .doc-content{max-width:100%;}}
        </style>
      </head>
      <body>
        <div class="no-print">
          <button type="button" class="btn-print" onclick="window.print()">🖨️ ${ar ? 'طباعة' : 'Print'}</button>
          <button type="button" class="btn-close" onclick="window.close()">${ar ? 'إغلاق' : 'Close'}</button>
          ${mode === 'pdf' ? `<p class="pdf-hint">${ar ? 'لتنزيل PDF: اختر "حفظ كـ PDF" في مربع الطباعة' : 'To save as PDF: Choose "Save as PDF" in the print dialog'}</p>` : ''}
        </div>
        <div class="doc-content document-template document-template--${variant}">${docHtml}</div>
      </body>
      </html>
    `);
    win.document.close();
    if (mode === 'pdf') {
      setTimeout(() => win.print(), 300);
    } else {
      win.focus();
    }
  };

  const handlePrint = () => openPrintWindow('print');
  const handleDownloadPDF = () => openPrintWindow('pdf');

  /** معاينة مطابقة للطباعة - نفس HTML الذي يُطبع */
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const previewHtml = buildPrintHtml(doc, contactName, propertyDisplayStr, company, printOpts, ar, baseUrl, template);

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-bold text-gray-900">{ar ? typeLabel.ar : typeLabel.en} - {doc.serialNumber}</h3>
        <div className="flex flex-wrap items-center gap-4">
          {adminOnlyOptions && (
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg px-4 py-2 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">{t('printOptions')}</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={printOpts.includeHeader} onChange={(e) => setPrintOpts((o) => ({ ...o, includeHeader: e.target.checked }))} className="rounded" />
                  <span>{t('printIncludeHeader')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={printOpts.includeFooter} onChange={(e) => setPrintOpts((o) => ({ ...o, includeFooter: e.target.checked }))} className="rounded" />
                  <span>{t('printIncludeFooter')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={printOpts.includeSignature} onChange={(e) => setPrintOpts((o) => ({ ...o, includeSignature: e.target.checked }))} className="rounded" />
                  <span>{t('printIncludeSignature')}</span>
                </label>
              </div>
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg px-4 py-2 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">{t('contactDisplay')}</span>
                <select value={displayOpts.contactDisplay} onChange={(e) => setDisplayOpts((o) => ({ ...o, contactDisplay: e.target.value as ContactDisplayLevel }))} className="admin-select text-sm py-1.5">
                  <option value="nameOnly">{t('contactDisplayNameOnly')}</option>
                  <option value="namePhone">{t('contactDisplayNamePhone')}</option>
                  <option value="namePhoneCivilId">{t('contactDisplayNamePhoneCivilId')}</option>
                  <option value="namePhoneSerialNumber">{t('contactDisplayNamePhoneSerial')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg px-4 py-2 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">{t('propertyDisplay')}</span>
                <select value={displayOpts.propertyDisplay} onChange={(e) => setDisplayOpts((o) => ({ ...o, propertyDisplay: e.target.value as PropertyDisplayLevel }))} className="admin-select text-sm py-1.5">
                  <option value="numberOnly">{t('propertyDisplayNumberOnly')}</option>
                  <option value="fullAddress">{t('propertyDisplayFull')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg px-4 py-2 bg-gray-50">
                <span className="text-xs font-semibold text-gray-600">{t('accountDisplay')}</span>
                <select value={printOpts.accountDisplay} onChange={(e) => setPrintOpts((o) => ({ ...o, accountDisplay: e.target.value as AccountDisplayLevel }))} className="admin-select text-sm py-1.5">
                  <option value="codeOnly">{t('accountDisplayCodeOnly')}</option>
                  <option value="nameOnly">{t('accountDisplayNameOnly')}</option>
                  <option value="codeThenName">{t('accountDisplayCodeName')}</option>
                  <option value="nameThenCode">{t('accountDisplayNameCode')}</option>
                </select>
              </div>
            </div>
          )}
        <div className="flex gap-2">
          {onClose && (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              {ar ? 'إغلاق' : 'Close'}
            </button>
          )}
          <button type="button" onClick={handlePrint} className="px-4 py-2 rounded-lg font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] flex items-center gap-1">
            🖨️ {ar ? 'طباعة' : 'Print'}
          </button>
            <button type="button" onClick={handleDownloadPDF} className="px-4 py-2 rounded-lg font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 flex items-center gap-1">
              📄 {ar ? 'تنزيل PDF' : 'Download PDF'}
            </button>
          </div>
        </div>
              </div>
      <div ref={printRef} className="p-6 bg-white" dir={ar ? 'rtl' : 'ltr'}>
        {/* معاينة مطابقة للطباعة - نفس المستند الذي سيتم طباعته */}
        <div
          className={`doc-preview document-template document-template--${template?.variant || 'classic'} max-w-[210mm] mx-auto`}
          style={{
            fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
            fontSize: `${template?.textFontSize ?? 9}pt`,
            color: template?.textColor ?? '#374151',
            padding: `${template?.marginTop ?? 15}px ${template?.marginRight ?? 10}px ${template?.marginBottom ?? 20}px ${template?.marginLeft ?? 10}px`,
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </div>
  );
}
