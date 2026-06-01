export type CustomReportSource = 'bookings' | 'contacts' | 'maintenance' | 'submissions';

export type CustomReportColumn = { id: string; labelAr: string; labelEn: string };

export const CUSTOM_REPORT_SOURCES: Record<
  CustomReportSource,
  { labelAr: string; labelEn: string; endpoint: string; columns: CustomReportColumn[] }
> = {
  bookings: {
    labelAr: 'الحجوزات',
    labelEn: 'Bookings',
    endpoint: '/api/bookings?limit=500',
    columns: [
      { id: 'id', labelAr: 'المعرف', labelEn: 'ID' },
      { id: 'bookingSerial', labelAr: 'الرقم', labelEn: 'Serial' },
      { id: 'status', labelAr: 'الحالة', labelEn: 'Status' },
      { id: 'propertyTitleAr', labelAr: 'العقار', labelEn: 'Property' },
      { id: 'tenantName', labelAr: 'المستأجر', labelEn: 'Tenant' },
      { id: 'createdAt', labelAr: 'التاريخ', labelEn: 'Date' },
    ],
  },
  contacts: {
    labelAr: 'دفتر العناوين',
    labelEn: 'Address book',
    endpoint: '/api/address-book?limit=500&offset=0',
    columns: [
      { id: 'serialNumber', labelAr: 'الرقم', labelEn: 'Serial' },
      { id: 'firstName', labelAr: 'الاسم', labelEn: 'First name' },
      { id: 'familyName', labelAr: 'العائلة', labelEn: 'Family' },
      { id: 'email', labelAr: 'البريد', labelEn: 'Email' },
      { id: 'phone', labelAr: 'الهاتف', labelEn: 'Phone' },
      { id: 'category', labelAr: 'التصنيف', labelEn: 'Category' },
    ],
  },
  maintenance: {
    labelAr: 'طلبات الصيانة',
    labelEn: 'Maintenance',
    endpoint: '/api/admin/maintenance-requests?limit=500',
    columns: [
      { id: 'id', labelAr: 'المعرف', labelEn: 'ID' },
      { id: 'propertyLabelAr', labelAr: 'العقار', labelEn: 'Property' },
      { id: 'descriptionAr', labelAr: 'الوصف', labelEn: 'Description' },
      { id: 'status', labelAr: 'الحالة', labelEn: 'Status' },
      { id: 'priority', labelAr: 'الأولوية', labelEn: 'Priority' },
      { id: 'createdAt', labelAr: 'التاريخ', labelEn: 'Date' },
    ],
  },
  submissions: {
    labelAr: 'رسائل الزوار',
    labelEn: 'Contact submissions',
    endpoint: '/api/admin/contact-submissions?limit=500',
    columns: [
      { id: 'name', labelAr: 'الاسم', labelEn: 'Name' },
      { id: 'email', labelAr: 'البريد', labelEn: 'Email' },
      { id: 'phone', labelAr: 'الهاتف', labelEn: 'Phone' },
      { id: 'type', labelAr: 'النوع', labelEn: 'Type' },
      { id: 'message', labelAr: 'الرسالة', labelEn: 'Message' },
      { id: 'createdAt', labelAr: 'التاريخ', labelEn: 'Date' },
    ],
  },
};

function cellValue(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).replace(/"/g, '""');
}

export function rowsToCsv(rows: Record<string, unknown>[], columnIds: string[]): string {
  const header = columnIds.join(',');
  const lines = rows.map((row) => columnIds.map((c) => `"${cellValue(row, c)}"`).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): number {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return blob.size;
}

export async function fetchCustomReportRows(source: CustomReportSource): Promise<Record<string, unknown>[]> {
  const cfg = CUSTOM_REPORT_SOURCES[source];
  const res = await fetch(cfg.endpoint, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) throw new Error('fetch_failed');
  const data = await res.json();
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
  if (Array.isArray(data.list)) return data.list as Record<string, unknown>[];
  return [];
}
