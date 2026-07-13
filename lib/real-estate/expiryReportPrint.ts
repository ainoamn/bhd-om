import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openExpiryUnitsPrintWindow(
  rows: OperationsUnitRow[],
  maxDays: number,
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const titleAr = `تقرير العقود التي تنتهي خلال ${maxDays} يوم`;
  const titleEn = `Contracts expiring within ${maxDays} days`;
  const title = ar ? titleAr : titleEn;
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const mTop = template?.marginTop ?? 12;
  const mBottom = template?.marginBottom ?? 15;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;

  const sorted = [...rows]
    .filter((u) => u.tenant?.trim())
    .sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

  const th = `padding:6px 8px;border:1px solid #333;background:#f3e6eb;font-weight:600;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const td = `padding:6px 8px;border:1px solid #333;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const headers = ar
    ? ['#', 'المبنى', 'الوحدة', 'المستأجر', 'تاريخ الانتهاء', 'متبقي يوم', 'التواصل']
    : ['#', 'Building', 'Unit', 'Tenant', 'End date', 'Days left', 'Contact'];

  const bodyRows = sorted
    .map(
      (u, i) => `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${escapeHtml(u.building)}</td>
        <td style="${td}">${escapeHtml(u.unit)}</td>
        <td style="${td}">${escapeHtml(u.tenant || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(u.endDate || '—')}</td>
        <td style="${td}" dir="ltr">${u.daysLeft ?? '—'}</td>
        <td style="${td}" dir="ltr">${escapeHtml(u.mobile || u.contactNo || '—')}</td>
      </tr>`
    )
    .join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const meta = ar
    ? `إجمالي العقود: ${sorted.length} | التاريخ: ${dateStr}`
    : `Total contracts: ${sorted.length} | Date: ${dateStr}`;

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
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${textColor};padding:${mTop}px ${mRight}px ${mBottom}px ${mLeft}px;}
    h1{font-size:${textFontSize + 4}pt;color:${titleColor};margin:0 0 8px;}
    h2{font-size:${textFontSize + 2}pt;color:${titleColor};margin:0 0 6px;}
    .meta{font-size:${textFontSize}pt;margin:0 0 12px;opacity:0.85;}
    table{width:100%;border-collapse:collapse;}
    .no-print{display:flex;gap:12px;margin-bottom:16px;padding:12px;background:#f3f4f6;border-radius:8px;}
    .no-print button{padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;border:none;}
    .btn-print{background:#8B0000;color:#fff;}
    .btn-close{background:#e5e7eb;color:#374151;}
    @media print{.no-print{display:none!important;} @page{size:A4 landscape;margin:12mm;}}
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" class="btn-print" onclick="window.print()">🖨️ ${ar ? 'طباعة' : 'Print'}</button>
    <button type="button" class="btn-close" onclick="window.close()">${ar ? 'إغلاق' : 'Close'}</button>
  </div>
  <h1>${escapeHtml(companyName)}</h1>
  <h2>${escapeHtml(title)}</h2>
  <p class="meta">${escapeHtml(meta)}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th style="${th}">${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="7" style="${td}">${ar ? 'لا توجد نتائج' : 'No results'}</td></tr>`}</tbody>
  </table>
</body>
</html>`);
  win.document.close();
  win.focus();
  if (autoPrint) {
    setTimeout(() => {
      win.print();
    }, 350);
  }
}

export function getExpiringUnitsForReport(
  rows: OperationsUnitRow[],
  maxDays: number,
  buildingFilter = 'all'
): OperationsUnitRow[] {
  return rows.filter((u) => {
    if (!u.tenant?.trim()) return false;
    const d = u.daysLeft;
    if (d === null || d < 0 || d > maxDays) return false;
    if (buildingFilter !== 'all' && u.building !== buildingFilter) return false;
    return true;
  });
}
