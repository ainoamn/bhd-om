import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { formatOmr } from '@/lib/real-estate/dashboardStats';
import type { SavedContractListRow } from '@/lib/real-estate/savedContractListRow';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openContractsListPrintWindow(
  rows: SavedContractListRow[],
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const title = ar ? 'سجل العقود المحفوظة' : 'Saved contracts registry';
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const mTop = template?.marginTop ?? 12;
  const mBottom = template?.marginBottom ?? 15;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;

  const th = `padding:6px 8px;border:1px solid #333;background:#f3e6eb;font-weight:600;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const td = `padding:6px 8px;border:1px solid #333;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const headers = ar
    ? ['#', 'المبنى', 'الوحدة', 'رقم العقد', 'المستأجر', 'البداية', 'النهاية', 'متبقي', 'الإيجار', 'الحالة']
    : ['#', 'Building', 'Unit', 'Agreement', 'Tenant', 'Start', 'End', 'Days left', 'Rent', 'Status'];

  const bodyRows = rows
    .map(
      (r, i) => `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${escapeHtml(r.building)}</td>
        <td style="${td}">${escapeHtml(r.unit)}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.agreementNo || '—')}</td>
        <td style="${td}">${escapeHtml(r.tenantNameAr || r.tenantNameEn || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.startDate || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.endDate || '—')}</td>
        <td style="${td}" dir="ltr">${r.daysLeft ?? '—'}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.monthlyRent ? formatOmr(parseFloat(r.monthlyRent) || 0, locale) : '—')}</td>
        <td style="${td}">${escapeHtml(ar ? r.lifecycleLabelAr : r.lifecycleLabelEn)}</td>
      </tr>`
    )
    .join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const meta = ar
    ? `إجمالي العقود: ${rows.length} | التاريخ: ${dateStr}`
    : `Total contracts: ${rows.length} | Date: ${dateStr}`;

  const win = window.open('', '_blank', 'width=960,height=720,scrollbars=yes');
  if (!win) {
    alert(ar ? 'السماح بالنوافذ المنبثقة للطباعة.' : 'Allow popups to print.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html dir="${ar ? 'rtl' : 'ltr'}" lang="${locale}">
<head>
  <meta charset="UTF-8">
  <base href="${baseUrl}/">
  <title>${escapeHtml(title)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;color:${textColor};padding:${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;font-size:${textFontSize}pt;}
    h1{font-size:14pt;color:${titleColor};margin-bottom:8px;}
    .meta{font-size:${textFontSize}pt;margin-bottom:12px;opacity:0.85;}
    table{width:100%;border-collapse:collapse;}
    @media print{body{padding:0;}}
  </style>
</head>
<body>
  <h1>${escapeHtml(companyName)} — ${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(meta)}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th style="${th}">${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`);
  win.document.close();
  if (autoPrint) {
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
}
