import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import {
  getAccountsFromDb,
  getDocumentByIdFromDb,
  updateDocumentStatusInDb,
  createJournalEntryInDb,
  updateDocumentInDb,
} from '@/lib/accounting/data/dbService';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission(_req, 'JOURNAL_APPROVE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    const doc = await getDocumentByIdFromDb(id);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // إذا كان معتمد مسبقاً، أرجعه كما هو
    if (doc.status === 'APPROVED' || doc.status === 'PAID') {
      return NextResponse.json(doc);
    }

    const updatedDoc = await updateDocumentStatusInDb(id, 'APPROVED');

    // إنشاء الترحيل المحاسبي
    const accounts = await getAccountsFromDb();
    const cashAcc = accounts.find((a: any) => a.code === '1000');
    const bankAcc = accounts.find((a: any) => a.code === '1100');
    const revenueAcc = accounts.find((a: any) => a.type === 'REVENUE'); // افتراضي: أول إيراد
    const vatAcc = accounts.find((a: any) => a.code === '2200');
    const expenseAcc = accounts.find((a: any) => a.type === 'EXPENSE'); // افتراضي: أول مصروف
    const depositAcc = accounts.find((a: any) => a.code === '2100');
    const payableAcc = accounts.find((a: any) => a.code === '2000');

    const debitAcc = updatedDoc.bankAccountId ? bankAcc : cashAcc;
    const totalAmount = updatedDoc.totalAmount ?? updatedDoc.netAmount ?? 0;
    const amount = updatedDoc.netAmount ?? updatedDoc.totalAmount ?? 0;
    const vatAmount = updatedDoc.vatAmount ?? 0;

    const descAr = updatedDoc.descriptionAr ?? undefined;
    const descEn = updatedDoc.descriptionEn ?? undefined;
    let lines: Array<{ accountId: string; debit: number; credit: number; descriptionAr?: string; descriptionEn?: string }> = [];

    if (updatedDoc.type === 'RECEIPT' || updatedDoc.type === 'INVOICE') {
      if (!debitAcc || !revenueAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: descAr || `ترحيل ${updatedDoc.serialNumber}`, descriptionEn: descEn },
        { accountId: revenueAcc.id, debit: 0, credit: amount, descriptionAr: descAr, descriptionEn: descEn },
      ];
      if (vatAmount > 0 && vatAcc) {
        lines.push({ accountId: vatAcc.id, debit: 0, credit: vatAmount, descriptionAr: `ضريبة ${updatedDoc.serialNumber}`, descriptionEn: `VAT ${updatedDoc.serialNumber}` });
      }
    } else if (updatedDoc.type === 'PURCHASE_INV') {
      if (!payableAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
      const purchaseLines: typeof lines = [];
      const items = (updatedDoc as { items?: Array<{ accountId?: string; amount?: number; descriptionAr?: string; descriptionEn?: string }> }).items;
      if (items?.length && items.some((i) => i.accountId)) {
        let allocated = 0;
        for (const item of items) {
          if (item.accountId && (item.amount ?? 0) > 0) {
            purchaseLines.push({ accountId: item.accountId, debit: item.amount ?? 0, credit: 0, descriptionAr: item.descriptionAr ?? descAr, descriptionEn: item.descriptionEn ?? descEn });
            allocated += item.amount ?? 0;
          }
        }
        if (allocated < amount) {
          purchaseLines.push({ accountId: expenseAcc.id, debit: amount - allocated, credit: 0, descriptionAr: descAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: descEn || `Purchase invoice ${updatedDoc.serialNumber}` });
        }
      } else {
        purchaseLines.push({ accountId: expenseAcc.id, debit: amount, credit: 0, descriptionAr: descAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: descEn || `Purchase invoice ${updatedDoc.serialNumber}` });
      }
      if (vatAmount > 0 && vatAcc) {
        purchaseLines.push({ accountId: vatAcc.id, debit: vatAmount, credit: 0, descriptionAr: `ضريبة ${updatedDoc.serialNumber}`, descriptionEn: `VAT ${updatedDoc.serialNumber}` });
      }
      purchaseLines.push({ accountId: payableAcc.id, debit: 0, credit: totalAmount, descriptionAr: descAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: descEn || `Purchase invoice ${updatedDoc.serialNumber}` });
      lines = purchaseLines;
    } else if (updatedDoc.type === 'PAYMENT') {
      if (!debitAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: expenseAcc.id, debit: totalAmount, credit: 0, descriptionAr: descAr, descriptionEn: descEn },
        { accountId: debitAcc.id, debit: 0, credit: totalAmount, descriptionAr: descAr, descriptionEn: descEn },
      ];
    } else if (updatedDoc.type === 'DEPOSIT') {
      if (!debitAcc || !depositAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: descAr, descriptionEn: descEn },
        { accountId: depositAcc.id, debit: 0, credit: totalAmount, descriptionAr: descAr, descriptionEn: descEn },
      ];
    }

    if (lines.length > 0) {
      const entry = await createJournalEntryInDb({
        date: updatedDoc.date,
        lines,
        descriptionAr: descAr || `${updatedDoc.type} ${updatedDoc.serialNumber}`,
        descriptionEn: descEn,
        documentType: updatedDoc.type,
        documentId: updatedDoc.id,
        contactId: updatedDoc.contactId ?? undefined,
        bankAccountId: updatedDoc.bankAccountId ?? undefined,
        propertyId: updatedDoc.propertyId ?? undefined,
        projectId: updatedDoc.projectId ?? undefined,
        status: 'APPROVED',
      });
      await updateDocumentInDb(updatedDoc.id, { journalEntryId: entry.id });
      return NextResponse.json({ ...updatedDoc, journalEntryId: entry.id });
    }

    return NextResponse.json(updatedDoc);
  } catch (err) {
    console.error('Document approve error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to approve document' },
      { status: 400 }
    );
  }
}
