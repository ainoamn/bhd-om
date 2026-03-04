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
    const totalAmount = updatedDoc.totalAmount || updatedDoc.amount || 0;
    const amount = updatedDoc.amount || 0;
    const vatAmount = updatedDoc.vatAmount || 0;

    let lines: Array<{ accountId: string; debit: number; credit: number; descriptionAr?: string; descriptionEn?: string }> = [];

    if (updatedDoc.type === 'RECEIPT' || updatedDoc.type === 'INVOICE') {
      if (!debitAcc || !revenueAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: updatedDoc.descriptionAr || `ترحيل ${updatedDoc.serialNumber}`, descriptionEn: updatedDoc.descriptionEn },
        { accountId: revenueAcc.id, debit: 0, credit: amount, descriptionAr: updatedDoc.descriptionAr, descriptionEn: updatedDoc.descriptionEn },
      ];
      if (vatAmount > 0 && vatAcc) {
        lines.push({ accountId: vatAcc.id, debit: 0, credit: vatAmount, descriptionAr: `ضريبة ${updatedDoc.serialNumber}`, descriptionEn: `VAT ${updatedDoc.serialNumber}` });
      }
    } else if (updatedDoc.type === 'PURCHASE_INV') {
      if (!payableAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
      const purchaseLines: typeof lines = [];
      // توزيع البنود إن وجدت
      if (updatedDoc.items?.length && updatedDoc.items.some((i: any) => i.accountId)) {
        let allocated = 0;
        for (const item of updatedDoc.items) {
          if (item.accountId && item.amount > 0) {
            purchaseLines.push({ accountId: item.accountId, debit: item.amount, credit: 0, descriptionAr: item.descriptionAr || updatedDoc.descriptionAr, descriptionEn: item.descriptionEn || updatedDoc.descriptionEn });
            allocated += item.amount;
          }
        }
        if (allocated < amount) {
          purchaseLines.push({ accountId: expenseAcc.id, debit: amount - allocated, credit: 0, descriptionAr: updatedDoc.descriptionAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: updatedDoc.descriptionEn || `Purchase invoice ${updatedDoc.serialNumber}` });
        }
      } else {
        purchaseLines.push({ accountId: expenseAcc.id, debit: amount, credit: 0, descriptionAr: updatedDoc.descriptionAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: updatedDoc.descriptionEn || `Purchase invoice ${updatedDoc.serialNumber}` });
      }
      if (vatAmount > 0 && vatAcc) {
        purchaseLines.push({ accountId: vatAcc.id, debit: vatAmount, credit: 0, descriptionAr: `ضريبة ${updatedDoc.serialNumber}`, descriptionEn: `VAT ${updatedDoc.serialNumber}` });
      }
      purchaseLines.push({ accountId: payableAcc.id, debit: 0, credit: totalAmount, descriptionAr: updatedDoc.descriptionAr || `فاتورة مشتريات ${updatedDoc.serialNumber}`, descriptionEn: updatedDoc.descriptionEn || `Purchase invoice ${updatedDoc.serialNumber}` });
      lines = purchaseLines;
    } else if (updatedDoc.type === 'PAYMENT') {
      if (!debitAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: expenseAcc.id, debit: totalAmount, credit: 0, descriptionAr: updatedDoc.descriptionAr, descriptionEn: updatedDoc.descriptionEn },
        { accountId: debitAcc.id, debit: 0, credit: totalAmount, descriptionAr: updatedDoc.descriptionAr, descriptionEn: updatedDoc.descriptionEn },
      ];
    } else if (updatedDoc.type === 'DEPOSIT') {
      if (!debitAcc || !depositAcc) throw new Error('دليل الحسابات غير مكتمل');
      lines = [
        { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: updatedDoc.descriptionAr, descriptionEn: updatedDoc.descriptionEn },
        { accountId: depositAcc.id, debit: 0, credit: totalAmount, descriptionAr: updatedDoc.descriptionAr, descriptionEn: updatedDoc.descriptionEn },
      ];
    }

    if (lines.length > 0) {
      const entry = await createJournalEntryInDb({
        date: updatedDoc.date,
        lines,
        descriptionAr: updatedDoc.descriptionAr || `${updatedDoc.type} ${updatedDoc.serialNumber}`,
        descriptionEn: updatedDoc.descriptionEn,
        documentType: updatedDoc.type,
        documentId: updatedDoc.id,
        contactId: updatedDoc.contactId,
        bankAccountId: updatedDoc.bankAccountId,
        propertyId: updatedDoc.propertyId,
        projectId: updatedDoc.projectId,
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
