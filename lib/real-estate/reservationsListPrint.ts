import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import type { ReservationListRow } from '@/lib/real-estate/buildReservationsList';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openReservationsListPrintWindow(
  rows: ReservationListRow[],
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const title = ar ? 'قائمة الحجوزات' : 'Reservations list';
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
    ? ['#', 'المبنى', 'الوحدة', 'المحجوز', 'الجوال', 'التاريخ', 'الحالة']
    : ['#', 'Building', 'Unit', 'Reserved by', 'Phone', 'Date', 'Status'];

  const bodyRows = rows
    .map(
      (r, i) => `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${escapeHtml(r.building)}</td>
        <td style="${td}">${escapeHtml(r.unitsLabel)}</td>
        <td style="${td}">${escapeHtml(r.reservedBy || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.phone || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.since || '—')}</td>
        <td style="${td}">${escapeHtml(ar ? r.stateLabelAr : r.stateLabelEn)}</td>
      </tr>`
    )
    .join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const meta = ar
    ? `عدد السجلات: ${rows.length} | التاريخ: ${dateStr}`
    : `Records: ${rows.length} | Date: ${dateStr}`;

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

export function openReservationFormPrintWindow(
  row: ReservationListRow,
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const title = ar ? 'نموذج حجز وحدة' : 'Unit reservation form';
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const mTop = template?.marginTop ?? 12;
  const mBottom = template?.marginBottom ?? 15;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;
  const fd = (row.raw.formData && typeof row.raw.formData === 'object'
    ? row.raw.formData
    : {}) as Record<string, unknown>;

  const field = (label: string, value: string) => {
    const tdLabel = `padding:6px 10px;border:1px solid #ccc;background:#f9fafb;font-weight:600;width:32%;text-align:${ar ? 'right' : 'left'};`;
    const tdVal = `padding:6px 10px;border:1px solid #ccc;text-align:${ar ? 'right' : 'left'};`;
    return `<tr><td style="${tdLabel}">${escapeHtml(label)}</td><td style="${tdVal}" colspan="3">${escapeHtml(value || '—')}</td></tr>`;
  };

  const rows = [
    field(ar ? 'المبنى' : 'Building', row.building),
    field(ar ? 'الوحدة/الوحدات' : 'Unit(s)', row.unitsLabel),
    field(ar ? 'المحجوز' : 'Reserved by', row.reservedBy),
    field(ar ? 'الجوال' : 'Phone', row.phone),
    field(ar ? 'تاريخ الحجز' : 'Reservation date', row.since),
    field(ar ? 'رقم الحجز' : 'Reservation no.', row.agreementNo),
    field(ar ? 'الحالة' : 'Status', ar ? row.stateLabelAr : row.stateLabelEn),
    field(ar ? 'الموظف' : 'Staff', row.staffName),
    field(ar ? 'نوع العقد' : 'Contract type', String(fd.contractTypeSelect || fd.type || '—')),
    field(ar ? 'الإيجار الشهري' : 'Monthly rent', String(fd.monthlyRent || '—')),
  ].join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';

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
    table{width:100%;border-collapse:collapse;margin-top:10px;}
    @media print{body{padding:0;}}
  </style>
</head>
<body>
  <h1>${escapeHtml(companyName)} — ${escapeHtml(title)}</h1>
  <table>${rows}</table>
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
