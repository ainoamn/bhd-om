'use client';

import { useState } from 'react';

type ReconResult = {
  bookBalance: number;
  statementBalance: number;
  difference: number;
  matched: Array<{ bookLineId: string; statementLineId: string; amount: number }>;
  unmatchedBook: Array<{ id: string; date: string; description: string; debit: number; credit: number }>;
  unmatchedStatement: Array<{ id: string; date: string; amount: number; reference?: string }>;
};

export default function AccountingReconciliationPanel(props: { ar: boolean }) {
  const { ar } = props;
  const [mode, setMode] = useState<'CASH' | 'BANK'>('BANK');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState('');
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookPreview, setBookPreview] = useState<{ bookBalance: number; lines: unknown[] } | null>(null);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [error, setError] = useState('');

  const loadBook = async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({ mode });
      if (fromDate) sp.set('fromDate', fromDate);
      if (toDate) sp.set('toDate', toDate);
      const res = await fetch(`/api/accounting/bank-reconciliation?${sp}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBookPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setBookPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const runReconcile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/accounting/bank-reconciliation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          statementBalance: statementBalance ? Number(statementBalance) : undefined,
          statementCsv: csv.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setResult(data);
      setBookPreview({ bookBalance: data.bookBalance, lines: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        {ar
          ? 'طابق كشف البنك مع دفتر النظام — الصيغة: date,amount,reference,description'
          : 'Match bank statement with book ledger — CSV format: date,amount,reference,description'}
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{ar ? 'الحساب' : 'Account'}</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'CASH' | 'BANK')} className="admin-select">
            <option value="BANK">{ar ? 'البنوك (1100)' : 'Banks (1100)'}</option>
            <option value="CASH">{ar ? 'الصندوق (1000)' : 'Cash (1000)'}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{ar ? 'من' : 'From'}</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="admin-input" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{ar ? 'إلى' : 'To'}</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="admin-input" />
        </div>
        <button type="button" onClick={loadBook} disabled={loading} className="admin-btn-secondary text-sm !py-2">
          {ar ? 'تحميل الدفتر' : 'Load book'}
        </button>
      </div>
      {bookPreview && (
        <div className="rounded-xl border p-4 bg-emerald-50/50">
          <p className="text-sm text-gray-600">{ar ? 'رصيد الدفتر' : 'Book balance'}</p>
          <p className="text-2xl font-bold text-emerald-800">{bookPreview.bookBalance.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">{ar ? 'رصيد الكشف (البنك)' : 'Statement balance'}</label>
          <input
            type="number"
            step="0.001"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
            className="admin-input w-full"
            placeholder="0.000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">{ar ? 'أو الصق CSV' : 'Or paste CSV'}</label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="admin-input w-full min-h-[80px] font-mono text-xs"
            placeholder="date,amount,reference,description"
          />
        </div>
      </div>
      <button type="button" onClick={runReconcile} disabled={loading} className="admin-btn-primary text-sm !py-2">
        {loading ? (ar ? 'جاري المطابقة...' : 'Matching...') : (ar ? 'مطابقة' : 'Reconcile')}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">{ar ? 'الدفتر' : 'Book'}</p>
              <p className="font-bold">{result.bookBalance.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">{ar ? 'الكشف' : 'Statement'}</p>
              <p className="font-bold">{result.statementBalance.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg border p-3 ${Math.abs(result.difference) < 0.02 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <p className="text-xs text-gray-500">{ar ? 'الفرق' : 'Difference'}</p>
              <p className="font-bold">{result.difference.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm">
            {ar ? 'مطابق' : 'Matched'}: {result.matched.length} · {ar ? 'غير مطابق (دفتر)' : 'Unmatched book'}: {result.unmatchedBook.length} · {ar ? 'غير مطابق (كشف)' : 'Unmatched statement'}: {result.unmatchedStatement.length}
          </p>
          {result.unmatchedBook.length > 0 && (
            <div>
              <h5 className="font-semibold mb-2">{ar ? 'حركات الدفتر غير المطابقة' : 'Unmatched book lines'}</h5>
              <table className="admin-table w-full text-sm">
                <thead>
                  <tr>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'الوصف' : 'Description'}</th>
                    <th>{ar ? 'مدين' : 'Debit'}</th>
                    <th>{ar ? 'دائن' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.unmatchedBook.slice(0, 20).map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.description}</td>
                      <td>{row.debit > 0 ? row.debit.toLocaleString() : '—'}</td>
                      <td>{row.credit > 0 ? row.credit.toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
