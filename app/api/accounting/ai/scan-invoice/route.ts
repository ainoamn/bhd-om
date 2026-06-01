import { NextRequest, NextResponse } from 'next/server';
import { parseInvoiceFromText } from '@/lib/accounting/ai/invoiceOcrEngine';
import { extractTextFromAccountingPdfUrl } from '@/lib/accounting/ai/pdfTextExtract';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';

/** Scan invoice text — proposal only; user must review and save */
export async function POST(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    let text = String(body.text || '').trim();
    const fileName = body.fileName ? String(body.fileName) : undefined;
    const attachmentUrl = body.attachmentUrl ? String(body.attachmentUrl) : undefined;

    if (!text && attachmentUrl?.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromAccountingPdfUrl(attachmentUrl);
    }

    if (!text && !fileName && !attachmentUrl) {
      return NextResponse.json({ error: 'Text, PDF attachment, or fileName required' }, { status: 400 });
    }

    const result = parseInvoiceFromText(text, fileName);
    if (!result) {
      return NextResponse.json(
        { error: 'Could not parse invoice — paste OCR text, upload PDF/image, or use a descriptive filename' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...result,
      attachmentUrl,
      extractedTextLength: text.length,
    });
  } catch (err) {
    console.error('AI scan-invoice:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
