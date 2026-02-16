import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentsFromDb,
  createDocumentInDb,
  createJournalEntryInDb,
  updateDocumentInDb,
  getAccountsFromDb,
} from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

async function postDocumentToDb(doc: any) {
  const accounts = await getAccountsFromDb();
  const cashAcc = accounts.find((a: any) => a.code === '1000');
  const bankAcc = accounts.find((a: any) => a.code === '1100');
  const revenueAcc = accounts.find((a: any) => a.code === '4000');
  const vatAcc = accounts.find((a: any) => a.code === '2200');
  const expenseAcc = accounts.find((a: any) => a.code === '5000');
  const depositAcc = accounts.find((a: any) => a.code === '2100');

  const debitAcc = doc.bankAccountId ? bankAcc : cashAcc;
  const totalAmount = doc.totalAmount || doc.amount || 0;
  const amount = doc.amount || 0;
  const vatAmount = doc.vatAmount || 0;

  let lines: Array<{ accountId: string; debit: number; credit: number; descriptionAr?: string; descriptionEn?: string }> = [];

  const payableAcc = accounts.find((a: any) => a.code === '2000');

  if (doc.type === 'RECEIPT' || doc.type === 'INVOICE') {
    if (!debitAcc || !revenueAcc) throw new Error('دليل الحسابات غير مكتمل');
    lines = [
      { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: doc.descriptionAr || `إيصال ${doc.serialNumber}`, descriptionEn: doc.descriptionEn },
      { accountId: revenueAcc.id, debit: 0, credit: amount, descriptionAr: doc.descriptionAr, descriptionEn: doc.descriptionEn },
    ];
    if (vatAmount > 0 && vatAcc) {
      lines.push({ accountId: vatAcc.id, debit: 0, credit: vatAmount, descriptionAr: `ضريبة ${doc.serialNumber}`, descriptionEn: `VAT ${doc.serialNumber}` });
    }
  } else if (doc.type === 'PURCHASE_INV') {
    if (!payableAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
    const purchaseLines: typeof lines = [];
    if (doc.items?.length && doc.items.some((i: any) => i.accountId)) {
      let allocated = 0;
      for (const item of doc.items) {
        if (item.accountId && item.amount > 0) {
          purchaseLines.push({ accountId: item.accountId, debit: item.amount, credit: 0, descriptionAr: item.descriptionAr || doc.descriptionAr, descriptionEn: item.descriptionEn || doc.descriptionEn });
          allocated += item.amount;
        }
      }
      if (allocated < amount) {
        purchaseLines.push({ accountId: expenseAcc.id, debit: amount - allocated, credit: 0, descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`, descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}` });
      }
    } else {
      purchaseLines.push({ accountId: expenseAcc.id, debit: amount, credit: 0, descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`, descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}` });
    }
    if (vatAmount > 0 && vatAcc) {
      purchaseLines.push({ accountId: vatAcc.id, debit: vatAmount, credit: 0, descriptionAr: `ضريبة ${doc.serialNumber}`, descriptionEn: `VAT ${doc.serialNumber}` });
    }
    purchaseLines.push({ accountId: payableAcc.id, debit: 0, credit: totalAmount, descriptionAr: doc.descriptionAr || `فاتورة مشتريات ${doc.serialNumber}`, descriptionEn: doc.descriptionEn || `Purchase invoice ${doc.serialNumber}` });
    lines = purchaseLines;
  } else if (doc.type === 'PAYMENT') {
    if (!debitAcc || !expenseAcc) throw new Error('دليل الحسابات غير مكتمل');
    lines = [
      { accountId: expenseAcc.id, debit: totalAmount, credit: 0, descriptionAr: doc.descriptionAr, descriptionEn: doc.descriptionEn },
      { accountId: debitAcc.id, debit: 0, credit: totalAmount, descriptionAr: doc.descriptionAr, descriptionEn: doc.descriptionEn },
    ];
  } else if (doc.type === 'DEPOSIT') {
    if (!debitAcc || !depositAcc) throw new Error('دليل الحسابات غير مكتمل');
    lines = [
      { accountId: debitAcc.id, debit: totalAmount, credit: 0, descriptionAr: doc.descriptionAr, descriptionEn: doc.descriptionEn },
      { accountId: depositAcc.id, debit: 0, credit: totalAmount, descriptionAr: doc.descriptionAr, descriptionEn: doc.descriptionEn },
    ];
  }

  if (lines.length === 0) return null;
  const entry = await createJournalEntryInDb({
    date: doc.date,
    lines,
    descriptionAr: doc.descriptionAr || `${doc.type} ${doc.serialNumber}`,
    descriptionEn: doc.descriptionEn,
    documentType: doc.type,
    documentId: doc.id,
    contactId: doc.contactId,
    bankAccountId: doc.bankAccountId,
    propertyId: doc.propertyId,
    projectId: doc.projectId,
    status: 'APPROVED',
  });
  return entry;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const type = searchParams.get('type') || undefined;
    const docs = await getDocumentsFromDb({ fromDate, toDate, type });
    return NextResponse.json(docs);
  } catch (err) {
    console.error('Accounting documents GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const perm = requirePermission(request, 'DOCUMENT_CREATE');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const body = await request.json();
    const doc = await createDocumentInDb({
      type: body.type,
      status: body.status || 'APPROVED',
      date: body.date,
      serialNumber: body.serialNumber,
      dueDate: body.dueDate,
      contactId: body.contactId,
      bankAccountId: body.bankAccountId,
      propertyId: body.propertyId,
      projectId: body.projectId != null ? String(body.projectId) : undefined,
      amount: body.amount,
      currency: body.currency || 'OMR',
      vatRate: body.vatRate,
      vatAmount: body.vatAmount,
      totalAmount: body.totalAmount,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      items: body.items,
      attachments: body.attachments,
      purchaseOrder: body.purchaseOrder,
      reference: body.reference,
      branch: body.branch,
    });

    if (doc.status === 'APPROVED' || doc.status === 'PAID') {
      try {
        const entry = await postDocumentToDb(doc);
        if (entry) {
          await updateDocumentInDb(doc.id, { journalEntryId: entry.id });
          doc.journalEntryId = entry.id;
        }
      } catch (postErr) {
        console.error('Posting failed:', postErr);
        throw postErr;
      }
    }

    return NextResponse.json(doc);
  } catch (err) {
    console.error('Accounting documents POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create document' },
      { status: 400 }
    );
  }
}
