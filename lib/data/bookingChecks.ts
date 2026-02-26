/**
 * بيانات الشيكات المطلوبة من المستأجر - يُعبّئها يدوياً عند رفع المستندات والموافقة على الشروط
 * رقم الشيك، المبلغ، التاريخ
 */

export interface BookingCheckEntry {
  checkTypeId: string;
  labelAr: string;
  labelEn: string;
  checkNumber: string;
  amount: number;
  date: string;
  /** رقم الحساب البنكي لصاحب الشيك */
  accountNumber?: string;
  /** اسم الحساب البنكي لصاحب الشيك */
  accountName?: string;
  /** مالك الشيكات: المستأجر / فرد آخر / شركة - يُخزن في الشيك الأول ويُطبّق على الكل */
  ownerType?: 'tenant' | 'other_individual' | 'company';
  /** اسم البنك - يُخزن في الشيك الأول */
  bankName?: string;
  /** فرع البنك - يُخزن في الشيك الأول */
  bankBranch?: string;
  /** عند other_individual: اسم مالك الشيكات */
  ownerName?: string;
  /** الرقم المدني لمالك الشيكات */
  ownerCivilId?: string;
  /** رقم الهاتف لمالك الشيكات */
  ownerPhone?: string;
  /** عند company: اسم الشركة */
  companyName?: string;
  /** رقم السجل التجاري */
  companyRegNumber?: string;
  /** المفوض في السجل */
  authorizedRep?: string;
  /** رابط صورة الشيك المرفوعة قبل التوقيع */
  imageUrl?: string;
  updatedAt: string;
  /** اعتماد الشيك من إدارة العقار - واحد تلو الآخر */
  approvedAt?: string;
  approvedBy?: string;
  /** ملاحظة عند الاعتماد */
  approvalNoteAr?: string;
  approvalNoteEn?: string;
  /** رفض الشيك */
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReasonAr?: string;
  rejectionReasonEn?: string;
}

const STORAGE_KEY = 'bhd_booking_checks';

function getStored(): { bookingId: string; checks: BookingCheckEntry[] }[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: { bookingId: string; checks: BookingCheckEntry[] }[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getChecksByBooking(bookingId: string): BookingCheckEntry[] {
  const entry = getStored().find((e) => e.bookingId === bookingId);
  return entry?.checks ?? [];
}

export function saveBookingChecks(
  bookingId: string,
  checks: Omit<BookingCheckEntry, 'updatedAt'>[]
): void {
  const now = new Date().toISOString();
  const existing = getStored().find((e) => e.bookingId === bookingId);
  const entries = checks.map((c, i) => {
    const prev = existing?.checks[i];
    /** عند تغيير المستأجر لبيانات الشيك بعد الرفض (استبدال الشيك) = مسح الرفض حتى يمكن للمدير الاعتماد */
    const currAmount = typeof c.amount === 'number' ? c.amount : parseFloat(String(c.amount || 0)) || 0;
    const prevAmount = prev?.amount ?? 0;
    const dataChanged = prev && (
      (String(c.checkNumber || '').trim() !== String(prev.checkNumber || '').trim()) ||
      (currAmount !== prevAmount) ||
      ((c.date || '') !== (prev.date || ''))
    );
    const clearRejection = !!prev?.rejectedAt && !!dataChanged;
    return {
      ...c,
      updatedAt: now,
      approvedAt: prev?.approvedAt,
      approvedBy: prev?.approvedBy,
      approvalNoteAr: prev?.approvalNoteAr,
      approvalNoteEn: prev?.approvalNoteEn,
      rejectedAt: clearRejection ? undefined : prev?.rejectedAt,
      rejectedBy: clearRejection ? undefined : prev?.rejectedBy,
      rejectionReasonAr: clearRejection ? undefined : prev?.rejectionReasonAr,
      rejectionReasonEn: clearRejection ? undefined : prev?.rejectionReasonEn,
      accountNumber: ('accountNumber' in c ? c.accountNumber : prev?.accountNumber) ?? '',
      accountName: ('accountName' in c ? c.accountName : prev?.accountName) ?? '',
      ownerType: ('ownerType' in c ? c.ownerType : prev?.ownerType) ?? undefined,
      bankName: ('bankName' in c ? c.bankName : prev?.bankName) ?? undefined,
      bankBranch: ('bankBranch' in c ? c.bankBranch : prev?.bankBranch) ?? undefined,
      ownerName: ('ownerName' in c ? c.ownerName : prev?.ownerName) ?? undefined,
      ownerCivilId: ('ownerCivilId' in c ? c.ownerCivilId : prev?.ownerCivilId) ?? undefined,
      ownerPhone: ('ownerPhone' in c ? c.ownerPhone : prev?.ownerPhone) ?? undefined,
      companyName: ('companyName' in c ? c.companyName : prev?.companyName) ?? undefined,
      companyRegNumber: ('companyRegNumber' in c ? c.companyRegNumber : prev?.companyRegNumber) ?? undefined,
      authorizedRep: ('authorizedRep' in c ? c.authorizedRep : prev?.authorizedRep) ?? undefined,
      imageUrl: ('imageUrl' in c ? c.imageUrl : prev?.imageUrl) ?? undefined,
    } as BookingCheckEntry;
  });
  const all = getStored();
  const idx = all.findIndex((e) => e.bookingId === bookingId);
  const newEntry = { bookingId, checks: entries };
  if (idx >= 0) {
    all[idx] = newEntry;
  } else {
    all.push(newEntry);
  }
  save(all);
}

export function updateCheckEntry(
  bookingId: string,
  checkTypeId: string,
  data: Partial<Pick<BookingCheckEntry, 'checkNumber' | 'amount' | 'date'>>
): void {
  const all = getStored();
  const entry = all.find((e) => e.bookingId === bookingId);
  if (!entry) return;
  const check = entry.checks.find((c) => c.checkTypeId === checkTypeId);
  if (!check) return;
  const now = new Date().toISOString();
  Object.assign(check, data, { updatedAt: now });
  save(all);
}

/** اعتماد شيك حسب الفهرس (واحد تلو الآخر) */
export function approveCheck(
  bookingId: string,
  checkIndex: number,
  opts: { approvedBy?: string; noteAr?: string; noteEn?: string } | string
): void {
  const all = getStored();
  const entry = all.find((e) => e.bookingId === bookingId);
  if (!entry || !entry.checks[checkIndex]) return;
  const approvedBy = typeof opts === 'string' ? opts : opts?.approvedBy || '';
  const noteAr = typeof opts === 'object' ? opts?.noteAr : undefined;
  const noteEn = typeof opts === 'object' ? opts?.noteEn : undefined;
  const now = new Date().toISOString();
  const prev = entry.checks[checkIndex];
  entry.checks[checkIndex] = {
    ...prev,
    approvedAt: now,
    approvedBy,
    approvalNoteAr: noteAr !== undefined ? noteAr : prev.approvalNoteAr,
    approvalNoteEn: noteEn !== undefined ? noteEn : prev.approvalNoteEn,
    updatedAt: now,
    /** مسح بيانات الرفض عند الاعتماد حتى يُعد الشيك معتمداً بالكامل */
    rejectedAt: undefined,
    rejectedBy: undefined,
    rejectionReasonAr: undefined,
    rejectionReasonEn: undefined,
  };
  save(all);
}

/** هل جميع الشيكات معتمدة؟ */
export function areAllChecksApproved(bookingId: string): boolean {
  const checks = getChecksByBooking(bookingId);
  return checks.length > 0 && checks.every((c) => !!c.approvedAt && !c.rejectedAt);
}

/** رفض شيك حسب الفهرس */
export function rejectCheck(
  bookingId: string,
  checkIndex: number,
  opts: { reasonAr?: string; reasonEn?: string; rejectedBy?: string }
): void {
  const all = getStored();
  const entry = all.find((e) => e.bookingId === bookingId);
  if (!entry || !entry.checks[checkIndex]) return;
  const now = new Date().toISOString();
  entry.checks[checkIndex] = {
    ...entry.checks[checkIndex],
    approvedAt: undefined,
    approvedBy: undefined,
    rejectedAt: now,
    rejectedBy: opts.rejectedBy || '',
    rejectionReasonAr: opts.reasonAr || '',
    rejectionReasonEn: opts.reasonEn || '',
    updatedAt: now,
  };
  save(all);
}
