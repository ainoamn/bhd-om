/**
 * عقود الإيجار - إدارة كاملة
 * تُخزّن في localStorage
 */

import { updateProperty, updatePropertyUnit } from './properties';
import { updateBookingStatus } from './bookings';
import { setContactCategoryForBooking } from './addressBook';

export type ContractStatus =
  | 'DRAFT'           // مسودة - قيد الإدخال
  | 'ADMIN_APPROVED'  // اعتمدته الإدارة
  | 'TENANT_APPROVED' // اعتمده المستأجر
  | 'LANDLORD_APPROVED' // اعتمده المالك
  | 'APPROVED';       // معتمد بالكامل - عقد نافذ

export interface CheckInfo {
  checkNumber?: string;
  amount: number;
  dueDate: string;
  bankName?: string;
  notes?: string;
}

export interface RentalContract {
  id: string;
  /** ربط بالحجز */
  bookingId?: string;
  propertyId: number;
  unitKey?: string;
  propertyTitleAr: string;
  propertyTitleEn: string;

  /** المستأجر */
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantIdNumber?: string;
  tenantCivilId?: string;

  /** المالك */
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;

  /** مالية العقد */
  monthlyRent: number;
  annualRent: number;
  depositAmount: number;
  /** الشيكات */
  checks: CheckInfo[];

  /** الضمانات */
  guarantees?: string;

  /** التواريخ القانونية */
  startDate: string;
  endDate: string;
  /** مدة الإيجار بالأشهر */
  durationMonths: number;

  status: ContractStatus;
  adminApprovedAt?: string;
  tenantApprovedAt?: string;
  landlordApprovedAt?: string;

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_rental_contracts';

function getStored(): RentalContract[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: RentalContract[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function generateId() {
  return `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAllContracts(): RentalContract[] {
  return getStored();
}

export function getContractById(id: string): RentalContract | undefined {
  return getStored().find((c) => c.id === id);
}

export function getContractsByProperty(propertyId: number): RentalContract[] {
  return getStored().filter((c) => c.propertyId === propertyId);
}

export function getContractByBooking(bookingId: string): RentalContract | undefined {
  return getStored().find((c) => c.bookingId === bookingId);
}

/** هل يوجد عقد نافذ للوحدة؟ (معتمد أو قيد الاعتماد) */
export function hasActiveContractForUnit(propertyId: number, unitKey?: string): boolean {
  const list = getStored();
  return list.some(
    (c) =>
      c.propertyId === propertyId &&
      (unitKey ? c.unitKey === unitKey : !c.unitKey) &&
      c.status !== 'DRAFT' &&
      !isContractEnded(c)
  );
}

/** هل يوجد أي عقد للوحدة؟ (بما فيه المسودة - لقفل الحالة من صفحة الحجوزات) */
export function hasContractForUnit(propertyId: number, unitKey?: string): boolean {
  const list = getStored();
  return list.some(
    (c) =>
      c.propertyId === propertyId &&
      (unitKey ? c.unitKey === unitKey : !c.unitKey)
  );
}

function isContractEnded(c: RentalContract): boolean {
  try {
    return new Date(c.endDate) < new Date();
  } catch {
    return false;
  }
}

export function createContract(data: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt'>): RentalContract {
  const now = new Date().toISOString();
  const contract: RentalContract = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  const list = getStored();
  list.unshift(contract);
  save(list);
  // بعد إنشاء العقد يصبح العقار مؤجراً ولا يمكن تغيير الحالة من صفحة الحجوزات
  setPropertyRentedFromContract(contract);
  if (contract.bookingId) {
    updateBookingStatus(contract.bookingId, 'RENTED');
  }
  return contract;
}

export function updateContract(id: string, updates: Partial<RentalContract>): RentalContract | null {
  const list = getStored();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  save(list);
  return updated;
}

function setPropertyRentedFromContract(contract: RentalContract) {
  try {
    if (contract.unitKey) {
      updatePropertyUnit(contract.propertyId, contract.unitKey, { businessStatus: 'RENTED', isPublished: false });
    } else {
      updateProperty(contract.propertyId, { businessStatus: 'RENTED', isPublished: false });
    }
    if (contract.bookingId) {
      updateBookingStatus(contract.bookingId, 'RENTED');
    }
    setContactCategoryForBooking(contract.tenantPhone, 'TENANT', contract.tenantEmail);
  } catch {}
}

export function approveContractByAdmin(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'DRAFT') return null;
  const now = new Date().toISOString();
  return updateContract(id, { status: 'ADMIN_APPROVED', adminApprovedAt: now });
}

export function approveContractByTenant(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || c.status !== 'ADMIN_APPROVED') return null;
  const now = new Date().toISOString();
  const updated = updateContract(id, { status: 'TENANT_APPROVED', tenantApprovedAt: now });
  if (updated) {
    const next = getContractById(id)!;
    if (next.landlordApprovedAt) {
      updateContract(id, { status: 'APPROVED' });
      setPropertyRentedFromContract(next);
    }
  }
  return updated;
}

export function approveContractByLandlord(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c || (c.status !== 'ADMIN_APPROVED' && c.status !== 'TENANT_APPROVED')) return null;
  const now = new Date().toISOString();
  const updated = updateContract(id, {
    status: c.status === 'TENANT_APPROVED' ? 'APPROVED' : 'LANDLORD_APPROVED',
    landlordApprovedAt: now,
  });
  if (updated && c.status === 'TENANT_APPROVED') {
    setPropertyRentedFromContract(updated);
  }
  return updated;
}

/** اعتماد كامل - عند اكتمال جميع التوقيعات */
export function finalizeContractApproval(id: string): RentalContract | null {
  const c = getContractById(id);
  if (!c) return null;
  if (c.status === 'TENANT_APPROVED' && c.landlordApprovedAt) {
    return updateContract(id, { status: 'APPROVED' });
  }
  if (c.status === 'LANDLORD_APPROVED' && c.tenantApprovedAt) {
    const updated = updateContract(id, { status: 'APPROVED' });
    if (updated) setPropertyRentedFromContract(updated);
    return updated;
  }
  return null;
}
