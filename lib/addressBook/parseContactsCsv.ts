/**
 * تحليل CSV دفتر العناوين — مشترك بين العميل والخادم (بدون localStorage)
 */
import type { Contact, ContactCategory, ContactGender } from '@/lib/data/addressBook';

const CATEGORY_VALUES: ContactCategory[] = [
  'CLIENT',
  'TENANT',
  'LANDLORD',
  'SUPPLIER',
  'PARTNER',
  'GOVERNMENT',
  'AUTHORIZED_REP',
  'OTHER',
];

const SERIAL_PATTERN = /^CNT-[A-Z]-\d{4}-\d{4}-S\d+$/;

function parseCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if ((ch === ',' && !inQuotes) || ch === '\n') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** يحلّل CSV ويرجع جهات جاهزة للحفظ (بدون id إن لم يُذكر serial صالح) */
export function parseContactsCsv(csvText: string): Contact[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasSerialCol = header.includes('الرقم المتسلسل') || header.includes('serial');
  const hasAddressEnCol = header.includes('العنوان (en)') || header.includes('address (en)');
  const now = new Date().toISOString();
  const out: Contact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const offset = hasSerialCol || (cols[0] && SERIAL_PATTERN.test(String(cols[0]).trim())) ? 1 : 0;
    const firstName = cols[offset]?.trim();
    const familyName = cols[offset + 3]?.trim();
    const phone = cols[offset + 6]?.trim() || cols[offset + 7]?.trim();
    if (!firstName && !familyName && !phone) continue;

    const cat = CATEGORY_VALUES.includes(cols[offset + 14] as ContactCategory)
      ? (cols[offset + 14] as ContactCategory)
      : 'OTHER';
    const tags = (cols[hasAddressEnCol ? offset + 18 : offset + 17] || '')
      .split(/[;،,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const serialNumber = offset === 1 && cols[0]?.trim() ? String(cols[0]).trim() : undefined;

    out.push({
      id: '',
      serialNumber: serialNumber && SERIAL_PATTERN.test(serialNumber) ? serialNumber : undefined,
      firstName: firstName || '—',
      secondName: cols[offset + 1]?.trim() || undefined,
      thirdName: cols[offset + 2]?.trim() || undefined,
      familyName: familyName || '—',
      nationality: cols[offset + 4]?.trim() || '',
      gender: (cols[offset + 5] === 'FEMALE' ? 'FEMALE' : 'MALE') as ContactGender,
      phone: phone || '',
      phoneSecondary: cols[offset + 7]?.trim() || undefined,
      email: cols[offset + 8]?.trim() || undefined,
      civilId: cols[offset + 9]?.trim() || undefined,
      civilIdExpiry: cols[offset + 10]?.trim() || undefined,
      passportNumber: cols[offset + 11]?.trim() || undefined,
      passportExpiry: cols[offset + 12]?.trim() || undefined,
      workplace: cols[offset + 13]?.trim() || undefined,
      category: cat,
      address:
        cols[offset + 15] || (hasAddressEnCol && cols[offset + 16])
          ? {
              fullAddress: cols[offset + 15] || undefined,
              fullAddressEn: hasAddressEnCol ? cols[offset + 16] : undefined,
            }
          : undefined,
      notes: cols[hasAddressEnCol ? offset + 17 : offset + 16]?.trim() || undefined,
      tags: tags.length ? tags : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return out;
}
