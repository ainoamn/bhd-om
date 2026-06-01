/**
 * Extract text from uploaded accounting PDFs (server-side only)
 */

import fs from 'fs';
import path from 'path';

export async function extractTextFromAccountingPdfUrl(uploadUrl: string): Promise<string> {
  if (!uploadUrl.startsWith('/uploads/accounting/')) return '';
  const filePath = path.join(process.cwd(), 'public', uploadUrl.replace(/^\//, '').replace(/\.\./g, ''));
  if (!fs.existsSync(filePath) || !filePath.toLowerCase().endsWith('.pdf')) return '';
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch {
    return '';
  }
}
