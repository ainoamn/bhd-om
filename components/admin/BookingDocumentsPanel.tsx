'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDocumentsByBooking,
  createDocumentRequests,
  approveDocument,
  rejectDocument,
  rejectFile,
  getDocumentFiles,
  hasRejectedFiles,
  formatDocumentTimestamp,
  areAllRequiredDocumentsApproved,
  type BookingDocument,
  type DocumentStatus,
} from '@/lib/data/bookingDocuments';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { openWhatsAppWithMessage, openEmailWithMessage } from '@/lib/documentUploadLink';
import { getBookingDisplayName, type PropertyBooking } from '@/lib/data/bookings';
import { findContactByPhoneOrEmail, getContactById, getContactDisplayFull, searchContacts, getAllContacts, type Contact, type AuthorizedRepresentative } from '@/lib/data/addressBook';
import { hasPropertyLandlord, setPropertyLandlord } from '@/lib/data/propertyLandlords';
import TranslateField from '@/components/admin/TranslateField';

function TranslateBtn({ source, onResult, target, ar }: { source: string; onResult: (v: string) => void; target: 'ar' | 'en'; ar: boolean }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/translate?text=${encodeURIComponent(source)}&target=${target}`);
      const data = await res.json();
      if (data.translatedText) onResult(data.translatedText);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={handle} disabled={loading} className="text-xs px-2 py-1 rounded-lg bg-[#8B6F47]/10 text-[#8B6F47] hover:bg-[#8B6F47]/20 font-medium">
      {loading ? '...' : (ar ? 'ترجمة من الآخر' : 'Translate')}
    </button>
  );
}

/** استخراج بيانات العرض حسب نوع المستند */
function getDocumentInfoFields(
  docTypeId: string,
  booking: PropertyBooking,
  contact: Contact | null,
  docLabel?: string
): { labelAr: string; labelEn: string; value: string }[] {
  const row = (la: string, le: string, v: string) => ({ labelAr: la, labelEn: le, value: v || '—' });
  const nameAr = contact
    ? (contact.contactType === 'COMPANY' && contact.companyData?.companyNameAr
        ? contact.companyData.companyNameAr
        : [contact.firstName, contact.secondName, contact.thirdName, contact.familyName].filter(Boolean).join(' '))
    : booking.name || '—';
  const nameEn = contact?.nameEn || contact?.companyData?.companyNameEn || '—';

  const isRepDoc = docTypeId === 'AUTHORIZED_REP_CARD' || (docTypeId === 'ID_CARD' && docLabel && (/المفوض|Rep\s/.test(docLabel)));
  switch (docTypeId) {
    case 'ID_CARD':
      if (isRepDoc) {
        const reps = (contact?.companyData ?? (booking as { companyData?: { authorizedRepresentatives?: AuthorizedRepresentative[] } }).companyData)?.authorizedRepresentatives || [];
        if (reps.length > 0) {
          const labelSuffix = docLabel ? (docLabel.split(' - ').pop()?.trim() || '') : '';
          const rep = labelSuffix ? reps.find((r) => r.name && (r.name.includes(labelSuffix) || labelSuffix.includes(r.name))) : null;
          const chosen = rep || reps[0];
          return [
            row('اسم المفوض', 'Rep Name', chosen.name || '—'),
            row('الاسم (إنجليزي)', 'Name (English)', chosen.nameEn || '—'),
            row('رقم البطاقة', 'Civil ID', chosen.civilId ?? ''),
            row('تاريخ الانتهاء', 'Expiry', chosen.civilIdExpiry ?? ''),
            row('المنصب', 'Position', chosen.position || '—'),
          ];
        }
      }
      return [
        row('الاسم (عربي)', 'Name (Arabic)', nameAr),
        row('الاسم (إنجليزي)', 'Name (English)', nameEn),
        row('رقم البطاقة', 'Civil ID', (contact?.civilId || (booking as { civilId?: string }).civilId) ?? ''),
        row('تاريخ الانتهاء', 'Expiry', contact?.civilIdExpiry ?? ''),
      ];
    case 'AUTHORIZED_REP_CARD': {
      const reps = (contact?.companyData ?? (booking as { companyData?: { authorizedRepresentatives?: AuthorizedRepresentative[] } }).companyData)?.authorizedRepresentatives || [];
      if (reps.length === 0) return [row('الاسم', 'Name', nameAr), row('رقم البطاقة', 'Civil ID', '—'), row('تاريخ الانتهاء', 'Expiry', '—')];
      // مطابقة المفوض من اسم المستند (مثلاً "بطاقة المفوض بالتوقيع - أحمد")
      const labelSuffix = docLabel ? (docLabel.split(' - ').pop()?.trim() || docLabel.split('-').pop()?.trim() || '') : '';
      const rep = labelSuffix
        ? reps.find((r) => r.name && (r.name.includes(labelSuffix) || labelSuffix.includes(r.name)))
        : null;
      const chosen = rep || reps[0];
      return [
        row('اسم المفوض', 'Rep Name', chosen.name || '—'),
        row('الاسم (إنجليزي)', 'Name (English)', chosen.nameEn || '—'),
        row('رقم البطاقة', 'Civil ID', chosen.civilId ?? ''),
        row('تاريخ الانتهاء', 'Expiry', chosen.civilIdExpiry ?? ''),
        row('المنصب', 'Position', chosen.position || '—'),
      ];
    }
    case 'PASSPORT': {
      const isRepPassport = docLabel && /المفوض|Rep\s/.test(docLabel);
      const repList = (contact?.companyData ?? (booking as { companyData?: { authorizedRepresentatives?: AuthorizedRepresentative[] } }).companyData)?.authorizedRepresentatives || [];
      if (isRepPassport && repList.length) {
        const reps = repList;
        const labelSuffix = docLabel ? (docLabel.split(' - ').pop()?.trim() || '') : '';
        const rep = labelSuffix ? reps.find((r) => r.name && (r.name.includes(labelSuffix) || labelSuffix.includes(r.name))) : null;
        const chosen = rep || reps[0];
        return [
          row('اسم المفوض', 'Rep Name', chosen.name || '—'),
          row('الاسم (إنجليزي)', 'Name (English)', chosen.nameEn || '—'),
          row('رقم الجواز', 'Passport No.', chosen.passportNumber ?? ''),
          row('تاريخ الانتهاء', 'Expiry', chosen.passportExpiry ?? ''),
        ];
      }
      return [
        row('الاسم (عربي)', 'Name (Arabic)', nameAr),
        row('الاسم (إنجليزي)', 'Name (English)', nameEn),
        row('رقم الجواز', 'Passport No.', (contact?.passportNumber || (booking as { passportNumber?: string }).passportNumber) ?? ''),
        row('تاريخ الانتهاء', 'Expiry', contact?.passportExpiry ?? ''),
      ];
    }
    case 'EMPLOYMENT':
      return [
        row('الاسم', 'Name', nameAr),
        row('جهة العمل', 'Workplace', contact?.workplace ?? ''),
        row('جهة العمل (إنجليزي)', 'Workplace (En)', contact?.workplaceEn ?? ''),
      ];
    case 'COMMERCIAL_REGISTRATION': {
      const cd = contact?.companyData ?? (booking as { companyData?: { companyNameAr?: string; companyNameEn?: string; commercialRegistrationNumber?: string; establishmentDate?: string; commercialRegistrationExpiry?: string; authorizedRepresentatives?: AuthorizedRepresentative[] } }).companyData;
      if (!cd) return [row('اسم الشركة', 'Company', nameAr)];
      const reps = cd.authorizedRepresentatives || [];
      const repRows = reps.map((r: AuthorizedRepresentative, i: number) =>
        row(`المفوض ${i + 1}`, `Rep ${i + 1}`, `${r.name} — ${r.position}${r.phone ? ' • ' + r.phone : ''}`)
      );
      return [
        row('اسم الشركة (عربي)', 'Company (Ar)', cd.companyNameAr || ''),
        row('اسم الشركة (إنجليزي)', 'Company (En)', cd.companyNameEn ?? ''),
        row('رقم السجل', 'CR Number', cd.commercialRegistrationNumber ?? ''),
        row('تاريخ التأسيس', 'Establishment', cd.establishmentDate ?? ''),
        row('تاريخ الانتهاء', 'Expiry', cd.commercialRegistrationExpiry ?? ''),
        ...repRows,
      ];
    }
    case 'PREVIOUS_RENT':
    case 'BANK_STATEMENT':
    case 'FAMILY_CARD':
    default:
      return [row('الاسم', 'Name', nameAr), row('البريد', 'Email', booking.email || '—'), row('الهاتف', 'Phone', booking.phone || '—')];
  }
}

const STATUS_LABELS: Record<DocumentStatus, { ar: string; en: string; className: string }> = {
  PENDING: { ar: 'بانتظار الرفع', en: 'Pending upload', className: 'bg-amber-50 text-amber-700' },
  UPLOADED: { ar: 'مرفوع - بانتظار الاعتماد', en: 'Uploaded - Pending approval', className: 'bg-blue-50 text-blue-700' },
  APPROVED: { ar: 'معتمد', en: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected', className: 'bg-red-50 text-red-700' },
};

export interface BookingDocumentsPanelProps {
  open: boolean;
  onClose: () => void;
  booking: PropertyBooking;
  propertyId: number;
  locale?: string;
  onCreateContract?: () => void;
}

export default function BookingDocumentsPanel({
  open,
  onClose,
  booking,
  propertyId,
  locale = 'ar',
  onCreateContract,
}: BookingDocumentsPanelProps) {
  const ar = locale === 'ar';
  const [docs, setDocs] = useState<BookingDocument[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonAr, setRejectReasonAr] = useState('');
  const [rejectReasonEn, setRejectReasonEn] = useState('');
  const [viewingDoc, setViewingDoc] = useState<BookingDocument | null>(null);
  const [viewingFileIndex, setViewingFileIndex] = useState(0);
  /** رفض من داخل نافذة العرض: '' = رفض المستند كاملاً، أو fileUrl = رفض صورة بعينها */
  const [rejectingInViewer, setRejectingInViewer] = useState<string>('');
  /** تكبير الصورة عند الضغط عليها */
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [showLandlordSetup, setShowLandlordSetup] = useState(false);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setDocs(getDocumentsByBooking(booking.id));
  }, [booking.id]);

  const terms = getPropertyBookingTerms(propertyId);
  const requiredDocTypes = terms.requiredDocTypes || [];
  const hasRequiredDocs = requiredDocTypes.length > 0;
  const allApproved = areAllRequiredDocumentsApproved(booking.id);

  const handleProceedToContract = useCallback(() => {
    if (!onCreateContract) return;
    if (hasPropertyLandlord(propertyId)) {
      setShowLandlordSetup(false);
      onCreateContract();
    } else {
      setShowLandlordSetup(true);
      setLandlordSearch('');
      setSelectedLandlordId(null);
    }
  }, [onCreateContract, propertyId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const prevAllApproved = useRef(false);
  useEffect(() => {
    if (open && allApproved && hasRequiredDocs && onCreateContract && !prevAllApproved.current) {
      prevAllApproved.current = true;
      handleProceedToContract();
    }
    if (!allApproved) prevAllApproved.current = false;
  }, [open, allApproved, hasRequiredDocs, onCreateContract, handleProceedToContract]);

  const handleCreateRequests = () => {
    if (requiredDocTypes.length === 0) return;
    const requirements = requiredDocTypes.map((r) => ({
      docTypeId: r.docTypeId,
      labelAr: r.labelAr || '',
      labelEn: r.labelEn || '',
      isRequired: r.isRequired,
    }));
    createDocumentRequests(booking.id, propertyId, requirements);
    refresh();
  };

  const handleApprove = (docId: string) => {
    approveDocument(docId, ar ? 'المالك' : 'Owner');
    refresh();
  };

  const handleReject = (docId: string, fromViewer?: boolean, fileUrl?: string) => {
    const arReason = rejectReasonAr.trim();
    const enReason = rejectReasonEn.trim();
    if (!arReason && !enReason) return;
    const opts = {
      reasonAr: arReason || undefined,
      reasonEn: enReason || undefined,
      rejectedBy: ar ? 'المالك' : 'Owner',
    };
    if (fileUrl) {
      rejectFile(docId, fileUrl, opts);
    } else {
      rejectDocument(docId, opts);
    }
    setRejectingId(null);
    setRejectingInViewer('');
    setRejectReasonAr('');
    setRejectReasonEn('');
    if (fromViewer) {
      const updated = getDocumentsByBooking(booking.id).find((d) => d.id === docId);
      setViewingDoc(updated || null);
    }
    refresh();
  };

  const uploadLink = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/properties/${propertyId}/contract-terms?bookingId=${booking.id}${booking.email ? `&email=${encodeURIComponent(booking.email)}` : ''}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(uploadLink);
  };

  const handleLandlordSetupSave = () => {
    if (!selectedLandlordId) return;
    setPropertyLandlord(propertyId, selectedLandlordId);
    setShowLandlordSetup(false);
    if (onCreateContract) onCreateContract();
  };

  const msgAr = `مرحباً، يرجى إكمال إجراءات توثيق العقد عن طريق رفع المستندات المطلوبة:\n${uploadLink}`;
  const msgEn = `Hello, please complete the contract documentation by uploading the required documents:\n${uploadLink}`;
  const docLinkMessage = ar ? msgAr : msgEn;

  if (!open) return null;

  const docToReject = rejectingId ? docs.find((d) => d.id === rejectingId) : null;

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#8B6F47]/10 flex items-center justify-center text-2xl">📄</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{ar ? 'مستندات توثيق العقد' : 'Contract Documentation'}</h2>
              <p className="text-sm text-gray-500">{getBookingDisplayName(booking, locale)} — {booking.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refresh} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500" title={ar ? 'تحديث' : 'Refresh'}>
              ↻
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {docs.length === 0 && hasRequiredDocs && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center">
              <p className="text-amber-800 font-medium mb-4">
                {ar ? 'لم يتم إنشاء طلبات المستندات بعد. انقر أدناه لإنشائها من شروط العقار.' : 'Document requests not created yet. Click below to create from property terms.'}
              </p>
              <button
                type="button"
                onClick={handleCreateRequests}
                className="px-6 py-3 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors"
              >
                {ar ? 'إنشاء طلب المستندات' : 'Create Document Requests'}
              </button>
            </div>
          )}

          {docs.length === 0 && !hasRequiredDocs && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600">
                {ar ? 'لم يتم تحديد مستندات مطلوبة في شروط توثيق العقد. قم بتحديدها من صفحة الشروط.' : 'No document requirements set in contract terms. Configure them in the Terms page.'}
              </p>
            </div>
          )}

          {docs.length > 0 && (
            <>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-gray-600">
                  {ar ? 'رابط رفع المستندات للمستأجر:' : 'Document upload link for tenant:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={uploadLink}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="p-2.5 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    title={ar ? 'نسخ الرابط' : 'Copy link'}
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={() => booking.phone && openWhatsAppWithMessage(booking.phone, docLinkMessage)}
                    disabled={!booking.phone}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={booking.phone ? (ar ? 'إرسال الرابط بالواتساب' : 'Send link via WhatsApp') : (ar ? 'لا يوجد رقم واتساب مسجل' : 'No WhatsApp number')}
                  >
                    💬 {ar ? 'واتساب' : 'WhatsApp'}
                  </button>
                  <button
                    type="button"
                    onClick={() => booking.email && openEmailWithMessage(booking.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link - Contract documentation', docLinkMessage)}
                    disabled={!booking.email}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={booking.email ? (ar ? 'إرسال الرابط بالبريد' : 'Send link via email') : (ar ? 'لا يوجد بريد مسجل' : 'No email')}
                  >
                    ✉ {ar ? 'بريد' : 'Email'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {docs.map((d) => {
                  const sl = hasRejectedFiles(d)
                  ? { ar: 'صور مرفوضة - يُرجى الاستبدال', en: 'Rejected images - please replace', className: 'bg-amber-50 text-amber-700' }
                  : STATUS_LABELS[d.status];
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{ar ? d.labelAr : d.labelEn}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${sl.className}`}>
                            {ar ? sl.ar : sl.en}
                          </span>
                          {d.status === 'REJECTED' && (
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              📋 {ar ? 'أرشيف' : 'Archive'}
                            </span>
                          )}
                          {d.isRequired && (
                            <span className="text-xs text-amber-600 font-medium">{ar ? 'مطلوب' : 'Required'}</span>
                          )}
                        </div>
                        {(getDocumentFiles(d).length > 0) && (
                          <button
                            type="button"
                            onClick={() => { setViewingDoc(d); setViewingFileIndex(0); }}
                            className="text-sm text-[#8B6F47] hover:underline mt-1 block truncate max-w-[220px] text-right"
                            title={ar ? 'عرض المستند' : 'View document'}
                          >
                            {getDocumentFiles(d).length > 1
                              ? (ar ? `عرض المستند (${getDocumentFiles(d).length} ملفات)` : `View document (${getDocumentFiles(d).length} files)`)
                              : (getDocumentFiles(d)[0]?.name || (ar ? 'عرض المستند' : 'View document'))}
                          </button>
                        )}
                        <div className="mt-1.5 space-y-1 text-xs">
                          {d.uploadedAt && (
                            <p className="text-gray-500">
                              {ar ? '📤 رُفع في' : '📤 Uploaded on'} <span className="font-medium">{formatDocumentTimestamp(d.uploadedAt, ar)}</span>
                              {d.uploadedBy && (ar ? ' من قبل ' : ' by ')}<span className="text-[#8B6F47] font-semibold">{d.uploadedBy}</span>
                            </p>
                          )}
                          {d.status === 'APPROVED' && d.approvedAt && (
                            <p className="text-emerald-600">
                              {ar ? '✓ اُعتمد في' : '✓ Approved on'} <span className="font-medium">{formatDocumentTimestamp(d.approvedAt, ar)}</span>
                              {d.approvedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.approvedBy}</span>
                            </p>
                          )}
                          {d.status === 'REJECTED' && d.rejectedAt && (
                            <p className="text-red-600">
                              {ar ? '✕ رُفض في' : '✕ Rejected on'} <span className="font-medium">{formatDocumentTimestamp(d.rejectedAt, ar)}</span>
                              {d.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.rejectedBy}</span>
                            </p>
                          )}
                          {(d.rejectionReasonAr || d.rejectionReasonEn || d.rejectionReason) && (
                            <div className="text-sm text-red-600 mt-1 p-2 rounded-lg bg-red-50 border border-red-200">
                              <span className="font-semibold">
                                {d.status === 'APPROVED' ? (ar ? 'ملاحظة سابقة عند الرفض:' : 'Previous rejection note:') : (ar ? 'ملاحظة الرفض:' : 'Rejection note:')}
                              </span>
                              <div className="mt-0.5 space-y-0.5">
                                {d.rejectionReasonAr && <p>{d.rejectionReasonAr}</p>}
                                {d.rejectionReasonEn && d.rejectionReasonEn !== d.rejectionReasonAr && <p className="text-red-500/90">{d.rejectionReasonEn}</p>}
                                {!d.rejectionReasonAr && !d.rejectionReasonEn && d.rejectionReason && <p>{d.rejectionReason}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 flex-shrink-0 items-center">
                        {(getDocumentFiles(d).length > 0) && (
                          <button
                            type="button"
                            onClick={() => { setViewingDoc(d); setViewingFileIndex(0); }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-colors"
                          >
                            <span>👁</span>
                            {ar ? 'عرض المستند' : 'View document'}
                          </button>
                        )}
                        {d.status === 'UPLOADED' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(d.id)}
                              className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                            >
                              ✓ {ar ? 'اعتماد' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(d.id)}
                              className="px-5 py-2.5 rounded-xl font-bold border-2 border-red-400 text-red-600 hover:bg-red-50"
                            >
                              ✕ {ar ? 'رفض' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allApproved && hasRequiredDocs && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
                  <p className="font-bold text-emerald-800 mb-3">
                    {ar ? '✓ تم اعتماد جميع المستندات المطلوبة. يمكنك الآن إنشاء عقد الإيجار.' : '✓ All required documents approved. You can now create the rental contract.'}
                  </p>
                  {onCreateContract && (
                    <button
                      type="button"
                      onClick={handleProceedToContract}
                      className="px-6 py-3 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors"
                    >
                      {ar ? 'إنشاء عقد الإيجار' : 'Create Rental Contract'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {viewingDoc && getDocumentFiles(viewingDoc).length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
          onClick={(e) => { e.stopPropagation(); setViewingDoc(null); setZoomedImageUrl(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900 truncate flex-1">
                {ar ? viewingDoc.labelAr : viewingDoc.labelEn}
                {(() => {
                  const files = getDocumentFiles(viewingDoc);
                  const cur = files[viewingFileIndex];
                  if (files.length > 1) {
                    return (
                      <span className="text-gray-500 font-normal text-sm mr-2">
                        ({ar ? 'صورة' : 'Image'} {viewingFileIndex + 1} / {files.length}
                        {cur?.rejectedAt && (
                          <span className="text-red-600 font-bold"> — {ar ? 'مرفوضة' : 'Rejected'}</span>
                        )})
                      </span>
                    );
                  }
                  return null;
                })()}
              </span>
              <button
                type="button"
                onClick={() => { setViewingDoc(null); setZoomedImageUrl(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>
            {(() => {
              const contact = findContactByPhoneOrEmail(booking.phone, booking.email);
              const fields = getDocumentInfoFields(viewingDoc.docTypeId, booking, contact, ar ? viewingDoc.labelAr : viewingDoc.labelEn);
              return (
                <div className="px-4 py-3 bg-[#8B6F47]/5 border-b border-gray-100">
                  <p className="text-xs font-bold text-[#8B6F47] uppercase tracking-wider mb-2">{ar ? 'البيانات المسجلة' : 'Registered Data'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                    {fields.map((f) => (
                      <div key={f.labelAr} className="flex flex-col gap-0">
                        <span className="text-gray-500 text-xs">{ar ? f.labelAr : f.labelEn}</span>
                        <span className="font-medium text-gray-900 truncate" title={f.value}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className={`overflow-auto p-4 bg-gray-200 flex items-center justify-center relative flex-shrink-0 ${rejectingInViewer ? 'max-h-[220px] min-h-[160px]' : 'max-h-[65vh] min-h-[320px]'}`}>
              {(() => {
                const files = getDocumentFiles(viewingDoc);
                const current = files[viewingFileIndex];
                if (!current) return null;
                const isPdf = /\.(pdf|PDF)$/i.test(current.name || current.url);
                const hasMultiple = files.length > 1;
                const compact = !!rejectingInViewer;
                return (
                  <div className="flex items-center justify-center gap-2 w-full">
                    {hasMultiple && !compact && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewingFileIndex((i) => (i - 1 + files.length) % files.length); }}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-white shadow-lg border-2 border-gray-200 hover:bg-[#8B6F47] hover:text-white hover:border-[#8B6F47] flex items-center justify-center text-2xl font-bold text-gray-700 transition-colors z-10"
                        title={ar ? 'السابق' : 'Previous'}
                      >
                        ‹
                      </button>
                    )}
                    <div className={`flex-1 flex items-center justify-center ${compact ? 'max-h-[180px]' : 'min-h-[280px]'}`}>
                      {isPdf ? (
                        <iframe
                          src={current.url}
                          className={`w-full rounded-lg border-0 ${compact ? 'h-[180px]' : 'max-h-[60vh] min-h-[280px]'}`}
                          title={current.name || (ar ? 'عرض المستند' : 'View document')}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setZoomedImageUrl(current.url)}
                          className="flex items-center justify-center w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#8B6F47] focus:ring-offset-2 rounded-lg"
                          title={ar ? 'انقر للتكبير' : 'Click to zoom'}
                        >
                          <img
                            src={current.url}
                            alt={current.name || (ar ? viewingDoc.labelAr : viewingDoc.labelEn)}
                            className={`max-w-full object-contain rounded-lg shadow-lg ${current.rejectedAt ? 'ring-4 ring-red-500' : ''} ${compact ? 'max-h-[180px]' : 'max-h-[60vh]'}`}
                            draggable={false}
                          />
                        </button>
                      )}
                    </div>
                    {hasMultiple && !compact && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewingFileIndex((i) => (i + 1) % files.length); }}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-white shadow-lg border-2 border-gray-200 hover:bg-[#8B6F47] hover:text-white hover:border-[#8B6F47] flex items-center justify-center text-2xl font-bold text-gray-700 transition-colors z-10"
                        title={ar ? 'التالي' : 'Next'}
                      >
                        ›
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {viewingDoc.status === 'UPLOADED' && (
              <div className="px-6 py-5 border-t-2 border-gray-300 bg-gray-50 flex-shrink-0 rounded-b-2xl">
                {rejectingInViewer ? (
                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row gap-5 items-start">
                      {rejectingInViewer !== 'ALL' && (() => {
                        const files = getDocumentFiles(viewingDoc);
                        const cur = files.find((f) => f.url === rejectingInViewer);
                        if (!cur) return null;
                        const isPdf = /\.(pdf|PDF)$/i.test(cur.name || cur.url);
                        return (
                          <div className="flex-shrink-0 w-full lg:w-48">
                            <p className="text-sm font-bold text-gray-600 mb-2">{ar ? 'الصورة المرفوضة' : 'Rejected image'}</p>
                            {isPdf ? (
                              <div className="w-full aspect-square max-h-40 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 font-medium">
                                PDF
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setZoomedImageUrl(cur.url)}
                                className="w-full rounded-xl border-2 border-red-400 shadow-lg overflow-hidden cursor-zoom-in focus:outline-none"
                              >
                                <img src={cur.url} alt="" className="w-full aspect-square object-cover max-h-40" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0 w-full">
                        <p className="text-lg font-bold text-gray-900 mb-2">
                          {rejectingInViewer === 'ALL'
                            ? (ar ? 'سبب رفض المستند كاملاً (باللغتين)' : 'Rejection reason for entire document (bilingual)')
                            : (ar ? 'سبب رفض هذه الصورة (باللغتين)' : 'Rejection reason for this image (bilingual)')}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          {rejectingInViewer === 'ALL'
                            ? (ar ? 'سيُطلب من المستخدم إعادة رفع المستند كاملاً.' : 'User will be required to re-upload the entire document.')
                            : (ar ? 'سيُطلب من المستخدم استبدال هذه الصورة بأخرى أوضح.' : 'User will be required to replace this image with a clearer one.')}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="block text-sm font-bold text-gray-800">{ar ? 'سبب الرفض (عربي)' : 'Rejection reason (Arabic)'}</label>
                              {rejectReasonEn.trim() && (
                                <TranslateBtn
                                  source={rejectReasonEn}
                                  onResult={setRejectReasonAr}
                                  target="ar"
                                  ar={ar}
                                />
                              )}
                            </div>
                            <textarea
                              value={rejectReasonAr}
                              onChange={(e) => setRejectReasonAr(e.target.value)}
                              placeholder={ar ? 'أدخل سبب الرفض' : 'Enter rejection reason'}
                              rows={4}
                              className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none resize-y min-h-[110px] bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="block text-sm font-bold text-gray-800">{ar ? 'سبب الرفض (إنجليزي)' : 'Rejection reason (English)'}</label>
                              {rejectReasonAr.trim() && (
                                <TranslateBtn
                                  source={rejectReasonAr}
                                  onResult={setRejectReasonEn}
                                  target="en"
                                  ar={ar}
                                />
                              )}
                            </div>
                            <textarea
                              value={rejectReasonEn}
                              onChange={(e) => setRejectReasonEn(e.target.value)}
                              placeholder="Enter rejection reason"
                              rows={4}
                              className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none resize-y min-h-[110px] bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 flex-wrap mt-4">
                          <button
                            type="button"
                            onClick={() => handleReject(viewingDoc.id, true, rejectingInViewer === 'ALL' ? undefined : rejectingInViewer)}
                            disabled={!rejectReasonAr.trim() && !rejectReasonEn.trim()}
                            className="px-6 py-3 rounded-xl font-bold text-base bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-md"
                          >
                            {ar ? 'تأكيد الرفض' : 'Confirm Reject'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectingInViewer(''); setRejectReasonAr(''); setRejectReasonEn(''); }}
                            className="px-6 py-3 rounded-xl border-2 border-gray-300 hover:bg-gray-200 font-semibold"
                          >
                            {ar ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border-2 border-gray-200 shadow-sm">
                    <p className="text-center text-sm font-bold text-gray-700 mb-4">{ar ? 'اختر الإجراء:' : 'Choose action:'}</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => { handleApprove(viewingDoc.id); setViewingDoc(null); setZoomedImageUrl(null); refresh(); }}
                        disabled={hasRejectedFiles(viewingDoc)}
                        className="px-6 py-3 rounded-xl font-bold text-base bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        title={hasRejectedFiles(viewingDoc) ? (ar ? 'يوجد صور مرفوضة - يُرجى من المستخدم استبدالها أولاً' : 'Some images rejected - user must replace them first') : ''}
                      >
                        ✓ {ar ? 'اعتماد' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingInViewer('ALL'); setRejectReasonAr(''); setRejectReasonEn(''); }}
                        className="px-6 py-3 rounded-xl font-bold text-base border-2 border-red-400 text-red-600 hover:bg-red-50 hover:border-red-500 shadow-md transition-all min-w-[160px]"
                      >
                        ✕ {ar ? 'رفض المستند كاملاً' : 'Reject entire document'}
                      </button>
                      {(() => {
                        const files = getDocumentFiles(viewingDoc);
                        const current = files[viewingFileIndex];
                        if (files.length > 1 && current && !current.rejectedAt) {
                          return (
                            <button
                              type="button"
                              onClick={() => { setRejectingInViewer(current.url); setRejectReasonAr(''); setRejectReasonEn(''); }}
                              className="px-6 py-3 rounded-xl font-bold text-base border-2 border-amber-400 text-amber-700 hover:bg-amber-50 shadow-md transition-all min-w-[160px]"
                            >
                              ⚠ {ar ? 'رفض هذه الصورة فقط' : 'Reject this image only'}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewingDoc.status === 'REJECTED' && (
              <div className="px-4 py-3 border-t border-gray-200 bg-red-50">
                {viewingDoc.rejectedAt && (
                  <p className="text-xs text-red-700 mb-1">
                    {ar ? '✕ رُفض في' : '✕ Rejected on'} {formatDocumentTimestamp(viewingDoc.rejectedAt, ar)}
                    {viewingDoc.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{viewingDoc.rejectedBy}</span>
                  </p>
                )}
                {(viewingDoc.rejectionReasonAr || viewingDoc.rejectionReasonEn || viewingDoc.rejectionReason) && (
                  <>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">{ar ? 'ملاحظة الرفض' : 'Rejection Note'}</p>
                    <div className="text-sm space-y-1">
                      {viewingDoc.rejectionReasonAr && <p className="text-gray-900 font-medium">{viewingDoc.rejectionReasonAr}</p>}
                      {viewingDoc.rejectionReasonEn && <p className="text-gray-700">{viewingDoc.rejectionReasonEn}</p>}
                      {!viewingDoc.rejectionReasonAr && !viewingDoc.rejectionReasonEn && viewingDoc.rejectionReason && (
                        <p className="text-gray-900">{viewingDoc.rejectionReason}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {docToReject && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={() => { setRejectingId(null); setRejectReasonAr(''); setRejectReasonEn(''); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{ar ? 'سبب الرفض' : 'Rejection reason'}</h3>
          <p className="text-sm text-gray-500 mb-4">{ar ? 'للمستند:' : 'For document:'} {(ar ? docToReject.labelAr : docToReject.labelEn)}</p>
          <div className="grid grid-cols-1 gap-4">
            <TranslateField
              label={ar ? 'سبب الرفض (عربي)' : 'Rejection reason (Arabic)'}
              value={rejectReasonAr}
              onChange={setRejectReasonAr}
              sourceValue={rejectReasonEn}
              onTranslateFromSource={setRejectReasonAr}
              translateFrom="en"
              locale={locale}
              placeholder={ar ? 'أدخل سبب الرفض' : 'Enter rejection reason'}
              multiline
              rows={3}
              inputErrorClass="min-h-[80px] py-3 px-4 text-base border-2 border-gray-200"
            />
            <TranslateField
              label={ar ? 'سبب الرفض (إنجليزي)' : 'Rejection reason (English)'}
              value={rejectReasonEn}
              onChange={setRejectReasonEn}
              sourceValue={rejectReasonAr}
              onTranslateFromSource={setRejectReasonEn}
              translateFrom="ar"
              locale={locale}
              placeholder="Enter rejection reason"
              multiline
              rows={3}
              inputErrorClass="min-h-[80px] py-3 px-4 text-base border-2 border-gray-200"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => handleReject(docToReject.id)}
              disabled={!rejectReasonAr.trim() && !rejectReasonEn.trim()}
              className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {ar ? 'تأكيد الرفض' : 'Confirm Reject'}
            </button>
            <button
              type="button"
              onClick={() => { setRejectingId(null); setRejectReasonAr(''); setRejectReasonEn(''); }}
              className="px-6 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100 font-semibold"
            >
              ✕ {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showLandlordSetup && (
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowLandlordSetup(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {ar ? 'أكمل بيانات المالك والمبنى' : 'Complete landlord & property data'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {ar ? 'يجب ربط المالك بالعقار مرة واحدة قبل إنشاء العقد.' : 'Link the landlord to this property (one-time setup) before creating the contract.'}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {ar ? 'اختر المالك من دفتر العناوين' : 'Select landlord from address book'}
            </label>
            <input
              type="text"
              value={landlordSearch}
              onChange={(e) => setLandlordSearch(e.target.value)}
              placeholder={ar ? 'بحث بالاسم أو الهاتف أو البريد...' : 'Search by name, phone or email...'}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20 outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] max-h-[280px] pr-1">
            {(() => {
              const list = landlordSearch.trim()
                ? searchContacts(landlordSearch)
                : getAllContacts().filter((c) => c.category === 'LANDLORD' || c.category === 'CLIENT');
              return list.length === 0 ? (
                <div className="text-gray-500 text-sm py-4 text-center">
                  <p className="mb-2">{ar ? 'لا توجد نتائج. أضف المالك من دفتر العناوين أولاً.' : 'No results. Add the landlord from the address book first.'}</p>
                  <a
                    href={`/${locale}/admin/address-book`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8B6F47] hover:underline font-semibold"
                  >
                    {ar ? 'فتح دفتر العناوين' : 'Open Address Book'}
                  </a>
                </div>
              ) : (
                list.slice(0, 50).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedLandlordId(selectedLandlordId === c.id ? null : c.id)}
                    className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                      selectedLandlordId === c.id
                        ? 'border-[#8B6F47] bg-[#8B6F47]/10'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{getContactDisplayFull(c, locale)}</span>
                    {(c.phone || c.email) && (
                      <span className="block text-xs text-gray-500 mt-0.5">{[c.phone, c.email].filter(Boolean).join(' • ')}</span>
                    )}
                  </button>
                ))
              );
            })()}
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleLandlordSetupSave}
              disabled={!selectedLandlordId}
              className="flex-1 px-5 py-3 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {ar ? 'حفظ والمتابعة' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={() => setShowLandlordSetup(false)}
              className="px-5 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100 font-semibold"
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}

    {zoomedImageUrl && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90"
        onClick={() => setZoomedImageUrl(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && setZoomedImageUrl(null)}
        aria-label={ar ? 'إغلاق' : 'Close'}
      >
        <button
          type="button"
          onClick={() => setZoomedImageUrl(null)}
          className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl font-bold flex items-center justify-center z-10"
          aria-label={ar ? 'إغلاق' : 'Close'}
        >
          ✕
        </button>
        <img
          src={zoomedImageUrl}
          alt=""
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>
    )}
    </>
  );
}
