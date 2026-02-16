/**
 * إدارة الحسابات البنكية ومعلومات التحويل
 * Bank Accounts & Transfer Information
 * تُخزّن في localStorage
 */

export type BankAccountPurpose =
  | 'RENT'           // إيجار
  | 'SALES'          // مبيعات
  | 'DEPOSITS'       // عربون/ودائع
  | 'MAINTENANCE'    // صيانة
  | 'GENERAL'       // عام
  | 'OTHER';         // أخرى

export interface BankAccount {
  id: string;
  /** اسم الحساب (عربي) */
  nameAr: string;
  /** اسم الحساب (إنجليزي) */
  nameEn?: string;
  /** اسم البنك (عربي) */
  bankNameAr: string;
  /** اسم البنك (إنجليزي) */
  bankNameEn?: string;
  /** رقم الحساب */
  accountNumber: string;
  /** رقم الآيبان (IBAN) - مثال: OM1234567890123456789012 */
  iban?: string;
  /** رمز سويفت (SWIFT/BIC) */
  swiftCode?: string;
  /** العملة - افتراضي ر.ع */
  currency: string;
  /** الفرع */
  branch?: string;
  /** الغرض من الحساب */
  purpose?: BankAccountPurpose;
  /** افتراضي للتحويلات (يُعرض أولاً عند اختيار حساب للتحويل) */
  isDefault: boolean;
  /** نشط للعرض والاستخدام */
  isActive: boolean;
  /** ملاحظات */
  notes?: string;
  /** ترتيب العرض */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_bank_accounts';

function getStored(): BankAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(accounts: BankAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {}
}

function generateId(): string {
  return `BANK-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** الحصول على جميع الحسابات البنكية */
export function getAllBankAccounts(): BankAccount[] {
  return getStored().sort((a, b) => a.sortOrder - b.sortOrder);
}

/** الحصول على الحسابات النشطة فقط */
export function getActiveBankAccounts(): BankAccount[] {
  return getAllBankAccounts().filter((a) => a.isActive);
}

/** الحصول على الحساب الافتراضي للتحويل */
export function getDefaultBankAccount(): BankAccount | null {
  const defaultAcc = getActiveBankAccounts().find((a) => a.isDefault);
  if (defaultAcc) return defaultAcc;
  const active = getActiveBankAccounts();
  return active.length > 0 ? active[0] : null;
}

/** الحصول على حساب بالمعرف */
export function getBankAccountById(id: string): BankAccount | null {
  return getStored().find((a) => a.id === id) || null;
}

/** عرض الحساب البنكي: رقم الحساب - اسم الحساب */
export function getBankAccountDisplay(b: BankAccount): string {
  const parts = [b.accountNumber, b.nameAr].filter(Boolean);
  return parts.join(' - ') || b.nameAr || b.id;
}

/** البحث في الحسابات */
export function searchBankAccounts(query: string): BankAccount[] {
  const q = (query || '').toLowerCase().trim();
  if (!q) return getAllBankAccounts();
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return getAllBankAccounts().filter((a) => {
    const searchText = [
      a.nameAr,
      a.nameEn,
      a.bankNameAr,
      a.bankNameEn,
      a.accountNumber,
      a.iban,
      a.swiftCode,
      a.branch,
    ]
      .filter(Boolean)
      .join(' ');
    return normalize(searchText).includes(normalize(q));
  });
}

/** إنشاء حساب بنكي جديد */
export function createBankAccount(
  data: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>
): BankAccount {
  const accounts = getStored();
  const maxOrder = accounts.length > 0 ? Math.max(...accounts.map((a) => a.sortOrder)) : 0;
  const now = new Date().toISOString();
  const account: BankAccount = {
    ...data,
    id: generateId(),
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(account);
  saveStored(accounts);
  return account;
}

/** تحديث حساب بنكي */
export function updateBankAccount(
  id: string,
  updates: Partial<Omit<BankAccount, 'id' | 'createdAt'>>
): BankAccount | null {
  const accounts = getStored();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const existing = accounts[idx];
  if (updates.isDefault === true) {
    accounts.forEach((a) => {
      if (a.id !== id) a.isDefault = false;
    });
  }
  const updated: BankAccount = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  accounts[idx] = updated;
  saveStored(accounts);
  return updated;
}

/** حذف حساب بنكي */
export function deleteBankAccount(id: string): boolean {
  const accounts = getStored().filter((a) => a.id !== id);
  if (accounts.length === getStored().length) return false;
  saveStored(accounts);
  return true;
}

/** تعيين حساب كافتراضي */
export function setDefaultBankAccount(id: string): BankAccount | null {
  return updateBankAccount(id, { isDefault: true });
}

/** التحقق من صحة رقم الآيبان العماني (OM + 22 رقم) */
export function isValidOmaniIban(iban: string): boolean {
  const cleaned = (iban || '').replace(/\s/g, '').toUpperCase();
  return /^OM\d{22}$/.test(cleaned);
}

/** تنسيق رقم الآيبان للعرض (مجموعات من 4) */
export function formatIbanForDisplay(iban: string): string {
  const cleaned = (iban || '').replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 4) return cleaned;
  const parts: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  return parts.join(' ');
}
