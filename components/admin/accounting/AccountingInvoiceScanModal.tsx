'use client';

import { useState, useRef } from 'react';
import type { DocumentType } from '@/lib/data/accounting';
import { scanInvoiceFromText } from '@/lib/accounting/api/client';
import { extractTextFromInvoiceImage } from '@/lib/utils/invoiceImageOcr';

export type InvoiceScanResult = {
  type: DocumentType;
  date?: string;
  dueDate?: string;
  amount?: string;
  vatRate?: number;
  reference?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  attachments?: { url: string; name: string }[];
};

export default function AccountingInvoiceScanModal(props: {
  ar: boolean;
  open: boolean;
  onClose: () => void;
  onApply: (draft: InvoiceScanResult) => void;
}) {
  const { ar, open, onClose, onApply } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof scanInvoiceFromText>> | null>(null);

  if (!open) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    setOcrStatus('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/accounting', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAttachmentUrl(data.url);
      setFileName(file.name);

      if (file.type.startsWith('image/')) {
        setOcrStatus(ar ? 'جاري قراءة الصورة...' : 'Reading image...');
        const ocrText = await extractTextFromInvoiceImage(file, (msg) => {
          if (msg.startsWith('ocr:')) {
            setOcrStatus(ar ? `قراءة الصورة ${msg.slice(4)}%` : `Reading image ${msg.slice(4)}%`);
          } else if (msg === 'loading') {
            setOcrStatus(ar ? 'تحميل محرك OCR...' : 'Loading OCR engine...');
          }
        });
        if (ocrText) {
          setText(ocrText);
          setOcrStatus(ar ? 'تم استخراج النص من الصورة' : 'Text extracted from image');
        } else {
          setOcrStatus(ar ? 'لم يُستخرج نص — الصق يدوياً' : 'No text extracted — paste manually');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError('');
    setPreview(null);
    try {
      const result = await scanInvoiceFromText({
        text: text.trim() || fileName,
        fileName: fileName || undefined,
        attachmentUrl: attachmentUrl || undefined,
      });
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? 'تعذّر المسح' : 'Scan failed'));
    } finally {
      setScanning(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply({
      type: preview.type as DocumentType,
      date: preview.date,
      dueDate: preview.dueDate,
      amount: preview.amount != null ? String(preview.amount) : '',
      vatRate: preview.vatRate,
      reference: preview.reference,
      descriptionAr: preview.descriptionAr,
      descriptionEn: preview.descriptionEn,
      attachments: attachmentUrl ? [{ url: attachmentUrl, name: fileName || 'scan' }] : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="admin-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">{ar ? 'مسح فاتورة (AI + OCR)' : 'Scan invoice (AI + OCR)'}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            {ar
              ? 'البيانات المستخرجة لن تُحفظ إلا بعد مراجعتك والنقر على «حفظ» في نموذج المستند.'
              : 'Extracted data is not saved until you review and click Save on the document form.'}
          </p>
          <div>
            <label className="block text-sm font-semibold mb-1">{ar ? 'رفع صورة (OCR تلقائي)' : 'Upload image (auto OCR)'}</label>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="admin-input w-full"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            {uploading && <p className="text-xs text-gray-500 mt-1">{ar ? 'جاري الرفع...' : 'Uploading...'}</p>}
            {ocrStatus && <p className="text-xs text-blue-700 mt-1">{ocrStatus}</p>}
            {attachmentUrl && <p className="text-xs text-emerald-700 mt-1">✓ {fileName}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{ar ? 'نص الفاتورة (قابل للتعديل)' : 'Invoice text (editable)'}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="admin-input w-full min-h-[100px] font-mono text-xs"
              placeholder={ar ? 'يُملأ تلقائياً من الصورة أو الصق يدوياً' : 'Auto-filled from image or paste manually'}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {preview && (
            <div className="rounded-xl border p-4 bg-gray-50 space-y-1 text-sm">
              <p className="font-semibold">{ar ? preview.explanationAr : preview.explanationEn}</p>
              <p>{ar ? 'النوع' : 'Type'}: {preview.type}</p>
              {preview.amount != null && <p>{ar ? 'المبلغ' : 'Amount'}: {preview.amount.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}</p>}
              {preview.date && <p>{ar ? 'التاريخ' : 'Date'}: {preview.date}</p>}
              {preview.dueDate && <p>{ar ? 'الاستحقاق' : 'Due'}: {preview.dueDate}</p>}
              {preview.reference && <p>{ar ? 'المرجع' : 'Ref'}: {preview.reference}</p>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 admin-btn-secondary !py-2">{ar ? 'إلغاء' : 'Cancel'}</button>
            <button type="button" onClick={handleScan} disabled={scanning || uploading} className="flex-1 admin-btn-secondary !py-2">
              {scanning ? (ar ? 'جاري المسح...' : 'Scanning...') : (ar ? 'مسح' : 'Scan')}
            </button>
            {preview && (
              <button type="button" onClick={handleApply} className="flex-1 admin-btn-primary !py-2">
                {ar ? 'تطبيق على النموذج' : 'Apply to form'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
