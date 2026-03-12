/**
 * طباعة إيصالات موحدة — نفس تصميم وإعدادات موقع الإيصالات (حجز الوحدة، المحاسبة، إلخ).
 * Unified receipt print — same design as site document templates (booking receipt, accounting, etc.).
 */

import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { LOGO_SIZE_DEFAULT } from '@/lib/data/documentTemplateConstants';

export type ReceiptRow = { labelAr: string; labelEn: string; value: string };

export interface SimpleReceiptOptions {
  /** عنوان نوع المستند (مثل: إيصال الاشتراك / Subscription receipt) */
  docTitleAr: string;
  docTitleEn: string;
  /** رقم المستند (اختياري) */
  serialNumber?: string;
  /** تاريخ المستند */
  date: Date;
  /** صفوف الجدول: تسمية عربي، إنجليزي، القيمة */
  rows: ReceiptRow[];
  locale: string;
}

function buildSimpleReceiptContentHtml(
  options: SimpleReceiptOptions,
  company: ReturnType<typeof getCompanyData>,
  template: ReturnType<typeof getDefaultTemplate> | null,
  baseUrl: string,
): string {
  const { docTitleAr, docTitleEn, serialNumber, date, rows, locale } = options;
  const ar = locale === 'ar';
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const bilingual = !!template?.bilingual;
  const typeLabel = ar ? docTitleAr : docTitleEn;
  const typeLabelSecondary = bilingual ? (ar ? docTitleEn : docTitleAr) : '';

  const displayName = company?.nameAr || company?.nameEn || (ar ? 'شركة' : 'Company');
  const logoSize = template?.logoSize ?? LOGO_SIZE_DEFAULT;
  const logoUrl = company?.logoUrl?.trim();
  const logoSrc = logoUrl ? (logoUrl.startsWith('/') ? baseUrl + logoUrl : logoUrl) : '';
  const logoHtml = logoSrc
    ? `<div style="display:flex;justify-content:center;margin-bottom:4px;"><img src="${logoSrc}" alt="Logo" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;" /></div>`
    : '';
  const companyNameHtml = company
    ? `<h1 style="font-size:${textFontSize + 2}pt;font-weight:700;color:${titleColor};margin:0 0 8px 0;">${ar ? (company.nameAr || company.nameEn || displayName) : (company.nameEn || company.nameAr || displayName)}</h1>`
    : '';

  const dateStr = date.toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const headerSub = serialNumber
    ? `${typeLabel} ${typeLabelSecondary ? `| ${typeLabelSecondary}` : ''} رقم: ${serialNumber} · ${dateStr}`
    : `${typeLabel} ${typeLabelSecondary ? `| ${typeLabelSecondary}` : ''} · ${dateStr}`;

  const headerHtml = `
    <div class="doc-header" style="border-bottom:2px solid ${titleColor};padding-bottom:12px;margin-bottom:16px;text-align:center;">
      ${logoHtml}
      ${companyNameHtml}
      <p style="font-size:${textFontSize}pt;font-weight:600;color:${textColor};margin:0;">${headerSub}</p>
    </div>`;

  const align = ar ? 'right' : 'left';
  const tdLabel = `padding:6px 12px;font-weight:600;color:${titleColor};width:140px;vertical-align:top;font-size:${textFontSize}pt;text-align:${align};`;
  const tdVal = `padding:6px 12px;color:${textColor};font-size:${textFontSize}pt;text-align:${align};`;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td style="${tdLabel}">${ar ? r.labelAr : r.labelEn}</td><td style="${tdVal}">${r.value}</td></tr>`,
    )
    .join('');

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:${textFontSize}pt;" cellpadding="0" cellspacing="0">
      <tbody>${rowsHtml}</tbody>
    </table>`;

  const footerHtml = `<p style="font-size:${textFontSize - 1}pt;color:#6b7280;margin-top:16px;">${ar ? 'بن حمود للتطوير' : 'Bin Hamood Development'} — ${dateStr}</p>`;

  return headerHtml + tableHtml + footerHtml;
}

/**
 * يفتح نافذة طباعة إيصال بتصميم موحد مع إيصالات الموقع (نفس رأس الشركة، القالب، الألوان).
 * مناسبة لإيصال الاشتراك، إيصال الدفع بعد ترقية/تنزيل الباقة، وأي إيصال بسيط.
 */
export function openReceiptPrintWindow(
  options: SimpleReceiptOptions & { autoPrint?: boolean },
): void {
  if (typeof window === 'undefined') return;
  const { docTitleAr, docTitleEn, locale, autoPrint } = options;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('receipt');
  const baseUrl = window.location.origin;

  const docHtml = buildSimpleReceiptContentHtml(
    options,
    company,
    template,
    baseUrl,
  );

  const title = ar ? docTitleAr : docTitleEn;
  const mTop = template?.marginTop ?? 15;
  const mBottom = template?.marginBottom ?? 20;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const variant = template?.variant || 'classic';

  const win = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
  if (!win) {
    alert(ar ? 'السماح بالنوافذ المنبثقة للطباعة.' : 'Allow popups to print.');
    return;
  }

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
        .document-template--compact table{font-size:0.95em;}
        .document-template--compact th,.document-template--compact td{padding:6px 10px !important;}
        .no-print{display:flex;gap:12px;margin-bottom:16px;padding:12px;background:#f3f4f6;border-radius:8px;flex-wrap:wrap;}
        .no-print button{padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;border:none;}
        .btn-print{background:#8B6F47;color:white;}
        .btn-print:hover{background:#6B5535;}
        .btn-close{background:#e5e7eb;color:#374151;}
        .btn-close:hover{background:#d1d5db;}
        @media print{.no-print{display:none !important;} .doc-content{max-width:100%;}}
      </style>
    </head>
    <body>
      <div class="no-print">
        <button type="button" class="btn-print" onclick="window.print()">🖨️ ${ar ? 'طباعة' : 'Print'}</button>
        <button type="button" class="btn-close" onclick="window.close()">${ar ? 'إغلاق' : 'Close'}</button>
      </div>
      <div class="doc-content document-template document-template--${variant}">${docHtml}</div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();

  if (autoPrint) {
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
    }, 300);
  }
}
