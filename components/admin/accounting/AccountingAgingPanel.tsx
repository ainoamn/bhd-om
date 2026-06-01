'use client';

type AgingBucket = { bucket: string; bucketAr: string; amount: number; count: number };

type AgingReport = {
  ledger: 'ar' | 'ap';
  asOfDate: string;
  totalOutstanding: number;
  buckets: AgingBucket[];
  lines: Array<{
    serialNumber: string;
    contactName?: string;
    dueDate: string;
    amount: number;
    daysOverdue: number;
    bucket: string;
  }>;
};

export default function AccountingAgingPanel(props: {
  ar: boolean;
  ledger: 'ar' | 'ap';
  onLedgerChange: (l: 'ar' | 'ap') => void;
  loading: boolean;
  data: AgingReport | null;
}) {
  const { ar, ledger, onLedgerChange, loading, data } = props;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onLedgerChange('ar')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${ledger === 'ar' ? 'admin-btn-primary !py-2' : 'admin-btn-secondary !py-2'}`}
        >
          {ar ? 'ذمم العملاء (AR)' : 'Accounts Receivable'}
        </button>
        <button
          type="button"
          onClick={() => onLedgerChange('ap')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${ledger === 'ap' ? 'admin-btn-primary !py-2' : 'admin-btn-secondary !py-2'}`}
        >
          {ar ? 'ذمم الموردين (AP)' : 'Accounts Payable'}
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
      ) : !data ? (
        <p className="text-gray-500">{ar ? 'لا توجد بيانات' : 'No data'}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.buckets.map((b) => (
              <div key={b.bucket} className="rounded-xl border p-3 bg-gray-50/80">
                <p className="text-xs text-gray-600">{ar ? b.bucketAr : b.bucket}</p>
                <p className="text-lg font-bold tabular-nums">{b.amount.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}</p>
                <p className="text-xs text-gray-500">{b.count} {ar ? 'فاتورة' : 'items'}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold">
            {ar ? 'إجمالي المستحق' : 'Total outstanding'}: {data.totalOutstanding.toLocaleString()} {ar ? 'ر.ع' : 'OMR'}
          </p>
          {data.lines.length > 0 ? (
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>{ar ? 'الرقم' : 'No.'}</th>
                  <th>{ar ? 'العميل/المورد' : 'Contact'}</th>
                  <th>{ar ? 'الاستحقاق' : 'Due'}</th>
                  <th>{ar ? 'أيام' : 'Days'}</th>
                  <th className="text-right">{ar ? 'المبلغ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((row) => (
                  <tr key={row.serialNumber}>
                    <td className="font-mono text-sm">{row.serialNumber}</td>
                    <td>{row.contactName || '—'}</td>
                    <td>{row.dueDate}</td>
                    <td>{row.daysOverdue > 0 ? row.daysOverdue : '—'}</td>
                    <td className="text-right font-semibold">{row.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">{ar ? 'لا توجد ذمم مفتوحة' : 'No open balances'}</p>
          )}
        </>
      )}
    </div>
  );
}
