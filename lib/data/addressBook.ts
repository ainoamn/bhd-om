/**
 * دفتر العناوين - إدارة جهات الاتصال والعناوين
 * يُخزّن في localStorage
 */

import { isContactLinked as checkContactLinked } from './contactLinks';

export type ContactCategory =
  | 'CLIENT'           // عميل
  | 'TENANT'           // مستأجر
  | 'LANDLORD'         // مالك
  | 'SUPPLIER'         // مورد
  | 'PARTNER'          // شريك
  | 'GOVERNMENT'       // جهة حكومية
  | 'AUTHORIZED_REP'   // مفوض بالتوقيع - مرتبط بشركة
  | 'OTHER';           // أخرى

export interface ContactAddress {
  governorate?: string;
  state?: string;
  area?: string;
  village?: string;
  street?: string;
  building?: string;
  floor?: string;
  fullAddress?: string;
  /** العنوان بالإنجليزي */
  fullAddressEn?: string;
}

export type ContactGender = 'MALE' | 'FEMALE';

/** نوع جهة الاتصال: شخصي (ذكر/أنثى) أو شركة */
export type ContactType = 'PERSONAL' | 'COMPANY';

/** وسم المفوض بالتوقيع في دفتر العناوين */
export const AUTHORIZED_REP_TAG_AR = 'مفوض بالتوقيع';
export const AUTHORIZED_REP_TAG_EN = 'Authorized Representative';

/** المفوض بالإدارة والتوقيع - للشركات */
export interface AuthorizedRepresentative {
  id: string;
  /** الاسم الكامل (عربي) */
  name: string;
  /** الاسم الكامل (إنجليزي) - إجباري */
  nameEn?: string;
  /** الجنسية - لتحديد إذا عماني (بطاقة فقط) أو وافد (بطاقة + جواز) */
  nationality?: string;
  /** الرقم المدني */
  civilId?: string;
  /** تاريخ انتهاء الرقم المدني */
  civilIdExpiry?: string;
  /** رقم الجواز (للوفد فقط) */
  passportNumber?: string;
  /** تاريخ انتهاء الجواز (للوفد فقط) */
  passportExpiry?: string;
  /** رقم الهاتف */
  phone: string;
  /** المنصب في الشركة */
  position: string;
  /** معرف جهة الاتصال المحفوظة منفرداً في دفتر العناوين */
  contactId?: string;
}

/** رموز التصنيف للسيريل نبر: CNT-{Code}-{Year}-{Seq}-S{n} */
const CATEGORY_SERIAL_CODES: Record<ContactCategory, string> = {
  CLIENT: 'C',
  TENANT: 'T',
  LANDLORD: 'L',
  SUPPLIER: 'S',
  PARTNER: 'P',
  GOVERNMENT: 'G',
  AUTHORIZED_REP: 'A',
  OTHER: 'O',
};

/** التحقق من صلاحية رقم الهاتف: رمز الدولة + عمان لا يقل عن 8 أرقام */
export function validatePhoneWithCountryCode(phone: string, countryCode = '968'): { valid: boolean; message?: string } {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 6) return { valid: false, message: 'invalidPhoneShort' };
  const full = digits.startsWith(countryCode) ? digits : countryCode + digits.replace(/^0+/, '');
  const numPart = full.startsWith(countryCode) ? full.slice(countryCode.length) : full;
  if (countryCode === '968' && numPart.length < 8) return { valid: false, message: 'invalidPhoneOmanMin8' };
  return { valid: true };
}

/** التحقق من تاريخ انتهاء البطاقة المدنية: لا يقل عن 30 يوماً من اليوم */
export function validateCivilIdExpiry(expiryStr: string): { valid: boolean } {
  if (!expiryStr?.trim()) return { valid: true };
  try {
    const expiry = new Date(expiryStr);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 30);
    return { valid: !isNaN(expiry.getTime()) && expiry >= minDate };
  } catch {
    return { valid: false };
  }
}

/** التحقق من تاريخ انتهاء الجواز: لا يقل عن 90 يوماً من اليوم */
export function validatePassportExpiry(expiryStr: string): { valid: boolean } {
  if (!expiryStr?.trim()) return { valid: true };
  try {
    const expiry = new Date(expiryStr);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 90);
    return { valid: !isNaN(expiry.getTime()) && expiry >= minDate };
  } catch {
    return { valid: false };
  }
}

export interface Contact {
  id: string;
  /** الرقم المتسلسل (سيريل نبر) مثل CNT-C-2025-0001-S1 */
  serialNumber?: string;
  /** نوع الجهة: شخصي أو شركة */
  contactType?: ContactType;
  /** الاسم الأول (شخصي) أو اسم الشركة (شركة - للتوافق) */
  firstName: string;
  /** الاسم الثاني */
  secondName?: string;
  /** الاسم الثالث */
  thirdName?: string;
  /** اسم العائلة (شخصي) أو فارغ (شركة) */
  familyName: string;
  /** الجنسية (شخصي) */
  nationality: string;
  /** الجنس (شخصي فقط) */
  gender: ContactGender;
  email?: string;
  phone: string;
  phoneSecondary?: string;
  /** بيانات الشركة - عند contactType === 'COMPANY' */
  companyData?: {
    /** اسم الشركة (عربي) */
    companyNameAr: string;
    /** اسم الشركة (إنجليزي) */
    companyNameEn?: string;
    /** رقم السجل التجاري - إلزامي */
    commercialRegistrationNumber: string;
    /** تاريخ انتهاء السجل - إلزامي عند الحجز/التوثيق */
    commercialRegistrationExpiry?: string;
    /** تاريخ التأسيس - إلزامي عند الحجز/التوثيق */
    establishmentDate?: string;
    /** المفوضون بالإدارة والتوقيع */
    authorizedRepresentatives: AuthorizedRepresentative[];
  };
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
  /** العقار/الوحدة المرتبطة (عميل لأي وحدة) - من الحجز */
  linkedPropertyId?: number;
  linkedUnitKey?: string;
  linkedUnitDisplay?: string;
  /** مفوض بالتوقيع لشركة - معرف جهة الاتصال للشركة */
  authorizedForCompanyId?: string;
  /** اسم الشركة (عربي) - للمفوض بالتوقيع */
  linkedCompanyNameAr?: string;
  /** اسم الشركة (إنجليزي) - للمفوض بالتوقيع */
  linkedCompanyNameEn?: string;
  /** سجل تغيير التصنيف: تاريخ، من، إلى */
  categoryChangeHistory?: Array<{ date: string; from: ContactCategory; to: ContactCategory }>;
  /** موقوفة/مؤرشفة - لا تُحذف، يمكن استعادتها */
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** الحصول على الاسم الكامل - للشركة يعرض اسم الشركة، للشخصي يعرض الاسم */
export function getContactDisplayName(c: Contact | undefined | null, locale?: string): string {
  if (!c) return '—';
  if (c.contactType === 'COMPANY' && c.companyData?.companyNameAr) {
    if (locale === 'en' && c.companyData.companyNameEn?.trim()) return c.companyData.companyNameEn;
    return c.companyData.companyNameAr;
  }
  if (locale === 'en' && c.nameEn?.trim()) return c.nameEn;
  const parts = [c.firstName, c.secondName, c.thirdName, c.familyName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return c.name || c.nameEn || '—';
}

/** هل الجهة شركة؟ */
export function isCompanyContact(c: Contact): boolean {
  return c.contactType === 'COMPANY';
}

/** هل الجهة مفوض بالتوقيع لشركة؟ */
export function isAuthorizedRepresentative(c: Contact): boolean {
  return !!(c.contactType === 'PERSONAL' && c.authorizedForCompanyId);
}

/** الحصول على اسم الشركة المرتبطة (للمفوض بالتوقيع) */
export function getLinkedCompanyName(c: Contact, locale?: string): string | undefined {
  if (!c.authorizedForCompanyId) return undefined;
  if (locale === 'en' && c.linkedCompanyNameEn?.trim()) return c.linkedCompanyNameEn;
  return c.linkedCompanyNameAr || c.linkedCompanyNameEn || undefined;
}

/** الحصول على المنصب في الشركة للمفوض بالتوقيع - من سجل جهة الاتصال أو من بيانات الشركة */
export function getLinkedRepPosition(c: Contact): string | undefined {
  if (c.position?.trim()) return c.position.trim();
  if (!c.authorizedForCompanyId) return undefined;
  const company = getContactById(c.authorizedForCompanyId);
  const rep = company?.companyData?.authorizedRepresentatives?.find((r) => r.contactId === c.id);
  return rep?.position?.trim();
}

/** الحصول على جميع الشركات التي يمثلها المفوض بالتوقيع */
export function getCompaniesForRep(contactId: string): Array<{ id: string; nameAr: string; nameEn?: string; position?: string }> {
  const list = getStored();
  const result: Array<{ id: string; nameAr: string; nameEn?: string; position?: string }> = [];
  for (const c of list) {
    if (c.contactType !== 'COMPANY' || !c.companyData?.authorizedRepresentatives) continue;
    const rep = c.companyData.authorizedRepresentatives.find((r) => r.contactId === contactId);
    if (rep) {
      result.push({
        id: c.id,
        nameAr: c.companyData.companyNameAr || c.firstName || '—',
        nameEn: c.companyData.companyNameEn,
        position: rep.position?.trim(),
      });
    }
  }
  return result;
}

/** عناصر التصنيف للمفوض: [{ companyName, position }] للعرض المنسق */
export function getLinkedRepDisplayItems(contact: Contact, locale?: string): Array<{ companyName: string; position?: string }> {
  const companies = getCompaniesForRep(contact.id);
  if (companies.length === 0) {
    const pos = getLinkedRepPosition(contact);
    const name = getLinkedCompanyName(contact, locale);
    if (name) return [{ companyName: name, position: pos || undefined }];
    if (pos) return [{ companyName: pos }];
    return [];
  }
  const positions = [...new Set(companies.map((co) => co.position?.trim() || '').filter(Boolean))];
  if (positions.length === 1 && positions[0]) {
    const names = companies.map((co) => (locale === 'en' && co.nameEn?.trim() ? co.nameEn : co.nameAr)).join('، ');
    return [{ companyName: names, position: positions[0] }];
  }
  return companies.map((co) => {
    const companyName = locale === 'en' && co.nameEn?.trim() ? co.nameEn : co.nameAr;
    const pos = co.position?.trim();
    return { companyName, position: pos || undefined };
  });
}

/** نص التصنيف للمفوض (للعنوان والوصف) */
export function getLinkedRepDisplay(contact: Contact, locale?: string): string {
  const items = getLinkedRepDisplayItems(contact, locale);
  return items.map((i) => (i.position ? `${i.companyName} — ${i.position}` : i.companyName)).join('، ');
}

/** عرض العميل كامل: الاسم | الهاتف | الرقم المدني */
export function getContactDisplayFull(c: Contact | undefined | null, locale?: string): string {
  if (!c) return '—';
  const name = getContactDisplayName(c, locale);
  const parts = [name, c.phone, c.civilId].filter(Boolean);
  return parts.join(' | ') || '—';
}

/** عرض العميل حسب مستوى التفاصيل */
export function getContactDisplayByLevel(
  c: Contact,
  level: 'nameOnly' | 'namePhone' | 'namePhoneCivilId' | 'namePhoneSerialNumber',
  locale?: string
): string {
  const name = getContactDisplayName(c, locale);
  if (level === 'nameOnly') return name || '—';
  if (level === 'namePhone') return [name, c.phone].filter(Boolean).join(' | ') || '—';
  if (level === 'namePhoneCivilId') return [name, c.phone, c.civilId].filter(Boolean).join(' | ') || '—';
  if (level === 'namePhoneSerialNumber') return [name, c.phone, c.serialNumber, c.civilId].filter(Boolean).join(' | ') || '—';
  return getContactDisplayFull(c, locale);
}

/** الحصول على جهة العمل أو الملاحظات أو العنوان حسب اللغة */
export function getContactLocalizedField(c: Contact, field: 'workplace' | 'notes' | 'address', locale?: string): string {
  if (field === 'address') {
    if (locale === 'en' && c.address?.fullAddressEn?.trim()) return c.address.fullAddressEn;
    return c.address?.fullAddress || c.address?.fullAddressEn || '—';
  }
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

export function getAllContacts(includeArchived = false): Contact[] {
  const list = getStored();
  if (includeArchived) return list;
  return list.filter((c) => !c.archived);
}

export function getContactById(id: string): Contact | undefined {
  return getStored().find((c) => c.id === id);
}

export function getContactsByCategory(category: ContactCategory, includeArchived = false): Contact[] {
  let list = getStored().filter((c) => c.category === category);
  if (!includeArchived) list = list.filter((c) => !c.archived);
  return list;
}

/** جميع الجهات الشخصية (للقائمة المنسدلة عند اختيار المفوض) - يمكن استثناء معرفات وعرض الكل أو تصفية بالاسم */
export function getAllPersonalContacts(excludeContactIds?: string[], nameFilter?: string): Contact[] {
  let list = getStored().filter((c) => !c.archived && c.contactType !== 'COMPANY');
  const exclude = new Set(excludeContactIds || []);
  list = list.filter((c) => !exclude.has(c.id));
  const q = (nameFilter || '').trim().toLowerCase();
  if (q.length >= 1) {
    const fullNameOf = (c: Contact) =>
      [c.firstName, c.secondName, c.thirdName, c.familyName, (c as { name?: string }).name, c.linkedCompanyNameAr, c.linkedCompanyNameEn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    list = list.filter((c) => {
      const full = fullNameOf(c);
      const first = (c.firstName || (c as { name?: string }).name || '').trim().toLowerCase();
      return full.includes(q) || first.startsWith(q) || q.startsWith(first);
    });
  }
  return list;
}

/** البحث عن جهات اتصال شخصية بالرقم المدني أو رقم الجواز أو الاسم (من أول حرف) - للمفوضين بالتوقيع */
export function findContactsByCivilIdOrName(
  civilId?: string,
  passportNumber?: string,
  nameQuery?: string,
  excludeContactIds?: string[]
): Contact[] {
  const list = getStored().filter((c) => !c.archived && c.contactType !== 'COMPANY');
  const normCivilId = (civilId || '').replace(/\D/g, '').trim();
  const normPassport = (passportNumber || '').trim().toUpperCase();
  const queryLower = (nameQuery || '').trim().toLowerCase();
  const exclude = new Set(excludeContactIds || []);
  const fullNameOf = (c: Contact) =>
    [c.firstName, c.secondName, c.thirdName, c.familyName, (c as { name?: string }).name, c.linkedCompanyNameAr, c.linkedCompanyNameEn]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  return list.filter((c) => {
    if (exclude.has(c.id)) return false;
    if (normCivilId.length >= 4 && (c.civilId || '').replace(/\D/g, '').trim() === normCivilId) return true;
    if (normPassport.length >= 4 && (c.passportNumber || '').trim().toUpperCase() === normPassport) return true;
    if (queryLower.length >= 1) {
      const cFull = fullNameOf(c);
      const cFirst = (c.firstName || (c as { name?: string }).name || '').trim().toLowerCase();
      if (cFull.includes(queryLower) || cFirst.startsWith(queryLower) || queryLower.startsWith(cFirst)) return true;
    }
    return false;
  });
}

/** البحث عن جهات اتصال شخصية بالرقم المتسلسل (حرفين أو أكثر) - للمفوضين بالتوقيع */
export function findContactsBySerialPrefix(prefix: string, excludeContactIds?: string[]): Contact[] {
  const p = (prefix || '').trim().toUpperCase();
  if (p.length < 2) return [];
  const list = getStored().filter((c) => !c.archived && c.contactType !== 'COMPANY');
  const exclude = new Set(excludeContactIds || []);
  return list.filter((c) => {
    if (exclude.has(c.id)) return false;
    const serial = (c.serialNumber || '').toUpperCase();
    return serial.length >= 2 && serial.startsWith(p);
  });
}

/** بحث في الاسم، البريد، الهاتف، الشركة، الملاحظات، العلامات، الرقم المدني، الجواز، الرقم المتسلسل */
export function searchContacts(query: string, includeArchived = false): Contact[] {
  let list = getStored();
  if (!includeArchived) list = list.filter((c) => !c.archived);
  if (!query.trim()) return list;
  const q = query.trim().toLowerCase();
  const normalize = (s: string) =>
    s
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .toLowerCase();
  const nq = normalize(q);
  return list.filter((c) => {
    const searchable = [
      c.serialNumber,
      c.firstName,
      c.address?.fullAddressEn,
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
      c.companyData?.companyNameAr,
      c.companyData?.companyNameEn,
      c.companyData?.commercialRegistrationNumber,
      ...(c.companyData?.authorizedRepresentatives || []).flatMap((r) => [r.name, r.civilId, r.passportNumber, r.position]),
      ...(c.tags || []),
    ]
      .filter(Boolean)
      .join(' ');
    return normalize(searchable).includes(nq) || searchable.toLowerCase().includes(q);
  });
}

export function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const crNumber = data.companyData?.commercialRegistrationNumber;
  const dups = findDuplicateContactFields(
    data.phone,
    data.civilId,
    data.passportNumber,
    undefined,
    crNumber
  );
  if (dups.phone) throw new Error('DUPLICATE_PHONE');
  if (dups.civilId) throw new Error('DUPLICATE_CIVIL_ID');
  if (dups.passportNumber) throw new Error('DUPLICATE_PASSPORT');
  if (dups.commercialRegistration) throw new Error('DUPLICATE_COMMERCIAL_REGISTRATION');

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
  if (contact.contactType === 'COMPANY' && contact.companyData?.authorizedRepresentatives?.length) {
    syncAuthorizedRepsToAddressBook(contact);
  }
  return contact;
}

export function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const current = list[idx];
  const merged = { ...current, ...updates };
  const crNumber = merged.companyData?.commercialRegistrationNumber;
  const excludeIds: string[] = [id];
  if (current.authorizedForCompanyId) {
    excludeIds.push(current.authorizedForCompanyId);
    const company = getContactById(current.authorizedForCompanyId);
    const companyRepIds = (company?.companyData?.authorizedRepresentatives || [])
      .map((r) => (r as { contactId?: string }).contactId)
      .filter(Boolean) as string[];
    excludeIds.push(...companyRepIds);
  }
  const repContactIds = (current.companyData?.authorizedRepresentatives || [])
    .map((r) => (r as { contactId?: string }).contactId)
    .filter(Boolean) as string[];
  excludeIds.push(...repContactIds);
  const normCr = (crNumber || '').replace(/\D/g, '').trim();
  if (normCr.length >= 4) {
    for (const c of list) {
      if (c.id === id) continue;
      const cCr = (c.companyData?.commercialRegistrationNumber || '').replace(/\D/g, '').trim();
      if (cCr.length >= 4 && cCr === normCr) excludeIds.push(c.id);
    }
  }
  const dups = findDuplicateContactFields(
    merged.phone,
    merged.civilId,
    merged.passportNumber,
    id,
    crNumber,
    excludeIds
  );
  if (dups.phone) throw new Error('DUPLICATE_PHONE');
  if (dups.civilId) throw new Error('DUPLICATE_CIVIL_ID');
  if (dups.passportNumber) throw new Error('DUPLICATE_PASSPORT');
  if (dups.commercialRegistration) throw new Error('DUPLICATE_COMMERCIAL_REGISTRATION');

  /** تسجيل تغيير التصنيف في السجل */
  const categoryChangeHistory = [...(current.categoryChangeHistory || [])];
  if (updates.category != null && updates.category !== current.category) {
    categoryChangeHistory.push({
      date: new Date().toISOString(),
      from: current.category,
      to: updates.category,
    });
  }

  const updated = { ...merged, categoryChangeHistory, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  save(list);
  if (updated.contactType === 'COMPANY' && updated.companyData?.authorizedRepresentatives?.length) {
    syncAuthorizedRepsToAddressBook(updated);
  }
  return updated;
}

/** مزامنة المفوضين بالتوقيع كجهات اتصال شخصية منفصلة - تُستدعى عند حفظ شركة */
function syncAuthorizedRepsToAddressBook(company: Contact): void {
  const reps = company.companyData?.authorizedRepresentatives || [];
  if (reps.length === 0) return;
  const companyNameAr = company.companyData?.companyNameAr || '';
  const companyNameEn = company.companyData?.companyNameEn || '';
  const linkData = {
    linkedPropertyId: company.linkedPropertyId,
    linkedUnitKey: company.linkedUnitKey,
    linkedUnitDisplay: company.linkedUnitDisplay,
  };
  const excludeCompanyIds = [company.id];
  const usedRepContactIds: string[] = [];
  const updatedReps: AuthorizedRepresentative[] = [];
  for (const rep of reps) {
    const existing = rep.contactId ? getContactById(rep.contactId) : undefined;
    const baseTags = existing?.tags?.filter((t) => t !== AUTHORIZED_REP_TAG_AR && t !== AUTHORIZED_REP_TAG_EN) || [];
    const tags = [AUTHORIZED_REP_TAG_AR, ...baseTags];
    const repData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> = {
      contactType: 'PERSONAL',
      firstName: rep.name || '—',
      secondName: undefined,
      thirdName: undefined,
      familyName: '',
      nameEn: rep.nameEn?.trim() || undefined,
      nationality: rep.nationality || '',
      gender: 'MALE',
      phone: rep.phone || '',
      position: rep.position || '',
      category: 'AUTHORIZED_REP',
      civilId: rep.civilId,
      civilIdExpiry: rep.civilIdExpiry,
      passportNumber: rep.passportNumber,
      passportExpiry: rep.passportExpiry,
      authorizedForCompanyId: company.id,
      linkedCompanyNameAr: companyNameAr,
      linkedCompanyNameEn: companyNameEn,
      tags,
      ...linkData,
    };
    const excludeForDup = [...excludeCompanyIds, ...usedRepContactIds];
    let repContactId: string;
    if (rep.contactId) {
      const existingContact = getContactById(rep.contactId);
      if (existingContact) {
        updateContactDirect(rep.contactId, repData, excludeForDup);
        repContactId = rep.contactId;
      } else {
        const created = createContactDirect(repData, excludeForDup);
        repContactId = created.id;
      }
    } else {
      const dups = findDuplicateContactFields(repData.phone, repData.civilId, repData.passportNumber, undefined, undefined, excludeForDup);
      const existingContact = dups.civilId ?? dups.passportNumber ?? dups.phone;
      if (existingContact) {
        const linkOnlyUpdates: Partial<Contact> = {
          authorizedForCompanyId: company.id,
          linkedCompanyNameAr: companyNameAr,
          linkedCompanyNameEn: companyNameEn,
          category: 'AUTHORIZED_REP',
          tags,
          ...linkData,
        };
        updateContactDirect(existingContact.id, linkOnlyUpdates, excludeForDup);
        repContactId = existingContact.id;
      } else {
        const created = createContactDirect(repData, excludeForDup);
        repContactId = created.id;
      }
    }
    usedRepContactIds.push(repContactId);
    updatedReps.push({ ...rep, contactId: repContactId });
  }
  const list = getStored();
  const companyIdx = list.findIndex((c) => c.id === company.id);
  if (companyIdx < 0) return;
  const now = new Date().toISOString();
  list[companyIdx] = {
    ...list[companyIdx],
    companyData: {
      ...list[companyIdx].companyData!,
      authorizedRepresentatives: updatedReps,
    },
    updatedAt: now,
  };
  save(list);
}

/** إنشاء جهة اتصال بدون استدعاء مزامنة المفوضين (للاستخدام الداخلي) */
function createContactDirect(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>, excludeFromDupCheck?: string[]): Contact {
  const crNumber = data.companyData?.commercialRegistrationNumber;
  const dups = findDuplicateContactFields(
    data.phone,
    data.civilId,
    data.passportNumber,
    undefined,
    crNumber,
    excludeFromDupCheck
  );
  if (dups.phone) throw new Error('DUPLICATE_PHONE');
  if (dups.civilId) throw new Error('DUPLICATE_CIVIL_ID');
  if (dups.passportNumber) throw new Error('DUPLICATE_PASSPORT');
  if (dups.commercialRegistration) throw new Error('DUPLICATE_COMMERCIAL_REGISTRATION');
  const now = new Date().toISOString();
  const serialNumber = generateContactSerialNumber(data.category ?? 'OTHER');
  const contact: Contact = { ...data, id: generateId(), serialNumber, createdAt: now, updatedAt: now };
  const list = getStored();
  list.unshift(contact);
  save(list);
  return contact;
}

/** تحديث جهة اتصال بدون استدعاء مزامنة المفوضين (للاستخدام الداخلي) */
function updateContactDirect(id: string, updates: Partial<Contact>, excludeContactIds?: string[]): Contact | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const current = list[idx];
  const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const crNumber = merged.companyData?.commercialRegistrationNumber;
  const dups = findDuplicateContactFields(
    merged.phone,
    merged.civilId,
    merged.passportNumber,
    id,
    crNumber,
    excludeContactIds
  );
  if (dups.phone) throw new Error('DUPLICATE_PHONE');
  if (dups.civilId) throw new Error('DUPLICATE_CIVIL_ID');
  if (dups.passportNumber) throw new Error('DUPLICATE_PASSPORT');
  if (dups.commercialRegistration) throw new Error('DUPLICATE_COMMERCIAL_REGISTRATION');
  list[idx] = merged;
  save(list);
  return merged;
}

/** تطبيع رقم الهاتف للمقارنة - يدعم الصيغة المحلية (8 أرقام) والصيغة الدولية (968+8) و 00968 */
export function normalizePhoneForComparison(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 6) return digits;
  if (digits.startsWith('00')) digits = digits.slice(2);
  // عمان: 968. إذا 8 أرقام تبدأ بـ 9 → نعتبرها 968 + الرقم
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  return digits;
}

/** التحقق من تكرار الهاتف أو الرقم المدني أو رقم الجواز أو السجل التجاري - يُستثنى جهة الاتصال الحالية عند التعديل */
export function findDuplicateContactFields(
  phone: string,
  civilId?: string,
  passportNumber?: string,
  excludeContactId?: string,
  commercialRegistrationNumber?: string,
  /** جهات إضافية للاستثناء (مثلاً الشركة عند إنشاء مفوض بالتوقيع) */
  excludeContactIds?: string[]
): { phone?: Contact; civilId?: Contact; passportNumber?: Contact; commercialRegistration?: Contact } {
  const list = getStored();
  const normPhone = normalizePhoneForComparison(phone || '');
  const normCivilId = (civilId || '').replace(/\D/g, '').trim();
  const normPassport = (passportNumber || '').trim().toUpperCase();
  const normCr = (commercialRegistrationNumber || '').replace(/\D/g, '').trim();
  const result: { phone?: Contact; civilId?: Contact; passportNumber?: Contact; commercialRegistration?: Contact } = {};
  const excludeSet = new Set((excludeContactIds || []).map((x) => String(x).trim()));
  if (excludeContactId) excludeSet.add(String(excludeContactId).trim());
  for (const c of list) {
    const cId = String(c.id ?? '').trim();
    if (cId && excludeSet.has(cId)) continue;
    const cNorm = normalizePhoneForComparison(c.phone || '');
    if (normPhone.length >= 6 && cNorm.length >= 6 && normPhone === cNorm) result.phone = c;
    if (normCivilId.length >= 4 && (c.civilId || '').replace(/\D/g, '').trim() === normCivilId) result.civilId = c;
    if (normPassport.length >= 4 && (c.passportNumber || '').trim().toUpperCase() === normPassport) result.passportNumber = c;
    if (normCr.length >= 4 && (c.companyData?.commercialRegistrationNumber || '').replace(/\D/g, '').trim() === normCr) result.commercialRegistration = c;
  }
  return result;
}

/** البحث عن جهة اتصال للحجز: بالهاتف (الرئيسي أو هاتف المفوض) أو الرقم المدني أو رقم السجل التجاري */
export function findContactForBookingSearch(query: string): { contact: Contact; matchType: 'phone' | 'civilId' | 'commercialRegistration' } | null {
  const list = getStored().filter((c) => !c.archived);
  const q = (query || '').replace(/\D/g, '').trim();
  if (q.length < 4) return null;
  const normPhone = normalizePhoneForComparison(q);
  const normCivilId = q;
  const normCr = q;
  for (const c of list) {
    const cNorm = normalizePhoneForComparison(c.phone || '');
    if (normPhone.length >= 6 && cNorm.length >= 6 && normPhone === cNorm) return { contact: c, matchType: 'phone' };
    const repPhone = c.companyData?.authorizedRepresentatives?.[0]?.phone;
    if (repPhone && normPhone.length >= 6) {
      const repNorm = normalizePhoneForComparison(repPhone);
      if (repNorm.length >= 6 && normPhone === repNorm) return { contact: c, matchType: 'phone' };
    }
    if (normCivilId.length >= 4 && (c.civilId || '').replace(/\D/g, '').trim() === normCivilId) return { contact: c, matchType: 'civilId' };
    if (normCr.length >= 4 && (c.companyData?.commercialRegistrationNumber || '').replace(/\D/g, '').trim() === normCr) return { contact: c, matchType: 'commercialRegistration' };
  }
  return null;
}

/** البحث عن جهة اتصال بالهاتف أو البريد - مطابقة دقيقة مع دعم الصيغة المحلية/الدولية للهاتف */
export function findContactByPhoneOrEmail(phone: string, email?: string): Contact | undefined {
  const list = getStored();
  const normPhone = normalizePhoneForComparison(phone || '');
  const normEmail = (email || '').trim().toLowerCase();
  return list.find((c) => {
    const cNorm = normalizePhoneForComparison(c.phone || '');
    const cEmail = (c.email || '').trim().toLowerCase();
    const matchPhone = normPhone.length >= 6 && cNorm.length >= 6 && normPhone === cNorm;
    const matchEmail = normEmail.length >= 3 && cEmail.length >= 3 && cEmail === normEmail;
    return matchPhone || matchEmail;
  });
}

/** إيجاد جميع جهات الاتصال المكررة (نفس الهاتف أو الرقم المدني أو الجواز) - للدمج - مع الإغلاق المتعدي */
export function findDuplicateContactGroups(): Contact[][] {
  const list = getStored();
  const seen = new Set<string>();
  const groups: Contact[][] = [];
  const addTransitive = (start: Contact): Contact[] => {
    const group: Contact[] = [];
    const toProcess = [start];
    const inGroup = new Set<string>();
    while (toProcess.length > 0) {
      const cur = toProcess.pop()!;
      if (inGroup.has(cur.id)) continue;
      inGroup.add(cur.id);
      group.push(cur);
      const dups = findDuplicateContactFields(cur.phone, cur.civilId, cur.passportNumber);
      for (const d of [dups.phone, dups.civilId, dups.passportNumber]) {
        if (d && !inGroup.has(d.id)) toProcess.push(d);
      }
    }
    return group;
  };
  for (const c of list) {
    if (seen.has(c.id)) continue;
    const group = addTransitive(c);
    if (group.length > 1) {
      group.forEach((m) => seen.add(m.id));
      groups.push(group);
    }
  }
  return groups;
}

/** دمج جهات اتصال مكررة في جهة واحدة - تُحفظ الأقدم وتُدمج البيانات، التصنيف يبقى للأقدم */
export function mergeDuplicateContacts(contactIds: string[]): Contact | null {
  if (contactIds.length < 2) return null;
  const list = getStored();
  const toMerge = contactIds.map((id) => list.find((c) => c.id === id)).filter(Boolean) as Contact[];
  if (toMerge.length < 2) return null;
  const byDate = [...toMerge].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const keep = byDate[0];
  const mergeFrom = byDate.slice(1);
  const allHistory = [
    ...(keep.categoryChangeHistory || []),
    ...mergeFrom.flatMap((o) => o.categoryChangeHistory || []),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const merged: Contact = {
    ...keep,
    firstName: keep.firstName || mergeFrom.find((o) => o.firstName)?.firstName || keep.firstName,
    secondName: keep.secondName || mergeFrom.find((o) => o.secondName)?.secondName,
    thirdName: keep.thirdName || mergeFrom.find((o) => o.thirdName)?.thirdName,
    familyName: keep.familyName || mergeFrom.find((o) => o.familyName)?.familyName || keep.familyName,
    phone: keep.phone || mergeFrom.find((o) => o.phone)?.phone || keep.phone,
    email: keep.email || mergeFrom.find((o) => o.email)?.email,
    civilId: keep.civilId || mergeFrom.find((o) => o.civilId)?.civilId,
    passportNumber: keep.passportNumber || mergeFrom.find((o) => o.passportNumber)?.passportNumber,
    categoryChangeHistory: allHistory.length ? allHistory : undefined,
    archived: false,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  const idsToRemove = new Set(mergeFrom.map((c) => c.id));
  const newList = list.filter((c) => !idsToRemove.has(c.id));
  const idx = newList.findIndex((c) => c.id === keep.id);
  if (idx >= 0) newList[idx] = merged;
  save(newList);
  return merged;
}

/** تحديث تصنيف الجهة عند الحجز (عميل) أو توثيق العقد (مستأجر) */
export function setContactCategoryForBooking(phone: string, category: 'CLIENT' | 'TENANT', email?: string): void {
  const c = findContactByPhoneOrEmail(phone, email);
  if (c && c.category !== category) {
    updateContact(c.id, { category });
  }
}

/** إضافة طالب الحجز إلى دفتر العناوين - يُضاف كعميل (CLIENT) حتى توثيق عقد الإيجار فيصبح مستأجراً (TENANT).
 * المطابقة تتم على رقم الهاتف فقط (مطابقة دقيقة) لتجنب دمج أشخاص مختلفين يتشاركون نفس البريد. */
export function ensureContactFromBooking(
  name: string,
  phone: string,
  email?: string,
  options?: { propertyId?: number; unitKey?: string; unitDisplay?: string; civilId?: string; passportNumber?: string }
): Contact {
  const linkData = options?.propertyId != null
    ? {
        linkedPropertyId: options.propertyId,
        linkedUnitKey: options.unitKey,
        linkedUnitDisplay: options.unitDisplay,
      }
    : {};
  const normPhone = normalizePhoneForComparison(phone || '');
  let existing = findContactByPhoneOrEmail(phone, email);
  if (!existing && (normPhone.length >= 6 || (email || '').trim().length >= 3)) {
    existing = normPhone.length >= 6
      ? getStored().find((c) => normalizePhoneForComparison(c.phone || '') === normPhone)
      : (email && (email || '').trim().length >= 3
        ? getStored().find((c) => (c.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase())
        : undefined);
  }
  if (existing) {
    if (existing.archived) restoreContact(existing.id);
    const updates: Partial<Contact> = { ...linkData };
    if (existing.category !== 'TENANT') updates.category = 'CLIENT';
    if (options?.civilId) updates.civilId = options.civilId;
    if (options?.passportNumber) updates.passportNumber = options.passportNumber;
    if (Object.keys(updates).length > 0) {
      updateContact(existing.id, updates);
    }
    return { ...existing, ...updates };
  }
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name || '—';
  const familyName = parts.length > 1 ? parts[parts.length - 1] : firstName;
  const secondName = parts.length > 2 ? parts[1] : undefined;
  const thirdName = parts.length > 3 ? parts[2] : undefined;
  const civilIdVal = options?.civilId?.trim();
  const passportVal = options?.passportNumber?.trim();
  const dups = findDuplicateContactFields(phone, civilIdVal, passportVal);
  if (dups.civilId) {
    const c = dups.civilId;
    const updates: Partial<Contact> = { phone, ...linkData };
    if (c.category !== 'TENANT') (updates as Partial<Contact>).category = 'CLIENT';
    if (civilIdVal) updates.civilId = civilIdVal;
    if (passportVal) updates.passportNumber = passportVal;
    if (email?.trim()) updates.email = email.trim();
    updateContact(c.id, updates);
    return { ...c, ...updates };
  }
  if (dups.passportNumber) {
    const c = dups.passportNumber;
    const updates: Partial<Contact> = { phone, ...linkData };
    if (c.category !== 'TENANT') (updates as Partial<Contact>).category = 'CLIENT';
    if (civilIdVal) updates.civilId = civilIdVal;
    if (passportVal) updates.passportNumber = passportVal;
    if (email?.trim()) updates.email = email.trim();
    updateContact(c.id, updates);
    return { ...c, ...updates };
  }
  return createContact({
    firstName,
    secondName,
    thirdName,
    familyName,
    nationality: '',
    gender: 'MALE',
    phone,
    email: email?.trim() || undefined,
    category: 'CLIENT',
    civilId: civilIdVal || undefined,
    passportNumber: passportVal || undefined,
    ...linkData,
  });
}

/** إضافة شركة حاجزة إلى دفتر العناوين - تُنشأ كجهة شركة مع المفوضين */
export function ensureCompanyContactFromBooking(
  companyNameAr: string,
  phone: string,
  email: string,
  companyData: {
    companyNameEn?: string;
    commercialRegistrationNumber?: string;
    authorizedRepresentatives: AuthorizedRepresentative[];
  },
  options?: { propertyId?: number; unitKey?: string; unitDisplay?: string }
): Contact {
  const linkData = options?.propertyId != null
    ? { linkedPropertyId: options.propertyId, linkedUnitKey: options.unitKey, linkedUnitDisplay: options.unitDisplay }
    : {};
  const crNumber = companyData.commercialRegistrationNumber?.trim();
  let existing = findContactByPhoneOrEmail(phone, email);
  if (!existing && crNumber) {
    const dups = findDuplicateContactFields('', undefined, undefined, undefined, crNumber);
    if (dups.commercialRegistration) existing = dups.commercialRegistration;
  }
  if (existing) {
    if (existing.archived) restoreContact(existing.id);
    const updates: Partial<Contact> = {
      ...linkData,
      contactType: 'COMPANY',
      firstName: companyNameAr,
      familyName: '',
      phone,
      email: email?.trim() || undefined,
      companyData: {
        companyNameAr,
        companyNameEn: companyData.companyNameEn?.trim() || undefined,
        commercialRegistrationNumber: crNumber || '',
        authorizedRepresentatives: companyData.authorizedRepresentatives,
      },
    };
    if (existing.category !== 'TENANT') updates.category = 'CLIENT';
    updateContact(existing.id, updates);
    return { ...existing, ...updates };
  }
  return createContact({
    contactType: 'COMPANY',
    firstName: companyNameAr,
    familyName: '',
    nationality: '',
    gender: 'MALE',
    phone,
    email: email?.trim() || undefined,
    category: 'CLIENT',
    companyData: {
      companyNameAr,
      companyNameEn: companyData.companyNameEn?.trim() || undefined,
      commercialRegistrationNumber: crNumber || '',
      authorizedRepresentatives: companyData.authorizedRepresentatives,
    },
    ...linkData,
  });
}

/** إيقاف/أرشفة جهة اتصال - للجهات غير المرتبطة فقط. يمكن استعادتها لاحقاً */
export function archiveContact(id: string): boolean {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  const now = new Date().toISOString();
  list[idx] = { ...list[idx], archived: true, archivedAt: now, updatedAt: now };
  save(list);
  return true;
}

/** استعادة جهة اتصال موقوفة */
export function restoreContact(id: string): boolean {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  const { archived, archivedAt, ...rest } = list[idx];
  list[idx] = { ...rest, updatedAt: new Date().toISOString() } as Contact;
  save(list);
  return true;
}

/** إيقاف جهة اتصال غير مرتبطة. المرتبطة (حجز/عقد/مستند مالي) لا يمكن إيقافها - تُرمى CANNOT_DELETE_LINKED */
export function deleteContact(id: string): boolean {
  const contact = getContactById(id);
  if (!contact) return false;
  const { linked } = checkContactLinked(contact);
  if (linked) throw new Error('CANNOT_DELETE_LINKED');
  return archiveContact(id);
}

/** تصدير جهات الاتصال إلى CSV */
export function exportContactsToCsv(contacts: Contact[]): string {
  const headers = [
    'الرقم المتسلسل',
    'الاسم الأول', 'الاسم الثاني', 'الاسم الثالث', 'اسم العائلة',
    'الجنسية', 'الجنس', 'الهاتف', 'هاتف بديل', 'البريد',
    'الرقم المدني', 'انتهاء الرقم المدني', 'رقم الجواز', 'انتهاء الجواز',
    'جهة العمل', 'التصنيف', 'عميل لوحدة', 'العنوان', 'العنوان (EN)', 'الملاحظات', 'العلامات',
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
    c.linkedUnitDisplay || '',
    c.address?.fullAddress || [c.address?.governorate, c.address?.state, c.address?.village].filter(Boolean).join(' - ') || '',
    c.address?.fullAddressEn || '',
    c.notes || '',
    (c.tags || []).join('; '),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
}

const CATEGORY_VALUES: ContactCategory[] = ['CLIENT', 'TENANT', 'LANDLORD', 'SUPPLIER', 'PARTNER', 'GOVERNMENT', 'AUTHORIZED_REP', 'OTHER'];

const SERIAL_PATTERN = /^CNT-[A-Z]-\d{4}-\d{4}-S\d+$/;

/** استيراد جهات الاتصال من CSV - يرجع عدد السجلات المستوردة */
export function importContactsFromCsv(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return 0;
  const header = lines[0].toLowerCase();
  const hasSerialCol = header.includes('الرقم المتسلسل') || header.includes('serial');
  const hasAddressEnCol = header.includes('العنوان (en)') || header.includes('address (en)');
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
    const tags = (cols[hasAddressEnCol ? offset + 18 : offset + 17] || '').split(/[;،,]/).map((t) => t.trim()).filter(Boolean);
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
      address: (cols[offset + 15] || (hasAddressEnCol && cols[offset + 16])) ? { fullAddress: cols[offset + 15] || undefined, fullAddressEn: hasAddressEnCol ? cols[offset + 16] : undefined } : undefined,
      notes: cols[hasAddressEnCol ? offset + 17 : offset + 16]?.trim() || undefined,
      tags: tags.length ? tags : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const dups = findDuplicateContactFields(contact.phone, contact.civilId, contact.passportNumber);
    if (dups.phone || dups.civilId || dups.passportNumber) continue;
    list.push(contact);
    count++;
  }
  if (count > 0) save(list);
  return count;
}
