/**
 * دفتر العناوين - إدارة جهات الاتصال والعناوين
 * يُخزّن في localStorage
 */

export type ContactCategory =
  | 'CLIENT'      // عميل
  | 'TENANT'      // مستأجر
  | 'LANDLORD'    // مالك
  | 'SUPPLIER'    // مورد
  | 'PARTNER'     // شريك
  | 'GOVERNMENT'  // جهة حكومية
  | 'OTHER';      // أخرى

export interface ContactAddress {
  governorate?: string;
  state?: string;
  area?: string;
  village?: string;
  street?: string;
  building?: string;
  floor?: string;
  fullAddress?: string;
}

export type ContactGender = 'MALE' | 'FEMALE';

/** رموز التصنيف للسيريل نبر: CNT-{Code}-{Year}-{Seq}-S{n} */
const CATEGORY_SERIAL_CODES: Record<ContactCategory, string> = {
  CLIENT: 'C',
  TENANT: 'T',
  LANDLORD: 'L',
  SUPPLIER: 'S',
  PARTNER: 'P',
  GOVERNMENT: 'G',
  OTHER: 'O',
};

export interface Contact {
  id: string;
  /** الرقم المتسلسل (سيريل نبر) مثل CNT-C-2025-0001-S1 */
  serialNumber?: string;
  /** الاسم الأول */
  firstName: string;
  /** الاسم الثاني */
  secondName?: string;
  /** الاسم الثالث */
  thirdName?: string;
  /** اسم العائلة */
  familyName: string;
  /** الجنسية */
  nationality: string;
  /** الجنس */
  gender: ContactGender;
  email?: string;
  phone: string;
  phoneSecondary?: string;
  /** جهة العمل */
  workplace?: string;
  /** جهة العمل (إنجليزي) */
  workplaceEn?: string;
  company?: string;
  position?: string;
  category: ContactCategory;
  address?: ContactAddress;
  /** الرقم المدني */
  civilId?: string;
  /** تاريخ انتهاء الرقم المدني */
  civilIdExpiry?: string;
  /** رقم الجواز (للوفد فقط) */
  passportNumber?: string;
  /** تاريخ انتهاء الجواز (للوفد فقط) */
  passportExpiry?: string;
  notes?: string;
  /** الملاحظات (إنجليزي) */
  notesEn?: string;
  tags?: string[];
  /** للتوافق مع البيانات القديمة */
  name?: string;
  nameEn?: string;
  createdAt: string;
  updatedAt: string;
}

/** الحصول على الاسم الكامل من أجزاء الاسم - يدعم locale للعرض بالإنجليزي عند توفر nameEn */
export function getContactDisplayName(c: Contact, locale?: string): string {
  if (locale === 'en' && c.nameEn?.trim()) return c.nameEn;
  const parts = [c.firstName, c.secondName, c.thirdName, c.familyName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return c.name || c.nameEn || '—';
}

/** عرض العميل كامل: الاسم | الهاتف | الرقم المدني */
export function getContactDisplayFull(c: Contact, locale?: string): string {
  const name = getContactDisplayName(c, locale);
  const parts = [name, c.phone, c.civilId].filter(Boolean);
  return parts.join(' | ') || '—';
}

/** الحصول على جهة العمل أو الملاحظات حسب اللغة */
export function getContactLocalizedField(c: Contact, field: 'workplace' | 'notes', locale?: string): string {
  if (locale === 'en') {
    const enVal = field === 'workplace' ? c.workplaceEn : c.notesEn;
    if (enVal?.trim()) return enVal;
  }
  return (field === 'workplace' ? c.workplace : c.notes) || '—';
}

/** هل الجنسية عمانية؟ (لا يحتاج جواز سفر) */
export function isOmaniNationality(nationality: string): boolean {
  const n = (nationality || '').toLowerCase().trim();
  return n === 'عماني' || n === 'omani' || n === 'oman' || n === 'عمان';
}

const STORAGE_KEY = 'bhd_address_book';

function migrateContact(raw: Record<string, unknown>): Contact {
  let firstName = raw.firstName as string | undefined;
  let secondName = raw.secondName as string | undefined;
  let thirdName = raw.thirdName as string | undefined;
  let familyName = raw.familyName as string | undefined;
  const hasNewName = firstName != null || familyName != null;
  if (!hasNewName && raw.name) {
    const parts = String(raw.name).trim().split(/\s+/);
    if (parts.length >= 2) {
      familyName = parts.pop()!;
      firstName = parts.shift()!;
      secondName = parts[0];
      thirdName = parts[1];
    } else if (parts.length === 1) {
      firstName = parts[0];
      familyName = parts[0];
    }
  }
  if (!firstName) firstName = (raw.name as string) || '—';
  if (!familyName) familyName = (raw.name as string) || '—';
  return {
    ...raw,
    firstName,
    secondName,
    thirdName,
    familyName,
    nationality: (raw.nationality as string) || '',
    gender: (raw.gender as ContactGender) || 'MALE',
  } as Contact;
}

function getStored(): Contact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const migrated = list.map((c: Record<string, unknown>) => migrateContact({ ...c }));
    const needsSerial = migrated.some((c: Contact) => !c.serialNumber?.trim());
    if (needsSerial) {
      const withSerials = ensureSerialNumbers(migrated);
      save(withSerials);
      return withSerials;
    }
    return migrated;
  } catch {
    return [];
  }
}

function save(list: Contact[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function generateId() {
  return `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** توليد سيريل نبر للجهة: CNT-{CategoryCode}-{Year}-{Seq}-S{n} */
function generateContactSerialNumber(category: ContactCategory): string {
  const year = new Date().getFullYear();
  const code = CATEGORY_SERIAL_CODES[category] ?? 'O';
  const list = getStored();
  const sameYearSameCat = list.filter((c) => {
    const cYear = c.createdAt ? new Date(c.createdAt).getFullYear() : year;
    const cCat = c.category ?? 'OTHER';
    return cYear === year && cCat === category;
  });
  const seq = sameYearSameCat.length + 1;
  return `CNT-${code}-${year}-${String(seq).padStart(4, '0')}-S${seq}`;
}

/** تعيين سيريل نبر للجهات القديمة التي لا تملكه - مرتبة حسب تاريخ الإنشاء */
function ensureSerialNumbers(list: Contact[]): Contact[] {
  const year = new Date().getFullYear();
  const sorted = [...list].sort((a, b) =>
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  const byCat: Record<string, number> = {};
  const serialMap: Record<string, string> = {};
  for (const c of sorted) {
    const code = CATEGORY_SERIAL_CODES[c.category ?? 'OTHER'] ?? 'O';
    const cYear = c.createdAt ? new Date(c.createdAt).getFullYear() : year;
    const key = `${code}-${cYear}`;
    if (c.serialNumber?.trim()) {
      const m = c.serialNumber.match(/CNT-[A-Z]-\d{4}-(\d{4})/);
      if (m) byCat[key] = Math.max(byCat[key] ?? 0, parseInt(m[1], 10));
      continue;
    }
    byCat[key] = (byCat[key] ?? 0) + 1;
    const seq = byCat[key];
    serialMap[c.id] = `CNT-${code}-${cYear}-${String(seq).padStart(4, '0')}-S${seq}`;
  }
  return list.map((c) => (serialMap[c.id] ? { ...c, serialNumber: serialMap[c.id] } : c));
}

export function getAllContacts(): Contact[] {
  return getStored();
}

export function getContactById(id: string): Contact | undefined {
  return getStored().find((c) => c.id === id);
}

export function getContactsByCategory(category: ContactCategory): Contact[] {
  return getStored().filter((c) => c.category === category);
}

/** بحث في الاسم، البريد، الهاتف، الشركة، الملاحظات، العلامات، الرقم المدني، الجواز، الرقم المتسلسل */
export function searchContacts(query: string): Contact[] {
  if (!query.trim()) return getStored();
  const q = query.trim().toLowerCase();
  const normalize = (s: string) =>
    s
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .toLowerCase();
  const nq = normalize(q);
  return getStored().filter((c) => {
    const searchable = [
      c.serialNumber,
      c.firstName,
      c.secondName,
      c.thirdName,
      c.familyName,
      c.name,
      c.nameEn,
      c.nationality,
      c.email,
      c.phone,
      c.phoneSecondary,
      c.workplace,
      c.company,
      c.position,
      c.civilId,
      c.passportNumber,
      c.notes,
      c.address?.fullAddress,
      c.address?.governorate,
      c.address?.state,
      c.address?.village,
      ...(c.tags || []),
    ]
      .filter(Boolean)
      .join(' ');
    return normalize(searchable).includes(nq) || searchable.toLowerCase().includes(q);
  });
}

export function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const now = new Date().toISOString();
  const serialNumber = generateContactSerialNumber(data.category ?? 'OTHER');
  const contact: Contact = {
    ...data,
    id: generateId(),
    serialNumber,
    createdAt: now,
    updatedAt: now,
  };
  const list = getStored();
  list.unshift(contact);
  save(list);
  return contact;
}

export function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  save(list);
  return updated;
}

/** البحث عن جهة اتصال بالهاتف أو البريد */
export function findContactByPhoneOrEmail(phone: string, email?: string): Contact | undefined {
  const list = getStored();
  const normPhone = phone.replace(/\D/g, '');
  return list.find((c) => {
    const cPhone = (c.phone || '').replace(/\D/g, '');
    const matchPhone = normPhone && cPhone && (cPhone === normPhone || cPhone.endsWith(normPhone) || normPhone.endsWith(cPhone));
    const matchEmail = email && c.email && c.email.toLowerCase() === email.toLowerCase();
    return matchPhone || matchEmail;
  });
}

/** تحديث تصنيف الجهة عند الحجز (عميل) أو توثيق العقد (مستأجر) */
export function setContactCategoryForBooking(phone: string, category: 'CLIENT' | 'TENANT', email?: string): void {
  const c = findContactByPhoneOrEmail(phone, email);
  if (c && c.category !== category) {
    updateContact(c.id, { category });
  }
}

export function deleteContact(id: string): boolean {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  save(list);
  return true;
}

/** تصدير جهات الاتصال إلى CSV */
export function exportContactsToCsv(contacts: Contact[]): string {
  const headers = [
    'الرقم المتسلسل',
    'الاسم الأول', 'الاسم الثاني', 'الاسم الثالث', 'اسم العائلة',
    'الجنسية', 'الجنس', 'الهاتف', 'هاتف بديل', 'البريد',
    'الرقم المدني', 'انتهاء الرقم المدني', 'رقم الجواز', 'انتهاء الجواز',
    'جهة العمل', 'التصنيف', 'العنوان', 'الملاحظات', 'العلامات',
  ];
  const rows = contacts.map((c) => [
    c.serialNumber || '',
    c.firstName,
    c.secondName || '',
    c.thirdName || '',
    c.familyName,
    c.nationality,
    c.gender,
    c.phone,
    c.phoneSecondary || '',
    c.email || '',
    c.civilId || '',
    c.civilIdExpiry || '',
    c.passportNumber || '',
    c.passportExpiry || '',
    c.workplace || '',
    c.category,
    c.address?.fullAddress || [c.address?.governorate, c.address?.state, c.address?.village].filter(Boolean).join(' - ') || '',
    c.notes || '',
    (c.tags || []).join('; '),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
}

const CATEGORY_VALUES: ContactCategory[] = ['CLIENT', 'TENANT', 'LANDLORD', 'SUPPLIER', 'PARTNER', 'GOVERNMENT', 'OTHER'];

const SERIAL_PATTERN = /^CNT-[A-Z]-\d{4}-\d{4}-S\d+$/;

/** استيراد جهات الاتصال من CSV - يرجع عدد السجلات المستوردة */
export function importContactsFromCsv(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return 0;
  const header = lines[0].toLowerCase();
  const hasSerialCol = header.includes('الرقم المتسلسل') || header.includes('serial');
  const parseRow = (row: string): string[] => {
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
  };
  const list = getStored();
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const offset = hasSerialCol || (cols[0] && SERIAL_PATTERN.test(String(cols[0]).trim())) ? 1 : 0;
    const firstName = cols[offset]?.trim();
    const familyName = cols[offset + 3]?.trim();
    const phone = cols[offset + 6]?.trim() || cols[offset + 7]?.trim();
    if (!firstName && !familyName && !phone) continue;
    const cat = CATEGORY_VALUES.includes(cols[offset + 14] as ContactCategory) ? (cols[offset + 14] as ContactCategory) : 'OTHER';
    const tags = (cols[offset + 17] || '').split(/[;،,]/).map((t) => t.trim()).filter(Boolean);
    const serialNumber = offset === 1 && cols[0]?.trim() ? String(cols[0]).trim() : undefined;
    const contact: Contact = {
      id: generateId(),
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
      address: cols[offset + 15] ? { fullAddress: cols[offset + 15] } : undefined,
      notes: cols[offset + 16]?.trim() || undefined,
      tags: tags.length ? tags : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(contact);
    count++;
  }
  if (count > 0) save(list);
  return count;
}
