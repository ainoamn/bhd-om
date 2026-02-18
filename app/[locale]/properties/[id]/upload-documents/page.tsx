'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { getDocumentsByBooking, uploadDocument, replaceFileInDocument, getDocumentFiles, hasRejectedFiles, formatDocumentTimestamp } from '@/lib/data/bookingDocuments';
import { getBookingsByProperty } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';
import { getPropertyBookingTerms } from '@/lib/data/bookingTerms';
import type { BookingDocument } from '@/lib/data/bookingDocuments';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'بانتظار الرفع', en: 'Pending upload' },
  UPLOADED: { ar: 'مرفوع - بانتظار الاعتماد', en: 'Uploaded - Pending approval' },
  APPROVED: { ar: 'معتمد', en: 'Approved' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
};

export default function UploadDocumentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const bookingIdParam = searchParams?.get('bookingId');
  const emailParam = searchParams?.get('email');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [bookingId, setBookingId] = useState<string | null>(bookingIdParam || null);
  const [email, setEmail] = useState(emailParam || '');
  const [verifyError, setVerifyError] = useState('');
  const [docs, setDocs] = useState<BookingDocument[]>([]);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const dataOverrides = getPropertyDataOverrides();
  const property = getPropertyById(id, dataOverrides);

  const verifyAndLoad = () => {
    setVerifyError('');
    if (!email.trim()) {
      setVerifyError(ar ? 'أدخل البريد الإلكتروني' : 'Enter your email');
      return;
    }
    const bookings = getBookingsByProperty(parseInt(id, 10));
    const match = bookings.find(
      (b) => b.status === 'CONFIRMED' && b.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (match) {
      setBookingId(match.id);
      setDocs(getDocumentsByBooking(match.id));
    } else {
      setVerifyError(ar ? 'لم يتم العثور على حجز مؤكد بهذا البريد' : 'No confirmed booking found with this email');
    }
  };

  useEffect(() => {
    if (bookingIdParam) {
      const bookings = getBookingsByProperty(parseInt(id, 10));
      const match = bookings.find(
        (b) => b.id === bookingIdParam && b.status === 'CONFIRMED' && b.propertyId === parseInt(id, 10)
      );
      if (match) {
        setBookingId(bookingIdParam);
        setDocs(getDocumentsByBooking(bookingIdParam));
        if (match.email) setEmail(match.email);
        setVerifyError('');
      } else {
        setVerifyError(ar ? 'رابط غير صالح أو انتهت صلاحيته' : 'Invalid or expired link');
      }
    }
    if (property) setPropertyTitle(ar ? property.titleAr : property.titleEn);
  }, [id, bookingIdParam, ar, property]);

  const refreshDocs = () => {
    if (bookingId) setDocs(getDocumentsByBooking(bookingId));
  };

  const handleFileSelect = async (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingId(docId);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/booking-documents', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          uploadDocument(docId, data.url, file.name, email.trim() || undefined);
        } else {
          alert(ar ? 'فشل الرفع' : 'Upload failed');
        }
      }
      refreshDocs();
    } catch {
      alert(ar ? 'حدث خطأ أثناء الرفع' : 'An error occurred during upload');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const triggerFileInput = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const triggerReplaceInput = (docId: string, fileUrl: string) => {
    const key = `replace-${docId}-${encodeURIComponent(fileUrl)}`;
    replaceInputRefs.current[key]?.click();
  };

  const handleReplaceFileSelect = async (docId: string, oldFileUrl: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingId(docId);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/booking-documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        replaceFileInDocument(docId, oldFileUrl, data.url, file.name);
        refreshDocs();
      } else {
        alert(ar ? 'فشل الرفع' : 'Upload failed');
      }
    } catch {
      alert(ar ? 'حدث خطأ أثناء الرفع' : 'An error occurred during upload');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
          <div className="text-6xl mb-6 opacity-80">🔍</div>
          <p className="text-white/80 mb-6 text-lg">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1612] via-[#0f0d0b] to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B6F47]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#C9A961]/10 rounded-full blur-3xl" />
        </div>
        <PageHero
          title={ar ? 'رفع مستندات توثيق العقد' : 'Upload Contract Documents'}
          subtitle={propertyTitle}
          compact
          backgroundImage={property.image}
        />
      </div>

      <section className="relative -mt-16 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-2xl">
          <div
            className={`rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {!bookingId ? (
              <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {ar ? 'تأكيد هويتك' : 'Verify your identity'}
                </h2>
                <p className="text-white/70 text-sm mb-6">
                  {ar ? 'أدخل البريد الإلكتروني الذي استخدمته عند الحجز للوصول إلى صفحة رفع المستندات.' : 'Enter the email you used when booking to access the document upload page.'}
                </p>
                <div className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={ar ? 'البريد الإلكتروني' : 'Email address'}
                    className="w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none"
                  />
                  {verifyError && (
                    <p className="text-red-400 text-sm">{verifyError}</p>
                  )}
                  <button
                    type="button"
                    onClick={verifyAndLoad}
                    className="w-full px-6 py-4 rounded-xl font-bold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-all"
                  >
                    {ar ? 'متابعة' : 'Continue'}
                  </button>
                </div>
              </div>
            ) : docs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-white/80">
                  {ar ? 'لا توجد مستندات مطلوبة لهذا الحجز حالياً. تواصل مع إدارة العقار.' : 'No documents required for this booking at the moment. Contact property management.'}
                </p>
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-6">
                {(() => {
                  const docTerms = getPropertyBookingTerms(id);
                  const termsText = ar ? (docTerms.contractDocTermsAr || docTerms.contractDocTermsEn) : (docTerms.contractDocTermsEn || docTerms.contractDocTermsAr);
                  return termsText ? (
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                      <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{termsText}</p>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-[#8B6F47]/30 flex items-center justify-center text-2xl">📄</div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{ar ? 'المستندات المطلوبة' : 'Required Documents'}</h2>
                    <p className="text-sm text-white/60">{ar ? 'قم برفع كل مستند حسب النوع المطلوب' : 'Upload each document as required'}</p>
                  </div>
                </div>

                {docs.map((d) => {
                  const sl = hasRejectedFiles(d)
                    ? { ar: 'صور مرفوضة - يُرجى الاستبدال', en: 'Rejected images - please replace' }
                    : (STATUS_LABELS[d.status] || STATUS_LABELS.PENDING);
                  const canUpload = d.status !== 'APPROVED';
                  const files = getDocumentFiles(d);
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{ar ? d.labelAr : d.labelEn}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              hasRejectedFiles(d) ? 'bg-amber-500/30 text-amber-300' :
                              d.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                              d.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                              d.status === 'UPLOADED' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {ar ? sl.ar : sl.en}
                            </span>
                            {d.isRequired && (
                              <span className="text-xs text-amber-400">{ar ? 'مطلوب' : 'Required'}</span>
                            )}
                          </div>
                          {files.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {files.map((f, i) => {
                                const replaceKey = `replace-${d.id}-${encodeURIComponent(f.url)}`;
                                const isRejected = !!f.rejectedAt;
                                const isReplaced = !!f.replacedAt && (f.rejectionReasonAr || f.rejectionReasonEn);
                                return (
                                  <div key={f.url} className={`p-2 rounded-lg ${isRejected ? 'bg-red-500/20 border border-red-500/40' : isReplaced ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
                                    <input
                                      ref={(el) => { replaceInputRefs.current[replaceKey] = el; }}
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                      className="hidden"
                                      onChange={(e) => handleReplaceFileSelect(d.id, f.url, e)}
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                      {(() => {
                                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || f.url);
                                        return isImage ? (
                                          <button
                                            type="button"
                                            onClick={() => setZoomedImageUrl(f.url)}
                                            className="text-sm text-[#C9A961] hover:underline truncate text-right cursor-zoom-in flex items-center gap-2"
                                            title={ar ? 'انقر لتكبير الصورة' : 'Click to zoom image'}
                                          >
                                            <img src={f.url} alt="" className="w-12 h-12 object-cover rounded border border-white/20 shrink-0" />
                                            <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                          </button>
                                        ) : (
                                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#C9A961] hover:underline truncate flex items-center gap-2">
                                            <span className="truncate">{f.name || (ar ? `المستند ${i + 1}` : `Document ${i + 1}`)}</span>
                                          </a>
                                        );
                                      })()}
                                      {isRejected && (
                                        <button
                                          type="button"
                                          onClick={() => triggerReplaceInput(d.id, f.url)}
                                          disabled={!!uploadingId}
                                          className="text-xs px-3 py-1 rounded-lg bg-[#8B6F47] text-white hover:bg-[#6B5535] font-semibold shrink-0 disabled:opacity-50"
                                        >
                                          {ar ? 'استبدل الصورة' : 'Replace image'}
                                        </button>
                                      )}
                                    </div>
                                    {isRejected && (
                                      <div className="mt-1 text-xs text-red-400">
                                        <span>{ar ? 'مرفوضة - يرجى استبدالها بصفة أوضح' : 'Rejected - please replace with a clearer image'}</span>
                                        {(f.rejectionReasonAr || f.rejectionReasonEn) && (
                                          <p className="text-red-300 mt-0.5 font-medium">{ar ? 'سبب طلب الاستبدال:' : 'Replacement requested because:'} {(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                        )}
                                      </div>
                                    )}
                                    {isReplaced && (f.rejectionReasonAr || f.rejectionReasonEn) && (
                                      <div className="mt-1 text-xs text-amber-400/90">
                                        <span>{ar ? '✓ تم الاستبدال. سبب الطلب السابق:' : '✓ Replaced. Previous request reason:'}</span>
                                        <p className="text-amber-300/90 mt-0.5">{(ar ? f.rejectionReasonAr || f.rejectionReasonEn : f.rejectionReasonEn || f.rejectionReasonAr)}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {hasRejectedFiles(d) && (
                                <p className="text-xs text-amber-400">{ar ? '⚠ الصور المرفوضة أعلاه يجب استبدالها.' : '⚠ Rejected images above must be replaced.'}</p>
                              )}
                            </div>
                          )}
                          <div className="mt-2 space-y-1.5 text-xs">
                            {d.uploadedAt && (
                              <p className="text-white/60">
                                {ar ? '📤 رُفع في' : '📤 Uploaded on'} <span className="text-white/80 font-medium">{formatDocumentTimestamp(d.uploadedAt, ar)}</span>
                                {d.uploadedBy && (ar ? ' من قبل ' : ' by ')}<span className="text-[#C9A961] font-semibold">{d.uploadedBy}</span>
                              </p>
                            )}
                            {d.status === 'APPROVED' && d.approvedAt && (
                              <p className="text-emerald-400">
                                {ar ? '✓ اُعتمد في' : '✓ Approved on'} <span className="font-medium">{formatDocumentTimestamp(d.approvedAt, ar)}</span>
                                {d.approvedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.approvedBy}</span>
                              </p>
                            )}
                            {d.status === 'REJECTED' && d.rejectedAt && (
                              <p className="text-red-400">
                                {ar ? '✕ رُفض في' : '✕ Rejected on'} <span className="font-medium">{formatDocumentTimestamp(d.rejectedAt, ar)}</span>
                                {d.rejectedBy && (ar ? ' من قبل ' : ' by ')}<span className="font-semibold">{d.rejectedBy}</span>
                              </p>
                            )}
                            {(d.rejectionReasonAr || d.rejectionReasonEn || d.rejectionReason) && (
                              <div className="text-sm text-red-400/90 mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="font-semibold">
                                  {d.status === 'APPROVED' ? (ar ? 'ملاحظة سابقة عند الرفض:' : 'Previous rejection note:') : (ar ? 'ملاحظة الرفض:' : 'Rejection note:')}
                                </span>
                                <div className="mt-0.5 space-y-0.5">
                                  {d.rejectionReasonAr && <p>{d.rejectionReasonAr}</p>}
                                  {d.rejectionReasonEn && d.rejectionReasonEn !== d.rejectionReasonAr && <p className="text-red-400/80">{d.rejectionReasonEn}</p>}
                                  {!d.rejectionReasonAr && !d.rejectionReasonEn && d.rejectionReason && <p>{d.rejectionReason}</p>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            ref={(el) => { fileInputRefs.current[d.id] = el; }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                            multiple
                            onChange={(e) => handleFileSelect(d.id, e)}
                            className="hidden"
                          />
                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => triggerFileInput(d.id)}
                              disabled={!!uploadingId}
                              className="px-5 py-2.5 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] disabled:opacity-50 transition-all"
                            >
                              {uploadingId === d.id ? (ar ? 'جاري الرفع...' : 'Uploading...') : (files.length > 0 ? (ar ? 'إضافة صور' : 'Add more') : (ar ? 'رفع' : 'Upload'))}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <p className="text-white/50 text-sm text-center">
                  {ar ? 'PDF، صور، أو مستندات Office (doc, xls)' : 'PDF, images, or Office documents (doc, xls)'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
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
    </div>
  );
}
