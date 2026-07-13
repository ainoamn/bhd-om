import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate } from '@/lib/data/documentTemplates';
import { CONTRACT_DOCUMENT_SLOTS } from '@/lib/real-estate/contractDocuments';
import {
  buildPaymentSchedule,
  buildVatChequeSchedule,
  CONTRACT_VAT_RATE,
  estimateVatTotal,
  isVatChequesEnabled,
} from '@/lib/real-estate/contractVat';
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
  const tdLabel = `padding:6px 10px;border:1px solid #ccc;background:#f9fafb;font-weight:600;width:28%;text-align:${ar ? 'right' : 'left'};`;
  const tdVal = `padding:6px 10px;border:1px solid #ccc;text-align:${ar ? 'right' : 'left'};`;
  return `<tr><td style="${tdLabel}">${escapeHtml(label)}</td><td style="${tdVal}" colspan="3">${escapeHtml(value || '—')}</td></tr>`;
}

function scheduleTable(
  rows: Record<string, unknown>[],
  headers: string[],
  ar: boolean,
  textFontSize: number
): string {
  if (!rows.length) return '';
  const th = `padding:6px 8px;border:1px solid #333;background:#f3e6eb;font-weight:600;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const td = `padding:6px 8px;border:1px solid #333;font-size:${textFontSize}pt;text-align:${ar ? 'right' : 'left'};`;
  const body = rows
    .map(
      (r, i) => `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}" dir="ltr">${escapeHtml(String(r.dueDate || r.paymentDate || '—'))}</td>
        <td style="${td}" dir="ltr">${escapeHtml(String(r.checkNo || r.chequeNo || '—'))}</td>
        <td style="${td}" dir="ltr">${escapeHtml(String(r.amount || '—'))}</td>
      </tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
    <thead><tr>${headers.map((h) => `<th style="${th}">${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function openContractOfficialPrintWindow(
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
  const title = ar ? 'عقد إيجار — نسخة رسمية' : 'Tenancy contract — official copy';
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

  const paymentMethodLabel =
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
          : '—';

  const vatEnabled = values.contractSubjectToVat === 'yes';
  const vatModeLabel =
    values.vatPaymentMode === 'separate'
      ? ar
        ? 'شيكات ضريبة منفصلة'
        : 'Separate VAT cheques'
      : values.vatPaymentMode === 'included'
        ? ar
          ? 'ضمن الإيجار'
          : 'Included in rent'
        : '—';

  const paymentSchedule = buildPaymentSchedule(values);
  const vatSchedule = buildVatChequeSchedule(values);

  const partyRows = [
    fieldRow(ar ? 'المؤجر / الشركة' : 'Landlord / Company', company?.nameAr || company?.nameEn || '—', ar),
    fieldRow(ar ? 'المالك' : 'Owner', unit.ownerNames || '—', ar),
    fieldRow(ar ? 'المستأجر (عربي)' : 'Tenant (Arabic)', values.tenantNameAr || unit.tenant || '—', ar),
    fieldRow(ar ? 'المستأجر (EN)' : 'Tenant (English)', values.tenantNameEn, ar),
    fieldRow(ar ? 'الرقم المدني' : 'Civil ID', values.civilCard, ar),
    fieldRow(ar ? 'الجوال' : 'Mobile', values.tenantMobile, ar),
  ].join('');

  const propertyRows = [
    fieldRow(ar ? 'المبنى' : 'Building', unit.building, ar),
    fieldRow(ar ? 'الوحدة' : 'Unit', unit.unit, ar),
    fieldRow(ar ? 'الطابق' : 'Floor', values.floorDetails, ar),
    fieldRow(ar ? 'نوع الوحدة' : 'Unit type', values.unitType, ar),
    fieldRow(ar ? 'عداد الكهرباء' : 'Electricity meter', values.electricityMeter, ar),
    fieldRow(ar ? 'عداد الماء' : 'Water meter', values.waterMeter, ar),
  ].join('');

  const contractRows = [
    fieldRow(ar ? 'رقم العقد' : 'Agreement no.', values.agreementNo, ar),
    fieldRow(ar ? 'نوع العقد' : 'Contract type', contractTypeLabel, ar),
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
    fieldRow(ar ? 'طريقة الدفع' : 'Payment method', paymentMethodLabel, ar),
    fieldRow(
      ar ? 'خاضع لضريبة القيمة المضافة' : 'Subject to VAT',
      vatEnabled ? (ar ? 'نعم' : 'Yes') : ar ? 'لا' : 'No',
      ar
    ),
    ...(vatEnabled
      ? [
          fieldRow(ar ? 'طريقة دفع الضريبة' : 'VAT payment mode', vatModeLabel, ar),
          fieldRow(
            ar ? 'إجمالي الضريبة التقديري' : 'Estimated VAT total',
            `${formatOmr(estimateVatTotal(values), locale)} ${ar ? 'ر.ع.' : 'OMR'} (${(CONTRACT_VAT_RATE * 100).toFixed(0)}%)`,
            ar
          ),
        ]
      : []),
    fieldRow(ar ? 'استمارة بلدية' : 'Municipal form', values.municipalFormNo, ar),
    fieldRow(ar ? 'عقد بلدي' : 'Municipal contract', values.municipalContractNo, ar),
    fieldRow(ar ? 'ملاحظات' : 'Notes', values.remarks, ar),
  ].join('');

  const rentScheduleHtml =
    paymentSchedule.length > 0
      ? `<h2 style="font-size:11pt;color:${titleColor};margin:14px 0 6px;">${ar ? 'جدول دفعات الإيجار' : 'Rent payment schedule'}</h2>${scheduleTable(
          paymentSchedule,
          ar ? ['#', 'الاستحقاق', 'رقم الشيك', 'المبلغ (ر.ع.)'] : ['#', 'Due date', 'Cheque no.', 'Amount (OMR)'],
          ar,
          textFontSize
        )}`
      : '';

  const vatScheduleHtml =
    isVatChequesEnabled(values) && vatSchedule.length > 0
      ? `<h2 style="font-size:11pt;color:${titleColor};margin:14px 0 6px;">${ar ? 'جدول شيكات ضريبة القيمة المضافة' : 'VAT cheque schedule'}</h2>${scheduleTable(
          vatSchedule,
          ar ? ['#', 'الاستحقاق', 'رقم الشيك', 'المبلغ (ر.ع.)'] : ['#', 'Due date', 'Cheque no.', 'Amount (OMR)'],
          ar,
          textFontSize
        )}`
      : '';

  const docs = values.documents || [];
  const docRows = CONTRACT_DOCUMENT_SLOTS.map((slot) => {
    const item = docs.find((d) => d.category === slot.category);
    const status = item?.name
      ? item.name
      : ar
        ? 'غير مرفق'
        : 'Not attached';
    return fieldRow(ar ? slot.titleAr : slot.titleEn, status, ar);
  }).join('');

  const companyName = ar
    ? company?.nameAr || company?.nameEn || 'شركة'
    : company?.nameEn || company?.nameAr || 'Company';
  const dateStr = new Date().toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { dateStyle: 'long' });
  const meta = ar
    ? `التاريخ: ${dateStr} | ${unit.building} — ${unit.unit}`
    : `Date: ${dateStr} | ${unit.building} — ${unit.unit}`;

  const signatures = `<table style="width:100%;margin-top:28px;border:none;">
    <tr>
      <td style="width:48%;padding:8px;border:none;text-align:center;">
        <div style="border-top:1px solid #333;margin-top:48px;padding-top:6px;font-size:${textFontSize}pt;">${ar ? 'توقيع المؤجر' : 'Landlord signature'}</div>
      </td>
      <td style="width:4%;border:none;"></td>
      <td style="width:48%;padding:8px;border:none;text-align:center;">
        <div style="border-top:1px solid #333;margin-top:48px;padding-top:6px;font-size:${textFontSize}pt;">${ar ? 'توقيع المستأجر' : 'Tenant signature'}</div>
      </td>
    </tr>
  </table>`;

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
    body{font-family:Arial,sans-serif;color:${textColor};padding:${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;font-size:${textFontSize}pt;line-height:1.45;}
    h1{font-size:14pt;color:${titleColor};margin-bottom:8px;}
    h2{font-size:11pt;color:${titleColor};}
    .meta{font-size:${textFontSize}pt;margin-bottom:12px;opacity:0.85;}
    table.contract-table{width:100%;border-collapse:collapse;margin-bottom:4px;}
    @media print{body{padding:0;}}
  </style>
</head>
<body>
  <h1>${escapeHtml(companyName)} — ${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(meta)}</p>
  <h2 style="font-size:11pt;color:${titleColor};margin:8px 0 6px;">${ar ? 'أطراف العقد' : 'Contract parties'}</h2>
  <table class="contract-table">${partyRows}</table>
  <h2 style="font-size:11pt;color:${titleColor};margin:14px 0 6px;">${ar ? 'بيانات العقار' : 'Property details'}</h2>
  <table class="contract-table">${propertyRows}</table>
  <h2 style="font-size:11pt;color:${titleColor};margin:14px 0 6px;">${ar ? 'شروط العقد' : 'Contract terms'}</h2>
  <table class="contract-table">${contractRows}</table>
  ${rentScheduleHtml}
  ${vatScheduleHtml}
  <h2 style="font-size:11pt;color:${titleColor};margin:14px 0 6px;">${ar ? 'المستندات المرفقة' : 'Attached documents'}</h2>
  <table class="contract-table">${docRows}</table>
  ${signatures}
  <p style="margin-top:14px;font-size:8pt;opacity:0.7;">${escapeHtml(
    ar
      ? 'نسخة رسمية من لوحة العقارات — للنماذج البلدية الكاملة راجع النظام التشغيلي.'
      : 'Official copy from real-estate dashboard — use the operational system for full municipal forms.'
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
