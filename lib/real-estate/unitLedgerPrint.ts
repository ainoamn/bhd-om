import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { ledgerStatusKind, type UnitLedgerEvent } from '@/lib/real-estate/unitLedger';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusChipHtml(status: string, kind: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    current: { bg: '#dcfce7', fg: '#166534' },
    draft: { bg: '#fef9c3', fg: '#854d0e' },
    pending: { bg: '#ffedd5', fg: '#9a3412' },
    cancelled: { bg: '#fee2e2', fg: '#991b1b' },
    archived: { bg: '#f3f4f6', fg: '#374151' },
  };
  const c = colors[kind] ?? colors.pending;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:8pt;background:${c.bg};color:${c.fg};">${escapeHtml(status)}</span>`;
}

export function openUnitLedgerPrintWindow(
  unit: OperationsUnitRow,
  events: UnitLedgerEvent[],
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const title = ar ? 'سجل الوحدة' : 'Unit ledger';
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const mTop = template?.marginTop ?? 12;
  const mBottom = template?.marginBottom ?? 15;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;

  const th = `padding:6px 8px;border:1px solid #333;background:#f3e6eb;font-weight:600;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const td = `padding:6px 8px;border:1px solid #333;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};vertical-align:top;`;
  const headers = ar
    ? ['النوع', 'الطرف', 'المرجع', 'من', 'إلى', 'الحالة', 'الإيجار', 'الموظف', 'ملاحظات']
    : ['Type', 'Party', 'Ref', 'From', 'To', 'Status', 'Rent', 'Staff', 'Notes'];

  const bodyRows = events
    .map((r) => {
      const tp = ar ? r.typeAr || r.typeEn : r.typeEn || r.typeAr;
      const st = ar ? r.statusAr || r.statusEn || '—' : r.statusEn || r.statusAr || '—';
      const kind = ledgerStatusKind(r.statusAr, r.statusEn);
      const note = String(r.note || '');
      const shortNote = note.length > 120 ? `${note.slice(0, 117)}…` : note;
      return `<tr>
        <td style="${td}">${escapeHtml(tp)}</td>
        <td style="${td}">${escapeHtml(r.party || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.ref || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.from || '—')}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.to || '—')}</td>
        <td style="${td}">${statusChipHtml(st, kind)}</td>
        <td style="${td}" dir="ltr">${escapeHtml(r.rent || '—')}</td>
        <td style="${td}">${escapeHtml(r.staff || '—')}</td>
        <td style="${td};max-width:200px;font-size:8pt;">${escapeHtml(shortNote || '—')}</td>
      </tr>`;
    })
    .join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const unitMeta = ar
    ? `المبنى: ${unit.building} | الوحدة: ${unit.unit} | المستأجر: ${unit.tenant || '—'}`
    : `Building: ${unit.building} | Unit: ${unit.unit} | Tenant: ${unit.tenant || '—'}`;
  const meta = ar
    ? `${unitMeta} | إجمالي الأحداث: ${events.length} | التاريخ: ${dateStr}`
    : `${unitMeta} | Total events: ${events.length} | Date: ${dateStr}`;

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
    body{font-family:Arial,sans-serif;color:${textColor};padding:${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;}
    h1{font-size:14pt;color:${titleColor};margin-bottom:8px;}
    .meta{font-size:${textFontSize}pt;margin-bottom:12px;opacity:0.85;}
    table{width:100%;border-collapse:collapse;}
    @media print{body{padding:0;}}
  </style>
</head>
<body>
  <h1>${escapeHtml(companyName)} — ${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(meta)}</p>
  ${
    events.length
      ? `<table><thead><tr>${headers.map((h) => `<th style="${th}">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows}</tbody></table>`
      : `<p>${escapeHtml(ar ? 'لا توجد أحداث مسجَّلة لهذه الوحدة.' : 'No recorded events for this unit.')}</p>`
  }
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
