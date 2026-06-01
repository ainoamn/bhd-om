import type { AccountingDocument } from '@/lib/data/accounting';
import type { BankAccount } from '@/lib/data/bankAccounts';
import { getBankAccountDisplay } from '@/lib/data/bankAccounts';

/** «من حساب» في عرض المدفوعات/الإيصالات */
export function resolvePaymentFromAccount(d: AccountingDocument, ar: boolean, bankAccounts: BankAccount[]): string {
  const method = d.paymentMethod || (d.bankAccountId ? 'BANK_TRANSFER' : 'CASH');
  if (d.type !== 'RECEIPT') {
    return ar ? 'مصروفات التشغيل' : 'Operating expenses';
  }
  if (method === 'CHEQUE') return ar ? 'شيكات تحت التحصيل' : 'Cheques receivable';
  if (method === 'BANK_TRANSFER') {
    const b = bankAccounts.find((x) => x.id === d.bankAccountId);
    return b ? getBankAccountDisplay(b) : ar ? 'البنوك' : 'Banks';
  }
  return ar ? 'الصندوق' : 'Cash';
}

/** «إلى حساب» في عرض المدفوعات/الإيصالات */
export function resolvePaymentToAccount(d: AccountingDocument, ar: boolean, bankAccounts: BankAccount[]): string {
  if (d.type === 'RECEIPT') return ar ? 'إيرادات الإيجار' : 'Rent revenue';
  if (d.bankAccountId) {
    const b = bankAccounts.find((x) => x.id === d.bankAccountId);
    return b ? getBankAccountDisplay(b) : ar ? 'البنوك' : 'Banks';
  }
  return ar ? 'الصندوق' : 'Cash';
}
