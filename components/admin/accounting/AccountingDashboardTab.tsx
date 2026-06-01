'use client';

import { useState } from 'react';
import Icon from '@/components/icons/Icon';
import AccountingQuickActions from '@/components/admin/accounting/AccountingQuickActions';
import {
  getAccountBalance,
  searchDocuments,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
} from '@/lib/data/accounting';
import {
  getBookingsPendingCancellation,
  getBookingDisplayName,
  mergeBookingsFromServer,
  confirmBookingReceiptByAccountant,
  getBookingsPendingAccountantConfirmation,
  completeCancellationByAccountant,
  type PropertyBooking,
} from '@/lib/data/bookings';
import { getDocumentUploadLink, getDocumentLinkMessage, openWhatsAppWithMessage, openEmailWithMessage } from '@/lib/documentUploadLink';
import type { ReportViewId } from '@/lib/accounting/ui/reportLabels';
import styles from '@/components/admin/accounting.module.css';

type TabId = 'dashboard' | 'sales' | 'purchases' | 'accounts' | 'journal' | 'documents' | 'reports' | 'claims' | 'cheques' | 'payments' | 'settings' | 'audit' | 'periods';

type DashboardStats = {
  totalEntries: number;
  totalDocuments: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
};

type Anomaly = {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  balance: number;
  message: string;
};

function BookingCancellationCompleteForm({ requestId, onComplete, ar }: { requestId: string; onComplete: () => void; ar: boolean }) {
  const [note, setNote] = useState('');
  const handleComplete = () => {
    const result = completeCancellationByAccountant(requestId, note.trim() || (ar ? 'تم استرداد/خصم المبلغ' : 'Amount refunded/deducted'));
    if (result) {
      setNote('');
      onComplete();
    }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={ar ? 'ملاحظة المحاسب (تُعرض في الحجز)' : 'Accountant note (shown on booking)'}
        className="admin-input flex-1 min-w-[180px] !py-2 !text-sm"
      />
      <button type="button" onClick={handleComplete} className="px-4 py-2 admin-btn-primary transition-colors shrink-0">
        {ar ? 'تمت العملية' : 'Done'}
      </button>
    </div>
  );
}

export default function AccountingDashboardTab(props: {
  ar: boolean;
  locale: string;
  mounted: boolean;
  useDb: boolean;
  documents: AccountingDocument[];
  journalEntries: JournalEntry[];
  accounts: ChartAccount[];
  accountsForReports: ChartAccount[];
  entriesForReports: JournalEntry[];
  dataMeta?: { documentsTruncated?: boolean; journalTruncated?: boolean; documentsTotal?: number; journalTotal?: number } | null;
  stats: DashboardStats;
  todayStats: { received: number; expenses: number };
  cashSnapshot: { balance: number };
  banksTotal: number;
  receivables: number;
  chequesReceivable: number;
  monthlyLabels: string[];
  monthlyRevenue: number[];
  monthlyExpense: number[];
  anomalies: Anomaly[];
  latestEntries: JournalEntry[];
  latestDocs: AccountingDocument[];
  pendingConfirmBookings: PropertyBooking[];
  setPendingConfirmBookings: React.Dispatch<React.SetStateAction<PropertyBooking[]>>;
  setTab: (tab: TabId, action?: string, report?: ReportViewId) => void;
  onNewInvoice: () => void;
  onNewReceipt: () => void;
  onNewExpense: () => void;
  onScanInvoice: () => void;
  setRangeThisMonth: () => void;
  setRangeLast30: () => void;
  setRangeYearToDate: () => void;
  onReceiptConfirmed: () => void;
  loadData: () => void;
}) {
  const {
    ar,
    locale,
    mounted,
    useDb,
    documents,
    journalEntries,
    accounts,
    accountsForReports,
    entriesForReports,
    dataMeta,
    stats,
    todayStats,
    cashSnapshot,
    banksTotal,
    receivables,
    chequesReceivable,
    monthlyLabels,
    monthlyRevenue,
    monthlyExpense,
    anomalies,
    latestEntries,
    latestDocs,
    pendingConfirmBookings,
    setPendingConfirmBookings,
    setTab,
    onNewInvoice,
    onNewReceipt,
    onNewExpense,
    onScanInvoice,
    setRangeThisMonth,
    setRangeLast30,
    setRangeYearToDate,
    onReceiptConfirmed,
    loadData,
  } = props;

  const acc4000 = accounts.find((a) => a.code === '4000');
  const acc4250 = accounts.find((a) => a.code === '4250');
  const bal4000 = acc4000 ? getAccountBalance(acc4000.id, undefined, entriesForReports, accountsForReports).balance : 0;
  const bal4250 = acc4250 ? getAccountBalance(acc4250.id, undefined, entriesForReports, accountsForReports).balance : 0;

  const pendingReceipts = useDb ? pendingConfirmBookings : getBookingsPendingAccountantConfirmation();
  const pendingCancellations = getBookingsPendingCancellation();

  return (
    <>
      {useDb && documents.length === 0 && journalEntries.length === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          {ar
            ? 'لا توجد حركات محاسبية بعد. يتم تشغيل المزامنة تلقائياً (دفعات الاشتراكات والحجوزات) عند فتح هذه الصفحة. إذا كان لديك دفعات سابقة، أعد تحميل الصفحة (F5) بعد ثوانٍ لرؤية الإيصالات.'
            : 'No accounting movements yet. Sync runs automatically (subscription and booking payments) when you open this page. If you have previous payments, reload the page (F5) after a few seconds to see receipts.'}
        </div>
      )}

      <div className={`space-y-6 transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <AccountingQuickActions
          ar={ar}
          todayReceived={todayStats.received}
          todayExpenses={todayStats.expenses}
          onNewInvoice={onNewInvoice}
          onNewReceipt={onNewReceipt}
          onNewExpense={onNewExpense}
          onScanInvoice={onScanInvoice}
          onViewReports={() => setTab('reports', undefined, 'income')}
        />
        {(dataMeta?.documentsTruncated || dataMeta?.journalTruncated) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {ar
              ? `عرض أحدث ${documents.length} مستند و${journalEntries.length} قيد — الإجمالي: ${dataMeta?.documentsTotal ?? documents.length} مستند، ${dataMeta?.journalTotal ?? journalEntries.length} قيد. استخدم الفلاتر أو التبويبات لتحميل المزيد.`
              : `Showing latest ${documents.length} documents and ${journalEntries.length} entries — totals: ${dataMeta?.documentsTotal ?? documents.length} docs, ${dataMeta?.journalTotal ?? journalEntries.length} entries. Use filters or tabs to load more.`}
          </p>
        )}
        <div className={styles.rangeBar}>
          <span className="text-xs font-semibold text-gray-700">{ar ? 'نطاق زمني' : 'Range'}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={setRangeThisMonth} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50">{ar ? 'هذا الشهر' : 'This Month'}</button>
            <button type="button" onClick={setRangeLast30} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50">{ar ? 'آخر 30 يوماً' : 'Last 30 Days'}</button>
            <button type="button" onClick={setRangeYearToDate} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50">{ar ? 'منذ بداية السنة' : 'Year to Date'}</button>
          </div>
        </div>
        <div className={styles.statGrid}>
          <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'إجمالي الأصول' : 'Total Assets'}</p>
            <p className={styles.statCardValue}>{stats.totalAssets.toLocaleString()} ر.ع</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'إجمالي الالتزامات' : 'Liabilities'}</p>
            <p className={styles.statCardValue}>{stats.totalLiabilities.toLocaleString()} ر.ع</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'balance')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'حقوق الملكية' : 'Equity'}</p>
            <p className={styles.statCardValue}>{stats.totalEquity.toLocaleString()} ر.ع</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'الإيرادات' : 'Revenue'}</p>
            <p className={`${styles.statCardValue} ${styles.statCardPositive}`}>{stats.totalRevenue.toLocaleString()} ر.ع</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'المصروفات' : 'Expenses'}</p>
            <p className={`${styles.statCardValue} ${styles.statCardNegative}`}>{stats.totalExpenses.toLocaleString()} ر.ع</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'income')} className={`${styles.statCard} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-start`}>
            <p className={styles.statCardLabel}>{ar ? 'صافي الدخل' : 'Net Income'}</p>
            <p className={`${styles.statCardValue} ${stats.netIncome >= 0 ? styles.statCardPositive : styles.statCardNegative}`}>{stats.netIncome.toLocaleString()} ر.ع</p>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'الصندوق' : 'Cash'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{cashSnapshot.balance.toLocaleString()} ر.ع</p>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'البنوك' : 'Banks'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{banksTotal.toLocaleString()} ر.ع</p>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'ذمم العملاء' : 'Receivables'}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{receivables.toLocaleString()} ر.ع</p>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'شيكات قيد التحصيل' : 'Cheques receivable'}</p>
            <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">{chequesReceivable.toLocaleString()} ر.ع</p>
          </div>
        </div>
        {accounts.length > 0 && (
          <div className="rounded-2xl admin-accent-border admin-accent-bg-soft p-5 shadow-sm">
            <p className="text-xs font-semibold admin-accent-text mb-3">{ar ? 'الحسابات الرئيسية للنظام' : 'Key system accounts'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">1000 — {ar ? 'الصندوق' : 'Cash'}</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{cashSnapshot.balance.toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">4000 — {ar ? 'إيرادات العقارات والإيجار' : 'Property & Rent Revenue'}</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{bal4000.toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">4250 — {ar ? 'إيرادات الاشتراكات (الباقات)' : 'Subscription Revenue'}</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{bal4250.toLocaleString()} ر.ع</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">{ar ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{(bal4000 + bal4250).toLocaleString()} ر.ع</p>
              </div>
            </div>
          </div>
        )}
        {(stats.totalRevenue > 0 || stats.totalExpenses > 0) && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-gray-700">{ar ? 'الإيرادات vs المصروفات' : 'Revenue vs Expenses'}</p>
            <div className="flex gap-8 items-end h-20">
              <div className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full max-w-32 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500 min-h-[8px]"
                  style={{ height: `${Math.max(8, (stats.totalRevenue / Math.max(stats.totalRevenue + stats.totalExpenses, 1)) * 72)}px` }}
                />
                <span className="text-sm font-bold text-emerald-700 tabular-nums">{stats.totalRevenue.toLocaleString()} ر.ع</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full max-w-32 rounded-t-lg bg-gradient-to-t from-red-500 to-red-400 transition-all duration-500 min-h-[8px]"
                  style={{ height: `${Math.max(8, (stats.totalExpenses / Math.max(stats.totalRevenue + stats.totalExpenses, 1)) * 72)}px` }}
                />
                <span className="text-sm font-bold text-red-700 tabular-nums">{stats.totalExpenses.toLocaleString()} ر.ع</span>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {ar ? 'إيرادات' : 'Revenue'}</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {ar ? 'مصروفات' : 'Expenses'}</span>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-gray-700">{ar ? 'اتجاهات الأشهر الأخيرة' : 'Recent monthly trends'}</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-2">{ar ? 'الإيرادات' : 'Revenue'}</p>
              <div className="flex items-end gap-2 h-16">
                {monthlyRevenue.map((v, i) => (
                  <div key={`rev-${i}`} className="w-6 rounded-t bg-emerald-400" style={{ height: `${Math.max(4, (v / Math.max(...monthlyRevenue.concat(1))) * 64)}px` }} title={`${monthlyLabels[i]}: ${v.toLocaleString()} ر.ع`} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                {monthlyLabels.map((l) => <span key={`rl-${l}`}>{l}</span>)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">{ar ? 'المصروفات' : 'Expenses'}</p>
              <div className="flex items-end gap-2 h-16">
                {monthlyExpense.map((v, i) => (
                  <div key={`exp-${i}`} className="w-6 rounded-t bg-red-400" style={{ height: `${Math.max(4, (v / Math.max(...monthlyExpense.concat(1))) * 64)}px` }} title={`${monthlyLabels[i]}: ${v.toLocaleString()} ر.ع`} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                {monthlyLabels.map((l) => <span key={`el-${l}`}>{l}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button type="button" onClick={() => setTab('journal')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'عدد القيود' : 'Journal Entries'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{stats.totalEntries}</p>
          </button>
          <button type="button" onClick={() => setTab('documents')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'المستندات' : 'Documents'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{stats.totalDocuments}</p>
          </button>
          <button type="button" onClick={() => setTab('accounts')} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'الحسابات' : 'Accounts'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{accounts.length}</p>
          </button>
          <button type="button" onClick={() => setTab('reports', undefined, 'bankStatement')} className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
            <p className="text-xs font-semibold text-emerald-700">{ar ? 'كشف الحساب البنكي' : 'Bank Statement'}</p>
            <p className="mt-1 text-sm font-medium text-emerald-800">{ar ? 'عرض الإيداعات والسحوبات' : 'View deposits & withdrawals'}</p>
          </button>
          <button type="button" onClick={() => setTab('cheques')} className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-start">
            <p className="text-xs font-semibold text-amber-700">{ar ? 'الشيكات' : 'Cheques'}</p>
            <p className="mt-1 text-2xl font-bold text-amber-800 tabular-nums">{documents.filter((d) => d.paymentMethod === 'CHEQUE').length}</p>
          </button>
          <div className="rounded-2xl admin-accent-border admin-accent-bg-soft p-5 shadow-sm">
            <p className="text-xs font-semibold admin-accent-text">{ar ? 'معايير محاسبية عالمية' : 'Global Standards'}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed admin-accent-text">{ar ? 'قيد مزدوج • ميزان مراجعة • قائمة دخل • ميزانية عمومية' : 'Double-entry • Trial Balance • P&L • Balance Sheet'}</p>
          </div>
        </div>
        {pendingReceipts.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
            <h5 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
              <span className="text-xl">⚠️</span>
              {ar ? 'تأكيد استلام مبالغ الحجز (الإيصال مُنشأ، غير مقيد)' : 'Confirm booking receipt (receipt created, unposted)'}
            </h5>
            <p className="text-sm text-amber-700 mb-4">
              {ar ? 'الإيصال مُنشأ تلقائياً عند الحجز. تحقّق من استلام المبلغ واضغط للتأكيد — ثم يظهر الحجز في الحجوزات لإدخال البيانات.' : 'Receipt was created at booking. Verify amount received and click to confirm — then the booking appears in Bookings for data entry.'}
            </p>
            <ul className="space-y-3">
              {pendingReceipts.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-200/80">
                  <div>
                    <p className="font-semibold text-gray-900">{getBookingDisplayName(b, locale)}</p>
                    <p className="text-sm text-gray-600">{b.propertyTitleAr || b.propertyTitleEn} • {(b.priceAtBooking ?? 0).toLocaleString()} ر.ع</p>
                    {b.paymentMethod && (
                      <p className="text-xs text-gray-500">
                        {b.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : b.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل' : 'Transfer') : (ar ? 'شيك' : 'Cheque')}
                        {b.paymentReferenceNo && ` • ${b.paymentReferenceNo}`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (useDb) {
                        try {
                          const res = await fetch(`/api/bookings/${encodeURIComponent(b.id)}/confirm-receipt`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
                          const body = await res.json().catch(() => ({}));
                          if (res.ok && body.booking) {
                            mergeBookingsFromServer([body.booking as PropertyBooking]);
                            setPendingConfirmBookings((prev) => prev.filter((x) => x.id !== b.id));
                            onReceiptConfirmed();
                            loadData();
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const link = getDocumentUploadLink(origin, locale, b.propertyId, b.id, b.email);
                            const msg = getDocumentLinkMessage(link, ar);
                            if (b.phone) openWhatsAppWithMessage(b.phone, msg);
                            if (b.email) openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link - Contract documentation', msg);
                          }
                        } catch {
                          // ignore
                        }
                      } else {
                        confirmBookingReceiptByAccountant(b.id);
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const link = getDocumentUploadLink(origin, locale, b.propertyId, b.id, b.email);
                        const msg = getDocumentLinkMessage(link, ar);
                        if (b.phone) openWhatsAppWithMessage(b.phone, msg);
                        if (b.email) openEmailWithMessage(b.email, ar ? 'رابط رفع المستندات - توثيق العقد' : 'Document upload link - Contract documentation', msg);
                        onReceiptConfirmed();
                        loadData();
                      }
                    }}
                    className="px-4 py-2 admin-btn-primary transition-colors shrink-0"
                  >
                    {ar ? 'تأكيد الاستلام وتقيد الطلب' : 'Confirm receipt & post'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pendingCancellations.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm">
            <h5 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
              <span className="text-xl">↩️</span>
              {ar ? 'طلبات إلغاء الحجوزات (استرداد/خصم)' : 'Booking cancellation requests (refund/deduction)'}
            </h5>
            <p className="text-sm text-red-700 mb-4">
              {ar ? '1) ألغِ الإيصال/السند المرتبط بالحجز إن وجد. 2) استرد أو اخصم المبلغ للعميل. 3) أدخل الملاحظة واضغط تمت العملية لإلغاء الحجز وإظهار الملاحظة في النظام.' : '1) Cancel the linked receipt/document if any. 2) Refund/deduct amount to customer. 3) Enter note and click Done to cancel booking and show note in system.'}
            </p>
            <ul className="space-y-4">
              {pendingCancellations.map(({ id, bookingId, amountToRefund, booking }) => {
                const linkedDocs = useDb
                  ? documents.filter((d) => String((d as AccountingDocument & { bookingId?: unknown }).bookingId || '') === String(bookingId))
                  : searchDocuments({ bookingId });
                return (
                  <li key={id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white rounded-xl border border-red-200/80">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{getBookingDisplayName(booking, locale)}</p>
                      <p className="text-sm text-gray-600">{booking.propertyTitleAr || booking.propertyTitleEn} • {amountToRefund.toLocaleString()} ر.ع {ar ? 'للاسترداد/الخصم' : 'to refund/deduct'}</p>
                      {booking.paymentMethod && (
                        <p className="text-xs text-gray-500">
                          {booking.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Cash') : booking.paymentMethod === 'BANK_TRANSFER' ? (ar ? 'تحويل' : 'Transfer') : (ar ? 'شيك' : 'Cheque')}
                          {booking.paymentReferenceNo && ` • ${booking.paymentReferenceNo}`}
                        </p>
                      )}
                      {linkedDocs.filter((d) => d.status !== 'CANCELLED').length > 0 && (
                        <p className="text-xs text-amber-700 mt-1">
                          {ar ? 'إلغِ الإيصال أولاً:' : 'Cancel receipt first:'}{' '}
                          <button type="button" onClick={() => setTab('documents')} className="underline font-medium">
                            {linkedDocs.filter((d) => d.status !== 'CANCELLED').map((d) => d.serialNumber).join(', ')}
                          </button>
                        </p>
                      )}
                    </div>
                    <BookingCancellationCompleteForm
                      requestId={id}
                      onComplete={() => {
                        onReceiptConfirmed();
                        loadData();
                      }}
                      ar={ar}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {anomalies.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm">
            <h5 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
              <Icon name="sparkles" className="h-5 w-5" />
              {ar ? 'تنبيهات الذكاء الاصطناعي' : 'AI Alerts'}
            </h5>
            <ul className="space-y-2 text-sm text-red-700">
              {anomalies.map((a) => (
                <li key={a.accountId} className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span><strong>{a.accountCode}</strong> — {a.accountNameAr}: {a.message} ({a.balance.toLocaleString()} ر.ع)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'أحدث القيود' : 'Latest entries'}</p>
            <ul className="mt-3 space-y-2">
              {latestEntries.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{e.serialNumber}</span>
                  <span className="text-gray-600">{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr || '—'}</span>
                  <span className="text-gray-500">{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{ar ? 'أحدث المستندات' : 'Latest documents'}</p>
            <ul className="mt-3 space-y-2">
              {latestDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{d.serialNumber}</span>
                  <span className="text-gray-600">{ar ? d.descriptionAr : d.descriptionEn || d.descriptionAr || '—'}</span>
                  <span className="text-gray-500">{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 shadow-sm">
          <p className="flex items-start gap-3 text-sm leading-relaxed text-amber-900">
            <Icon name="information" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <span>{ar ? 'النظام مرتبط بـ: دفتر العناوين، التفاصيل البنكية، العقارات، المشاريع. قيد مزدوج • ميزان مراجعة • قائمة دخل • ميزانية عمومية • اقتراح ذكي للحسابات.' : 'System linked to: Address Book, Bank Details, Properties, Projects. Double-entry • Trial Balance • P&L • Balance Sheet • AI account suggestions.'}</span>
          </p>
        </div>
      </div>
    </>
  );
}
