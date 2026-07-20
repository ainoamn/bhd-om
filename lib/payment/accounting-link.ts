/**
 * ربط المدفوعات بالحسابات — Double Entry Bookkeeping
 * عند نجاح الدفع عبر أي بوابة، يُنشئ قيد محاسبي تلقائياً
 * ويُحدث حالة المبلغ المستحق
 */

import { prisma } from '@/lib/prisma';
import type { AccountingAccountType } from '@prisma/client';
import { PaymentProvider } from './manager';
import { syncPaymentToLegacyAccounting } from './legacy-accounting-sync';

/** أنواع الدفع المحاسبية */
export interface PaymentAccountingData {
  provider: PaymentProvider;
  sessionId: string;
  reference: string;
  amount: number;
  customerEmail: string;
  customerName?: string;
  description?: string;
  userId?: string;
  dueId?: string;
  contractId?: string;
  propertyId?: string;
  paidAt?: Date;
}

/** نتيجة تسجيل القيد */
export interface AccountingResult {
  success: boolean;
  journalEntryId?: string;
  serialNumber?: string;
  error?: string;
  duplicate?: boolean;
}

const DEFAULT_ACCOUNTS = {
  BANK_CASH: '1010',
  THAWANI_WALLET: '1021',
  STRIPE_WALLET: '1022',
  PAYPAL_WALLET: '1023',
  TELR_WALLET: '1024',
  OTHER_WALLET: '1025',
  RENT_REVENUE: '3010',
  BILL_REVENUE: '3020',
  DEPOSIT_REVENUE: '3030',
  MISC_REVENUE: '4010',
  TENANT_RECEIVABLES: '2010',
} as const;

function getWalletAccountCode(provider: PaymentProvider): string {
  const map: Partial<Record<PaymentProvider, string>> = {
    thawani: DEFAULT_ACCOUNTS.THAWANI_WALLET,
    stripe: DEFAULT_ACCOUNTS.STRIPE_WALLET,
    paypal: DEFAULT_ACCOUNTS.PAYPAL_WALLET,
    telr: DEFAULT_ACCOUNTS.TELR_WALLET,
  };
  return map[provider] || DEFAULT_ACCOUNTS.OTHER_WALLET;
}

async function getOrCreateAccount(
  code: string,
  nameAr: string,
  nameEn: string,
  type: AccountingAccountType
): Promise<string> {
  const existing = await prisma.accountingAccount.findUnique({ where: { code } });
  if (existing) return existing.id;

  const account = await prisma.accountingAccount.create({
    data: {
      code,
      nameAr,
      nameEn,
      type,
      isActive: true,
    },
  });

  return account.id;
}

/** التأكد من وجود الحسابات الأساسية */
export async function ensureAccountsExist(): Promise<void> {
  const accounts: Array<{
    code: string;
    nameAr: string;
    nameEn: string;
    type: AccountingAccountType;
  }> = [
    { code: DEFAULT_ACCOUNTS.BANK_CASH, nameAr: 'النقدية في البنك', nameEn: 'Bank Cash', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.THAWANI_WALLET, nameAr: 'محفظة ثواني', nameEn: 'Thawani Wallet', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.STRIPE_WALLET, nameAr: 'محفظة Stripe', nameEn: 'Stripe Wallet', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.PAYPAL_WALLET, nameAr: 'محفظة PayPal', nameEn: 'PayPal Wallet', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.TELR_WALLET, nameAr: 'محفظة Telr', nameEn: 'Telr Wallet', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.OTHER_WALLET, nameAr: 'محفظة إلكترونية أخرى', nameEn: 'Other E-Wallet', type: 'ASSET' },
    { code: DEFAULT_ACCOUNTS.RENT_REVENUE, nameAr: 'إيرادات الإيجار', nameEn: 'Rent Revenue', type: 'REVENUE' },
    { code: DEFAULT_ACCOUNTS.BILL_REVENUE, nameAr: 'إيرادات الفواتير', nameEn: 'Bill Revenue', type: 'REVENUE' },
    { code: DEFAULT_ACCOUNTS.DEPOSIT_REVENUE, nameAr: 'إيرادات التأمين', nameEn: 'Deposit Revenue', type: 'REVENUE' },
    { code: DEFAULT_ACCOUNTS.MISC_REVENUE, nameAr: 'إيرادات متنوعة', nameEn: 'Miscellaneous Revenue', type: 'REVENUE' },
    { code: DEFAULT_ACCOUNTS.TENANT_RECEIVABLES, nameAr: 'مستحقات المستأجرين', nameEn: 'Tenant Receivables', type: 'LIABILITY' },
  ];

  for (const acc of accounts) {
    await getOrCreateAccount(acc.code, acc.nameAr, acc.nameEn, acc.type);
  }
}

async function findExistingPaymentEntry(reference: string) {
  if (!reference) return null;
  return prisma.accountingJournalEntry.findFirst({
    where: {
      reference,
      serialNumber: { startsWith: 'PAY-' },
    },
    select: { id: true, serialNumber: true },
  });
}

/**
 * تسجيل مدفوعة في الحسابات — Double Entry
 */
export async function recordPayment(data: PaymentAccountingData): Promise<AccountingResult> {
  try {
    const existing = await findExistingPaymentEntry(data.reference);
    if (existing) {
      return {
        success: true,
        journalEntryId: existing.id,
        serialNumber: existing.serialNumber,
        duplicate: true,
      };
    }

    await ensureAccountsExist();

    const walletCode = getWalletAccountCode(data.provider);
    const walletAccount = await prisma.accountingAccount.findUnique({ where: { code: walletCode } });
    const revenueAccount = await prisma.accountingAccount.findUnique({
      where: { code: DEFAULT_ACCOUNTS.RENT_REVENUE },
    });

    if (!walletAccount || !revenueAccount) {
      return { success: false, error: 'الحسابات المحاسبية غير موجودة' };
    }

    const year = new Date().getFullYear();
    const count = await prisma.accountingJournalEntry.count({
      where: { createdAt: { gte: new Date(year, 0, 1) } },
    });
    const serialNumber = `PAY-${year}-${String(count + 1).padStart(5, '0')}`;
    const paidAt = data.paidAt || new Date();

    const journalEntry = await prisma.accountingJournalEntry.create({
      data: {
        serialNumber,
        date: paidAt,
        totalDebit: data.amount,
        totalCredit: data.amount,
        descriptionAr: `دفع إلكتروني — ${data.description || 'إيجار'} — عبر ${data.provider}`,
        descriptionEn: `Online payment — ${data.description || 'Rent'} — via ${data.provider}`,
        reference: data.reference,
        status: 'POSTED',
        postedBy: 'SYSTEM',
        postedAt: paidAt,
        createdBy: data.userId || 'SYSTEM',
        lines: {
          create: [
            {
              accountId: walletAccount.id,
              debit: data.amount,
              credit: 0,
              descriptionAr: `استلام مبلغ ${data.amount} ر.ع عبر ${data.provider} — ${data.reference}`,
              descriptionEn: `Received ${data.amount} OMR via ${data.provider} — ${data.reference}`,
            },
            {
              accountId: revenueAccount.id,
              debit: 0,
              credit: data.amount,
              descriptionAr: `إيراد إيجار — ${data.customerName || data.customerEmail}`,
              descriptionEn: `Rent revenue — ${data.customerName || data.customerEmail}`,
            },
          ],
        },
      },
    });

    if (data.dueId && data.dueId !== 'ALL') {
      await prisma.dueAmount.updateMany({
        where: { id: data.dueId },
        data: {
          status: 'PAID',
          paidAmount: data.amount,
          paidAt,
        },
      });
    }

    if (data.userId) {
      await prisma.tenantAlert.create({
        data: {
          userId: data.userId,
          type: 'SYSTEM',
          title: 'تم استلام الدفع',
          message: `تم استلام مبلغ ${data.amount} ر.ع عبر ${data.provider}. رقم القيد: ${serialNumber}`,
          priority: 'LOW',
          status: 'UNREAD',
        },
      });
    }

    await syncPaymentToLegacyAccounting({
      provider: data.provider,
      reference: data.reference,
      serialNumber,
      amount: data.amount,
      description: data.description,
      customerName: data.customerName || data.customerEmail,
      paidAt,
    });

    return {
      success: true,
      journalEntryId: journalEntry.id,
      serialNumber,
    };
  } catch (error) {
    console.error('[AccountingLink] Error recording payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** تسجيل استرداد (Refund) — عكس القيد */
export async function recordRefund(
  data: PaymentAccountingData & { originalJournalId?: string }
): Promise<AccountingResult> {
  try {
    const existing = await findExistingPaymentEntry(`REF-${data.reference}`);
    if (existing) {
      return {
        success: true,
        journalEntryId: existing.id,
        serialNumber: existing.serialNumber,
        duplicate: true,
      };
    }

    await ensureAccountsExist();

    const walletCode = getWalletAccountCode(data.provider);
    const walletAccount = await prisma.accountingAccount.findUnique({ where: { code: walletCode } });
    const revenueAccount = await prisma.accountingAccount.findUnique({
      where: { code: DEFAULT_ACCOUNTS.RENT_REVENUE },
    });

    if (!walletAccount || !revenueAccount) {
      return { success: false, error: 'الحسابات المحاسبية غير موجودة' };
    }

    const year = new Date().getFullYear();
    const count = await prisma.accountingJournalEntry.count({
      where: { createdAt: { gte: new Date(year, 0, 1) } },
    });
    const serialNumber = `REF-${year}-${String(count + 1).padStart(5, '0')}`;

    const journalEntry = await prisma.accountingJournalEntry.create({
      data: {
        serialNumber,
        date: new Date(),
        totalDebit: data.amount,
        totalCredit: data.amount,
        descriptionAr: `استرداد — ${data.description || 'إيجار'} — عبر ${data.provider}`,
        descriptionEn: `Refund — ${data.description || 'Rent'} — via ${data.provider}`,
        reference: `REF-${data.reference}`,
        status: 'POSTED',
        postedBy: 'SYSTEM',
        postedAt: new Date(),
        createdBy: data.userId || 'SYSTEM',
        lines: {
          create: [
            {
              accountId: revenueAccount.id,
              debit: data.amount,
              credit: 0,
              descriptionAr: `استرداد إيراد — ${data.reference}`,
              descriptionEn: `Revenue refund — ${data.reference}`,
            },
            {
              accountId: walletAccount.id,
              debit: 0,
              credit: data.amount,
              descriptionAr: `صرف استرداد ${data.amount} ر.ع عبر ${data.provider}`,
              descriptionEn: `Refund payout ${data.amount} OMR via ${data.provider}`,
            },
          ],
        },
      },
    });

    return {
      success: true,
      journalEntryId: journalEntry.id,
      serialNumber,
    };
  } catch (error) {
    console.error('[AccountingLink] Error recording refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** ملخص المدفوعات المحاسبية */
export async function getPaymentsSummary(days: number = 30): Promise<{
  totalCollected: number;
  totalRefunded: number;
  netRevenue: number;
  count: number;
  byProvider: Record<string, number>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await prisma.accountingJournalEntry.findMany({
    where: {
      createdAt: { gte: since },
      serialNumber: { startsWith: 'PAY-' },
    },
    select: {
      totalDebit: true,
      descriptionAr: true,
    },
  });

  let totalCollected = 0;
  const byProvider: Record<string, number> = {};

  for (const entry of entries) {
    const providerMatch = entry.descriptionAr?.match(/عبر (\S+)/);
    const provider = providerMatch ? providerMatch[1] : 'unknown';
    const amount = entry.totalDebit;
    totalCollected += amount;
    byProvider[provider] = (byProvider[provider] || 0) + amount;
  }

  const refundEntries = await prisma.accountingJournalEntry.findMany({
    where: {
      createdAt: { gte: since },
      serialNumber: { startsWith: 'REF-' },
    },
    select: { totalDebit: true },
  });

  const totalRefunded = refundEntries.reduce((sum, entry) => sum + entry.totalDebit, 0);

  return {
    totalCollected,
    totalRefunded,
    netRevenue: totalCollected - totalRefunded,
    count: entries.length,
    byProvider,
  };
}
