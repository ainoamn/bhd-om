'use client';

import Icon from '@/components/icons/Icon';
import styles from '../accounting.module.css';

export type AccountingQuickActionsProps = {
  ar: boolean;
  todayReceived: number;
  todayExpenses: number;
  onNewInvoice: () => void;
  onNewReceipt: () => void;
  onNewExpense: () => void;
  onScanInvoice: () => void;
  onViewReports: () => void;
};

export default function AccountingQuickActions({
  ar,
  todayReceived,
  todayExpenses,
  onNewInvoice,
  onNewReceipt,
  onNewExpense,
  onScanInvoice,
  onViewReports,
}: AccountingQuickActionsProps) {
  return (
    <section className={styles.quickActions} aria-label={ar ? 'إجراءات سريعة' : 'Quick actions'}>
      <div className={styles.quickActionsHeader}>
        <div>
          <h2 className={styles.quickActionsTitle}>
            {ar ? 'ابدأ في ثوانٍ' : 'Start in seconds'}
          </h2>
          <p className={styles.quickActionsSubtitle}>
            {ar
              ? 'فاتورة · إيصال · مصروف — بدون مصطلحات معقدة'
              : 'Invoice · receipt · expense — no accounting jargon'}
          </p>
        </div>
        <div className={styles.quickTodayStats}>
          <div className={styles.quickTodayStat}>
            <span className={styles.quickTodayLabel}>{ar ? 'استلمنا اليوم' : 'Received today'}</span>
            <span className={`${styles.quickTodayValue} ${styles.quickTodayPositive}`}>
              {todayReceived.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}
            </span>
          </div>
          <div className={styles.quickTodayStat}>
            <span className={styles.quickTodayLabel}>{ar ? 'مصروف اليوم' : 'Spent today'}</span>
            <span className={`${styles.quickTodayValue} ${styles.quickTodayNegative}`}>
              {todayExpenses.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.quickActionsGrid}>
        <button type="button" onClick={onNewInvoice} className={styles.quickActionCard}>
          <span className={styles.quickActionIcon} aria-hidden>
            <Icon name="archive" className="w-6 h-6" />
          </span>
          <span className={styles.quickActionLabel}>{ar ? 'فاتورة بيع' : 'Sales invoice'}</span>
          <span className={styles.quickActionHint}>{ar ? 'إرسال للعميل' : 'Send to customer'}</span>
        </button>
        <button type="button" onClick={onNewReceipt} className={styles.quickActionCard}>
          <span className={styles.quickActionIcon} aria-hidden>
            <Icon name="plus" className="w-6 h-6" />
          </span>
          <span className={styles.quickActionLabel}>{ar ? 'إيصال / تحصيل' : 'Receipt / collection'}</span>
          <span className={styles.quickActionHint}>{ar ? 'نقد أو بنك' : 'Cash or bank'}</span>
        </button>
        <button type="button" onClick={onNewExpense} className={styles.quickActionCard}>
          <span className={styles.quickActionIcon} aria-hidden>
            <Icon name="documentText" className="w-6 h-6" />
          </span>
          <span className={styles.quickActionLabel}>{ar ? 'مصروف' : 'Expense'}</span>
          <span className={styles.quickActionHint}>{ar ? 'دفعة أو مشتريات' : 'Payment or purchase'}</span>
        </button>
        <button type="button" onClick={onScanInvoice} className={`${styles.quickActionCard} ${styles.quickActionCardMuted}`}>
          <span className={styles.quickActionIcon} aria-hidden>
            <Icon name="sparkles" className="w-6 h-6" />
          </span>
          <span className={styles.quickActionLabel}>{ar ? 'مسح فاتورة' : 'Scan invoice'}</span>
          <span className={styles.quickActionHint}>{ar ? 'AI — مراجعة قبل الحفظ' : 'AI — review before save'}</span>
        </button>
        <button type="button" onClick={onViewReports} className={`${styles.quickActionCard} ${styles.quickActionCardMuted}`}>
          <span className={styles.quickActionIcon} aria-hidden>
            <Icon name="chartBar" className="w-6 h-6" />
          </span>
          <span className={styles.quickActionLabel}>{ar ? 'التقارير' : 'Reports'}</span>
          <span className={styles.quickActionHint}>{ar ? '30+ تحليل مالي' : 'Financial analysis'}</span>
        </button>
      </div>
    </section>
  );
}
