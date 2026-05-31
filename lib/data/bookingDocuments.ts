/**
 * مستندات توثيق العقد - يرفعها المستأجر/المشتري ويُعتمدها المالك أو الإدارة
 * المصدر: الخادم (`/api/settings/booking-documents`) — ذاكرة مؤقتة في المتصفح فقط
 */

export type DocumentStatus = 'PENDING' | 'UPLOADED' | 'APPROVED' | 'REJECTED';

/** ملف واحد ضمن المستند - يدعم رفض صورة بعينها واستبدالها مع الحفاظ على سجل السبب */
export interface DocumentFileItem {
  url: string;
  name: string;
  /** إذا وُجد = الصورة مرفوضة ويجب استبدالها */
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReasonAr?: string;
  rejectionReasonEn?: string;
  /** عند الاستبدال: تاريخ الاستبدال - الملاحظة تبقى للأرشفة */
  replacedAt?: string;
}

export interface BookingDocument {
  id: string;
  bookingId: string;
  propertyId: number;
  docTypeId: string;
  labelAr: string;
  labelEn: string;
  /** شرح/وصف المستند (للمستندات الإضافية) */
  descriptionAr?: string;
  descriptionEn?: string;
  isRequired: boolean;
  status: DocumentStatus;
  /** للمرجعية القديمة - استخدم fileUrls إن وُجدت */
  fileUrl?: string;
  fileName?: string;
  /** قائمة الملفات المرفوعة (يدعم أكثر من صورة للمستند) */
  fileUrls?: string[];
  fileNames?: string[];
  /** قائمة الملفات مع حالة الرفض لكل صورة */
  files?: DocumentFileItem[];
  uploadedAt?: string;
  /** من رفع المستند (اسم المستأجر/البريد) */
  uploadedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  /** من رفض المستند */
  rejectedBy?: string;
  /** سبب الرفض (للمرجعية القديمة) */
  rejectionReason?: string;
  /** سبب الرفض بالعربية */
  rejectionReasonAr?: string;
  /** سبب الرفض بالإنجليزية */
  rejectionReasonEn?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_booking_documents';
const API_URL = '/api/settings/booking-documents';
let didHydrateFromServer = false;
let hydratingFromServer = false;
let didMigrateLegacyLocalStorage = false;
let documentsStore: BookingDocument[] = [];

function migrateLegacyLocalStorageOnce(): void {
  if (typeof window === 'undefined' || didMigrateLegacyLocalStorage) return;
  didMigrateLegacyLocalStorage = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as BookingDocument[];
    if (Array.isArray(legacy) && legacy.length > 0) {
      documentsStore = legacy;
      void fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(legacy),
      }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function getStored(): BookingDocument[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyLocalStorageOnce();
  if (!didHydrateFromServer && !hydratingFromServer) {
    hydratingFromServer = true;
    void fetchBookingDocumentsFromServer().finally(() => {
      hydratingFromServer = false;
    });
  }
  return documentsStore;
}

function save(list: BookingDocument[]) {
  if (typeof window === 'undefined') return;
  documentsStore = list;
  void fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(list),
  }).catch(() => {});
}

function mergeDocumentsFromServer(incoming: BookingDocument[], bookingId?: string): void {
  if (incoming.length === 0) return;
  if (bookingId) {
    const others = documentsStore.filter((d) => d.bookingId !== bookingId);
    documentsStore = [...others, ...incoming];
    return;
  }
  const map = new Map<string, BookingDocument>();
  for (const d of documentsStore) map.set(d.id, d);
  for (const d of incoming) {
    if (d?.id) map.set(d.id, d);
  }
  documentsStore = Array.from(map.values());
}

/** جلب مستندات الحجز من الخادم */
export async function fetchBookingDocumentsFromServer(opts?: {
  bookingId?: string;
}): Promise<BookingDocument[]> {
  if (typeof window === 'undefined') return [];
  const qs = opts?.bookingId ? `?bookingId=${encodeURIComponent(opts.bookingId)}` : '';
  try {
    const r = await fetch(`${API_URL}${qs}`, { cache: 'no-store', credentials: 'include' });
    const payload = r.ok ? await r.json() : null;
    if (!Array.isArray(payload)) return getStored();
    mergeDocumentsFromServer(payload as BookingDocument[], opts?.bookingId);
    didHydrateFromServer = true;
  } catch {
    /* ignore */
  }
  return getStored();
}

/** انتظار hydrate من الخادم — استدعِه قبل الترحيل أو الدمج */
export async function ensureBookingDocumentsHydrated(opts?: {
  bookingId?: string;
}): Promise<void> {
  await fetchBookingDocumentsFromServer(opts);
}

/** دمج مستندات من الخادم (صفحة الرفع العامة أو بعد hydrate) */
export function applyDocumentsSnapshot(docs: BookingDocument[]): void {
  if (typeof window === 'undefined' || docs.length === 0) return;
  const bookingIds = new Set(docs.map((d) => d.bookingId));
  const others = documentsStore.filter((d) => !bookingIds.has(d.bookingId));
  documentsStore = [...others, ...docs];
}

export { isBookingStatusEligibleForDocumentUpload } from '@/lib/data/bookingUploadEligibility';

function generateId() {
  return `BDOC-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDocumentsByBooking(bookingId: string): BookingDocument[] {
  return getStored().filter((d) => d.bookingId === bookingId);
}

export function getDocumentById(id: string): BookingDocument | undefined {
  return getStored().find((d) => d.id === id);
}

/** إنشاء طلبات المستندات لحجز عند تحديد المستندات المطلوبة من المالك */
export function createDocumentRequests(
  bookingId: string,
  propertyId: number,
  requirements: { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[]
): BookingDocument[] {
  const existing = getDocumentsByBooking(bookingId);
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const docs: BookingDocument[] = requirements.map((r) => ({
    id: generateId(),
    bookingId,
    propertyId,
    docTypeId: r.docTypeId,
    labelAr: r.labelAr,
    labelEn: r.labelEn,
    isRequired: r.isRequired,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  }));
  const all = [...getStored(), ...docs];
  save(all);
  return docs;
}

/** إضافة طلبات المستندات الناقصة (مثلاً عند إضافة مفوضين جدد للشركة) */
export function addMissingDocumentRequests(
  bookingId: string,
  propertyId: number,
  requirements: { docTypeId: string; labelAr: string; labelEn: string; isRequired: boolean }[]
): BookingDocument[] {
  const existing = getDocumentsByBooking(bookingId);
  const missing: BookingDocument[] = [];
  const now = new Date().toISOString();
  for (const r of requirements) {
    const hasMatch = existing.some((d) => d.docTypeId === r.docTypeId && d.labelAr === r.labelAr);
    if (!hasMatch) {
      missing.push({
        id: generateId(),
        bookingId,
        propertyId,
        docTypeId: r.docTypeId,
        labelAr: r.labelAr,
        labelEn: r.labelEn,
        isRequired: r.isRequired,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  if (missing.length === 0) return existing;
  const all = [...getStored(), ...missing];
  save(all);
  return [...existing, ...missing];
}

/** إضافة مستند إضافي مطلوب من الإدارة (مع وصف/شرح) */
export function addCustomDocumentRequest(
  bookingId: string,
  propertyId: number,
  opts: { labelAr: string; labelEn: string; descriptionAr?: string; descriptionEn?: string; isRequired?: boolean }
): BookingDocument {
  const customId = `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const doc: BookingDocument = {
    id: generateId(),
    bookingId,
    propertyId,
    docTypeId: customId,
    labelAr: opts.labelAr,
    labelEn: opts.labelEn,
    isRequired: opts.isRequired ?? false,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  if (opts.descriptionAr) doc.descriptionAr = opts.descriptionAr;
  if (opts.descriptionEn) doc.descriptionEn = opts.descriptionEn;
  const all = [...getStored(), doc];
  save(all);
  return doc;
}

/** تحويل المستند إلى مصفوفة files موحدة (للمرجعية القديمة) */
export function getDocumentFiles(doc: BookingDocument): DocumentFileItem[] {
  if (doc.files?.length) return doc.files;
  const urls = doc.fileUrls ?? (doc.fileUrl ? [doc.fileUrl] : []);
  const names = doc.fileNames ?? (doc.fileName ? [doc.fileName] : []);
  return urls.map((url, i) => ({ url, name: names[i] || '' }));
}

/** هل يوجد صور مرفوضة في المستند؟ */
export function hasRejectedFiles(doc: BookingDocument): boolean {
  return getDocumentFiles(doc).some((f) => f.rejectedAt);
}

/** رفع مستند من المستأجر - يضيف الملف للقائمة (يدعم أكثر من صورة) */
export function uploadDocument(docId: string, fileUrl: string, fileName: string, uploadedBy?: string): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const doc = list[idx];
  const files = [...getDocumentFiles(doc), { url: fileUrl, name: fileName }];
  const urls = files.map((f) => f.url);
  const names = files.map((f) => f.name);
  list[idx] = {
    ...doc,
    fileUrl: urls[0],
    fileName: names[0],
    fileUrls: urls,
    fileNames: names,
    files,
    status: 'UPLOADED',
    uploadedAt: now,
    uploadedBy: uploadedBy ?? doc.uploadedBy,
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** استبدال صورة مرفوضة بجديدة - تحافظ على ملاحظة الرفض للأرشفة */
export function replaceFileInDocument(
  docId: string,
  oldFileUrl: string,
  newFileUrl: string,
  newFileName: string
): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const doc = list[idx];
  const now = new Date().toISOString();
  const files = getDocumentFiles(doc).map((f) => {
    if (f.url !== oldFileUrl) return f;
    return {
      url: newFileUrl,
      name: newFileName,
      rejectedBy: f.rejectedBy,
      rejectionReasonAr: f.rejectionReasonAr,
      rejectionReasonEn: f.rejectionReasonEn,
      replacedAt: now,
    };
  });
  const urls = files.map((f) => f.url);
  const names = files.map((f) => f.name);
  list[idx] = {
    ...doc,
    fileUrl: urls[0],
    fileName: names[0],
    fileUrls: urls,
    fileNames: names,
    files,
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** إزالة صورة من المستند (للمستخدم: حذف الصورة المرفوضة) */
export function removeFileFromDocument(docId: string, fileUrl: string): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const doc = list[idx];
  const files = getDocumentFiles(doc).filter((f) => f.url !== fileUrl);
  const urls = files.map((f) => f.url);
  const names = files.map((f) => f.name);
  const now = new Date().toISOString();
  list[idx] = {
    ...doc,
    fileUrl: urls[0],
    fileName: names[0],
    fileUrls: urls,
    fileNames: names,
    files,
    status: files.length > 0 ? 'UPLOADED' : 'PENDING',
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** رفض صورة واحدة - المستخدم يجب حذفها واستبدالها */
export function rejectFile(
  docId: string,
  fileUrl: string,
  options: { reasonAr?: string; reasonEn?: string; rejectedBy?: string }
): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const doc = list[idx];
  const now = new Date().toISOString();
  const files = getDocumentFiles(doc).map((f) =>
    f.url === fileUrl
      ? {
          ...f,
          rejectedAt: now,
          rejectedBy: options.rejectedBy?.trim() || undefined,
          rejectionReasonAr: options.reasonAr?.trim() || undefined,
          rejectionReasonEn: options.reasonEn?.trim() || undefined,
        }
      : f
  );
  list[idx] = {
    ...doc,
    files,
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** إلغاء رفض صورة (إذا ألغى المشرف الرفض عن طريق الخطأ) */
export function unresectFile(docId: string, fileUrl: string): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const doc = list[idx];
  const files = getDocumentFiles(doc).map((f) =>
    f.url === fileUrl ? { url: f.url, name: f.name } : f
  );
  list[idx] = { ...doc, files, updatedAt: new Date().toISOString() };
  save(list);
  return list[idx];
}

/** اعتماد مستند من المالك/الإدارة - لا يعتمد إن وُجدت صور مرفوضة */
export function approveDocument(docId: string, approvedBy?: string): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const doc = list[idx];
  if (hasRejectedFiles(doc)) return null;
  const now = new Date().toISOString();
  list[idx] = {
    ...doc,
    status: 'APPROVED',
    approvedAt: now,
    approvedBy,
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** إزالة طلب مستند (مثل جواز السفر للعماني) */
export function removeDocumentRequest(docId: string): boolean {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  save(list);
  return true;
}

/** إزالة طلبات المستندات بحسب نوع المستند (مثلاً عند العودة من "شركة" إلى "المستأجر") */
export function removeDocumentRequestsByTypes(bookingId: string, docTypeIds: string[]): number {
  const list = getStored();
  const ids = new Set(docTypeIds);
  let removed = 0;
  const filtered = list.filter((d) => {
    if (d.bookingId === bookingId && ids.has(d.docTypeId)) {
      removed++;
      return false;
    }
    return true;
  });
  if (removed > 0) save(filtered);
  return removed;
}

/** رفض مستند - يحذف الصور فقط ويبقي البيانات والتواريخ كأرشفة لمتابعة المعاملة */
export function rejectDocument(
  docId: string,
  reasonOrOptions?: string | { reasonAr?: string; reasonEn?: string; rejectedBy?: string }
): BookingDocument | null {
  const list = getStored();
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  let rejectionReason: string | undefined;
  let rejectionReasonAr: string | undefined;
  let rejectionReasonEn: string | undefined;
  let rejectedBy: string | undefined;
  if (typeof reasonOrOptions === 'string') {
    rejectionReason = reasonOrOptions;
    rejectionReasonAr = reasonOrOptions;
    rejectionReasonEn = reasonOrOptions;
  } else if (reasonOrOptions) {
    rejectionReasonAr = reasonOrOptions.reasonAr?.trim() || undefined;
    rejectionReasonEn = reasonOrOptions.reasonEn?.trim() || undefined;
    rejectedBy = reasonOrOptions.rejectedBy?.trim() || undefined;
    rejectionReason = rejectionReasonAr || rejectionReasonEn;
  }
  const doc = list[idx];
  list[idx] = {
    ...doc,
    status: 'REJECTED',
    rejectedAt: now,
    rejectedBy,
    rejectionReason,
    rejectionReasonAr,
    rejectionReasonEn,
    approvedAt: undefined,
    approvedBy: undefined,
    fileUrl: undefined,
    fileName: undefined,
    fileUrls: undefined,
    fileNames: undefined,
    files: undefined,
    updatedAt: now,
  };
  save(list);
  return list[idx];
}

/** هل جميع المستندات المطلوبة معتمدة؟ */
export function areAllRequiredDocumentsApproved(bookingId: string): boolean {
  const docs = getDocumentsByBooking(bookingId);
  const required = docs.filter((d) => d.isRequired);
  if (required.length === 0) return true;
  return required.every((d) => d.status === 'APPROVED');
}

/** هل يوجد مستندات مرفوعة بانتظار التأكيد؟ (أو صور مرفوضة تحتاج استبدال) */
export function hasDocumentsNeedingConfirmation(bookingId: string): boolean {
  const docs = getDocumentsByBooking(bookingId);
  return docs.some((d) => d.status === 'UPLOADED' || hasRejectedFiles(d));
}

/** تنسيق تاريخ ووقت المستند للعرض */
export function formatDocumentTimestamp(isoStr: string | undefined, ar: boolean): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(ar ? 'ar-OM' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoStr;
  }
}
