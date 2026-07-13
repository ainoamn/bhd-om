import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { formatOmr } from '@/lib/real-estate/dashboardStats';
import type { UnitContractFormValues } from '@/lib/real-estate/unitContractWorkspace';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fieldRow(label: string, value: string, ar: boolean): string {
  const tdLabel = `padding:6px 10px;border:1px solid #ccc;background:#f9fafb;font-weight:600;width:32%;text-align:${ar ? 'right' : 'left'};`;
  const tdVal = `padding:6px 10px;border:1px solid #ccc;text-align:${ar ? 'right' : 'left'};`;
  return `<tr><td style="${tdLabel}">${escapeHtml(label)}</td><td style="${tdVal}" colspan="3">${escapeHtml(value || '—')}</td></tr>`;
}

export function openContractSummaryPrintWindow(
  unit: Pick<OperationsUnitRow, 'building' | 'unit' | 'tenant' | 'ownerNames'>,
  values: UnitContractFormValues,
  locale: 'ar' | 'en',
  autoPrint = true
): void {
  if (typeof window === 'undefined') return;
  const ar = locale === 'ar';
  const company = getCompanyData();
  const template = getDefaultTemplate('report');
  const baseUrl = window.location.origin;
  const title = ar ? 'ملخص عقد الإيجار' : 'Tenancy contract summary';
  const titleColor = template?.titleColor ?? '#354058';
  const textColor = template?.textColor ?? '#374151';
  const textFontSize = template?.textFontSize ?? 9;
  const mTop = template?.marginTop ?? 12;
  const mBottom = template?.marginBottom ?? 15;
  const mLeft = template?.marginLeft ?? 10;
  const mRight = template?.marginRight ?? 10;

  const contractTypeLabel =
    values.contractType === 'commercial'
      ? ar
        ? 'تجاري'
        : 'Commercial'
      : ar
        ? 'سكني'
        : 'Residential';

  const rentFormatted = values.monthlyRent
    ? `${formatOmr(parseFloat(values.monthlyRent) || 0, locale)} ${ar ? 'ر.ع.' : 'OMR'}`
    : '—';

  const rows = [
    fieldRow(ar ? 'المبنى' : 'Building', unit.building, ar),
    fieldRow(ar ? 'الوحدة' : 'Unit', unit.unit, ar),
    fieldRow(ar ? 'المالك' : 'Owner', unit.ownerNames || '—', ar),
    fieldRow(ar ? 'رقم العقد' : 'Agreement no.', values.agreementNo, ar),
    fieldRow(ar ? 'نوع العقد' : 'Contract type', contractTypeLabel, ar),
    fieldRow(ar ? 'المستأجر (عربي)' : 'Tenant (AR)', values.tenantNameAr || unit.tenant || '—', ar),
    fieldRow(ar ? 'المستأجر (EN)' : 'Tenant (EN)', values.tenantNameEn, ar),
    fieldRow(ar ? 'الرقم المدني' : 'Civil ID', values.civilCard, ar),
    fieldRow(ar ? 'الجوال' : 'Mobile', values.tenantMobile, ar),
    fieldRow(ar ? 'الطابق' : 'Floor', values.floorDetails, ar),
    fieldRow(ar ? 'نوع الوحدة' : 'Unit type', values.unitType, ar),
    fieldRow(ar ? 'تاريخ البداية' : 'Start date', values.startDate, ar),
    fieldRow(ar ? 'تاريخ النهاية' : 'End date', values.endDate, ar),
    fieldRow(ar ? 'المدة (أشهر)' : 'Duration (months)', values.contractMonths, ar),
    fieldRow(ar ? 'الإيجار الشهري' : 'Monthly rent', rentFormatted, ar),
    fieldRow(
      ar ? 'الضمان' : 'Deposit',
      values.depositAmount
        ? `${formatOmr(parseFloat(values.depositAmount) || 0, locale)} ${ar ? 'ر.ع.' : 'OMR'}`
        : '—',
      ar
    ),
    fieldRow(
      ar ? 'طريقة الدفع' : 'Payment method',
      values.paymentMethod === 'cheque'
        ? ar
          ? 'شيك'
          : 'Cheque'
        : values.paymentMethod === 'cash'
          ? ar
            ? 'نقداً'
            : 'Cash'
          : values.paymentMethod === 'transfer'
            ? ar
              ? 'تحويل بنكي'
              : 'Bank transfer'
            : '—',
      ar
    ),
    fieldRow(ar ? 'عداد الكهرباء' : 'Electricity meter', values.electricityMeter, ar),
    fieldRow(ar ? 'عداد الماء' : 'Water meter', values.waterMeter, ar),
    fieldRow(ar ? 'استمارة بلدية' : 'Municipal form', values.municipalFormNo, ar),
    fieldRow(ar ? 'عقد بلدي' : 'Municipal contract', values.municipalContractNo, ar),
    fieldRow(ar ? 'ملاحظات' : 'Notes', values.remarks, ar),
  ].join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const meta = ar
    ? `التاريخ: ${dateStr} | ${unit.building} — ${unit.unit}`
    : `Date: ${dateStr} | ${unit.building} — ${unit.unit}`;

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
  <table>${rows}</table>
  <p style="margin-top:14px;font-size:8pt;opacity:0.7;">${escapeHtml(
    ar
      ? 'ملخص من لوحة العقارات — للنسخة الرسمية الكاملة استخدم النظام التشغيلي.'
      : 'Summary from real-estate dashboard — use the full operational system for official documents.'
  )}</p>
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
