'use client';

/** Client-side OCR from image files using Tesseract.js (lazy-loaded) */
export async function extractTextFromInvoiceImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return '';
  }
  onProgress?.('loading');
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng+ara', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(`ocr:${Math.round((m.progress || 0) * 100)}`);
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}
