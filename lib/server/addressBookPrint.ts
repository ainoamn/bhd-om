import { siteConfig } from '@/config/site';
import type { Contact } from '@/lib/data/addressBook';
import { getContactDisplayName, isCompanyContact } from '@/lib/data/addressBook';

type PrintLocale = 'ar' | 'en';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d: string | undefined, locale: PrintLocale): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

const CATEGORY_BILINGUAL: Record<string, string> = {
  CLIENT: 'عميل / Client',
  TENANT: 'مستأجر / Tenant',
  LANDLORD: 'مالك / Landlord',
  SUPPLIER: 'مورد / Supplier',
  PARTNER: 'شريك / Partner',
  GOVERNMENT: 'جهة حكومية / Government',
  AUTHORIZED_REP: 'مفوض بالتوقيع / Authorized Rep',
  OTHER: 'أخرى / Other',
};

export function buildAddressBookContactPrintHtml(
  contact: Contact,
  options: { locale?: PrintLocale; origin?: string; linkedUserId?: string | null } = {}
): string {
  const locale = options.locale ?? 'ar';
  const origin = (options.origin || siteConfig.company.url).replace(/\/$/, '');
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isCompany = isCompanyContact(contact);
  const fullName = isCompany
    ? contact.companyData?.companyNameAr || contact.firstName || '—'
    : [contact.firstName, contact.secondName, contact.thirdName, contact.familyName].filter(Boolean).join(' ') || '—';
  const userId = options.linkedUserId || contact.userId || contact.linkedUserId || '';
  const scanUrl = userId ? `${origin}/${locale}/scan/${userId}` : '';
  const qrImg = scanUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(scanUrl)}`
    : '';

  const tableStyle = 'width:100%;border-collapse:collapse;border:1px solid #9ca3af;font-size:12px;margin-bottom:16px';
  const thStyle = 'border:1px solid #9ca3af;padding:8px;background:#8B6F47;color:white;text-align:right;font-weight:bold';
  const tdStyle = 'border:1px solid #9ca3af;padding:6px 8px';
  const tdLabelStyle = `${tdStyle};background:#f9fafb;font-weight:600;width:160px`;
  const sectionTitle =
    'font-size:14px;font-weight:bold;color:#8B6F47;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #d1d5db';

  const row = (label: string, value: string) =>
    `<tr><td style="${tdLabelStyle}">${esc(label)}</td><td style="${tdStyle}">${value}</td></tr>`;

  const basicRows = [
    row('الرقم المتسلسل / Serial No.', esc(contact.serialNumber || '—')),
    row(
      'النوع / Type',
      esc(isCompany ? 'شركة / Company' : 'شخص / Personal')
    ),
    row('الاسم / Name', esc(fullName)),
    ...(contact.nameEn || contact.companyData?.companyNameEn
      ? [row('الاسم (EN) / Name (EN)', esc(contact.nameEn || contact.companyData?.companyNameEn || ''))]
      : []),
    ...(qrImg
      ? [
          `<tr><td style="${tdLabelStyle}">الباركود / Barcode</td><td style="${tdStyle}"><img src="${qrImg}" alt="QR" style="width:120px;height:120px;display:block" /><p style="margin:4px 0 0;font-size:10px;color:#6b7280">${locale === 'ar' ? 'مسح الباركود لعرض بيانات المستخدم' : 'Scan to view user data'}</p><p style="margin:4px 0 0;font-size:10px;color:#9ca3af;word-break:break-all" dir="ltr">${esc(scanUrl)}</p></td></tr>`,
        ]
      : []),
    row('الهاتف / Phone', esc(contact.phone || '—')),
    row('هاتف بديل / Alt. Phone', esc(contact.phoneSecondary || '—')),
    row('البريد / Email', esc(contact.email || '—')),
    row('التصنيف / Category', esc(CATEGORY_BILINGUAL[contact.category] || contact.category)),
    row('العنوان / Address', esc(contact.address?.fullAddress || '—')),
    row('تاريخ الإنشاء / Created', esc(fmtDate(contact.createdAt, locale))),
  ].join('');

  const companyRows = isCompany && contact.companyData
    ? `
      <h2 style="${sectionTitle}">بيانات الشركة / Company</h2>
      <table style="${tableStyle}"><tbody>
        ${row('س.ت. / CR No.', esc(contact.companyData.commercialRegistrationNumber || '—'))}
        ${row('انتهاء السجل / CR Expiry', esc(contact.companyData.commercialRegistrationExpiry || '—'))}
        ${row('تاريخ التأسيس / Est. Date', esc(contact.companyData.establishmentDate || '—'))}
      </tbody></table>
      ${
        (contact.companyData.authorizedRepresentatives || []).length
          ? `<h2 style="${sectionTitle}">المفوضون بالتوقيع / Authorized representatives</h2>
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle}">الاسم / Name</th>
          <th style="${thStyle}">المنصب / Position</th>
          <th style="${thStyle}">الهاتف / Phone</th>
        </tr></thead>
        <tbody>
          ${(contact.companyData.authorizedRepresentatives || [])
            .map(
              (r) =>
                `<tr><td style="${tdStyle}">${esc(r.name || '—')}</td><td style="${tdStyle}">${esc(r.position || '—')}</td><td style="${tdStyle}">${esc(r.phone || '—')}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>`
          : ''
      }`
    : '';

  const personalRows =
    !isCompany
      ? `
      <table style="${tableStyle}"><tbody>
        ${row('الجنسية / Nationality', esc(contact.nationality || '—'))}
        ${row('الرقم المدني / Civil ID', esc(contact.civilId || '—'))}
        ${row('انتهاء البطاقة / ID Expiry', esc(contact.civilIdExpiry || '—'))}
        ${row('الجواز / Passport', esc(contact.passportNumber || '—'))}
        ${row('انتهاء الجواز / Passport Expiry', esc(contact.passportExpiry || '—'))}
        ${row('جهة العمل / Workplace', esc(contact.workplace || '—'))}
      </tbody></table>`
      : '';

  const displayName = getContactDisplayName(contact, locale);

  return `<!DOCTYPE html><html dir="${dir}" lang="${locale}"><head><meta charset="utf-8"><title>${esc(displayName)} — ${locale === 'ar' ? 'تقرير جهة اتصال' : 'Contact report'}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#111;background:#fff}@media print{body{padding:0}}</style></head><body>
<div style="border:2px solid #8B6F47;padding:24px;max-width:210mm;margin:0 auto">
  <div style="border-bottom:2px solid #8B6F47;padding-bottom:20px;margin-bottom:24px;text-align:center">
    <img src="${origin}/logo-bhd.png" alt="Logo" style="width:64px;height:64px;object-fit:contain;vertical-align:middle;margin-${locale === 'ar' ? 'left' : 'right'}:12px">
    <div style="display:inline-block;text-align:center;vertical-align:middle">
      <h1 style="margin:0;font-size:20px;color:#8B6F47">${esc(siteConfig.company.nameAr)} / ${esc(siteConfig.company.nameEn)}</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#4b5563">${esc(siteConfig.company.legalName)}</p>
      <p style="margin:8px 0 0;font-size:13px;font-weight:bold;color:#8B6F47">${locale === 'ar' ? 'تقرير جهة اتصال' : 'Contact report'} / Contact Report</p>
    </div>
  </div>
  <h2 style="${sectionTitle}">البيانات الأساسية / Basic information</h2>
  <table style="${tableStyle}"><tbody>${basicRows}</tbody></table>
  ${personalRows}
  ${companyRows}
  <p style="margin-top:24px;font-size:11px;color:#6b7280;text-align:center">${locale === 'ar' ? 'تم إنشاء التقرير من نظام بن حمود للتطوير' : 'Generated by BIN HAMOOD DEVELOPMENT SPC'}</p>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}
