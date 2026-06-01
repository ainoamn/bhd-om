'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import {
  getAccountById,
  getAccountBalance,
  getAccountLedgerWithBalance,
  type ChartAccount,
  type JournalEntry,
  type AccountType,
} from '@/lib/data/accounting';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER } from '@/lib/accounting/ui/accountTypeLabels';
import styles from '@/components/admin/accounting.module.css';

export default function AccountingAccountsTab(props: {
  ar: boolean;
  accounts: ChartAccount[];
  journalEntries: JournalEntry[];
  filterFromDate: string;
  filterToDate: string;
  onAddAccount: () => void;
}) {
  const { ar, accounts, journalEntries, filterFromDate, filterToDate, onAddAccount } = props;

  const [sortAccounts, setSortAccounts] = useState<SortOption>('number');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const sortedAccounts = useMemo(() => {
    const list = [...accounts];
    list.sort((a, b) => {
      switch (sortAccounts) {
        case 'dateDesc':
        case 'dateAsc':
          return 0;
        case 'number':
          return (a.code || '').localeCompare(b.code || '');
        case 'property':
          return (a.nameAr || '').localeCompare(b.nameAr || '');
        case 'alphabetical':
          return (a.nameAr || a.nameEn || '').localeCompare(b.nameAr || b.nameEn || '');
        default:
          return 0;
      }
    });
    return list;
  }, [accounts, sortAccounts]);

  const accountsByType = useMemo(() => {
    const map = new Map<AccountType, typeof sortedAccounts>();
    for (const t of ACCOUNT_TYPE_ORDER) map.set(t, []);
    for (const a of sortedAccounts) {
      const list = map.get(a.type as AccountType);
      if (list) list.push(a);
    }
    return ACCOUNT_TYPE_ORDER.map((t) => ({ type: t, accounts: map.get(t) || [] }));
  }, [sortedAccounts]);

  const ledgerWithBalance = selectedAccountId
    ? getAccountLedgerWithBalance(
        selectedAccountId,
        filterFromDate || undefined,
        filterToDate || undefined,
        journalEntries,
        accounts
      )
    : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm" data-testid="accounting-tab-accounts">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
        <h4 className="flex items-center gap-2 font-bold text-gray-900">
          <Icon name="archive" className="h-5 w-5 admin-accent-text" />
          {ar ? 'دليل الحسابات' : 'Chart of Accounts'}
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <SortSelect value={sortAccounts} onChange={setSortAccounts} ar={ar} />
          <button type="button" className={styles.btnPrimary} onClick={onAddAccount}>
            <Icon name="plus" className="h-4 w-4" />
            {ar ? 'إضافة حساب' : 'Add account'}
          </button>
          <select
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value || null)}
            className="admin-input !py-2.5 !text-sm !w-auto"
          >
            <option value="">{ar ? '— عرض كشف حساب —' : '— View ledger —'}</option>
            {sortedAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedAccountId ? (
        <div className="p-6">
          <h5 className="font-semibold text-gray-900 mb-4">
            {(() => {
              const acc = getAccountById(selectedAccountId);
              return acc ? `${acc.code} - ${ar ? acc.nameAr : acc.nameEn || acc.nameAr}` : '';
            })()}
          </h5>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{ar ? 'التاريخ' : 'Date'}</th>
                  <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                  <th>{ar ? 'الوصف' : 'Description'}</th>
                  <th>{ar ? 'مدين' : 'Debit'}</th>
                  <th>{ar ? 'دائن' : 'Credit'}</th>
                  <th>{ar ? 'الرصيد الجاري' : 'Running Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {ledgerWithBalance.map(({ entry, debit, credit, runningBalance }, i) => (
                  <tr key={`${entry.id}-${i}`}>
                    <td>{new Date(entry.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td className="font-mono text-sm">{entry.serialNumber}</td>
                    <td>{ar ? entry.descriptionAr : entry.descriptionEn || entry.descriptionAr || '—'}</td>
                    <td>{debit > 0 ? debit.toLocaleString() : '—'}</td>
                    <td>{credit > 0 ? credit.toLocaleString() : '—'}</td>
                    <td className="font-semibold">{runningBalance.toLocaleString()} ر.ع</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledgerWithBalance.length === 0 && (
            <p className="text-center text-gray-500 py-8">{ar ? 'لا توجد حركات' : 'No transactions'}</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {accountsByType.map(({ type, accounts: typeAccounts }) => {
            if (typeAccounts.length === 0) return null;
            const typeLabel = ar ? ACCOUNT_TYPE_LABELS[type].ar : ACCOUNT_TYPE_LABELS[type].en;
            const typeTotal = typeAccounts.reduce((sum, a) => {
              const bal = getAccountBalance(a.id, undefined, journalEntries, accounts);
              return sum + bal.balance;
            }, 0);
            return (
              <div key={type} className="border-b border-gray-100 last:border-b-0">
                <div className="px-6 py-3 bg-gray-50/80 flex justify-between items-center">
                  <h5 className="font-semibold text-gray-800">{typeLabel}</h5>
                  <span className="text-sm font-bold tabular-nums text-gray-700">{typeTotal.toLocaleString()} ر.ع</span>
                </div>
                <table className="admin-table w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">{ar ? 'الرمز' : 'Code'}</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">{ar ? 'اسم الحساب' : 'Account'}</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">{ar ? 'الرصيد' : 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeAccounts.map((a) => {
                      const bal = getAccountBalance(a.id, undefined, journalEntries, accounts);
                      return (
                        <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-mono text-sm text-gray-800">{a.code}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{ar ? a.nameAr : a.nameEn || a.nameAr}</td>
                          <td className={`py-3 px-4 text-right font-semibold tabular-nums ${bal.balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{bal.balance.toLocaleString()} ر.ع</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
